"""
Forecasting model (PRD Section 19).

Deliberately NOT a black-box deep model: dataset size in a hackathon is
small and explainability matters more than raw accuracy. Uses Holt's
linear trend (double exponential smoothing), a well-understood,
explainable statistical method, with a widening prediction interval
based on rolling residual std dev.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Tuple


@dataclass
class ForecastPoint:
    forecast_date: str
    forecast_rate: float
    lower_bound: float
    upper_bound: float


@dataclass
class ForecastResult:
    model_name: str
    horizon_days: int
    points: List[ForecastPoint]
    confidence: float
    volatility_band: str  # Low / Medium / High


def _holt_linear(series: List[float], alpha: float = 0.25, beta: float = 0.05):
    """
    Holt's linear (damped) trend method. Returns (level, trend, fitted_residuals).
    series must have length >= 2.

    beta is kept low deliberately: a daily freight series this noisy will make
    an undamped Holt trend chase noise as if it were a persistent directional
    move, producing an implausible multi-day runaway forecast. A low beta plus
    the damping in `forecast()` below keeps the point forecast from drifting
    further than the underlying signal actually supports.
    """
    level = series[0]
    trend = series[1] - series[0]
    fitted = [level]
    residuals = []

    for t in range(1, len(series)):
        actual = series[t]
        prev_level = level
        level = alpha * actual + (1 - alpha) * (prev_level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend
        forecast_t = prev_level + trend
        fitted.append(forecast_t)
        residuals.append(actual - forecast_t)

    return level, trend, residuals


def _rolling_residual_std(residuals: List[float], window: int = 30) -> float:
    if not residuals:
        return 1.0
    recent = residuals[-window:] if len(residuals) >= window else residuals
    mean = sum(recent) / len(recent)
    var = sum((r - mean) ** 2 for r in recent) / max(len(recent) - 1, 1)
    return math.sqrt(var) if var > 0 else 1.0


def _volatility_band(std_dev: float, base_rate: float) -> str:
    ratio = std_dev / base_rate if base_rate else 0
    if ratio < 0.03:
        return "Low"
    if ratio < 0.07:
        return "Medium"
    return "High"


def forecast(
    history: List[Tuple[str, float]],
    horizon_days: int,
    z_score: float = 1.28,  # ~80% interval, matches confidence floor/ceiling below
) -> ForecastResult:
    """
    history: list of (iso_date, rate) sorted ascending by date, >= 14 points recommended.
    horizon_days: 7 / 14 / 30 typically (PRD Section 10.2).
    """
    if len(history) < 2:
        raise ValueError("Need at least 2 historical points to forecast")

    dates = [d for d, _ in history]
    rates = [r for _, r in history]

    level, trend, residuals = _holt_linear(rates)
    std_dev = _rolling_residual_std(residuals)
    base_rate = rates[-1]
    vol_band = _volatility_band(std_dev, base_rate)

    last_date = date.fromisoformat(dates[-1])
    points: List[ForecastPoint] = []

    # Damped trend (phi < 1): each successive step adds a shrinking fraction
    # of the trend rather than the full amount, so a noisy short-term slope
    # doesn't compound into an unrealistic long-horizon move.
    phi = 0.85
    damped_trend_sum = 0.0
    phi_power = phi

    for h in range(1, horizon_days + 1):
        damped_trend_sum += trend * phi_power
        phi_power *= phi
        point_forecast = level + damped_trend_sum
        # interval widens with sqrt(horizon) -- standard for random-walk-type
        # accumulated uncertainty, keeps the band from growing unrealistically fast
        width = z_score * std_dev * math.sqrt(h)
        lower = max(point_forecast - width, 0.0)
        upper = point_forecast + width
        points.append(
            ForecastPoint(
                forecast_date=(last_date + timedelta(days=h)).isoformat(),
                forecast_rate=round(point_forecast, 2),
                lower_bound=round(lower, 2),
                upper_bound=round(upper, 2),
            )
        )

    # confidence = 100 * (1 - normalized interval width), floor 50 / ceiling 90 (Section 19)
    final_width = points[-1].upper_bound - points[-1].lower_bound
    normalized_width = final_width / base_rate if base_rate else 1.0
    confidence = 100 * (1 - min(normalized_width, 1.0))
    confidence = max(50.0, min(90.0, confidence))

    return ForecastResult(
        model_name="Holt's Linear Trend (double exponential smoothing) — demo model",
        horizon_days=horizon_days,
        points=points,
        confidence=round(confidence, 1),
        volatility_band=vol_band,
    )
