-- =============================================================================
-- Sprint 3 RPC Migration — WealthOps AI / Precept Legacy
-- Generated: 2026-03-25
-- Fixes race condition on contacts.total_calls increment (Shield review finding)
-- Author: Forge (Builder Agent)
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_contact_calls(p_contact_id bigint)
RETURNS void
LANGUAGE sql AS $$
  UPDATE contacts
  SET total_calls = COALESCE(total_calls, 0) + 1
  WHERE id = p_contact_id;
$$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
