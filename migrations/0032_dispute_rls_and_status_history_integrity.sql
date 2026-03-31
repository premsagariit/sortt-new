-- ============================================================
-- Migration 0032 — Dispute RLS + Status History Integrity
-- Project: Sortt
-- Depends: 0031_admin_kyc_reviewed_at.sql
-- ============================================================

BEGIN;

-- Ensure changed_by is populated before enforcing NOT NULL.
UPDATE order_status_history osh
SET changed_by = o.seller_id
FROM orders o
WHERE osh.order_id = o.id
  AND osh.changed_by IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM order_status_history
    WHERE changed_by IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on order_status_history.changed_by; NULL rows still exist';
  END IF;
END $$;

ALTER TABLE order_status_history
  ALTER COLUMN changed_by SET NOT NULL;

-- Dispute evidence should be readable by both order parties, not only raiser.
DROP POLICY IF EXISTS dispute_evidence_parties ON dispute_evidence;

CREATE POLICY dispute_evidence_parties ON dispute_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM disputes d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = dispute_evidence.dispute_id
        AND (
          o.seller_id = current_app_user_id()
          OR o.aggregator_id = current_app_user_id()
        )
    )
  );

COMMIT;
