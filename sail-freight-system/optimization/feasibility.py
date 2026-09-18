"""
Feasibility engine (PRD Section 12). Pure deterministic rule evaluation --
no ML, no randomness. Evaluated across the full vessel x port cross-product
so the UI can render a feasibility matrix.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Vessel:
    id: int
    vessel_class: str
    dwt: float
    loa: float
    beam: float
    draft: float
    freight_low: float
    freight_high: float
    availability_score: float = 90.0


@dataclass
class Port:
    id: int
    name: str
    max_draft: float
    max_loa: float
    handling_capacity: float
    congestion_index: float
    avg_turnaround_days: float
    demurrage_rate: float
    commodity_support: list


@dataclass
class FeasibilityResult:
    feasible: bool
    reason: Optional[str]  # first failing rule if infeasible, else None


def check_feasibility(vessel: Vessel, port: Port, commodity: str, quantity_tonnes: float) -> FeasibilityResult:
    """
    FEASIBLE(vessel, port, cargo) =
        vessel.draft <= port.max_draft
    AND vessel.loa   <= port.max_loa
    AND vessel.dwt_capacity >= cargo.quantity_tonnes
    AND port.commodity_support includes cargo.commodity

    Returns the FIRST failing rule as a human-readable reason (Section 12).
    """
    if vessel.draft > port.max_draft:
        return FeasibilityResult(
            False,
            f"Draft exceeds port limit: vessel {vessel.draft}m > {port.name} max {port.max_draft}m",
        )
    if vessel.loa > port.max_loa:
        return FeasibilityResult(
            False,
            f"LOA exceeds port limit: vessel {vessel.loa}m > {port.name} max {port.max_loa}m",
        )
    if vessel.dwt < quantity_tonnes:
        return FeasibilityResult(
            False,
            f"Vessel DWT capacity insufficient: {vessel.dwt}t < required {quantity_tonnes}t",
        )
    if commodity not in port.commodity_support:
        return FeasibilityResult(
            False,
            f"{port.name} does not support commodity '{commodity}'",
        )
    return FeasibilityResult(True, None)


def feasibility_matrix(vessels: list, ports: list, commodity: str, quantity_tonnes: float) -> list:
    """Cross-product evaluation for the UI's feasibility matrix (Section 12)."""
    matrix = []
    for v in vessels:
        for p in ports:
            result = check_feasibility(v, p, commodity, quantity_tonnes)
            matrix.append(
                {
                    "vessel_id": v.id,
                    "vessel_class": v.vessel_class,
                    "port_id": p.id,
                    "port_name": p.name,
                    "feasible": result.feasible,
                    "reason": result.reason,
                }
            )
    return matrix
