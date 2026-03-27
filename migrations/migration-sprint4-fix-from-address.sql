-- Sprint 4: Fix Hunter from_address in email_drafts
-- Issue: Hunter was writing drafts with from_address=marshall@connect.preceptlegacy.com
--        which does not exist. Marshall's real inbox is marshall@preceptlegacy.com.
-- Fix: Update all existing email_drafts to use the correct from_address.

UPDATE email_drafts
SET from_address = 'marshall@preceptlegacy.com'
WHERE from_address = 'marshall@connect.preceptlegacy.com';
