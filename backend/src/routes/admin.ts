/**
 * backend/src/routes/admin.ts
 * ─────────────────────────────────────────────────────────────────
 * Admin-only API routes. All routes require:
 *   1. Valid Clerk JWT (via authMiddleware — already applied globally)
 *   2. user_type === 'admin' from DB (via verifyAdmin — V7, never JWT claim)
 *
 * Every mutation:
 *   - Wraps DB changes + admin_audit_log INSERT in a single transaction
 *   - Rolls back the entire transaction if the audit insert fails (BLOCK 3)
 *
 * KYC endpoints are split (BLOCK 2):
 *   - GET /kyc/pending      → metadata only, no URLs
 *   - GET /kyc/:id/documents → signed URLs, called on-demand
 *
 * Stats counters (WARN 1): five exact counters, no GMV
 * ─────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { query, pool } from '../lib/db';
import { storageProvider } from '../lib/storage';
import { verifyAdmin } from '../middleware/verifyAdmin';

const router = Router();

// Apply admin role check to all routes in this file
router.use(verifyAdmin);

// ─── HELPER ────────────────────────────────────────────────────────────────

/**
 * Writes an audit log entry within an existing client (transaction).
 * MUST be called inside a BEGIN/COMMIT block — failure here rolls back the tx.
 */
async function insertAuditLog(
  client: import('pg').PoolClient,
  adminUserId: string,
  action: string,
  targetTable: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
) {
  await client.query(
    `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [adminUserId, action, targetTable, targetId, JSON.stringify(metadata)]
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
// Returns exactly five platform counters (WARN 1 — no GMV)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [pendingKyc, openDisputes, ordersToday, completedOrders, activeAggregators] =
      await Promise.all([
        query(
          `SELECT COUNT(*) AS count FROM aggregator_profiles WHERE kyc_status = 'pending'`
        ),
        query(
          `SELECT COUNT(*) AS count FROM disputes WHERE status = 'open'`
        ),
        query(
          `SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE`
        ),
        query(
          `SELECT COUNT(*) AS count FROM orders WHERE status = 'completed'`
        ),
        query(
          `SELECT COUNT(*) AS count FROM aggregator_availability WHERE is_online = true`
        ),
      ]);

    return res.json({
      total_pending_kyc: parseInt(pendingKyc.rows[0].count, 10),
      total_open_disputes: parseInt(openDisputes.rows[0].count, 10),
      total_orders_today: parseInt(ordersToday.rows[0].count, 10),
      total_completed_orders: parseInt(completedOrders.rows[0].count, 10),
      total_active_aggregators: parseInt(activeAggregators.rows[0].count, 10),
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/kyc/pending
// Metadata only — NO signed URLs (BLOCK 2)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/kyc/pending', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
         ap.user_id,
         ap.business_name,
         ap.aggregator_type,
         ap.city_code,
         ap.kyc_status,
         ap.created_at AS submitted_at,
         COUNT(om.id)::int AS document_count
       FROM aggregator_profiles ap
       LEFT JOIN order_media om
         ON om.uploaded_by = ap.user_id
        AND om.media_type LIKE 'kyc_%'
       WHERE ap.kyc_status = 'pending'
       GROUP BY ap.user_id, ap.business_name, ap.aggregator_type, ap.city_code, ap.kyc_status, ap.created_at
       ORDER BY ap.created_at ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[admin/kyc/pending]', err);
    return res.status(500).json({ error: 'Failed to fetch KYC queue' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/kyc/:userId/documents
// On-demand signed URLs (5-min expiry) — called only when admin opens a record (BLOCK 2)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/kyc/:userId/documents', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const adminUserId = req.user!.id;

  try {
    const mediaResult = await query(
      `SELECT id, media_type, storage_path
       FROM order_media
       WHERE uploaded_by = $1 AND media_type LIKE 'kyc_%'
       ORDER BY created_at ASC`,
      [userId]
    );

    const SIGNED_URL_TTL = 5 * 60; // 5 minutes
    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString();

    // Generate signed URLs for each document
    const docs = await Promise.all(
      mediaResult.rows.map(async (row: { id: string; media_type: string; storage_path: string }) => ({
        id: row.id,
        media_type: row.media_type,
        signed_url: await storageProvider.getSignedUrl(row.storage_path, SIGNED_URL_TTL),
        expires_at: expiresAt,
      }))
    );

    // Audit: write that this admin viewed the documents (no transaction needed for read audit)
    await query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, 'kyc_documents_viewed', 'order_media', $2, $3, NOW())`,
      [adminUserId, userId, JSON.stringify({ document_count: docs.length })]
    );

    return res.json(docs);
  } catch (err) {
    console.error('[admin/kyc/documents]', err);
    return res.status(500).json({ error: 'Failed to fetch KYC documents' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/aggregators/:id/kyc
// Approve or reject KYC. Uses SET LOCAL guard for V35 trigger.
// audit_log INSERT is inside same transaction (BLOCK 3).
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/aggregators/:id/kyc', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminUserId = req.user!.id;
  const { kyc_status, note } = req.body as {
    kyc_status: 'verified' | 'rejected';
    note?: string;
  };

  if (!['verified', 'rejected'].includes(kyc_status)) {
    return res.status(400).json({ error: 'kyc_status must be "verified" or "rejected"' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // V35: SET LOCAL flag so the trigger allows this update from admin context
    await client.query(`SET LOCAL app.is_admin_context = 'true'`);
    await client.query(
      `UPDATE aggregator_profiles SET kyc_status = $1, kyc_reviewed_at = NOW() WHERE user_id = $2`,
      [kyc_status, id]
    );
    // Audit log inside same transaction — failure rolls back the KYC update too (BLOCK 3)
    await client.query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, $2, 'aggregator_profiles', $3, $4, NOW())`,
      [
        adminUserId,
        `kyc_${kyc_status}`,
        id,
        JSON.stringify({ kyc_status, note: note ?? null }),
      ]
    );
    await client.query('COMMIT');
    return res.json({ success: true, kyc_status });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[admin/aggregators/kyc]', err);
    return res.status(500).json({ error: 'Failed to update KYC status' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/disputes
// Open disputes with order context and SLA hours
// ─────────────────────────────────────────────────────────────────────────────
router.get('/disputes', async (req: Request, res: Response) => {
  try {
    const disputesResult = await query(
      `SELECT
         d.id,
         d.order_id,
         d.raised_by,
         d.description,
         d.status,
         d.created_at,
         d.resolved_at,
         d.resolution_note,
         EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 3600 AS hours_since_raised,
         o.status AS order_status,
         seller.id AS seller_id,
         agg.business_name AS aggregator_name
       FROM disputes d
       JOIN orders o ON o.id = d.order_id
       JOIN users seller ON seller.id = o.seller_id
       LEFT JOIN aggregator_profiles agg ON agg.user_id = o.aggregator_id
       WHERE d.status = 'open'
       ORDER BY d.created_at ASC`
    );

    const disputes = await Promise.all(
      disputesResult.rows.map(async (d: any) => {
        const mediaRes = await query(
          `SELECT storage_path FROM order_media
           WHERE order_id = $1 AND media_type IN ('scale_photo', 'scrap_photo', 'evidence_photo')`,
          [d.order_id]
        );

        const evidence_urls = await Promise.all(
          mediaRes.rows.map(async (m: { storage_path: string }) =>
            storageProvider.getSignedUrl(m.storage_path, 3600)
          )
        );

        return { ...d, evidence_urls };
      })
    );

    return res.json(disputes);
  } catch (err) {
    console.error('[admin/disputes]', err);
    return res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/disputes/:id
// Resolve or dismiss a dispute. audit_log INSERT inside same transaction (BLOCK 3).
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/disputes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminUserId = req.user!.id;
  const { action, resolution_note } = req.body as {
    action: 'resolve' | 'dismiss';
    resolution_note?: string;
  };

  if (!['resolve', 'dismiss'].includes(action)) {
    return res.status(400).json({ error: 'action must be "resolve" or "dismiss"' });
  }

  const newStatus = action === 'resolve' ? 'resolved' : 'dismissed';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE disputes
       SET status = $1, resolution_note = $2, resolved_at = NOW()
       WHERE id = $3`,
      [newStatus, resolution_note ?? null, id]
    );
    // Audit INSERT inside same transaction — failure rolls back the dispute update (BLOCK 3)
    await client.query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, $2, 'disputes', $3, $4, NOW())`,
      [
        adminUserId,
        action,
        id,
        JSON.stringify({ new_status: newStatus, resolution_note: resolution_note ?? null }),
      ]
    );
    await client.query('COMMIT');
    return res.json({ success: true, status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[admin/disputes/patch]', err);
    return res.status(500).json({ error: 'Failed to update dispute' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/prices
// Current price_index entry per material
// ─────────────────────────────────────────────────────────────────────────────
router.get('/prices', async (req: Request, res: Response) => {
  try {
    // Latest entry per material (most recent scraped_at wins)
    const result = await query(
      `SELECT DISTINCT ON (material_code)
         material_code,
         rate_per_kg,
         is_manual_override,
         CASE WHEN is_manual_override THEN 'override' ELSE 'scraper' END AS source,
         scraped_at
       FROM price_index
       ORDER BY material_code, scraped_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[admin/prices]', err);
    return res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/prices/override
// Manual rate with sanity bounds (X2). audit_log inside same transaction.
// ─────────────────────────────────────────────────────────────────────────────

const PRICE_SANITY_BOUNDS: Record<string, { min: number; max: number }> = {
  metal:   { min: 20,  max: 60  },
  iron:    { min: 20,  max: 60  },
  copper:  { min: 400, max: 900 },
  paper:   { min: 5,   max: 20  },
  plastic: { min: 5,   max: 25  },
  ewaste:  { min: 50,  max: 500 },
  glass:   { min: 1,   max: 10  },
  fabric:  { min: 3,   max: 20  },
};

router.post('/prices/override', async (req: Request, res: Response) => {
  const adminUserId = req.user!.id;
  const { material_code, rate_per_kg } = req.body as {
    material_code: string;
    rate_per_kg: number;
  };
  const cityCode = 'HYD';

  if (!material_code || typeof rate_per_kg !== 'number') {
    return res.status(400).json({ error: 'material_code and rate_per_kg are required' });
  }

  // Sanity bounds check (X2)
  const bounds = PRICE_SANITY_BOUNDS[material_code.toLowerCase()];
  if (!bounds) {
    return res.status(422).json({
      error: `Unsupported material_code '${material_code}'`,
    });
  }

  if (bounds && (rate_per_kg < bounds.min || rate_per_kg > bounds.max)) {
    return res.status(422).json({
      error: `Rate ₹${rate_per_kg}/kg is outside sanity bounds for ${material_code} (₹${bounds.min}–₹${bounds.max}/kg)`,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO price_index (city_code, material_code, rate_per_kg, source, is_manual_override, scraped_at)
       VALUES ($1, $2, $3, 'admin_override', true, NOW())
       RETURNING id`,
      [cityCode, material_code, rate_per_kg]
    );
    await client.query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, 'price_override', 'price_index', $2, $3, NOW())`,
      [
        adminUserId,
        inserted.rows[0]?.id ?? null,
        JSON.stringify({ material_code, rate_per_kg, is_manual_override: true }),
      ]
    );
    await client.query('COMMIT');
    return res.json({ success: true, material_code, rate_per_kg });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[admin/prices/override]', err);
    return res.status(500).json({ error: 'Failed to save price override' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/flagged
// Aggregators with avg_rating < 3.0 after 10+ completed orders
// ─────────────────────────────────────────────────────────────────────────────
router.get('/flagged', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
         o.aggregator_id,
         ap.business_name,
         ap.city_code,
         ap.kyc_status,
         ROUND(AVG(r.score)::numeric, 2) AS avg_rating,
         COUNT(DISTINCT o.id) AS total_orders,
         MAX(o.created_at) AS last_order_at
       FROM orders o
       -- Migration 0016: rated_user → ratee_id; column is 'score' not 'rating'
       JOIN ratings r ON r.order_id = o.id AND r.ratee_id = o.aggregator_id
       JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
       WHERE o.status = 'completed'
       GROUP BY o.aggregator_id, ap.business_name, ap.city_code, ap.kyc_status
       HAVING COUNT(DISTINCT o.id) >= 10 AND AVG(r.score) < 3.0
       ORDER BY AVG(r.score) ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[admin/flagged]', err);
    return res.status(500).json({ error: 'Failed to fetch flagged aggregators' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/orders
// All orders with filter ?status=&seller_id=&limit=&offset=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/orders', async (req: Request, res: Response) => {
  const { status, seller_id, limit = '50', offset = '0' } = req.query as Record<string, string>;
  try {
    const conditions: string[] = ['o.deleted_at IS NULL'];
    const params: unknown[] = [];
    if (status) { params.push(status); conditions.push(`o.status = $${params.length}`); }
    if (seller_id) { params.push(seller_id); conditions.push(`o.seller_id = $${params.length}`); }

    params.push(Number(limit), Number(offset));
    const where = conditions.join(' AND ');

    const [ordersRes, totalRes] = await Promise.all([
      query(
        `SELECT
           o.id,
           o.status,
           o.created_at,
           o.scheduled_at,
           o.picked_up_at,
           o.completed_at,
           o.cancelled_at,
           o.cancellation_reason,
           o.amount_due,
           o.pickup_address,
           o.pickup_lat,
           o.pickup_lng,
           o.city_code,
           o.seller_id,
           o.aggregator_id,
           sel.name AS seller_name,
           sel.display_phone AS seller_phone,
           ap.business_name AS aggregator_business_name,
           agg.display_phone AS aggregator_phone,
           ap.aggregator_type
         FROM orders o
         JOIN users sel ON sel.id = o.seller_id
         LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
         LEFT JOIN users agg ON agg.id = o.aggregator_id
         WHERE ${where}
         ORDER BY o.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      query(
        `SELECT COUNT(*) AS total FROM orders o WHERE ${where}`,
        params.slice(0, params.length - 2)
      ),
    ]);

    return res.json({
      orders: ordersRes.rows,
      total: parseInt(totalRes.rows[0].total, 10),
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) {
    console.error('[admin/orders]', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/orders/locations  (must be BEFORE /orders/:id)
// Live order pins for the map view (lat/lng + status colour)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/orders/locations', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
         o.id, o.status, o.pickup_lat AS lat, o.pickup_lng AS lng,
         o.created_at, o.city_code,
         sel.name AS seller_name,
         ap.business_name AS aggregator_name
       FROM orders o
       JOIN users sel ON sel.id = o.seller_id
       LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
       WHERE o.pickup_lat IS NOT NULL
         AND o.pickup_lng IS NOT NULL
         AND o.deleted_at IS NULL
         AND o.created_at > NOW() - INTERVAL '30 days'
       ORDER BY o.created_at DESC
       LIMIT 500`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[admin/orders/locations]', err);
    return res.status(500).json({ error: 'Failed to fetch order locations' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/orders/:id
// Full order details for dispute resolution + admin inspection
// ─────────────────────────────────────────────────────────────────────────────
router.get('/orders/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminUserId = req.user!.id;

  try {
    const [orderRes, itemsRes, timelineRes, mediasRes] = await Promise.all([
      query(
        `SELECT
           o.id, o.status, o.created_at, o.scheduled_at,
           o.picked_up_at, o.completed_at, o.cancelled_at,
           o.cancellation_reason, o.amount_due, o.seller_note,
           o.pickup_address, o.pickup_lat, o.pickup_lng, o.city_code,
           o.preferred_pickup_window, o.aggregator_accepted_at,
           o.seller_id, o.aggregator_id,
           sel.name AS seller_name,
           sel.display_phone AS seller_phone,
           sel.created_at AS seller_joined_at,
           sa.flat_number AS seller_flat, sa.street AS seller_street,
           sa.area AS seller_area, sa.city AS seller_city,
           sa.pincode AS seller_pincode,
           ap.business_name AS aggregator_business_name,
           ap.aggregator_type, ap.city_code AS aggregator_city,
           ap.kyc_status AS aggregator_kyc_status,
           agg.display_phone AS aggregator_phone,
           agg.name AS aggregator_name,
           CASE
             WHEN o.pickup_lat IS NOT NULL AND o.pickup_lng IS NOT NULL
                  AND ap.home_lat IS NOT NULL AND ap.home_lng IS NOT NULL
             THEN round((point(o.pickup_lng, o.pickup_lat) <@> point(ap.home_lng, ap.home_lat)) * 1.60934, 2)
           END AS distance_km
         FROM orders o
         JOIN users sel ON sel.id = o.seller_id
         LEFT JOIN seller_addresses sa ON sa.seller_id = o.seller_id AND sa.is_primary = true
         LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
         LEFT JOIN users agg ON agg.id = o.aggregator_id
         WHERE o.id = $1`,
        [id]
      ),
      query(
        `SELECT oi.material_code, oi.estimated_weight_kg, oi.actual_weight_kg,
                oi.unit_price_per_kg, oi.line_amount
         FROM order_items oi WHERE oi.order_id = $1 ORDER BY oi.material_code`,
        [id]
      ),
      query(
        `SELECT status, changed_at, changed_by, note
         FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC`,
        [id]
      ),
      query(
        `SELECT id, media_type, storage_path, created_at
         FROM order_media WHERE order_id = $1 ORDER BY created_at ASC`,
        [id]
      ),
    ]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // Generate signed URLs for media (5 min)
    const media = await Promise.all(
      mediasRes.rows.map(async (m: any) => ({
        id: m.id,
        media_type: m.media_type,
        url: await storageProvider.getSignedUrl(m.storage_path, 300),
        created_at: m.created_at,
      }))
    );

    // Audit log (no tx needed for read)
    await query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, 'order_detail_viewed', 'orders', $2, $3, NOW())`,
      [adminUserId, id, JSON.stringify({ context: 'admin_portal' })]
    );

    return res.json({
      ...order,
      items: itemsRes.rows,
      timeline: timelineRes.rows,
      media,
    });
  } catch (err) {
    console.error('[admin/orders/:id]', err);
    return res.status(500).json({ error: 'Failed to fetch order details' });
  }
});


// (locations route was moved to before /orders/:id above)

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics
// Platform-wide KPI trends for the analytics dashboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const [
      dailyOrdersRes,
      statusBreakdownRes,
      cityBreakdownRes,
      topSellersRes,
      topAggregatorsRes,
      hourlyDistributionRes,
      revenueWeeklyRes,
    ] = await Promise.all([
      // Orders per day – last 30 days
      query(`
        SELECT
          DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS day,
          COUNT(*) AS orders,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
        FROM orders
        WHERE created_at > NOW() - INTERVAL '30 days'
          AND deleted_at IS NULL
        GROUP BY day ORDER BY day ASC
      `),
      // Status distribution
      query(`
        SELECT status, COUNT(*) AS count
        FROM orders WHERE deleted_at IS NULL
        GROUP BY status ORDER BY count DESC
      `),
      // City breakdown
      query(`
        SELECT city_code, COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status='completed') AS completed
        FROM orders WHERE deleted_at IS NULL
        GROUP BY city_code ORDER BY total DESC
      `),
      // Top 10 sellers by order count
      query(`
        SELECT sel.id, sel.name, sel.display_phone,
               COUNT(o.id) AS total_orders,
               COUNT(o.id) FILTER (WHERE o.status='completed') AS completed_orders,
               COALESCE(SUM(o.amount_due) FILTER (WHERE o.status='completed'), 0) AS total_gmv
        FROM orders o JOIN users sel ON sel.id = o.seller_id
        WHERE o.deleted_at IS NULL
        GROUP BY sel.id, sel.name, sel.display_phone
        ORDER BY total_orders DESC LIMIT 10
      `),
      // Top 10 aggregators by completed orders
      query(`
        SELECT agg.id, agg.name, ap.business_name, agg.display_phone,
               COUNT(o.id) FILTER (WHERE o.status='completed') AS completed_orders,
               COALESCE(AVG(r.score), 0)::numeric(3,2) AS avg_rating
        FROM orders o
        JOIN users agg ON agg.id = o.aggregator_id
        LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
        LEFT JOIN ratings r ON r.order_id = o.id AND r.ratee_id = o.aggregator_id
        WHERE o.status = 'completed' AND o.deleted_at IS NULL
        GROUP BY agg.id, agg.name, ap.business_name, agg.display_phone
        ORDER BY completed_orders DESC LIMIT 10
      `),
      // Hourly order distribution (0-23)
      query(`
        SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
               COUNT(*) AS orders
        FROM orders WHERE deleted_at IS NULL
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY hour ORDER BY hour ASC
      `),
      // Weekly GMV (last 12 weeks)
      query(`
        SELECT
          DATE_TRUNC('week', completed_at AT TIME ZONE 'Asia/Kolkata') AS week_start,
          COUNT(*) AS completed_orders,
          COALESCE(SUM(amount_due), 0) AS gmv
        FROM orders
        WHERE status = 'completed' AND deleted_at IS NULL
          AND completed_at > NOW() - INTERVAL '12 weeks'
        GROUP BY week_start ORDER BY week_start ASC
      `),
    ]);

    return res.json({
      daily_orders: dailyOrdersRes.rows,
      status_breakdown: statusBreakdownRes.rows,
      city_breakdown: cityBreakdownRes.rows,
      top_sellers: topSellersRes.rows,
      top_aggregators: topAggregatorsRes.rows,
      hourly_distribution: hourlyDistributionRes.rows,
      revenue_weekly: revenueWeeklyRes.rows,
    });
  } catch (err) {
    console.error('[admin/analytics]', err);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
