"""
Synthetic freight-rate series generator (PRD Section 22).

Produces a deterministic (fixed-seed) daily freight-rate series per route:
    rate(t) = base + trend(t) + seasonal(t) + AR(1) noise(t)

Design goals:
- Reproducible: same seed -> same series -> same demo narrative every run.
- Realistic enough to make forecasting/backtesting/risk features visibly
  meaningful (seasonal swings, occasional volatility clusters), without
  pretending to be real market data.
- Every row is explicitly tagged data_origin='synthetic' at the DB level
  (see Section 27 schema) -- this script only produces the numbers.

Usage:
    python generate_freight_series.py --days 180 --out freight_rates.csv

Output columns: route_id,date,rate_usd_per_t,data_origin
"""

import argparse
import csv
import math
import random
from datetime import date, timedelta

SEED = 42  # fixed seed -> reproducible demo (Section 22)

# Per-route base rate ($/t) and volatility, roughly consistent with the
# vessel typical-freight ranges in Section 13 (Panamax ~20-24 $/t is the
# reference class SAIL would most commonly charter for coking coal).
ROUTE_PARAMS = {
    1: {"base": 22.0, "vol": 0.45, "route_name": "Australia -> Paradip"},
    2: {"base": 22.6, "vol": 0.50, "route_name": "Australia -> Visakhapatnam"},
    3: {"base": 21.8, "vol": 0.42, "route_name": "Australia -> Gangavaram"},
    4: {"base": 22.2, "vol": 0.45, "route_name": "Australia -> Dhamra"},
    5: {"base": 23.1, "vol": 0.55, "route_name": "Australia -> Gopalpur"},
    6: {"base": 24.0, "vol": 0.60, "route_name": "Australia -> Haldia"},
}

ANNUAL_PERIOD_DAYS = 365.25


def generate_route_series(route_id: int, params: dict, num_days: int, start: date):
    rng = random.Random(SEED * 1000 + route_id)  # per-route but still deterministic
    base = params["base"]
    vol = params["vol"]

    rows = []
    # AR(1) noise state
    noise = 0.0
    phi = 0.85  # persistence -> volatility clustering, avoids pure white noise
    # slow drift trend over the window (mild, +/- ~8% over a year)
    trend_amplitude = base * 0.08

    for i in range(num_days):
        d = start + timedelta(days=i)

        # seasonal component: one annual cycle + a smaller semi-annual ripple
        # (e.g. cyclone-season-adjacent freight tightening)
        seasonal = (
            base * 0.05 * math.sin(2 * math.pi * i / ANNUAL_PERIOD_DAYS)
            + base * 0.02 * math.sin(4 * math.pi * i / ANNUAL_PERIOD_DAYS + 0.7)
        )

        # gentle linear-ish drift via a slow sine so it doesn't run away
        trend = trend_amplitude * math.sin(2 * math.pi * i / (ANNUAL_PERIOD_DAYS * 1.3))

        # AR(1) noise with occasional volatility shocks
        shock = rng.gauss(0, vol)
        if rng.random() < 0.015:  # ~1.5% chance/day of a larger disruption-style jump
            shock += rng.choice([-1, 1]) * vol * rng.uniform(2.0, 3.0)
        noise = phi * noise + shock

        rate = base + trend + seasonal + noise
        rate = max(rate, base * 0.4)  # floor so synthetic data never goes absurd/negative

        rows.append(
            {
                "route_id": route_id,
                "date": d.isoformat(),
                "rate_usd_per_t": round(rate, 2),
                "data_origin": "synthetic",
            }
        )

    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=180, help="History length in days")
    parser.add_argument(
        "--end-date",
        type=str,
        default=date.today().isoformat(),
        help="Last date of the generated series (ISO format). History runs backward from here.",
    )
    parser.add_argument("--out", type=str, default="freight_rates.csv")
    args = parser.parse_args()

    end = date.fromisoformat(args.end_date)
    start = end - timedelta(days=args.days - 1)

    all_rows = []
    for route_id, params in ROUTE_PARAMS.items():
        all_rows.extend(generate_route_series(route_id, params, args.days, start))

    with open(args.out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["route_id", "date", "rate_usd_per_t", "data_origin"])
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"Wrote {len(all_rows)} rows ({len(ROUTE_PARAMS)} routes x {args.days} days) to {args.out}")
    print(f"Date range: {start.isoformat()} -> {end.isoformat()} (seed={SEED}, reproducible)")


if __name__ == "__main__":
    main()
