BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
-- The existing update_ai_audit_log_updated_at trigger requires this column.
ALTER TABLE ai_audit_log ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
COMMIT;
