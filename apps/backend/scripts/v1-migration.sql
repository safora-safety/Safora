-- ============================================================
-- Safora V1 migration — breadcrumbs, watchdog state, age/terms
-- Idempotent: safe to re-run (IF NOT EXISTS throughout)
-- ============================================================

BEGIN;

-- 1. Live tracking (architecture.md §3, tasks.md #4)
CREATE TABLE IF NOT EXISTS journey_breadcrumbs (
  id BIGSERIAL PRIMARY KEY,
  journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  location GEOGRAPHY(Point,4326) NOT NULL,
  speed REAL,
  battery SMALLINT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_journey
  ON journey_breadcrumbs (journey_id, recorded_at DESC);

-- 2. Watchdog state (architecture.md §4/§6, tasks.md #7)
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS last_location GEOGRAPHY(Point,4326),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deviated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- Partial index: the watchdog and the admin radar both filter on status='active' constantly
CREATE INDEX IF NOT EXISTS idx_journeys_active
  ON journeys (status) WHERE status = 'active';

-- 3. Age notice + terms (tasks.md #10, #11) — no parental-consent workflow in V1
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS age SMALLINT,
  ADD COLUMN IF NOT EXISTS age_notice_ack BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- 4. Optional: per-report name visibility (only if you implement the toggle — see database.md §3)
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS show_reporter_name BOOLEAN NOT NULL DEFAULT true;

-- 5. Confirm PostGIS spatial index exists on reports (should already exist — verify, don't assume)
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING GIST (location);

-- 6. SOS alerts: add source column for watchdog-triggered alerts
ALTER TABLE sos_alerts
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

COMMIT;


-- ============================================================
-- Rollback (for local dev only — think twice before running
-- against any database with real data)
-- ============================================================
-- BEGIN;
-- ALTER TABLE sos_alerts DROP COLUMN IF EXISTS source;
-- ALTER TABLE reports DROP COLUMN IF EXISTS show_reporter_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS terms_accepted_at, DROP COLUMN IF EXISTS age_notice_ack, DROP COLUMN IF EXISTS age;
-- DROP INDEX IF EXISTS idx_journeys_active;
-- ALTER TABLE journeys DROP COLUMN IF EXISTS escalated_at, DROP COLUMN IF EXISTS deviated_at, DROP COLUMN IF EXISTS last_seen_at, DROP COLUMN IF EXISTS last_location;
-- DROP TABLE IF EXISTS journey_breadcrumbs;
-- COMMIT;
