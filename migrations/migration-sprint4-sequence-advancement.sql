-- Migration: Sequence advancement logic — DB function + table comments
-- Sprint: sprint-4
-- Date: 2026-03-27
--
-- This migration adds:
--   1. Table comments documenting sequence_enrollments and events schemas
--   2. A DB function get_due_enrollments() used by the daily cron to fetch
--      active enrollments whose current_step_due has arrived.
--
-- Advancement logic overview:
--   - The daily cron calls get_due_enrollments() to find active enrollments due today
--   - For each enrollment, the TypeScript layer determines the action (email/linkedin/call)
--   - If a reply_received event exists for the contact, the reply branch logic fires
--   - Otherwise, the enrollment advances to the next step or completes
--   - Completed A1 enrollments with no reply move to nurture and enroll in A3

-- =============================================================================
-- TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE public.sequence_enrollments IS
  'Tracks each contact''s enrollment in an outreach sequence (A1/A2/A3). '
  'Status: active, paused, completed, exited. '
  'current_step tracks progress; current_step_due is the next action date.';

COMMENT ON TABLE public.events IS
  'Audit log of all CRM events. reply_received events carry a payload with: '
  '{ "sentiment": "positive"|"negative"|"not_now", "channel": "email"|"linkedin", '
  '"reply_snippet": "..." }. Used by advancement logic to branch sequences.';

-- =============================================================================
-- FUNCTION: get_due_enrollments
-- Returns active enrollments whose current_step_due <= p_today.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_due_enrollments(p_today date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  id              bigint,
  contact_id      bigint,
  sequence_id     text,
  current_step    integer,
  current_step_due timestamptz,
  status          text,
  total_steps     integer,
  steps           jsonb,
  first_name      text,
  last_name       text,
  current_stage   text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    se.id,
    se.contact_id,
    se.sequence_id,
    se.current_step,
    se.current_step_due,
    se.status,
    s.total_steps,
    s.steps,
    c.first_name,
    c.last_name,
    c.current_stage
  FROM public.sequence_enrollments se
  JOIN public.sequences s ON s.id = se.sequence_id
  JOIN public.contacts c ON c.id = se.contact_id
  WHERE se.status = 'active'
    AND se.current_step_due <= p_today
  ORDER BY se.current_step_due ASC;
$$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
