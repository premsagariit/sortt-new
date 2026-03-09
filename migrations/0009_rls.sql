-- ============================================================
-- Migration 0009 — Row Level Security (RLS)
-- Project: Sortt / [APP_NAME]
-- Applies policies to all tables complying with security rules.
-- Depends: 0001-0008
-- ============================================================

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE POLICY users_read_own ON users
  FOR SELECT USING (current_app_user_id() = id);

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (current_app_user_id() = id);

-- ------------------------------------------------------------
-- SELLER_PROFILES
-- ------------------------------------------------------------
CREATE POLICY seller_own_profile ON seller_profiles
  FOR ALL USING (current_app_user_id() = user_id);

-- ------------------------------------------------------------
-- AGGREGATOR_PROFILES
-- ------------------------------------------------------------
CREATE POLICY aggregator_own_profile_select ON aggregator_profiles
  FOR SELECT USING (current_app_user_id() = user_id);

CREATE POLICY aggregator_own_profile_update ON aggregator_profiles
  FOR UPDATE USING (current_app_user_id() = user_id);

-- ------------------------------------------------------------
-- AGGREGATOR_MATERIAL_RATES
-- ------------------------------------------------------------
CREATE POLICY aggregator_rates_own ON aggregator_material_rates
  FOR ALL USING (current_app_user_id() = aggregator_id);

-- ------------------------------------------------------------
-- BUSINESS_MEMBERS
-- R1: Role-based RLS
-- admin uses business_seller_id, members check member_user_id
-- ------------------------------------------------------------
CREATE POLICY business_members_admin ON business_members
  FOR ALL USING (current_app_user_id() = business_seller_id);

CREATE POLICY business_members_self ON business_members
  FOR SELECT USING (current_app_user_id() = member_user_id);

-- ------------------------------------------------------------
-- ORDERS
-- R2: Separate INSERT and SELECT policies
-- V25: Address revelation handled broadly here + in views
-- ------------------------------------------------------------
CREATE POLICY seller_own_orders_read ON orders
  FOR SELECT USING (current_app_user_id() = seller_id);

CREATE POLICY seller_own_orders_update ON orders
  FOR UPDATE USING (current_app_user_id() = seller_id);

CREATE POLICY seller_own_orders_delete ON orders
  FOR DELETE USING (current_app_user_id() = seller_id);

CREATE POLICY seller_own_orders_insert ON orders
  FOR INSERT WITH CHECK (current_app_user_id() = seller_id);

-- Aggregators can see orders in their city that are 'created'
CREATE POLICY aggregator_city_orders ON orders
  FOR SELECT USING (
    status = 'created'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM aggregator_profiles ap
      WHERE ap.user_id = current_app_user_id()
      AND ap.city_code = orders.city_code
    )
  );

-- Aggregators can read/update orders they have accepted
CREATE POLICY aggregator_accepted_orders_read ON orders
  FOR SELECT USING (current_app_user_id() = aggregator_id);

CREATE POLICY aggregator_accepted_orders_update ON orders
  FOR UPDATE USING (current_app_user_id() = aggregator_id);

-- ------------------------------------------------------------
-- ORDER_ITEMS
-- ------------------------------------------------------------
CREATE POLICY order_items_seller ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND o.seller_id = current_app_user_id()
    )
  );

CREATE POLICY order_items_aggregator ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND o.aggregator_id = current_app_user_id()
    )
  );

-- ------------------------------------------------------------
-- ORDER_STATUS_HISTORY
-- ------------------------------------------------------------
CREATE POLICY status_history_parties ON order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_status_history.order_id
      AND (o.seller_id = current_app_user_id()
           OR o.aggregator_id = current_app_user_id())
    )
  );

-- ------------------------------------------------------------
-- ORDER_MEDIA
-- ------------------------------------------------------------
CREATE POLICY order_media_parties ON order_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_media.order_id
      AND (o.seller_id = current_app_user_id()
           OR o.aggregator_id = current_app_user_id())
    )
  );

CREATE POLICY order_media_insert ON order_media
  FOR INSERT WITH CHECK (current_app_user_id() = uploaded_by);

-- ------------------------------------------------------------
-- MESSAGES
-- ------------------------------------------------------------
-- Enable RLS on the partition tables (required by pg_tables check)
ALTER TABLE messages_2026_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_2026_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_2026_05 ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_order_participants ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = messages.order_id
      AND (o.seller_id = current_app_user_id()
           OR o.aggregator_id = current_app_user_id())
    )
  );

CREATE POLICY messages_insert ON messages
  FOR INSERT WITH CHECK (
    current_app_user_id() = sender_id
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = messages.order_id
      AND (o.seller_id = current_app_user_id()
           OR o.aggregator_id = current_app_user_id())
    )
  );

-- ------------------------------------------------------------
-- AGGREGATOR_AVAILABILITY
-- C2: Aggregator heartbeat restrictions
-- ------------------------------------------------------------
CREATE POLICY aggregator_availability_own ON aggregator_availability
  FOR ALL USING (current_app_user_id() = user_id);

-- ------------------------------------------------------------
-- DEVICE_TOKENS
-- ------------------------------------------------------------
CREATE POLICY device_tokens_own ON device_tokens
  FOR ALL USING (current_app_user_id() = user_id);

-- ------------------------------------------------------------
-- RATINGS
-- ------------------------------------------------------------
CREATE POLICY ratings_parties ON ratings
  FOR SELECT USING (
    current_app_user_id() = rated_by
    OR current_app_user_id() = rated_user
  );

CREATE POLICY ratings_insert ON ratings
  FOR INSERT WITH CHECK (current_app_user_id() = rated_by);

-- ------------------------------------------------------------
-- INVOICES
-- ------------------------------------------------------------
CREATE POLICY invoices_parties ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = invoices.order_id
      AND (o.seller_id = current_app_user_id()
           OR o.aggregator_id = current_app_user_id())
    )
  );

-- ------------------------------------------------------------
-- DISPUTES
-- ------------------------------------------------------------
CREATE POLICY disputes_parties ON disputes
  FOR SELECT USING (
    current_app_user_id() = raised_by
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = disputes.order_id
      AND (o.seller_id = current_app_user_id()
           OR o.aggregator_id = current_app_user_id())
    )
  );

CREATE POLICY disputes_insert ON disputes
  FOR INSERT WITH CHECK (current_app_user_id() = raised_by);

-- ------------------------------------------------------------
-- DISPUTE_EVIDENCE
-- ------------------------------------------------------------
CREATE POLICY dispute_evidence_parties ON dispute_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_evidence.dispute_id
      AND d.raised_by = current_app_user_id()
    )
  );

CREATE POLICY dispute_evidence_insert ON dispute_evidence
  FOR INSERT WITH CHECK (current_app_user_id() = submitted_by);

-- ------------------------------------------------------------
-- PRICE_INDEX
-- ------------------------------------------------------------
CREATE POLICY price_index_read ON price_index
  FOR SELECT USING (current_app_user_id() IS NOT NULL);

-- ------------------------------------------------------------
-- CITIES + MATERIAL_TYPES
-- Public read access
-- ------------------------------------------------------------
CREATE POLICY cities_read ON cities
  FOR SELECT USING (true);

CREATE POLICY material_types_read ON material_types
  FOR SELECT USING (true);

-- End of generic RLS rules.
-- seller_flags, admin_audit_log & otp_log do not have RLS user policies mapped.
