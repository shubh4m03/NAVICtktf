-- SAIL Intelligent Freight Forecasting & Vessel Chartering System
-- PostgreSQL schema per PRD Section 27.
-- All monetary fields NUMERIC(18,2); all data_origin columns enforce
-- Section 21 (every number traceable to real/synthetic/assumption/model_output/simulation).

CREATE TYPE data_origin_t AS ENUM ('real', 'synthetic', 'assumption', 'model_output', 'simulation');
CREATE TYPE user_role_t AS ENUM ('manager', 'analyst', 'admin');
CREATE TYPE recommendation_t AS ENUM ('CHARTER_NOW', 'WAIT', 'CONSIDER_ALTERNATIVE');
CREATE TYPE risk_event_type_t AS ENUM ('market', 'port', 'weather', 'geopolitical', 'vessel', 'route');
CREATE TYPE severity_t AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    role          user_role_t NOT NULL DEFAULT 'manager',
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vessels (
    id                BIGSERIAL PRIMARY KEY,
    vessel_class      TEXT NOT NULL,
    dwt               NUMERIC(12,2) NOT NULL,
    loa               NUMERIC(8,2) NOT NULL,
    beam              NUMERIC(8,2) NOT NULL,
    draft             NUMERIC(6,2) NOT NULL,
    availability_score NUMERIC(5,2) NOT NULL DEFAULT 100,
    data_origin       data_origin_t NOT NULL DEFAULT 'synthetic'
);

CREATE TABLE ports (
    id                   BIGSERIAL PRIMARY KEY,
    name                 TEXT NOT NULL UNIQUE,
    max_draft            NUMERIC(6,2) NOT NULL,
    max_loa              NUMERIC(8,2) NOT NULL,
    handling_capacity    NUMERIC(12,2) NOT NULL, -- t/day
    congestion_index     NUMERIC(5,2) NOT NULL,  -- 0-100
    avg_turnaround_days  NUMERIC(6,2) NOT NULL,
    demurrage_rate       NUMERIC(18,2) NOT NULL, -- INR/day
    commodity_support    TEXT[] NOT NULL DEFAULT '{}',
    data_origin          data_origin_t NOT NULL DEFAULT 'synthetic'
);

CREATE TABLE routes (
    id                   BIGSERIAL PRIMARY KEY,
    origin               TEXT NOT NULL,
    destination_port_id  BIGINT NOT NULL REFERENCES ports(id),
    distance_nm          NUMERIC(10,2) NOT NULL,
    typical_transit_days NUMERIC(6,2) NOT NULL
);

CREATE TABLE cargo_requirements (
    id                     BIGSERIAL PRIMARY KEY,
    user_id                BIGINT NOT NULL REFERENCES users(id),
    commodity              TEXT NOT NULL,
    quantity_tonnes        NUMERIC(14,2) NOT NULL CHECK (quantity_tonnes > 0),
    origin                 TEXT NOT NULL,
    destination_port_id    BIGINT NOT NULL REFERENCES ports(id),
    required_arrival_date  DATE NOT NULL,
    decision_date          DATE NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (required_arrival_date > decision_date)
);

CREATE TABLE freight_rates (
    id             BIGSERIAL PRIMARY KEY,
    route_id       BIGINT NOT NULL REFERENCES routes(id),
    date           DATE NOT NULL,
    rate_usd_per_t NUMERIC(10,2) NOT NULL,
    data_origin    data_origin_t NOT NULL DEFAULT 'synthetic',
    UNIQUE (route_id, date)
);

CREATE TABLE forecast_results (
    id            BIGSERIAL PRIMARY KEY,
    route_id      BIGINT NOT NULL REFERENCES routes(id),
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    horizon_days  INT NOT NULL,
    forecast_rate NUMERIC(10,2) NOT NULL,
    lower_bound   NUMERIC(10,2) NOT NULL,
    upper_bound   NUMERIC(10,2) NOT NULL,
    confidence    NUMERIC(5,2) NOT NULL,
    model_name    TEXT NOT NULL
);

CREATE TABLE risk_events (
    id                  BIGSERIAL PRIMARY KEY,
    route_id            BIGINT REFERENCES routes(id),
    type                risk_event_type_t NOT NULL,
    title               TEXT NOT NULL,
    severity            NUMERIC(5,2) NOT NULL,
    expected_delay_days NUMERIC(6,2) NOT NULL DEFAULT 0,
    cost_impact_pct     NUMERIC(6,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_origin         data_origin_t NOT NULL DEFAULT 'simulation'
);

CREATE TABLE weather_data (
    id            BIGSERIAL PRIMARY KEY,
    route_id      BIGINT NOT NULL REFERENCES routes(id),
    segment_name  TEXT NOT NULL,
    date          DATE NOT NULL,
    risk_score    NUMERIC(5,2) NOT NULL,
    wind_desc     TEXT,
    wave_desc     TEXT,
    cyclone_prob  NUMERIC(5,2)
);

CREATE TABLE market_data (
    id                   BIGSERIAL PRIMARY KEY,
    date                 DATE NOT NULL UNIQUE,
    bunker_price_usd_per_t NUMERIC(10,2) NOT NULL,
    usd_inr_rate         NUMERIC(8,2) NOT NULL
);

CREATE TABLE decisions (
    id                     BIGSERIAL PRIMARY KEY,
    cargo_requirement_id   BIGINT NOT NULL REFERENCES cargo_requirements(id),
    recommendation         recommendation_t NOT NULL,
    recommended_vessel_id  BIGINT REFERENCES vessels(id),
    recommended_port_id    BIGINT REFERENCES ports(id),
    expected_total_cost    NUMERIC(18,2) NOT NULL,
    overall_risk           NUMERIC(5,2) NOT NULL,
    confidence             NUMERIC(5,2) NOT NULL,
    reasons                JSONB NOT NULL DEFAULT '[]',
    alternatives           JSONB NOT NULL DEFAULT '[]',
    assumptions            JSONB NOT NULL DEFAULT '[]',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cost_calculations (
    id            BIGSERIAL PRIMARY KEY,
    decision_id   BIGINT NOT NULL REFERENCES decisions(id),
    freight_cost  NUMERIC(18,2) NOT NULL,
    fuel_cost     NUMERIC(18,2) NOT NULL,
    port_charges  NUMERIC(18,2) NOT NULL,
    handling_cost NUMERIC(18,2) NOT NULL,
    delay_cost    NUMERIC(18,2) NOT NULL,
    demurrage     NUMERIC(18,2) NOT NULL,
    risk_premium  NUMERIC(18,2) NOT NULL,
    total_cost    NUMERIC(18,2) NOT NULL
);

CREATE TABLE optimization_results (
    id                     BIGSERIAL PRIMARY KEY,
    decision_id            BIGINT NOT NULL REFERENCES decisions(id),
    vessel_id              BIGINT NOT NULL REFERENCES vessels(id),
    port_id                BIGINT NOT NULL REFERENCES ports(id),
    charter_timing_anchor  TEXT NOT NULL,
    score                  NUMERIC(18,2) NOT NULL,
    rank                   INT NOT NULL
);

CREATE TABLE scenario_runs (
    id                BIGSERIAL PRIMARY KEY,
    base_decision_id  BIGINT NOT NULL REFERENCES decisions(id),
    overrides         JSONB NOT NULL,
    result            JSONB NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alerts (
    id                  BIGSERIAL PRIMARY KEY,
    route_id            BIGINT REFERENCES routes(id),
    event               TEXT NOT NULL,
    severity            severity_t NOT NULL,
    expected_delay_days NUMERIC(6,2) NOT NULL DEFAULT 0,
    cost_impact_pct     NUMERIC(6,2) NOT NULL DEFAULT 0,
    recommended_action  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_origin         data_origin_t NOT NULL DEFAULT 'simulation'
);

CREATE INDEX idx_freight_rates_route_date ON freight_rates (route_id, date);
CREATE INDEX idx_decisions_cargo ON decisions (cargo_requirement_id);
CREATE INDEX idx_weather_route_date ON weather_data (route_id, date);
CREATE INDEX idx_risk_events_route ON risk_events (route_id);
CREATE INDEX idx_alerts_route ON alerts (route_id);
