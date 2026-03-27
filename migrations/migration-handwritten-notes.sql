-- Migration: handwritten_notes table
-- Sprint-4 | Task: Handwritten notes table
-- Created: 2026-03-27

CREATE TABLE IF NOT EXISTS handwritten_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id BIGINT NOT NULL REFERENCES contacts(id),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'compliance_review', 'approved', 'sent', 'rejected')),
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'approved', 'flagged', 'rejected')),
  compliance_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  wealthfeed_note_id TEXT,
  note_type TEXT NOT NULL CHECK (note_type IN ('pre_sequence', 'thank_you', 'custom')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_handwritten_notes_contact_id ON handwritten_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_handwritten_notes_status ON handwritten_notes(status);
CREATE INDEX IF NOT EXISTS idx_handwritten_notes_note_type ON handwritten_notes(note_type);

-- Enable RLS
ALTER TABLE handwritten_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (anon: SELECT, INSERT, UPDATE — no DELETE)
CREATE POLICY "anon_select_handwritten_notes"
  ON handwritten_notes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_handwritten_notes"
  ON handwritten_notes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_handwritten_notes"
  ON handwritten_notes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
