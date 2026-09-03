-- ═══════════════════════════════════════════════════════════════════════
-- Smart Waste Intelligence — Core Schema (v2, real-world business model)
-- Postgres-compatible (runs on PGlite locally, and Supabase/Postgres in prod)
-- ═══════════════════════════════════════════════════════════════════════

-- ── Roles ─────────────────────────────────────────────────────────────
-- ADMIN               : full oversight, provisions every staff account, creates hubs/vehicles
-- LOCAL_HUB_MANAGER   : manages one local hub, its cleaners, requests transfers out
-- CLEANER             : collects waste from residents, drops at their local hub
-- RECYCLING_MANAGER   : manages a recycling facility, dispatches drivers/vehicles, processes batches
-- DRIVER              : moves a vehicle between a local hub and a recycling facility
-- RESIDENT            : Google-auth only, requests pickups, earns eco points

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    role            TEXT NOT NULL CHECK (role IN ('ADMIN','LOCAL_HUB_MANAGER','CLEANER','RECYCLING_MANAGER','DRIVER','RESIDENT')),
    name            TEXT NOT NULL,
    email           TEXT UNIQUE,
    phone           TEXT,
    username        TEXT UNIQUE,          -- staff login handle (admin-issued). NULL for residents.
    password_hash   TEXT,                 -- staff only. NULL for residents (Google-auth only).
    google_uid      TEXT UNIQUE,          -- resident only (Firebase uid)
    avatar_url      TEXT,
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      INTEGER REFERENCES users(id),
    local_hub_id    INTEGER,              -- for CLEANER / LOCAL_HUB_MANAGER
    recycling_hub_id INTEGER,             -- for RECYCLING_MANAGER / DRIVER (home base)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resident_profiles (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    address_line    TEXT,
    area            TEXT,
    city            TEXT,
    postal_code     TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    eco_points      INTEGER NOT NULL DEFAULT 0,
    total_kg_recycled DOUBLE PRECISION NOT NULL DEFAULT 0,
    preferred_local_hub_id INTEGER
);

CREATE TABLE IF NOT EXISTS driver_profiles (
    user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number      TEXT,
    license_expiry      DATE,
    employment_status   TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE','ON_LEAVE','SUSPENDED')),
    current_vehicle_id  INTEGER,
    availability        TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (availability IN ('AVAILABLE','ON_JOB','OFF_DUTY')),
    total_trips         INTEGER NOT NULL DEFAULT 0,
    total_kg_hauled     DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- ── Local Hubs (community collection points cleaners bring waste to) ──
CREATE TABLE IF NOT EXISTS local_hubs (
    id                  SERIAL PRIMARY KEY,
    code                TEXT UNIQUE NOT NULL,
    name                TEXT NOT NULL,
    address             TEXT,
    area                TEXT,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    capacity_kg         DOUBLE PRECISION NOT NULL DEFAULT 1000,
    current_load_kg     DOUBLE PRECISION NOT NULL DEFAULT 0,
    warning_pct         DOUBLE PRECISION NOT NULL DEFAULT 75,
    critical_pct        DOUBLE PRECISION NOT NULL DEFAULT 90,
    manager_id          INTEGER REFERENCES users(id),
    qr_code             TEXT UNIQUE NOT NULL,       -- static QR payload printed at the hub gate
    status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Recycling Facilities (process/recover material, dispatch fleet) ───
CREATE TABLE IF NOT EXISTS recycling_hubs (
    id                  SERIAL PRIMARY KEY,
    code                TEXT UNIQUE NOT NULL,
    name                TEXT NOT NULL,
    address             TEXT,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    daily_capacity_kg   DOUBLE PRECISION NOT NULL DEFAULT 5000,
    manager_id          INTEGER REFERENCES users(id),
    qr_code             TEXT UNIQUE NOT NULL,
    status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD CONSTRAINT fk_users_local_hub FOREIGN KEY (local_hub_id) REFERENCES local_hubs(id);
ALTER TABLE users ADD CONSTRAINT fk_users_recycling_hub FOREIGN KEY (recycling_hub_id) REFERENCES recycling_hubs(id);
ALTER TABLE resident_profiles ADD CONSTRAINT fk_res_hub FOREIGN KEY (preferred_local_hub_id) REFERENCES local_hubs(id);

-- ── Vehicles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
    id                  SERIAL PRIMARY KEY,
    plate_number        TEXT UNIQUE NOT NULL,
    vehicle_type        TEXT NOT NULL DEFAULT 'MINI_TRUCK' CHECK (vehicle_type IN ('MINI_TRUCK','COMPACTOR','TIPPER','E_RICKSHAW')),
    capacity_kg         DOUBLE PRECISION NOT NULL DEFAULT 1000,
    current_load_kg     DOUBLE PRECISION NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE','ASSIGNED','EN_ROUTE','MAINTENANCE','OUT_OF_SERVICE')),
    home_recycling_hub_id INTEGER REFERENCES recycling_hubs(id),
    qr_code             TEXT UNIQUE NOT NULL,
    total_trips         INTEGER NOT NULL DEFAULT 0,
    total_kg_hauled     DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE driver_profiles ADD CONSTRAINT fk_driver_vehicle FOREIGN KEY (current_vehicle_id) REFERENCES vehicles(id);

-- ── Pickup Requests (resident-initiated: scheduled / on-demand / missed) ─
CREATE TABLE IF NOT EXISTS pickup_requests (
    id                  SERIAL PRIMARY KEY,
    resident_id         INTEGER NOT NULL REFERENCES users(id),
    request_type        TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (request_type IN ('SCHEDULED','ON_DEMAND','MISSED_REPORT')),
    waste_type          TEXT NOT NULL DEFAULT 'MIXED' CHECK (waste_type IN ('PLASTIC','PAPER','METAL','E_WASTE','BIODEGRADABLE','HAZARDOUS','MIXED')),
    estimated_kg        DOUBLE PRECISION NOT NULL DEFAULT 5,
    notes               TEXT,
    address_line        TEXT NOT NULL,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    local_hub_id        INTEGER REFERENCES local_hubs(id),
    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ASSIGNED','COLLECTED','MISSED','CANCELLED')),
    priority_score      DOUBLE PRECISION NOT NULL DEFAULT 0,
    assigned_cleaner_id INTEGER REFERENCES users(id),
    assigned_at         TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ,
    actual_kg           DOUBLE PRECISION,
    sla_due_at          TIMESTAMPTZ,      -- when this is considered "missed" if not collected
    escalation_level    INTEGER NOT NULL DEFAULT 0,
    original_request_id INTEGER REFERENCES pickup_requests(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Collections (a physical pickup event performed by a cleaner) ──────
CREATE TABLE IF NOT EXISTS collections (
    id                  SERIAL PRIMARY KEY,
    pickup_request_id   INTEGER REFERENCES pickup_requests(id),
    cleaner_id          INTEGER REFERENCES users(id),      -- nullable: anonymized if the cleaner's account is deleted
    resident_id         INTEGER REFERENCES users(id),     -- nullable: anonymized if the resident's account is deleted
    local_hub_id        INTEGER NOT NULL REFERENCES local_hubs(id),
    waste_type          TEXT NOT NULL,
    weight_kg           DOUBLE PRECISION NOT NULL,
    eco_points_awarded  INTEGER NOT NULL DEFAULT 0,
    collected_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Hub → Recycling transfers (truck dispatch lifecycle with QR gates) ─
CREATE TABLE IF NOT EXISTS transfers (
    id                      SERIAL PRIMARY KEY,
    local_hub_id            INTEGER NOT NULL REFERENCES local_hubs(id),
    recycling_hub_id        INTEGER REFERENCES recycling_hubs(id),
    requested_by            INTEGER REFERENCES users(id),   -- local hub manager (or admin); nullable: anonymized on account deletion
    vehicle_id              INTEGER REFERENCES vehicles(id),
    driver_id               INTEGER REFERENCES users(id),
    assigned_by             INTEGER REFERENCES users(id),            -- recycling manager / admin
    status                  TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
                                'REQUESTED','DRIVER_ASSIGNED','ON_THE_JOB','ARRIVED_AT_HUB','LOADED',
                                'EN_ROUTE','ARRIVED_AT_RECYCLING','RECEIVED','COMPLETED','CANCELLED'
                            )),
    planned_weight_kg       DOUBLE PRECISION,        -- estimated at request time (hub's current load)
    loaded_weight_kg        DOUBLE PRECISION,        -- entered by driver at hub-QR-scan #2
    received_weight_kg      DOUBLE PRECISION,        -- entered by recycling staff on arrival
    variance_pct            DOUBLE PRECISION,
    requested_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_at             TIMESTAMPTZ,
    on_job_at               TIMESTAMPTZ,
    arrived_hub_at          TIMESTAMPTZ,
    loaded_at               TIMESTAMPTZ,
    en_route_at             TIMESTAMPTZ,
    arrived_recycling_at    TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ
);

-- Immutable timeline of every transfer event (QR scans, status changes)
CREATE TABLE IF NOT EXISTS transfer_events (
    id              SERIAL PRIMARY KEY,
    transfer_id     INTEGER NOT NULL REFERENCES transfers(id),
    event_type      TEXT NOT NULL,
    actor_id        INTEGER REFERENCES users(id),
    detail          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Recycling batches (classify → process → recover → residual) ──────
CREATE TABLE IF NOT EXISTS recycling_batches (
    id                  SERIAL PRIMARY KEY,
    batch_code          TEXT UNIQUE NOT NULL,
    recycling_hub_id    INTEGER NOT NULL REFERENCES recycling_hubs(id),
    transfer_id         INTEGER REFERENCES transfers(id),
    input_weight_kg     DOUBLE PRECISION NOT NULL,
    processed_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    recovered_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    residual_weight_kg  DOUBLE PRECISION NOT NULL DEFAULT 0,
    recovery_rate_pct   DOUBLE PRECISION,
    status              TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','CLASSIFIED','PROCESSING','COMPLETED')),
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS waste_classifications (
    id              SERIAL PRIMARY KEY,
    batch_id        INTEGER NOT NULL REFERENCES recycling_batches(id),
    category        TEXT NOT NULL CHECK (category IN ('PLASTIC','PAPER','METAL','E_WASTE','BIODEGRADABLE','HAZARDOUS','MIXED')),
    weight_kg       DOUBLE PRECISION NOT NULL,
    market_rate_per_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    recovery_value  DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- ── Alerts (system-generated, real triggers only) ─────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    type            TEXT NOT NULL,      -- HUB_WARNING, HUB_CRITICAL, MISSED_PICKUP, WEIGHT_VARIANCE, VEHICLE_OVERDUE
    severity        TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    message         TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       INTEGER,
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ACKNOWLEDGED','RESOLVED')),
    acknowledged_by INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS eco_points_ledger (
    id              SERIAL PRIMARY KEY,
    resident_id     INTEGER NOT NULL REFERENCES users(id),
    points          INTEGER NOT NULL,
    reason          TEXT NOT NULL,
    ref_type        TEXT,
    ref_id          INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id              SERIAL PRIMARY KEY,
    actor_id        INTEGER REFERENCES users(id),
    action          TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       INTEGER,
    detail          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pickup_status ON pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickup_resident ON pickup_requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_pickup_hub ON pickup_requests(local_hub_id);
CREATE INDEX IF NOT EXISTS idx_collections_hub ON collections(local_hub_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
