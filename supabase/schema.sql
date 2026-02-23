-- ============================================================================
-- Web Monitor + Summary — Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables.
-- ============================================================================

-- Table: monitored_links
-- Stores the URLs that users want to monitor for changes.
CREATE TABLE IF NOT EXISTS monitored_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT UNIQUE NOT NULL,
  title       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Table: link_checks
-- Stores the result of each content check for a monitored link.
-- On delete of a monitored_link, all associated checks are cascaded.
CREATE TABLE IF NOT EXISTS link_checks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id       UUID NOT NULL REFERENCES monitored_links(id) ON DELETE CASCADE,
  fetched_at    TIMESTAMPTZ DEFAULT now(),
  status        TEXT NOT NULL CHECK (status IN ('success', 'no_change', 'error')),
  raw_content   TEXT,
  content_hash  TEXT,
  diff_summary  JSONB,
  error_message TEXT
);

-- Index for fast lookups of checks by link, ordered by most recent first
CREATE INDEX IF NOT EXISTS idx_link_checks_link_id_fetched
  ON link_checks (link_id, fetched_at DESC);
