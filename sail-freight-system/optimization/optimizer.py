"""
Optimization Engine (PRD Section 18). Deterministic exhaustive search over
feasible {vessel x port x timing-anchor} combinations -- plain iteration,
brute force is sufficient at this scale (<=4 vessels x <=6 ports x 4 timing
anchors = 96 combinations). This is math, not "AI" (Section 21).

Score = Total Logistics Cost + delay_penalty_weight * expected_delay_days
        + risk_penalty_weight * overall_risk_score
"""

from dataclasses import dataclass
from typing import List, Optional

from feasibility import Vessel, Port, check_feasibility
from cost_engine import calculate_cost, CostBreakdown

TIMING_ANCHORS = [0, 7, 15, 30]  # days from decision date

DELAY_PENALTY_WEIGHT_INR = 500_000  # per day, Section 18 default
RISK_PENALTY_WEIGHT_INR = 200_000  # per risk point, Section 18 default


@dataclass
class CandidateResult:
    vessel: Vessel
    port: Port
    timing_anchor_days: int
    freight_rate: float
    expected_delay_days: float
    overall_risk: float
    cost: CostBreakdown
    score: float
    confidence: float


def score_candidate(cost: CostBreakdown, expected_delay_days: float, overall_risk: float) -> float:
    return (
        cost.total_cost
        + DELAY_PENALTY_WEIGHT_INR * expected_delay_days
        + RISK_PENALTY_WEIGHT_INR * overall_risk
    )


def run_optimization(
    vessels: List[Vessel],
    ports: List[Port],
    commodity: str,
    quantity_tonnes: float,
    forecast_fn,   # (port, timing_anchor_days) -> (freight_rate, confidence)
    risk_fn,       # (port, timing_anchor_days) -> overall_risk (0-100)
    delay_fn,      # (port, timing_anchor_days) -> expected_delay_days
) -> List[CandidateResult]:
    """
    forecast_fn / risk_fn / delay_fn are injected so this module stays pure
    combinatorics -- callers wire in the real ML-service calls or, in tests,
    stub functions. Returns ALL feasible candidates, sorted by score ascending
    (lowest/best first).
    """
    results: List[CandidateResult] = []

    for vessel in vessels:
        for port in ports:
            feas = check_feasibility(vessel, port, commodity, quantity_tonnes)
            if not feas.feasible:
                continue
            for anchor in TIMING_ANCHORS:
                freight_rate, confidence = forecast_fn(port, anchor)
                overall_risk = risk_fn(port, anchor)
                expected_delay = delay_fn(port, anchor)

                cost = calculate_cost(
                    freight_rate_usd_per_t=freight_rate,
                    quantity_tonnes=quantity_tonnes,
                    vessel_class=vessel.vessel_class,
                    port_charge_flat_inr=None,
                    handling_rate_inr_per_t=None,
                    demurrage_rate_inr_per_day=port.demurrage_rate,
                    expected_delay_days=expected_delay,
                    overall_risk_score=overall_risk,
                )
                score = score_candidate(cost, expected_delay, overall_risk)

                results.append(
                    CandidateResult(
                        vessel=vessel,
                        port=port,
                        timing_anchor_days=anchor,
                        freight_rate=freight_rate,
                        expected_delay_days=expected_delay,
                        overall_risk=overall_risk,
                        cost=cost,
                        score=score,
                        confidence=confidence,
                    )
                )

    results.sort(key=lambda r: r.score)
    return results


def best_and_alternatives(results: List[CandidateResult], n_alternatives: int = 2):
    if not results:
        return None, []
    best = results[0]
    alternatives = results[1 : 1 + n_alternatives]
    return best, alternatives


def recommend_timing(results: List[CandidateResult], min_saving_threshold: float = 0.03, max_downside_tolerance: float = 1.10):
    """
    Charter Timing Logic (Section 16). Operates on the results restricted to a
    single vessel/port combo (the one the optimizer already picked as best),
    comparing NOW (anchor=0) vs the best WAIT anchor.

    Returns one of: "CHARTER_NOW", "WAIT", "CONSIDER_ALTERNATIVE"
    plus the chosen candidate.
    """
    by_anchor = {r.timing_anchor_days: r for r in results}
    now = by_anchor.get(0)
    if now is None:
        return "CHARTER_NOW", results[0] if results else None

    wait_candidates = [r for anchor, r in by_anchor.items() if anchor > 0]
    if not wait_candidates:
        return "CHARTER_NOW", now

    best_wait = min(wait_candidates, key=lambda r: r.cost.total_cost)

    # downside case: use the upper bound of the forecast interval (pessimistic).
    # Caller is expected to have baked a pessimistic variant into a separate
    # call if precise downside tracking is needed; here we approximate downside
    # as cost at the same anchor computed with the risk-adjusted premium already
    # included, since we don't carry raw forecast bounds into CandidateResult.
    downside_wait_cost = best_wait.cost.total_cost * 1.05  # conservative approximation, documented assumption

    if (
        best_wait.cost.total_cost < now.cost.total_cost * (1 - min_saving_threshold)
        and downside_wait_cost < now.cost.total_cost * max_downside_tolerance
    ):
        return "WAIT", best_wait

    return "CHARTER_NOW", now
