-- CoFound database schema
-- Run this in the Supabase SQL editor for your project.
-- All tables are unprotected by RLS — access is enforced server-side
-- by filtering on user_id (SHA-256 hash of the bearer token).

-- ── Companies (startup brain per user) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,
  startup_name     TEXT NOT NULL DEFAULT '',
  one_liner        TEXT NOT NULL DEFAULT '',
  problem          TEXT NOT NULL DEFAULT '',
  solution         TEXT NOT NULL DEFAULT '',
  target_audience  TEXT NOT NULL DEFAULT '',
  icp              TEXT NOT NULL DEFAULT '',
  market_size      TEXT NOT NULL DEFAULT '',
  funding_stage    TEXT NOT NULL DEFAULT 'idea',
  current_mrr      TEXT NOT NULL DEFAULT '',
  user_count       TEXT NOT NULL DEFAULT '',
  top_metric       TEXT NOT NULL DEFAULT '',
  gtm_goal         TEXT NOT NULL DEFAULT '',
  biggest_challenge TEXT NOT NULL DEFAULT '',
  next_milestone   TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS companies_user_id_idx ON companies(user_id);

-- ── Rounds (each question asked to the council) ───────────────────────────────

CREATE TABLE IF NOT EXISTS rounds (
  id                 UUID PRIMARY KEY,
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL,
  question           TEXT NOT NULL,
  directed_to        TEXT,
  wave1_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  debate_triggered   BOOLEAN NOT NULL DEFAULT FALSE,
  debate_complete    BOOLEAN NOT NULL DEFAULT FALSE,
  synthesis_text     TEXT,
  synthesis_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rounds_company_id_idx ON rounds(company_id);
CREATE INDEX IF NOT EXISTS rounds_user_id_idx    ON rounds(user_id);

-- ── Responses (each agent answer per round, per wave) ─────────────────────────

CREATE TABLE IF NOT EXISTS responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL,
  wave        INTEGER NOT NULL DEFAULT 1,
  content     TEXT NOT NULL DEFAULT '',
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS responses_round_id_idx ON responses(round_id);
