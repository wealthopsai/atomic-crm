-- Sprint 4: Add anon RLS policies to contact_notes
-- Allows Hunter (anon role) to SELECT and INSERT contact notes
-- Required for automated research note backfill and ongoing note writes

CREATE POLICY anon_select_contact_notes ON contact_notes
  FOR SELECT TO anon USING (true);

CREATE POLICY anon_insert_contact_notes ON contact_notes
  FOR INSERT TO anon WITH CHECK (true);
