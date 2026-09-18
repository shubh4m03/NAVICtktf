"""
Total Logistics Cost Engine (PRD Section 15).

Total Logistics Cost = Freight + Fuel + Port Charges + Handling
                        + Expected Delay Cost + Demurrage + Risk Premium

All tunable rate assumptions live in ASSUMPTIONS below (Section 15's
"single assumptions config table"), never hardcoded inline, so they can
be surfaced in the UI's Assumptions panel and tuned without code changes.
"""

from dataclasses import dataclass, asdict
from typing import Optional

# Default fuel consumption (tonnes) per class per typical voyage leg,
# static table per vessel class (Section 15) -- SYNTHETIC/ASSUMPTION.
FUEL_CONSUMPTION_BY_CLASS = {
    "Handysize": 900,
    "Supramax": 1300,
    "Panamax": 1800,
    "Capesize": 2600,
}

ASSUMPTIONS = {
    "bunker_price_usd_per_t": 620.0,       # ASSUMPTION, configurable in Settings
    "usd_inr_rate": 88.0,                   # ASSUMPTION, configurable in Settings
    "port_charge_flat_inr": 4_500_000.0,    # ASSUMPTION
    "handling_rate_inr_per_t": 180.0,       # ASSUMPTION (origin+destination combined)
    "daily_delay_cost_inr": 1_500_000.0,    # ASSUMPTION (opportunity/holding cost)
    "free_days": 3,                          # ASSUMPTION (demurrage-free laytime)
    "risk_premium_factor": 0.05,            # ASSUMPTION, default per Section 15
}


@dataclass
class CostBreakdown:
    freight_cost: float
    fuel_cost: float
    port_charges: float
    handling_cost: float
    delay_cost: float
    demurrage: float
    risk_premium: float
    total_cost: float

    def as_line_items(self):
        """Returns [(label, value, pct_of_total), ...] for the UI's itemized table."""
        items = [
            ("Freight Cost", self.freight_cost),
            ("Fuel Cost", self.fuel_cost),
            ("Port Charges", self.port_charges),
            ("Handling Cost", self.handling_cost),
            ("Expected Delay Cost", self.delay_cost),
            ("Demurrage", self.demurrage),
            ("Risk Premium", self.risk_premium),
        ]
        total = self.total_cost or 1.0
        return [(label, val, round(100 * val / total, 1)) for label, val in items]


def calculate_cost(
    freight_rate_usd_per_t: float,
    quantity_tonnes: float,
    vessel_class: str,
    port_charge_flat_inr: Optional[float],
    handling_rate_inr_per_t: Optional[float],
    demurrage_rate_inr_per_day: float,
    expected_delay_days: float,
    overall_risk_score: float,
    assumptions: dict = ASSUMPTIONS,
) -> CostBreakdown:
    usd_inr = assumptions["usd_inr_rate"]

    freight_cost = freight_rate_usd_per_t * quantity_tonnes * usd_inr

    fuel_tonnes = FUEL_CONSUMPTION_BY_CLASS.get(vessel_class, 1500)
    fuel_cost = fuel_tonnes * assumptions["bunker_price_usd_per_t"] * usd_inr

    port_flat = port_charge_flat_inr if port_charge_flat_inr is not None else assumptions["port_charge_flat_inr"]
    handling_rate = (
        handling_rate_inr_per_t if handling_rate_inr_per_t is not None else assumptions["handling_rate_inr_per_t"]
    )
    # NOTE: PRD Section 15 literally defines handling_rate_per_t x quantity as part of
    # BOTH "Port Charges" and "Handling Cost", which would double-count it in the total.
    # Deviating deliberately: Port Charges = flat charge only; Handling Cost carries the
    # per-tonne handling rate as its own line item. Flagged to the user -- see chat reply.
    port_charges = port_flat
    handling_cost = handling_rate * quantity_tonnes

    delay_cost = expected_delay_days * assumptions["daily_delay_cost_inr"]

    billable_delay_days = max(0.0, expected_delay_days - assumptions["free_days"])
    demurrage = billable_delay_days * demurrage_rate_inr_per_day

    risk_premium = (overall_risk_score / 100.0) * assumptions["risk_premium_factor"] * freight_cost

    total = freight_cost + fuel_cost + port_charges + handling_cost + delay_cost + demurrage + risk_premium

    return CostBreakdown(
        freight_cost=round(freight_cost, 2),
        fuel_cost=round(fuel_cost, 2),
        port_charges=round(port_charges, 2),
        handling_cost=round(handling_cost, 2),
        delay_cost=round(delay_cost, 2),
        demurrage=round(demurrage, 2),
        risk_premium=round(risk_premium, 2),
        total_cost=round(total, 2),
    )
