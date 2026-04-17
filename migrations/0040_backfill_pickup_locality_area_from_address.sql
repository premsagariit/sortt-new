-- ============================================================
-- Migration 0040 — Backfill pickup_locality with area/colony names
-- Purpose: Correct historical rows where pickup_locality was city/landmark
-- Notes:
-- 1) Uses pickup_address/street component parsing to extract area-like segment.
-- 2) Keeps matching behavior intact (orders are still matched using pickup_address
--    and pickup_locality in existing feed logic).
-- 3) Idempotent: only updates rows when the extracted locality differs.
-- ============================================================

BEGIN;

WITH city_aliases AS (
  SELECT
    c.code,
    ARRAY_REMOVE(ARRAY[
      LOWER(TRIM(c.name)),
      CASE WHEN c.code = 'HYD' THEN 'secunderabad' ELSE NULL END
    ], NULL) AS city_tokens
  FROM cities c
),
order_candidates AS (
  SELECT
    o.id,
    (
      SELECT TRIM(part)
      FROM UNNEST(STRING_TO_ARRAY(COALESCE(o.pickup_address, ''), ',')) WITH ORDINALITY AS p(part, ord)
      WHERE TRIM(part) <> ''
        AND TRIM(part) !~ '^[0-9\s-]+$'
        AND LOWER(TRIM(part)) NOT IN ('india', 'telangana', 'andhra pradesh')
        AND LOWER(TRIM(part)) <> ALL(COALESCE(ca.city_tokens, ARRAY[]::text[]))
        AND LOWER(TRIM(part)) !~ '^(plot|survey|flat|house|h no|hno|door|sector|phase|road|rd|street|st)\b'
        AND ord < COALESCE((
          SELECT MIN(p2.ord)
          FROM UNNEST(STRING_TO_ARRAY(COALESCE(o.pickup_address, ''), ',')) WITH ORDINALITY AS p2(part, ord)
          WHERE LOWER(TRIM(p2.part)) = ANY(COALESCE(ca.city_tokens, ARRAY[]::text[]))
        ), 2147483647)
      ORDER BY ord DESC
      LIMIT 1
    ) AS extracted_locality
  FROM orders o
  LEFT JOIN city_aliases ca ON ca.code = o.city_code
  WHERE o.deleted_at IS NULL
),
updated_orders AS (
  UPDATE orders o
  SET
    pickup_locality = oc.extracted_locality,
    updated_at = NOW()
  FROM order_candidates oc
  WHERE o.id = oc.id
    AND oc.extracted_locality IS NOT NULL
    AND COALESCE(NULLIF(TRIM(o.pickup_locality), ''), '') IS DISTINCT FROM oc.extracted_locality
  RETURNING o.id
),
address_candidates AS (
  SELECT
    sa.id,
    (
      SELECT TRIM(part)
      FROM UNNEST(STRING_TO_ARRAY(COALESCE(sa.street, ''), ',')) WITH ORDINALITY AS p(part, ord)
      WHERE TRIM(part) <> ''
        AND TRIM(part) !~ '^[0-9\s-]+$'
        AND LOWER(TRIM(part)) NOT IN ('india', 'telangana', 'andhra pradesh')
        AND LOWER(TRIM(part)) <> ALL(COALESCE(ca.city_tokens, ARRAY[]::text[]))
        AND LOWER(TRIM(part)) !~ '^(plot|survey|flat|house|h no|hno|door|sector|phase|road|rd|street|st)\b'
        AND ord < COALESCE((
          SELECT MIN(p2.ord)
          FROM UNNEST(STRING_TO_ARRAY(COALESCE(sa.street, ''), ',')) WITH ORDINALITY AS p2(part, ord)
          WHERE LOWER(TRIM(p2.part)) = ANY(COALESCE(ca.city_tokens, ARRAY[]::text[]))
        ), 2147483647)
      ORDER BY ord DESC
      LIMIT 1
    ) AS extracted_locality
  FROM seller_addresses sa
  LEFT JOIN city_aliases ca ON ca.code = sa.city_code
),
updated_addresses AS (
  UPDATE seller_addresses sa
  SET
    pickup_locality = ac.extracted_locality,
    updated_at = NOW()
  FROM address_candidates ac
  WHERE sa.id = ac.id
    AND ac.extracted_locality IS NOT NULL
    AND COALESCE(NULLIF(TRIM(sa.pickup_locality), ''), '') IS DISTINCT FROM ac.extracted_locality
  RETURNING sa.id
)
SELECT
  (SELECT COUNT(*) FROM updated_orders) AS updated_order_rows,
  (SELECT COUNT(*) FROM updated_addresses) AS updated_seller_address_rows;

COMMIT;
