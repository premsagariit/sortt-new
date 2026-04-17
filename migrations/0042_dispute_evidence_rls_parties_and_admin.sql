-- ============================================================
-- Migration 0042 - Dispute evidence visibility for both parties
-- Allows seller, aggregator, and admin users to view dispute evidence.
-- ============================================================

BEGIN;

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
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = current_app_user_id()
        AND u.user_type = 'admin'
    )
  );

COMMIT;
