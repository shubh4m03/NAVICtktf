"""
Risk scoring model (PRD Section 17).

Six sub-scores (0-100, higher = riskier), combined into an overall score
via a documented, tunable weighted average. Every sub-score computation
is a plain deterministic formula over inputs -- no ML black box here,
consistent with Section 21 (never call deterministic math "AI").
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

# Weights per Section 17.3 (tunable, documented here as the single source of truth)
WEIGHTS = {
    "market": 0.25,
    "port": 0.25,
    "weather": 0.15,
    "geopolitical": 0.10,
    "vessel": 0.15,
    "route": 0.10,
}

BANDS = [
    (0, 39, "LOW"),
    (40, 64, "MEDIUM"),
    (65, 84, "HIGH"),
    (85, 100, "CRITICAL"),
]


def band_for(score: float) -> str:
    for lo, hi, label in BANDS:
        if lo <= score <= hi:
            return label
    return "CRITICAL" if score > 100 else "LOW"


@dataclass
class RiskSubScore:
    name: str
    score: float
    band: str
    reasons: List[str] = field(default_factory=list)


@dataclass
class RiskAssessment:
    sub_scores: List[RiskSubScore]
    overall: float
    overall_band: str


def market_risk(rolling_std_dev: float, base_rate: float) -> RiskSubScore:
    """Normalize rolling freight-rate volatility (std dev / base rate) to 0-100."""
    ratio = rolling_std_dev / base_rate if base_rate else 0
    score = min(100.0, ratio * 1000)  # 10% relative std dev -> 100 score, tuned for demo range
    reasons = []
    if score > 40:
        reasons.append("Freight-rate volatility trending above normal range")
    else:
        reasons.append("Freight-rate volatility within normal range")
    return RiskSubScore("Market Risk", round(score, 1), band_for(score), reasons)


def port_congestion_risk(congestion_index: float, trend_delta: float = 0.0) -> RiskSubScore:
    """Base = port's congestion_index (0-100), adjusted by a synthetic trend delta."""
    score = min(100.0, max(0.0, congestion_index + trend_delta))
    reasons = [f"Base congestion index {congestion_index:.0f}/100"]
    if trend_delta > 5:
        reasons.append("Congestion trend increasing")
    elif trend_delta < -5:
        reasons.append("Congestion trend easing")
    return RiskSubScore("Port Congestion Risk", round(score, 1), band_for(score), reasons)


def weather_risk(segment_scores: List[float], cyclone_season: bool = False) -> RiskSubScore:
    """Max over route segments, bumped if in cyclone season."""
    base = max(segment_scores) if segment_scores else 0.0
    score = min(100.0, base + (15 if cyclone_season else 0))
    reasons = [f"Peak segment weather risk {base:.0f}/100"]
    if cyclone_season:
        reasons.append("Route active during seasonal cyclone window")
    return RiskSubScore("Weather Risk", round(score, 1), band_for(score), reasons)


def geopolitical_risk(active_events: List[dict]) -> RiskSubScore:
    """0 if no active demo event on this route, else max severity of active events."""
    if not active_events:
        return RiskSubScore("Geopolitical Risk", 0.0, band_for(0.0), ["No active demo event on this route"])
    severity = max(e.get("severity", 0) for e in active_events)
    reasons = [e.get("title", "Unnamed event") for e in active_events]
    return RiskSubScore("Geopolitical Risk", round(severity, 1), band_for(severity), reasons)


def vessel_availability_risk(availability_score: float) -> RiskSubScore:
    score = 100 - availability_score
    reasons = [f"Vessel availability score {availability_score:.0f}/100"]
    return RiskSubScore("Vessel Availability Risk", round(score, 1), band_for(score), reasons)


def route_disruption_risk(route_baseline: float, active_alert_severity: float = 0.0) -> RiskSubScore:
    score = min(100.0, route_baseline + active_alert_severity)
    reasons = [f"Route baseline {route_baseline:.0f}/100"]
    if active_alert_severity > 0:
        reasons.append("Active alert contributing to route disruption risk")
    return RiskSubScore("Route Disruption Risk", round(score, 1), band_for(score), reasons)


def overall_risk(sub_scores: List[RiskSubScore]) -> RiskAssessment:
    key_map = {
        "Market Risk": "market",
        "Port Congestion Risk": "port",
        "Weather Risk": "weather",
        "Geopolitical Risk": "geopolitical",
        "Vessel Availability Risk": "vessel",
        "Route Disruption Risk": "route",
    }
    total = 0.0
    for s in sub_scores:
        weight_key = key_map.get(s.name)
        if weight_key:
            total += s.score * WEIGHTS[weight_key]
    total = round(total, 1)
    return RiskAssessment(sub_scores=sub_scores, overall=total, overall_band=band_for(total))
