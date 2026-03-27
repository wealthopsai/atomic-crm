-- Migration: Auto-enroll contacts into sequences on first draft
-- Sprint: sprint-4
-- Task: 86bc8af6-38d2-4e41-a139-2290e31004d7
-- Date: 2026-03-27
--
-- When Hunter inserts a first-touch email draft (sequence_id='A1', sequence_step=1),
-- this trigger atomically:
--   1. Enrolls the contact in sequence A1 (sequence_enrollments)
--   2. Updates the contact current_stage to 'first_touch_active'
--   3. Writes a sequence_enrolled event to the events table

-- =============================================================================
-- FUNCTION: handle_first_touch_draft_insert
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_first_touch_draft_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence_name text;
BEGIN
  -- Only trigger for A1 step 1 (first-touch drafts)
  IF NEW.sequence_id IS DISTINCT FROM 'A1' OR NEW.sequence_step IS DISTINCT FROM 1 THEN
    RETURN NEW;
  END IF;

  -- Look up sequence name for the event payload
  SELECT name INTO v_sequence_name
  FROM public.sequences
  WHERE id = 'A1';

  -- 1. Enroll in sequence A1. ON CONFLICT: skip if already enrolled (idempotent).
  INSERT INTO public.sequence_enrollments (
    contact_id,
    sequence_id,
    current_step,
    status,
    enrolled_at,
    current_step_due
  ) VALUES (
    NEW.contact_id,
    'A1',
    1,
    'active',
    NOW(),
    NOW() + INTERVAL '3 days'   -- step 2 is day 3
  )
  ON CONFLICT (contact_id, sequence_id) DO NOTHING;

  -- 2. Update contact stage to first_touch_active (only if currently 'researched')
  UPDATE public.contacts
  SET current_stage = 'first_touch_active'
  WHERE id = NEW.contact_id
    AND current_stage = 'researched';

  -- 3. Write sequence_enrolled event
  INSERT INTO public.events (
    event_type,
    contact_id,
    actor,
    channel,
    sequence_id,
    sequence_step,
    payload,
    created_at
  ) VALUES (
    'sequence_enrolled',
    NEW.contact_id,
    'hunter',
    'email',
    'A1',
    1,
    jsonb_build_object(
      'sequence_name', COALESCE(v_sequence_name, 'First Touch'),
      'step', 1,
      'triggered_by', 'first_touch_draft_insert',
      'draft_id', NEW.id
    ),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGER: trg_auto_enroll_on_first_draft
-- Fires AFTER INSERT on email_drafts, once per row
-- =============================================================================
DROP TRIGGER IF EXISTS trg_auto_enroll_on_first_draft ON public.email_drafts;

CREATE TRIGGER trg_auto_enroll_on_first_draft
  AFTER INSERT ON public.email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_touch_draft_insert();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
