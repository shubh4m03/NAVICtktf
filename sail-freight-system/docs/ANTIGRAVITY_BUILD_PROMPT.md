# BUILD PROMPT FOR ANTIGRAVITY
## Intelligent Freight Forecasting & Vessel Chartering Decision System
### SIH 2026 — Problem Statement SIH26006 (SAIL)

---

## 0. ROLE AND OPERATING MODE

You are the sole implementation agent for this project. You will build a complete,
working, demo-ready full-stack system: PostgreSQL database, Python ML/optimization
services (FastAPI), a Spring Boot backend, and a React/Next.js frontend, wired
together with Docker Compose.

Operating rules:
- Build in the phase order given in Section 9 below. Do not skip ahead to frontend
  polish while backend engine logic is unverified.
- Where a requirement is ambiguous, resolve it using the documented default
  assumptions in this document and surface the resolved assumption in the UI's
  Assumptions panel. Do not stop to ask for clarification — pick the documented
  default and keep moving.
- Every number the UI displays must be traceable to one of: REAL DATA, SYNTHETIC
  DATA, ASSUMPTION, MODEL OUTPUT, SIMULATION. This is enforced at the database
  schema level (an ENUM column) — do not bypass it.
- The deterministic engines (feasibility, cost, optimization) are MATH, not AI.
  Never let UI copy, code comments, or the optional LLM layer call them "AI"
  anything. Only the forecasting model and the optional LLM rephrasing layer
  involve statistical/ML methods, and even the forecast is a classical
  explainable statistical model (Holt's linear trend), not a black box.
- A reference implementation of the core engines already exists and has been
  tested. Use it as the source of truth — port/adapt it, do not blindly rewrite
  it from scratch. It lives at the repository paths given in Section 3. Where you
  need to translate Python reference logic into Java (feasibility/cost engine
  live in the Spring Boot backend per the architecture in Section 8), replicate
  the exact formulas and constants — do not "improve" the math without flagging
  the change back to the user first.

---

## 1. TWO CONFIRMED BUGS IN THE ORIGINAL SPEC — FIXES ARE MANDATORY, NOT OPTIONAL

These were found by actually running the engines against the original spec's own
numbers. Do not reintroduce them.

### Bug 1: The original fixed demo scenario is infeasible as written
Original scenario: 150,000 tonnes coking coal, Australia → Paradip.
Panamax DWT capacity is only 82,000t — physically cannot carry 150,000t.
Verified result: **only Capesize @ Paradip is feasible; every other vessel/port
combination fails feasibility.** This breaks three things simultaneously:
  - The claimed demo output ("Recommended vessel: Panamax") is impossible.
  - The judge demo flow step "switch destination to Dhamra, show alternative
    comparison" returns **zero feasible options** (Capesize draft 18.2m exceeds
    Dhamra's 18.0m limit) — the demo breaks live on stage.
  - The "minimum 2 alternative vessel/port combos" requirement for the
    Alternatives panel cannot be satisfied — there is only one feasible combo
    at any timing anchor.

**FIX (mandatory):** Use **70,000 tonnes** as the fixed demo cargo quantity,
not 150,000. At 70,000t:
  - Panamax (82,000t DWT) AND Capesize (180,000t DWT) are both feasible at
    Paradip → real alternatives exist for the Alternatives panel.
  - Panamax is feasible at Dhamra too (draft 14.2m < 18.0m limit) → the demo's
    "switch to Dhamra" step actually returns a result instead of breaking.
  - This preserves every other demo scenario field (commodity, origin,
    destination, required arrival date) — only the quantity changes.

Apply this fixed value everywhere the original spec said 150,000t: the demo
seed script, the demo narrative copy, and any hardcoded scenario JSON.

### Bug 2: Original cost formula double-counts handling cost
The original spec defines `handling_rate_per_t × quantity` as a component of
**both** "Port Charges" and "Handling Cost" — summing both into Total Logistics
Cost overstates the true cost.

**FIX (mandatory):**
```
Port Charges  = port.port_charge_flat                       (flat fee only)
Handling Cost = handling_rate_per_t × cargo_quantity_tonnes  (its own line item)
```
Do not include `handling_rate_per_t × quantity` inside Port Charges. This is
already implemented correctly in the reference `cost_engine.py` — replicate
that version, not a literal re-read of the original prose formula.

---

## 2. WHAT ALREADY EXISTS AND IS TESTED (build on this, don't redo it)

The following components are implemented, run, and verified against real
inputs. Treat their logic as locked unless you find a genuine bug — if you do,
flag it explicitly rather than silently changing behavior.

| Component | Path | Status |
|---|---|---|
| Synthetic freight-rate generator (deterministic seed=42, seasonal+AR(1) noise, damped) | `data/generate_freight_series.py` | Verified reproducible |
| Vessel master data | `data/seed/vessels.csv` | Loaded |
| Port master data | `data/seed/ports.csv` | Loaded |
| Route master data | `data/seed/routes.csv` | Loaded |
| Freight rate history (180 days x 6 routes) | `data/seed/freight_rates.csv` | Generated, verified |
| PostgreSQL schema | `data/schema.sql` | Written; validate with `psql -f schema.sql` before first use (was not runnable against a live Postgres instance during authoring — treat as unverified DDL, verify syntax on first real deploy) |
| Forecasting engine (Holt's linear trend, damped, widening interval) | `ml/forecasting.py` | Verified: 7d confidence 85%, 14d 79%, 30d 69% against seed data — matches the ~80-85% target for short horizons |
| Risk scoring engine (6 weighted sub-scores) | `ml/risk_scoring.py` | Verified |
| FastAPI ML service (`/forecast`, `/risk`, `/health`) | `ml/app.py` | Written, unit-level verified, not yet load-tested |
| Feasibility engine | `optimization/feasibility.py` | Verified against the spec's own stated example (Capesize feasible only at Paradip/Gangavaram/Dhamra) |
| Cost engine (with Bug 2 fix applied) | `optimization/cost_engine.py` | Verified |
| Brute-force optimizer + timing recommendation | `optimization/optimizer.py` | Verified end-to-end against corrected 70,000t demo scenario |

Not yet built: Spring Boot backend, React/Next.js frontend, Docker Compose
wiring, LLM explanation layer, full test suite, deployment config.

---

## 3. REPOSITORY STRUCTURE (already scaffolded — extend, do not restructure)

```
/frontend      — React/Next.js app
/backend       — Spring Boot service: controllers, feasibility engine (Java port
                 of optimization/feasibility.py), cost engine (Java port of
                 optimization/cost_engine.py), orchestration, JPA entities
/ml            — Python FastAPI: forecasting.py, risk_scoring.py, app.py (exists)
/optimization  — Python: feasibility.py, cost_engine.py, optimizer.py (exists,
                 reference implementation — also callable directly by the
                 optimizer's own FastAPI wrapper if you choose to expose it as
                 a service rather than porting it into the Java backend; either
                 architecture is acceptable, but pick one and be consistent —
                 do not implement feasibility/cost logic in three places)
/data          — seed scripts, seed CSVs, schema.sql (exists)
/docs          — PRD, API contracts, ER diagram, this prompt
/docker        — docker-compose.yml wiring frontend, backend, ml, optimization, postgres
```

**Architecture decision you must make and document in `/docs/architecture.md`:**
Either (a) port feasibility/cost logic into Java inside the Spring Boot backend
per the original architecture, with the Python versions in `/optimization` kept
only as the tested reference spec, OR (b) expose `/optimization` as its own
FastAPI service and have Spring Boot call it over REST like it calls `/ml`.
Option (b) is faster to ship correctly for a hackathon timeline since the logic
is already written and tested in Python — recommended unless the team has a
specific reason to want it in Java. Whichever you choose, state it explicitly
in `/docs/architecture.md` and do not duplicate the logic in both languages.

---

## 4. CORE PRINCIPLE — DO NOT VIOLATE

All analytical outputs (forecasts, costs, feasibility, optimization, risk
scores) are produced by deterministic/statistical engines. An optional LLM
layer may ONLY translate a structured JSON result into natural-language prose —
it must never invent, alter, or omit a numeric fact. If the LLM layer is
disabled or fails, the frontend must render the raw structured `reasons[]` /
`assumptions[]` arrays as bullet lists with zero degradation of information.

---

## 5. STRUCTURED DECISION OBJECT — CANONICAL SHAPE

Every decision-analysis response, whether fresh or replayed from history, uses
this exact shape. Treat it as a contract; frontend and backend must not drift
from it.

```json
{
  "recommendation": "CHARTER_NOW",
  "confidence": 0.84,
  "expected_cost": 764000000,
  "risk": { "overall": 68, "band": "MEDIUM" },
  "reasons": [
    "Freight rate expected to increase over next 14 days",
    "Panamax satisfies Dhamra draft and capacity constraints",
    "Dhamra has lower expected delay than Paradip for this cargo size",
    "Port congestion risk trending upward"
  ],
  "alternatives": [
    {
      "vessel_class": "Capesize",
      "port": "Paradip",
      "expected_cost": 780000000,
      "risk": { "overall": 60, "band": "MEDIUM" },
      "expected_delay_days": 1.2,
      "confidence": 0.81,
      "differentiator": "Lower cost but 1.2 days higher expected delay"
    }
  ],
  "assumptions": [
    "Demurrage rate assumed at port's documented rate (no contract-specific rate provided)",
    "Fuel price assumed flat over decision window unless scenario override applied",
    "Handling cost counted once as its own line item (see Bug 2 fix, Section 1)"
  ],
  "cost_breakdown": {
    "freight_cost": 0, "fuel_cost": 0, "port_charges": 0, "handling_cost": 0,
    "delay_cost": 0, "demurrage": 0, "risk_premium": 0, "total_cost": 0
  },
  "optimization_trace": [ ]
}
```

---

## 6. FEASIBILITY, COST, AND OPTIMIZATION RULES (verified formulas — replicate exactly)

### Feasibility
```
FEASIBLE(vessel, port, cargo) =
    vessel.draft <= port.max_draft
AND vessel.loa   <= port.max_loa
AND vessel.dwt_capacity >= cargo.quantity_tonnes
AND port.commodity_support includes cargo.commodity
```
Return the FIRST failing rule as the human-readable reason. Evaluate across the
full vessel × port cross-product for the feasibility matrix UI.

### Total Logistics Cost (Bug 2 fix applied)
```
Total Logistics Cost = Freight Cost + Fuel Cost + Port Charges + Handling Cost
                        + Expected Delay Cost + Demurrage + Risk Premium

Freight Cost       = freight_rate_$/t × quantity_t × usd_inr_rate
Fuel Cost          = bunker_price_$/t × fuel_consumption_t(vessel_class)   [static table]
Port Charges       = port.port_charge_flat                                 [flat fee ONLY]
Handling Cost      = handling_rate_per_t × quantity_t                      [its own line]
Expected Delay Cost= expected_delay_days × daily_delay_cost
Demurrage          = max(0, expected_delay_days − free_days) × port.demurrage_rate_per_day
Risk Premium       = (overall_risk_score / 100) × risk_premium_factor × Freight Cost
```
Default assumptions (tunable, config-table-driven, never hardcoded inline):
`bunker_price_usd_per_t = 620`, `usd_inr_rate = 88`, `free_days = 3`,
`risk_premium_factor = 0.05`, `daily_delay_cost_inr = 1,500,000`,
`port_charge_flat_inr = 4,500,000` (default when a port record doesn't specify one).

### Charter Timing Logic
Evaluate 4 anchors: Today, +7d, +15d, +30d.
```
IF expected_cost(best WAIT anchor) < expected_cost(NOW) * (1 - 0.03)
   AND downside_cost(best WAIT anchor) < expected_cost(NOW) * 1.10
THEN recommend WAIT
ELSE IF a feasible alternative port/vessel has lower expected_cost than NOW
THEN recommend CONSIDER_ALTERNATIVE
ELSE recommend CHARTER_NOW
```

### Optimization Objective (minimize; brute-force enumeration, ≤96 combinations)
```
Score = Total Logistics Cost
        + 500,000 × expected_delay_days     (delay_penalty_weight, INR/day)
        + 200,000 × overall_risk_score       (risk_penalty_weight, INR/risk-point)
```
Return best + top 2 next-lowest-scoring feasible alternatives, each with a
one-line differentiator reason (cost delta, risk delta, or delay delta).

### Risk Scoring
Six sub-scores (0-100, higher=riskier): Market, Port Congestion, Weather,
Geopolitical, Vessel Availability, Route Disruption. Weighted overall:
`0.25×Market + 0.25×Port + 0.15×Weather + 0.10×Geopolitical + 0.15×Vessel + 0.10×Route`.
Bands: LOW 0-39 / MEDIUM 40-64 / HIGH 65-84 / CRITICAL 85-100 — always shown
with both color AND text label, never color alone.

### Forecasting Model
Holt's linear trend (double exponential smoothing) with **damped trend**
(`phi = 0.85`) — the undamped version was tested and overreacts to noise,
producing an implausible runaway forecast; do not remove the damping.
`alpha = 0.25`, `beta = 0.05`. Prediction interval widens with `sqrt(horizon)`.
Confidence = `100 × (1 − normalized_interval_width)`, floored at 50%, capped
at 90% — never claim near-100% certainty.

---

## 7. DEMO SCENARIO (corrected — use these exact values)

```json
{
  "commodity": "Coking Coal",
  "quantity_tonnes": 70000,
  "origin": "Australia",
  "destination_port": "Paradip",
  "required_arrival_date": "2026-10-20",
  "decision_date": "2026-09-18"
}
```
Expected illustrative output (generated at runtime, not hardcoded strings):
multiple feasible vessel/port combinations at Paradip (Panamax and Capesize
both qualify), overall risk in the MEDIUM band, confidence in the ~75-85% range
for the 7-30 day horizons tested. Demo flow step "switch destination to Dhamra"
must return a feasible Panamax result, not an empty state.

---

## 8. TECH STACK AND ARCHITECTURE

- **Frontend:** React + Next.js, Tailwind utility classes, charts via
  Recharts/ECharts, React Query for server state, route-level code splitting.
- **Backend:** Spring Boot — controllers, orchestration, JPA entities matching
  `data/schema.sql`, JWT auth (users table, role check on write endpoints).
- **ML service:** Python FastAPI (`/ml`) — forecasting + risk, already scaffolded.
- **Optimization:** Python (`/optimization`) — feasibility + cost + optimizer,
  already scaffolded and tested; expose via FastAPI if you take architecture
  option (b) from Section 3.
- **Database:** PostgreSQL, schema at `data/schema.sql`.
- **LLM explanation layer:** optional, single call with strict "rephrase only,
  never invent numbers" system prompt; graceful fallback to raw structured
  bullets if unavailable.
- **Containerization:** Docker Compose wiring frontend, backend, ml,
  optimization (if separate service), postgres. Target: `docker-compose up`
  runs the full stack locally with zero manual steps beyond `.env` setup.

### API surface (implement all of these)
```
POST /api/decision/analyze       Run full pipeline → decision object (Section 5 shape)
POST /api/forecast                Freight forecast for a route + horizon
GET  /api/vessels                 Vessel master data
GET  /api/ports                   Port master data
POST /api/feasibility/check       Vessel x port x cargo feasibility
POST /api/cost/calculate          Cost breakdown for a vessel/port/timing
POST /api/optimization/run        Run optimizer over feasible combinations
POST /api/scenario/simulate       Recompute with overrides, return result + delta
GET  /api/risk                    Current risk scores for a route
GET  /api/alerts                  Active alerts (optionally filtered by route)
POST /api/backtesting              Run historical backtest for route/date-range/vessel
GET  /api/decisions                List/retrieve past decisions
```
Validation on all endpoints: required fields server-side checked;
`quantity_tonnes > 0`; `required_arrival_date > decision_date`; destination
port must exist; commodity must be in the supported list. 400 on validation
failure with `{ "error": "field_name", "message": "..." }`. 422 when no
feasible combination exists — still return best-effort partial results (e.g.
the blocking constraints) rather than a bare error. 503 → fall back to demo
data provider and flag `"data_mode": "DEMO_FALLBACK"` rather than failing.

---

## 9. BUILD PHASES — FOLLOW THIS ORDER

1. **Domain + data** (mostly done — verify `data/seed/*.csv` load correctly,
   run `data/generate_freight_series.py` fresh if you change any route params)
2. **DB + backend foundation** — run `data/schema.sql` against a real Postgres
   instance, fix any syntax issues found (it was authored but not execution-
   verified), scaffold Spring Boot with JPA entities matching the schema, wire
   basic auth, confirm `/api/vessels` and `/api/ports` return seed data
3. **Freight forecasting** — wire `/ml`'s `/forecast` endpoint into the backend,
   confirm `/api/forecast` returns rate+interval+confidence for 7/14/30d
4. **Vessel/port feasibility** — wire `optimization/feasibility.py` (ported or
   proxied per your Section 3 architecture decision), test against the full
   vessel×port matrix, confirm it matches the verified reference output
5. **Cost engine** — wire `optimization/cost_engine.py` with Bug 2 fix intact;
   confirm the displayed breakdown sums exactly to the total (±₹1 rounding)
6. **Optimization** — wire `optimization/optimizer.py`; confirm it returns best
   + 2 alternatives for the corrected 70,000t demo scenario
7. **Risk intelligence** — wire `/ml`'s `/risk` endpoint; confirm overall risk
   = weighted sub-scores; build the alerts rule engine over synthetic signals
8. **Decision Playground** — full `/api/decision/analyze` + frontend page;
   confirm the corrected demo scenario produces a complete recommendation
   end-to-end
9. **Frontend integration** — all remaining pages (Freight Intelligence, Risk
   & Disruptions, Vessel/Port Intelligence, Scenario Simulator, Sensitivity
   Analysis, Geopolitical/Weather Intelligence, Decision History, Data & System
   Status); every screen must have a defined non-blank state for
   loading/empty/error/no-data
10. **Backtesting** — `/api/backtesting` comparing Immediate Charter vs Forecast
    Strategy vs Decision Engine on the demo route, labeled as simulation
11. **Testing** — unit tests for feasibility (full matrix vs known outcomes),
    cost formulas (hand-computed fixtures — use the corrected formula from
    Section 6, not the original spec's double-counted version), optimizer
    (small fixed search space with known best answer), forecast interval
    monotonic widening with horizon. Integration test: full
    `/api/decision/analyze` against the corrected demo scenario returns a
    well-formed Section 5 response. Target ≥80% coverage on engine logic.
12. **Deployment** — Docker Compose, verify `docker-compose up` runs the full
    stack from a clean checkout

---

## 10. TECHNICAL INTEGRITY RULES (enforce in copy and code, not just data)

- Never state an accuracy percentage unless it's the literal output of a
  backtest run shown on the Backtesting page.
- Never present curated geopolitical/alert demo events as live real-world
  news — always label `SIMULATION MODE` or `DEMO DATA`.
- Every KPI/number on screen carries a data-origin badge: REAL DATA / SYNTHETIC
  DATA / ASSUMPTION / MODEL OUTPUT / SIMULATION.
- UI copy says "Optimization Engine," never "AI Optimization" — it's brute-
  force deterministic math.
- Global `DATA_MODE` banner ("DEMO DATA MODE — All figures are simulated for
  demonstration") persistent in the header while in demo mode.

---

## 11. DEFINITION OF DONE (acceptance checklist)

- [ ] User can enter cargo quantity, commodity, origin, destination, required
      arrival date and receive a recommendation
- [ ] System rejects infeasible vessel-port combinations and states the exact
      violated constraint
- [ ] Total cost displayed equals the sum of its line items, no drift beyond ₹1
- [ ] Decision engine returns at least one feasible option whenever at least
      one exists in the vessel×port space
- [ ] Corrected demo scenario (70,000t, Section 7) runs end-to-end and produces
      real alternatives, not a single forced result
- [ ] Switching destination port to Dhamra in the demo flow returns a feasible
      result, not an empty state
- [ ] Scenario simulator recomputes cost/risk/delay/recommendation via a real
      API call on any override, with a visible before/after delta
- [ ] Every forecast number shown with a prediction interval and confidence %
- [ ] Every screen has a defined loading/empty/error/no-data state
- [ ] Demo data is visibly labeled on every page via the persistent banner
- [ ] No UI copy claims "AI" for the deterministic engines
- [ ] Backtesting page labels all output as simulated/historical
- [ ] `docker-compose up` runs the full stack from a clean checkout with zero
      manual steps beyond `.env`
- [ ] `/docs/architecture.md` documents the feasibility/cost engine language
      decision from Section 3 and is not left ambiguous

---

## 12. WHAT TO REPORT BACK WHEN DONE

Do not silently mark this complete. Report explicitly:
- Which phases (Section 9) were completed vs partially completed
- Any formula, schema, or contract you deviated from and why
- Any new bugs found in the process (there were two already — assume there may
  be more, this spec was not audited beyond the engine layer)
- The actual output of the corrected demo scenario (real numbers, not
  illustrative ones) so it can be sanity-checked before judge day
