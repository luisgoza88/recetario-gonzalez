BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
-- Invitation RPCs use auth.uid(), not the retired public.users identifier.
-- Preflight verified production contains no invitation rows with legacy inviters.
ALTER TABLE household_invitations DROP CONSTRAINT IF EXISTS household_invitations_invited_by_fkey;
ALTER TABLE household_invitations ADD CONSTRAINT household_invitations_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
COMMIT;
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE household_invitations VALIDATE CONSTRAINT household_invitations_invited_by_fkey;
COMMIT;
