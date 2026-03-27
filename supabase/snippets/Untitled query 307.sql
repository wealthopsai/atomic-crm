-- WealthOps AI: Add SDR-specific columns to Atomic CRM contacts table
-- Run this ONCE against the wealthops-prospects Supabase project
-- Source: WealthOps CRM Build Plan, Section 4.1

-- WealthFeed source tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS wealthfeed_id TEXT UNIQUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'wealthfeed';

-- Money-in-motion trigger event
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trigger_event TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trigger_event_date TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trigger_event_source TEXT DEFAULT 'wealthfeed';

-- Financial profile
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS estimated_aum TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS aum_source TEXT DEFAULT 'wealthfeed';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS income_level TEXT;

-- Demographics
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- SDR pipeline fields
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS icp_fit_score INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'new';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assigned_sequence TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sequence_step INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_touches INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_calls INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_touch_date TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_touch_type TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS call_priority TEXT DEFAULT 'normal';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT FALSE;

-- Rich data (JSONB blobs for Hunter to read)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS research_brief JSONB;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS personalization_hooks JSONB;

-- Indexes for SDR queries
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(current_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_trigger_event ON contacts(trigger_event);
CREATE INDEX IF NOT EXISTS idx_contacts_wealthfeed_id ON contacts(wealthfeed_id);
CREATE INDEX IF NOT EXISTS idx_contacts_next_action_date ON contacts(next_action_date);