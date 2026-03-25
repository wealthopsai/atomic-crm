-- =============================================================================
-- Sprint 0 Fixes Migration — WealthOps AI / Precept Legacy
-- Generated: 2026-03-25
-- Addresses: Shield code review findings
-- Author: Forge (Builder Agent)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Missing UPDATE policies (5 tables)
-- -----------------------------------------------------------------------------

CREATE POLICY "anon_update_linkedin_drafts" ON public.linkedin_drafts
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_update_call_briefs" ON public.call_briefs
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_update_events" ON public.events
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_update_retail_comm_tracker" ON public.retail_comm_tracker
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_update_sequences" ON public.sequences
    FOR UPDATE TO anon USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 2. DROP pre-existing Contact Delete Policy — security risk
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Contact Delete Policy" ON public.contacts;


-- -----------------------------------------------------------------------------
-- 3. Index on institutional_firms.firm_type
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_institutional_firms_firm_type
    ON public.institutional_firms(firm_type);


-- -----------------------------------------------------------------------------
-- 4. Composite index on retail_comm_tracker(period_start, period_end)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_retail_comm_tracker_period
    ON public.retail_comm_tracker(period_start, period_end);


-- -----------------------------------------------------------------------------
-- 5. UNIQUE constraint on sequence_enrollments(contact_id, sequence_id)
-- -----------------------------------------------------------------------------

ALTER TABLE public.sequence_enrollments
    ADD CONSTRAINT uq_sequence_enrollments_contact_sequence
    UNIQUE (contact_id, sequence_id);


-- -----------------------------------------------------------------------------
-- 6. NOT NULL constraints on contact_id columns
-- -----------------------------------------------------------------------------

ALTER TABLE public.email_drafts
    ALTER COLUMN contact_id SET NOT NULL;

ALTER TABLE public.sequence_enrollments
    ALTER COLUMN contact_id SET NOT NULL;


-- =============================================================================
-- END OF FIXES MIGRATION
-- =============================================================================
