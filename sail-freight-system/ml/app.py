"""
ML service (PRD Section 29): FastAPI app hosting the forecasting model and
risk-scoring functions. Called internally by the Spring Boot backend --
not exposed directly to the frontend.

Demo mode reads seed CSVs from ../data/seed/. A LiveDataProvider can later
swap this for real freight feeds without changing the endpoint contracts.
"""

import csv
import os
from collections import defaultdict
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from forecasting import forecast as run_forecast
from risk_scoring import (
    market_risk,
    port_congestion_risk,
    weather_risk,
    geopolitical_risk,
    vessel_availability_risk,
    route_disruption_risk,
    overall_risk,
)

app = FastAPI(title="SAIL Freight ML Service", version="1.0.0")

SEED_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "seed")


def _load_freight_history(route_id: int) -> List[tuple]:
    path = os.path.join(SEED_DIR, "freight_rates.csv")
    if not os.path.exists(path):
        raise HTTPException(status_code=503, detail="Demo freight series not generated yet")
    rows = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            if int(row["route_id"]) == route_id:
                rows.append((row["date"], float(row["rate_usd_per_t"])))
    rows.sort(key=lambda r: r[0])
    if not rows:
        raise HTTPException(status_code=404, detail=f"No freight history for route_id={route_id}")
    return rows


class ForecastRequest(BaseModel):
    route_id: int
    horizon_days: int = 14


class ForecastPointOut(BaseModel):
    forecast_date: str
    forecast_rate: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    route_id: int
    model_name: str
    horizon_days: int
    confidence: float
    volatility_band: str
    current_rate: float
    points: List[ForecastPointOut]
    data_mode: str = "DEMO"


@app.post("/forecast", response_model=ForecastResponse)
def forecast_endpoint(req: ForecastRequest):
    if req.horizon_days not in (7, 14, 30):
        raise HTTPException(status_code=400, detail="horizon_days must be 7, 14, or 30")
    history = _load_freight_history(req.route_id)
    result = run_forecast(history, req.horizon_days)
    return ForecastResponse(
        route_id=req.route_id,
        model_name=result.model_name,
        horizon_days=result.horizon_days,
        confidence=result.confidence,
        volatility_band=result.volatility_band,
        current_rate=history[-1][1],
        points=[
            ForecastPointOut(
                forecast_date=p.forecast_date,
                forecast_rate=p.forecast_rate,
                lower_bound=p.lower_bound,
                upper_bound=p.upper_bound,
            )
            for p in result.points
        ],
    )


class RiskRequest(BaseModel):
    route_id: int
    port_congestion_index: float
    congestion_trend_delta: float = 0.0
    weather_segment_scores: List[float] = []
    cyclone_season: bool = False
    active_geo_events: List[dict] = []
    vessel_availability_score: float = 100.0
    route_baseline_risk: float = 10.0
    active_alert_severity: float = 0.0


class RiskSubScoreOut(BaseModel):
    name: str
    score: float
    band: str
    reasons: List[str]


class RiskResponse(BaseModel):
    route_id: int
    overall: float
    overall_band: str
    sub_scores: List[RiskSubScoreOut]
    data_mode: str = "DEMO"


@app.post("/risk", response_model=RiskResponse)
def risk_endpoint(req: RiskRequest):
    history = _load_freight_history(req.route_id)
    rates = [r for _, r in history[-30:]]
    mean = sum(rates) / len(rates)
    var = sum((r - mean) ** 2 for r in rates) / max(len(rates) - 1, 1)
    std_dev = var ** 0.5

    sub_scores = [
        market_risk(std_dev, rates[-1]),
        port_congestion_risk(req.port_congestion_index, req.congestion_trend_delta),
        weather_risk(req.weather_segment_scores or [10.0], req.cyclone_season),
        geopolitical_risk(req.active_geo_events),
        vessel_availability_risk(req.vessel_availability_score),
        route_disruption_risk(req.route_baseline_risk, req.active_alert_severity),
    ]
    assessment = overall_risk(sub_scores)

    return RiskResponse(
        route_id=req.route_id,
        overall=assessment.overall,
        overall_band=assessment.overall_band,
        sub_scores=[
            RiskSubScoreOut(name=s.name, score=s.score, band=s.band, reasons=s.reasons)
            for s in sub_scores
        ],
    )


@app.get("/health")
def health():
    return {"status": "ok"}
