/**
 * backend/scripts/migrate_to_text_ids.js  (v3 — multi-phase)
 *
 * Phase 1 (tx1): Truncate + Drop RLS policies + Drop FKs + Drop views
 * Phase 2 (each in own tx): ALTER column types individually 
 * Phase 3 (tx3): Recreate FKs, views, RLS policies
 *
 * Multi-phase approach avoids PostgreSQL catalog-lock conflicts when
 * ALTERing columns that had views/rules dropped in the same transaction.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

if (!process.argv.includes('--confirm')) {
  console.error('\n⚠️  This truncates ALL data and migrates the schema.\nRun with --confirm to proceed.\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TRUNCATE_TABLES = [
  'admin_audit_log','aggregator_availability','aggregator_material_rates',
  'aggregator_order_dismissals','aggregator_profiles','business_members',
  'device_tokens','dispute_evidence','disputes','invoices','notifications',
  'order_items','order_media','order_status_history','orders','otp_log',
  'ratings','seller_addresses','seller_flags','seller_profiles',
  'user_order_counters','users',
];

const USER_FK_COLS = [
  ['admin_audit_log','actor_id'],['admin_audit_log','target_id'],
  ['aggregator_availability','user_id'],
  ['aggregator_material_rates','aggregator_id'],
  ['aggregator_order_dismissals','aggregator_id'],
  ['aggregator_profiles','user_id'],
  ['business_members','member_user_id'],['business_members','business_seller_id'],
  ['business_members','invited_by'],
  ['device_tokens','user_id'],
  ['dispute_evidence','submitted_by'],
  ['disputes','raised_by'],
  ['messages','sender_id'],
  ['notifications','user_id'],
  ['order_media','uploaded_by'],
  ['orders','seller_id'],['orders','aggregator_id'],
  ['ratings','ratee_id'],['ratings','rater_id'],
  ['seller_addresses','seller_id'],
  ['seller_flags','seller_id'],
  ['seller_profiles','user_id'],
  ['user_order_counters','user_id'],
];

const ORDER_FK_COLS = [
  ['aggregator_order_dismissals','order_id'],
  ['disputes','order_id'],
  ['invoices','order_id'],
  ['messages','order_id'],
  ['order_items','order_id'],
  ['order_media','order_id'],
  ['order_status_history','order_id'],
  ['otp_log','order_id'],
  ['ratings','order_id'],
];

const NEW_FKS = [
  `ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_actor_id_fkey
     FOREIGN KEY (actor_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL`,
  `ALTER TABLE aggregator_availability ADD CONSTRAINT aggregator_availability_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE aggregator_material_rates ADD CONSTRAINT aggregator_material_rates_aggregator_id_fkey
     FOREIGN KEY (aggregator_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE aggregator_order_dismissals ADD CONSTRAINT aggregator_order_dismissals_aggregator_id_fkey
     FOREIGN KEY (aggregator_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE aggregator_order_dismissals ADD CONSTRAINT aggregator_order_dismissals_order_id_fkey
     FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE aggregator_profiles ADD CONSTRAINT aggregator_profiles_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE business_members ADD CONSTRAINT business_members_member_user_id_fkey
     FOREIGN KEY (member_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE business_members ADD CONSTRAINT business_members_business_seller_id_fkey
     FOREIGN KEY (business_seller_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE business_members ADD CONSTRAINT business_members_invited_by_fkey
     FOREIGN KEY (invited_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL`,
  `ALTER TABLE device_tokens ADD CONSTRAINT device_tokens_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE dispute_evidence ADD CONSTRAINT dispute_evidence_submitted_by_fkey
     FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL`,
  `ALTER TABLE disputes ADD CONSTRAINT disputes_raised_by_fkey
     FOREIGN KEY (raised_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL`,
  `ALTER TABLE disputes ADD CONSTRAINT disputes_order_id_fkey
     FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE invoices ADD CONSTRAINT invoices_order_id_fkey
     FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
     FOREIGN KEY (sender_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL`,
  `ALTER TABLE messages ADD CONSTRAINT messages_order_id_fkey
     FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
     FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE order_media ADD CONSTRAINT order_media_uploaded_by_fkey
     FOREIGN KEY (uploaded_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL`,
  `ALTER TABLE order_media ADD CONSTRAINT order_media_order_id_fkey
     FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE order_status_history ADD CONSTRAINT order_status_history_order_id_fkey
     FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE orders ADD CONSTRAINT orders_seller_id_fkey
     FOREIGN KEY (seller_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT`,
  `ALTER TABLE orders ADD CONSTRAINT orders_aggregator_id_fkey
     FOREIGN KEY (aggregator_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL`,
  `ALTER TABLE ratings ADD CONSTRAINT ratings_ratee_id_fkey
     FOREIGN KEY (ratee_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE ratings ADD CONSTRAINT ratings_rater_id_fkey
     FOREIGN KEY (rater_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE ratings ADD CONSTRAINT ratings_order_id_fkey
     FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE seller_addresses ADD CONSTRAINT seller_addresses_seller_id_fkey
     FOREIGN KEY (seller_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE seller_flags ADD CONSTRAINT seller_flags_seller_id_fkey
     FOREIGN KEY (seller_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE seller_profiles ADD CONSTRAINT seller_profiles_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
  `ALTER TABLE user_order_counters ADD CONSTRAINT user_order_counters_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
];

const POLICIES = [
  `CREATE POLICY users_read_own ON users FOR SELECT USING (current_app_user_id() = id)`,
  `CREATE POLICY users_update_own ON users FOR UPDATE USING (current_app_user_id() = id)`,
  `CREATE POLICY seller_own_orders_insert ON orders FOR INSERT WITH CHECK (current_app_user_id() = seller_id)`,
  `CREATE POLICY seller_own_orders_read ON orders FOR SELECT USING (current_app_user_id() = seller_id)`,
  `CREATE POLICY seller_own_orders_update ON orders FOR UPDATE USING (current_app_user_id() = seller_id)`,
  `CREATE POLICY seller_own_orders_delete ON orders FOR DELETE USING (current_app_user_id() = seller_id)`,
  `CREATE POLICY aggregator_accepted_orders_read ON orders FOR SELECT USING (current_app_user_id() = aggregator_id)`,
  `CREATE POLICY aggregator_accepted_orders_update ON orders FOR UPDATE USING (current_app_user_id() = aggregator_id)`,
  `CREATE POLICY aggregator_city_orders ON orders FOR SELECT USING (
    status = 'created' AND deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM aggregator_profiles ap
      WHERE ap.user_id = current_app_user_id() AND ap.city_code = orders.city_code))`,
  `CREATE POLICY order_items_seller ON order_items FOR ALL USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.seller_id = current_app_user_id()))`,
  `CREATE POLICY order_items_aggregator ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.aggregator_id = current_app_user_id()))`,
  `CREATE POLICY order_media_parties ON order_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_media.order_id
      AND (o.seller_id = current_app_user_id() OR o.aggregator_id = current_app_user_id())))`,
  `CREATE POLICY order_media_insert ON order_media FOR INSERT WITH CHECK (current_app_user_id() = uploaded_by)`,
  `CREATE POLICY status_history_parties ON order_status_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_status_history.order_id
      AND (o.seller_id = current_app_user_id() OR o.aggregator_id = current_app_user_id())))`,
  `CREATE POLICY messages_order_participants ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = messages.order_id
      AND (o.seller_id = current_app_user_id() OR o.aggregator_id = current_app_user_id())))`,
  `CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (
    current_app_user_id() = sender_id AND EXISTS (
      SELECT 1 FROM orders o WHERE o.id = messages.order_id
        AND (o.seller_id = current_app_user_id() OR o.aggregator_id = current_app_user_id())))`,
  `CREATE POLICY notifications_self_read ON notifications FOR SELECT USING (current_app_user_id() = user_id)`,
  `CREATE POLICY notifications_self_update ON notifications FOR UPDATE USING (current_app_user_id() = user_id)`,
  `CREATE POLICY aggregator_own_profile_select ON aggregator_profiles FOR SELECT USING (current_app_user_id() = user_id)`,
  `CREATE POLICY aggregator_own_profile_update ON aggregator_profiles FOR UPDATE USING (current_app_user_id() = user_id)`,
  `CREATE POLICY aggregator_availability_own ON aggregator_availability FOR ALL USING (current_app_user_id() = user_id)`,
  `CREATE POLICY aggregator_rates_own ON aggregator_material_rates FOR ALL USING (current_app_user_id() = aggregator_id)`,
  `CREATE POLICY seller_own_profile ON seller_profiles FOR ALL USING (current_app_user_id() = user_id)`,
  `CREATE POLICY seller_addresses_self ON seller_addresses FOR ALL USING (current_app_user_id() = seller_id) WITH CHECK (current_app_user_id() = seller_id)`,
  `CREATE POLICY device_tokens_own ON device_tokens FOR ALL USING (current_app_user_id() = user_id)`,
  `CREATE POLICY disputes_insert ON disputes FOR INSERT WITH CHECK (current_app_user_id() = raised_by)`,
  `CREATE POLICY disputes_parties ON disputes FOR SELECT USING (
    current_app_user_id() = raised_by OR EXISTS (
      SELECT 1 FROM orders o WHERE o.id = disputes.order_id
        AND (o.seller_id = current_app_user_id() OR o.aggregator_id = current_app_user_id())))`,
  `CREATE POLICY dispute_evidence_insert ON dispute_evidence FOR INSERT WITH CHECK (current_app_user_id() = submitted_by)`,
  `CREATE POLICY dispute_evidence_parties ON dispute_evidence FOR SELECT USING (
    EXISTS (SELECT 1 FROM disputes d JOIN orders o ON o.id = d.order_id
      WHERE d.id = dispute_evidence.dispute_id
        AND (o.seller_id = current_app_user_id() OR o.aggregator_id = current_app_user_id())))`,
  `CREATE POLICY invoices_parties ON invoices FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = invoices.order_id
      AND (o.seller_id = current_app_user_id() OR o.aggregator_id = current_app_user_id())))`,
  `CREATE POLICY ratings_insert ON ratings FOR INSERT WITH CHECK (current_app_user_id() = rater_id)`,
  `CREATE POLICY ratings_parties ON ratings FOR SELECT USING (
    current_app_user_id() = rater_id OR current_app_user_id() = ratee_id)`,
  `CREATE POLICY business_members_admin ON business_members FOR ALL USING (current_app_user_id() = business_seller_id)`,
  `CREATE POLICY business_members_self ON business_members FOR SELECT USING (current_app_user_id() = member_user_id)`,
  `CREATE POLICY price_index_read ON price_index FOR SELECT USING (current_app_user_id() IS NOT NULL)`,
  `CREATE POLICY cities_read ON cities FOR SELECT USING (true)`,
  `CREATE POLICY material_types_read ON material_types FOR SELECT USING (true)`,
];

async function exec(client, sql, label) {
  try {
    await client.query(sql);
  } catch(e) {
    if (label) console.warn(`  ⚠️  ${label}: ${e.message}`);
    else throw e;
  }
}

async function run() {
  console.log('🚀  Migration starting...\n');

  // ─────────────────────────────────────────────────────────────────
  // PHASE 1: Clean up (its own transaction so catalog locks are freed)
  // ─────────────────────────────────────────────────────────────────
  {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      console.log('🗑️   [Phase 1] Truncating tables...');
      await c.query(`TRUNCATE TABLE ${TRUNCATE_TABLES.join(',')} CASCADE`);

      console.log('🔒  [Phase 1] Dropping RLS policies...');
      const ps = await c.query(`SELECT tablename,policyname FROM pg_policies WHERE schemaname='public'`);
      for (const r of ps.rows)
        await exec(c, `DROP POLICY IF EXISTS "${r.policyname}" ON "${r.tablename}"`, `drop policy ${r.policyname}`);
      console.log(`     Dropped ${ps.rows.length} policies.`);

      console.log('🔗  [Phase 1] Dropping FK constraints...');
      const fks = await c.query(`
        SELECT c.conname, c.conrelid::regclass::text AS tbl
        FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid
        WHERE c.contype='f'
          AND c.connamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
          AND c.coninhcount=0 AND cl.relispartition=false`);
      for (const r of fks.rows)
        await exec(c, `ALTER TABLE ${r.tbl} DROP CONSTRAINT IF EXISTS "${r.conname}"`, `drop fk ${r.conname}`);
      console.log(`     Dropped ${fks.rows.length} FK constraints.`);

      console.log('👁️   [Phase 1] Dropping views and materialized views...');
      await exec(c, `DROP MATERIALIZED VIEW IF EXISTS aggregator_rating_stats CASCADE`, 'drop mat view aggregator_rating_stats');
      await exec(c, `DROP MATERIALIZED VIEW IF EXISTS current_price_index CASCADE`, 'drop mat view current_price_index');
      await exec(c, `DROP VIEW IF EXISTS users_public CASCADE`, 'drop users_public');

      // Also drop and recreate current_app_user_id() NOW (in Phase 1)
      // so Phase 2 column alters don't hit function-return-type mismatches
      await exec(c, `DROP FUNCTION IF EXISTS current_app_user_id() CASCADE`, 'drop fn');
      await c.query(`
        CREATE OR REPLACE FUNCTION current_app_user_id()
        RETURNS TEXT LANGUAGE sql STABLE AS $$
          SELECT current_setting('app.user_id', true)::text
        $$`);
      console.log('     current_app_user_id() updated to return TEXT.');

      await c.query('COMMIT');
      console.log('✅  Phase 1 complete.\n');
    } catch(e) {
      await c.query('ROLLBACK');
      throw e;
    } finally { c.release(); }
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 2: Alter column types (separate connections per statement)
  // ─────────────────────────────────────────────────────────────────
  console.log('🔧  [Phase 2] Altering column types...');

  const alterStmts = [
    // PKs first
    `ALTER TABLE users  ALTER COLUMN id TYPE TEXT USING id::text`,
    `ALTER TABLE users  ALTER COLUMN id DROP DEFAULT`,
    `ALTER TABLE orders ALTER COLUMN id TYPE TEXT USING id::text`,
    `ALTER TABLE orders ALTER COLUMN id DROP DEFAULT`,
    // User FK cols
    ...USER_FK_COLS.map(([t,c])=>`ALTER TABLE "${t}" ALTER COLUMN "${c}" TYPE TEXT USING "${c}"::text`),
    // Order FK cols
    ...ORDER_FK_COLS.map(([t,c])=>`ALTER TABLE "${t}" ALTER COLUMN "${c}" TYPE TEXT USING "${c}"::text`),
  ];

  for (const sql of alterStmts) {
    const c = await pool.connect();
    try {
      await c.query(sql);
    } catch(e) {
      c.release();
      console.error(`❌  ALTER failed: ${sql}\n   ${e.message}`);
      process.exit(1);
    }
    c.release();
  }
  console.log(`✅  ${alterStmts.length} columns altered.\n`);

  // ─────────────────────────────────────────────────────────────────
  // PHASE 3: Update function + Recreate FKs + Views + RLS
  // ─────────────────────────────────────────────────────────────────
  {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');

      // function already updated in Phase 1

      console.log('🔗  [Phase 3] Adding FK constraints with ON UPDATE CASCADE...');
      for (const sql of NEW_FKS)
        await exec(c, sql, `add fk`);

      console.log('👁️   [Phase 3] Recreating views and materialized views...');
      await c.query(`
        CREATE OR REPLACE VIEW users_public AS
        SELECT id, name, user_type, created_at FROM users`);
      await c.query(`
        CREATE MATERIALIZED VIEW aggregator_rating_stats AS
        SELECT ratee_id AS aggregator_id,
               count(*) AS total_ratings,
               round(avg(score), 2) AS avg_score
        FROM ratings GROUP BY ratee_id`);
      await c.query(`
        CREATE MATERIALIZED VIEW current_price_index AS
        SELECT DISTINCT ON (city_code, material_code)
               city_code, material_code, rate_per_kg,
               is_manual_override, source, scraped_at
        FROM price_index
        ORDER BY city_code, material_code, scraped_at DESC`);
      await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_agg_rating_stats ON aggregator_rating_stats(aggregator_id)`);
      await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_current_price_index ON current_price_index(city_code, material_code)`);

      console.log('🔒  [Phase 3] Recreating RLS policies...');
      for (const sql of POLICIES)
        await exec(c, sql, `create policy`);

      // Format constraint
      await exec(c, `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_format`, null);
      await c.query(`ALTER TABLE users ADD CONSTRAINT users_id_format CHECK (id ~ '^[a-z0-9_]+$')`);

      await c.query('COMMIT');
      console.log('✅  Phase 3 complete.\n');
    } catch(e) {
      await c.query('ROLLBACK');
      throw e;
    } finally { c.release(); }
  }

  await pool.end();
  console.log('🎉  Migration complete!\n');
  console.log('   users.id  → TEXT (format: {name}_{s|a}_{suffix})');
  console.log('   orders.id → TEXT (format: s_{suffix}_{n})\n');
}

run().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
