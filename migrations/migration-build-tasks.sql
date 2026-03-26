-- =============================================================================
-- Build Tasks Migration — WealthOps AI / Precept Legacy
-- Generated: 2026-03-26
-- Purpose: Autonomous build backlog table for Forge agent task tracking
-- Author: Forge (Builder Agent)
-- =============================================================================

CREATE TABLE public.build_tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  priority     INTEGER     DEFAULT 0,
  sprint       TEXT,
  status       TEXT        DEFAULT 'backlog',
  assigned_to  TEXT        DEFAULT 'forge',
  pr_number    INTEGER,
  pr_url       TEXT,
  shield_notes TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_build_tasks_status   ON public.build_tasks(status);
CREATE INDEX idx_build_tasks_priority ON public.build_tasks(priority DESC);

ALTER TABLE public.build_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_select_build_tasks ON public.build_tasks
  FOR SELECT TO anon USING (true);

CREATE POLICY anon_insert_build_tasks ON public.build_tasks
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY anon_update_build_tasks ON public.build_tasks
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
