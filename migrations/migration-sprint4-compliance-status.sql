-- Sprint 4: Add compliance_status and compliance_flags columns to email_drafts and linkedin_drafts
-- Replaces the boolean compliance_cleared field with a full compliance workflow state machine
-- compliance_status values: pending | approved | flagged | rejected | blocked_threshold
-- 2026-03-27

-- email_drafts: add compliance_status and compliance_flags
ALTER TABLE email_drafts
  ADD COLUMN IF NOT EXISTS compliance_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS compliance_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Add check constraint for valid compliance_status values on email_drafts
ALTER TABLE email_drafts
  ADD CONSTRAINT email_drafts_compliance_status_check
    CHECK (compliance_status IN ('pending', 'approved', 'flagged', 'rejected', 'blocked_threshold'));

-- Index for compliance_status on email_drafts (Counsel agent queries this frequently)
CREATE INDEX IF NOT EXISTS idx_email_drafts_compliance_status ON email_drafts (compliance_status);

-- linkedin_drafts: add compliance_status and compliance_flags
ALTER TABLE linkedin_drafts
  ADD COLUMN IF NOT EXISTS compliance_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS compliance_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Add check constraint for valid compliance_status values on linkedin_drafts
ALTER TABLE linkedin_drafts
  ADD CONSTRAINT linkedin_drafts_compliance_status_check
    CHECK (compliance_status IN ('pending', 'approved', 'flagged', 'rejected', 'blocked_threshold'));

-- Index for compliance_status on linkedin_drafts
CREATE INDEX IF NOT EXISTS idx_linkedin_drafts_compliance_status ON linkedin_drafts (compliance_status);

-- Migrate existing data: map compliance_cleared=true -> approved, false -> pending
UPDATE email_drafts SET compliance_status = 'approved' WHERE compliance_cleared = true;
