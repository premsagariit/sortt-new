-- ============================================================
-- Migration 0030 - Ratings integrity hardening
-- Ensures one rating per (order_id, rater_id) and blocks self-ratings.
-- ============================================================

-- Clean up historical duplicates before adding uniqueness.
-- Keep the earliest rating per (order_id, rater_id).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, rater_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM ratings
)
DELETE FROM ratings r
USING ranked d
WHERE r.id = d.id
  AND d.rn > 1;

ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS ratings_rater_not_ratee;

ALTER TABLE ratings
  ADD CONSTRAINT ratings_rater_not_ratee
  CHECK (rater_id <> ratee_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ratings_order_rater
  ON ratings (order_id, rater_id);

CREATE INDEX IF NOT EXISTS idx_ratings_ratee_created_at
  ON ratings (ratee_id, created_at DESC);
