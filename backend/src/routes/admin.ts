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
import { resolveProfilePhotosBucket } from '../lib/storageBuckets';
import { verifyAdmin } from '../middleware/verifyAdmin';
import { publishEvent } from '../lib/realtime';

const router = Router();

const ANALYTICS_CACHE_TTL_MS = 2 * 60 * 1000;
let analyticsCache: { expiresAt: number; payload: any } | null = null;

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS exists`,
    [table, column]
  );
  return Boolean(result.rows[0]?.exists);
}

async function tableExists(table: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = $1
     ) AS exists`,
    [table]
  );
  return Boolean(result.rows[0]?.exists);
}

const DISPUTE_ALLOWED_STATUSES = ['open', 'resolved', 'dismissed'] as const;
const DISPUTE_ALLOWED_ISSUE_TYPES = [
  'wrong_weight',
  'payment_not_made',
  'no_show',
  'abusive_behaviour',
  'other',
] as const;

const disputePublicIdExpr = (alias: string) =>
  `CONCAT(${alias}.order_id, '_', TO_CHAR(${alias}.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD'))`;

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
         u.profile_photo_url,
         COUNT(om.id)::int AS document_count
       FROM aggregator_profiles ap
       LEFT JOIN users u ON u.id = ap.user_id
       LEFT JOIN order_media om
         ON om.uploaded_by = ap.user_id
        AND om.media_type LIKE 'kyc_%'
       WHERE ap.kyc_status = 'pending'
       GROUP BY ap.user_id, ap.business_name, ap.aggregator_type, ap.city_code, ap.kyc_status, ap.created_at, u.profile_photo_url
       ORDER BY ap.created_at ASC`
    );
    const bucketName = resolveProfilePhotosBucket();
    const rows = await Promise.all(
      result.rows.map(async (row: any) => {
        let photo_url: string | null = null;
        if (row.profile_photo_url) {
          try {
            photo_url = await storageProvider.getSignedUrl(row.profile_photo_url, 3600, bucketName);
          } catch {
            photo_url = null;
          }
        }
        return { ...row, photo_url };
      })
    );
    return res.json(rows);
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
// All disputes with filters/search + pagination
// ─────────────────────────────────────────────────────────────────────────────
router.get('/disputes', async (req: Request, res: Response) => {
  try {
    const statusRaw = String(req.query.status ?? 'all').trim().toLowerCase();
    const issueTypeRaw = String(req.query.issue_type ?? '').trim().toLowerCase();
    const search = String(req.query.search ?? '').trim();
    const dateFrom = String(req.query.date_from ?? '').trim();
    const dateTo = String(req.query.date_to ?? '').trim();
    const limit = Math.min(200, Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const offset = Math.max(0, Number.parseInt(String(req.query.offset ?? '0'), 10) || 0);

    const normalizedStatus: 'all' | 'closed' | (typeof DISPUTE_ALLOWED_STATUSES)[number] | null =
      statusRaw === '' || statusRaw === 'all'
        ? 'all'
        : statusRaw === 'closed'
          ? 'closed'
          : (DISPUTE_ALLOWED_STATUSES as readonly string[]).includes(statusRaw)
            ? (statusRaw as (typeof DISPUTE_ALLOWED_STATUSES)[number])
            : null;

    if (!normalizedStatus) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const issueTypes = issueTypeRaw.length > 0
      ? issueTypeRaw.split(',').map((v) => v.trim()).filter(Boolean)
      : [];

    const invalidIssueTypes = issueTypes.filter(
      (issue) => !(DISPUTE_ALLOWED_ISSUE_TYPES as readonly string[]).includes(issue)
    );

    if (invalidIssueTypes.length > 0) {
      return res.status(400).json({ error: `Invalid issue_type filter: ${invalidIssueTypes.join(', ')}` });
    }

    const whereClauses: string[] = ['1=1'];
    const params: unknown[] = [];

    if (normalizedStatus === 'closed') {
      whereClauses.push(`d.status IN ('resolved', 'dismissed')`);
    } else if (normalizedStatus !== 'all') {
      params.push(normalizedStatus);
      whereClauses.push(`d.status = $${params.length}`);
    }

    if (issueTypes.length > 0) {
      params.push(issueTypes);
      whereClauses.push(`d.issue_type = ANY($${params.length}::text[])`);
    }

    if (search.length > 0) {
      params.push(`%${search}%`);
      whereClauses.push(`(
        d.description ILIKE $${params.length}
        OR d.order_id ILIKE $${params.length}
        OR ${disputePublicIdExpr('d')} ILIKE $${params.length}
        OR COALESCE(agg.business_name, '') ILIKE $${params.length}
        OR COALESCE(raised_user.name, '') ILIKE $${params.length}
      )`);
    }

    if (dateFrom.length > 0) {
      params.push(dateFrom);
      whereClauses.push(`d.created_at >= $${params.length}::date`);
    }

    if (dateTo.length > 0) {
      params.push(dateTo);
      whereClauses.push(`d.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const whereSql = whereClauses.join(' AND ');

    const countRes = await query(
      `SELECT COUNT(*)::int AS total
       FROM disputes d
       JOIN orders o ON o.id = d.order_id
       JOIN users seller ON seller.id = o.seller_id
       LEFT JOIN users raised_user ON raised_user.id = d.raised_by
       LEFT JOIN users agg_user ON agg_user.id = o.aggregator_id
       LEFT JOIN aggregator_profiles agg ON agg.user_id = o.aggregator_id
       WHERE ${whereSql}`,
      params
    );

    const pagedParams = [...params, limit, offset];
    const disputesResult = await query(
      `SELECT
         d.id AS dispute_uuid,
         ${disputePublicIdExpr('d')} AS dispute_id,
         d.order_id,
         d.raised_by,
         raised_user.name AS raised_by_name,
         d.issue_type,
         d.description,
         d.status,
         d.created_at,
         d.resolved_at,
         d.resolution_note,
         EXTRACT(EPOCH FROM (COALESCE(d.resolved_at, NOW()) - d.created_at)) / 3600 AS hours_since_raised,
         o.status AS order_status,
         seller.id AS seller_id,
         seller.name AS seller_name,
         o.aggregator_id,
         agg.business_name AS aggregator_name,
         agg_user.display_phone AS aggregator_phone,
         (
           SELECT COUNT(*)::int
           FROM dispute_evidence de
           WHERE de.dispute_id::text = d.id::text
         ) AS dispute_evidence_count
       FROM disputes d
       JOIN orders o ON o.id = d.order_id
       JOIN users seller ON seller.id = o.seller_id
       LEFT JOIN users raised_user ON raised_user.id = d.raised_by
       LEFT JOIN users agg_user ON agg_user.id = o.aggregator_id
       LEFT JOIN aggregator_profiles agg ON agg.user_id = o.aggregator_id
       WHERE ${whereSql}
       ORDER BY d.created_at DESC
       LIMIT $${pagedParams.length - 1} OFFSET $${pagedParams.length}`,
      pagedParams
    );

    const disputes = disputesResult.rows.map((row: any) => ({
      id: row.dispute_id,
      uuid: row.dispute_uuid,
      order_id: row.order_id,
      raised_by: row.raised_by,
      raised_by_name: row.raised_by_name,
      issue_type: row.issue_type,
      description: row.description,
      status: row.status,
      created_at: row.created_at,
      resolved_at: row.resolved_at,
      resolution_note: row.resolution_note,
      hours_since_raised: Number(row.hours_since_raised ?? 0),
      order_status: row.order_status,
      seller_id: row.seller_id,
      seller_name: row.seller_name,
      aggregator_id: row.aggregator_id,
      aggregator_name: row.aggregator_name,
      aggregator_phone: row.aggregator_phone,
      evidence_count: Number(row.dispute_evidence_count ?? 0),
    }));

    return res.json({
      disputes,
      total: Number(countRes.rows[0]?.total ?? 0),
      limit,
      offset,
    });
  } catch (err) {
    console.error('[admin/disputes]', err);
    return res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/disputes/:id
// Single dispute with order context and evidence
// ─────────────────────────────────────────────────────────────────────────────
router.get('/disputes/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id ?? '').trim();
  try {
    const result = await query(
      `SELECT
         d.id AS dispute_uuid,
         ${disputePublicIdExpr('d')} AS dispute_id,
         d.order_id,
         d.raised_by,
         raised_user.name AS raised_by_name,
         d.issue_type,
         d.description,
         d.status,
         d.created_at,
         d.resolved_at,
         d.resolution_note,
         EXTRACT(EPOCH FROM (COALESCE(d.resolved_at, NOW()) - d.created_at)) / 3600 AS hours_since_raised,
         o.status AS order_status,
         seller.id AS seller_id,
         seller.name AS seller_name,
         o.aggregator_id,
         agg.business_name AS aggregator_name
       FROM disputes d
       JOIN orders o ON o.id = d.order_id
       JOIN users seller ON seller.id = o.seller_id
       LEFT JOIN users raised_user ON raised_user.id = d.raised_by
       LEFT JOIN aggregator_profiles agg ON agg.user_id = o.aggregator_id
       WHERE d.id::text = $1
          OR ${disputePublicIdExpr('d')} = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = result.rows[0];

    const disputeEvidenceRes = await query(
      `SELECT de.storage_path,
              de.created_at,
              de.submitted_by,
              u.name AS submitted_by_name,
              u.user_type AS submitted_by_user_type
       FROM dispute_evidence de
       LEFT JOIN users u ON u.id = de.submitted_by
       WHERE de.dispute_id::text = $1::text
       ORDER BY de.created_at ASC`,
      [dispute.dispute_uuid]
    );

    const disputeEvidenceRaw = await Promise.all(
      disputeEvidenceRes.rows.map(async (row: {
        storage_path: string;
        created_at: string;
        submitted_by: string | null;
        submitted_by_name: string | null;
        submitted_by_user_type: string | null;
      }) => {
        const uploadedByRole =
          row.submitted_by === dispute.seller_id
            ? 'seller'
            : row.submitted_by === dispute.aggregator_id
              ? 'aggregator'
              : row.submitted_by_user_type === 'admin'
                ? 'admin'
                : 'user';

        const uploadedByLabel =
          uploadedByRole === 'seller'
            ? `Seller${dispute.seller_name ? ` (${dispute.seller_name})` : ''}`
            : uploadedByRole === 'aggregator'
              ? `Aggregator${dispute.aggregator_name ? ` (${dispute.aggregator_name})` : ''}`
              : uploadedByRole === 'admin'
                ? `Admin${row.submitted_by_name ? ` (${row.submitted_by_name})` : ''}`
                : (row.submitted_by_name || 'User');

        try {
          return {
            source: 'dispute_evidence' as const,
            media_type: 'dispute_evidence',
            created_at: row.created_at,
            url: await storageProvider.getSignedUrl(row.storage_path, 3600),
            uploaded_by_role: uploadedByRole,
            uploaded_by_label: uploadedByLabel,
            uploaded_by_name: row.submitted_by_name,
          };
        } catch {
          return null;
        }
      })
    );

    const disputeEvidence = disputeEvidenceRaw.filter(
      (item): item is {
        source: 'dispute_evidence';
        media_type: string;
        created_at: string;
        url: string;
        uploaded_by_role: string;
        uploaded_by_label: string;
        uploaded_by_name: string | null;
      } => item !== null
    );

    const evidence = [...disputeEvidence].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return res.json({
      id: dispute.dispute_id,
      uuid: dispute.dispute_uuid,
      order_id: dispute.order_id,
      raised_by: dispute.raised_by,
      raised_by_name: dispute.raised_by_name,
      issue_type: dispute.issue_type,
      description: dispute.description,
      status: dispute.status,
      created_at: dispute.created_at,
      resolved_at: dispute.resolved_at,
      resolution_note: dispute.resolution_note,
      hours_since_raised: Number(dispute.hours_since_raised ?? 0),
      order_status: dispute.order_status,
      seller_id: dispute.seller_id,
      seller_name: dispute.seller_name,
      aggregator_id: dispute.aggregator_id,
      aggregator_name: dispute.aggregator_name,
      evidence,
      evidence_urls: evidence.map((item) => item.url),
    });
  } catch (err) {
    console.error('[admin/disputes/:id]', err);
    return res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/disputes/:id
// Resolve or dismiss a dispute. audit_log INSERT inside same transaction (BLOCK 3).
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/disputes/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id ?? '').trim();
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

    const targetRes = await client.query(
      `SELECT
         d.id,
         d.order_id,
         d.status,
         ${disputePublicIdExpr('d')} AS dispute_id
       FROM disputes d
       WHERE d.id::text = $1
          OR ${disputePublicIdExpr('d')} = $1
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (targetRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const target = targetRes.rows[0];

    await client.query(
      `UPDATE disputes
       SET status = $1, resolution_note = $2, resolved_at = NOW()
       WHERE id = $3`,
      [newStatus, resolution_note ?? null, target.id]
    );

    const orderUpdateRes = await client.query(
      `UPDATE orders
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1
         AND status = 'disputed'`,
      [target.order_id]
    );

    if ((orderUpdateRes.rowCount ?? 0) > 0) {
      const statusNote = action === 'resolve'
        ? 'Dispute resolved by admin'
        : 'Dispute dismissed by admin';

      await client.query(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
         VALUES ($1, 'disputed', 'completed', $2, $3)`,
        [target.order_id, adminUserId, statusNote]
      );
    }

    await client.query(
      `UPDATE orders
       SET updated_at = NOW()
       WHERE id = $1`,
      [target.order_id]
    );

    // Audit INSERT inside same transaction — failure rolls back the dispute update (BLOCK 3)
    await client.query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, $2, 'disputes', $3, $4, NOW())`,
      [
        adminUserId,
        action,
        target.id,
        JSON.stringify({
          dispute_id: target.dispute_id,
          new_status: newStatus,
          resolution_note: resolution_note ?? null,
        }),
      ]
    );

    await client.query('COMMIT');
    return res.json({
      success: true,
      status: newStatus,
      dispute_id: target.dispute_id,
      order_id: target.order_id,
    });
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
         previous_rate_per_kg,
         change_percent,
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
// Manual rate override. audit_log inside same transaction.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/prices/override', async (req: Request, res: Response) => {
  const adminUserId = req.user!.id;
  const { material_code, rate_per_kg } = req.body as {
    material_code: string;
    rate_per_kg: number;
  };
  const normalizedMaterialCode = String(material_code ?? '').trim().toLowerCase();
  const cityCode = 'HYD';

  if (!normalizedMaterialCode || typeof rate_per_kg !== 'number') {
    return res.status(400).json({ error: 'material_code and rate_per_kg are required' });
  }

  if (rate_per_kg <= 0) {
    return res.status(422).json({ error: 'rate_per_kg must be greater than 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const previousRes = await client.query(
      `SELECT rate_per_kg
         FROM price_index
        WHERE city_code = $1
          AND LOWER(material_code) = LOWER($2)
        ORDER BY scraped_at DESC, id DESC
        LIMIT 1`,
      [cityCode, normalizedMaterialCode]
    );

    const previousRate = previousRes.rows[0]?.rate_per_kg != null ? Number(previousRes.rows[0].rate_per_kg) : null;
    const changePercent = previousRate && previousRate > 0
      ? Number((((rate_per_kg - previousRate) / previousRate) * 100).toFixed(2))
      : null;

    const inserted = await client.query(
      `INSERT INTO price_index (
         city_code,
         material_code,
         rate_per_kg,
         previous_rate_per_kg,
         change_percent,
         source,
         is_manual_override,
         scraped_at
       )
       VALUES ($1, $2, $3, $4, $5, 'admin_override', true, NOW())
       RETURNING id`,
      [cityCode, normalizedMaterialCode, rate_per_kg, previousRate, changePercent]
    );
    await client.query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, 'price_override', 'price_index', $2, $3, NOW())`,
      [
        adminUserId,
        inserted.rows[0]?.id ?? null,
        JSON.stringify({ material_code: normalizedMaterialCode, rate_per_kg, is_manual_override: true }),
      ]
    );
    await client.query('COMMIT');

    // Keep /api/rates in sync immediately; mobile reads current_price_index view.
    try {
      await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index`);
    } catch (refreshErr) {
      console.error('[admin/prices/override] concurrent view refresh failed', refreshErr);
      try {
        await query(`REFRESH MATERIALIZED VIEW current_price_index`);
      } catch (fallbackErr) {
        console.error('[admin/prices/override] fallback view refresh failed', fallbackErr);
      }
    }

    // Real-time notify mobile clients (aggregator price index) after override.
    await publishEvent('rates:hyd:index', 'rates_updated', {
      city_code: cityCode,
      material_code: normalizedMaterialCode,
      rate_per_kg,
      source: 'admin_override',
      updated_at: new Date().toISOString(),
    });

    return res.json({ success: true, material_code: normalizedMaterialCode, rate_per_kg });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[admin/prices/override]', err);
    return res.status(500).json({ error: 'Failed to save price override' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/active
// Aggregators with avg_rating >= 3.5 after 10+ completed orders
// ─────────────────────────────────────────────────────────────────────────────
router.get('/active', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
         o.aggregator_id,
         ap.business_name,
         ap.city_code,
         ap.kyc_status,
         u.profile_photo_url,
         ROUND(COALESCE(AVG(r.score), 0)::numeric, 2) AS avg_rating,
         COUNT(DISTINCT o.id) AS total_orders,
         MAX(o.created_at) AS last_order_at
       FROM orders o
       LEFT JOIN ratings r ON r.order_id = o.id AND r.ratee_id = o.aggregator_id
       LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
       LEFT JOIN users u ON u.id = o.aggregator_id
       WHERE o.status = 'completed'
       GROUP BY o.aggregator_id, ap.business_name, ap.city_code, ap.kyc_status, u.profile_photo_url
       HAVING COUNT(DISTINCT o.id) >= 10 AND COALESCE(AVG(r.score), 0) >= 3.5
       ORDER BY COALESCE(AVG(r.score), 0) DESC`
    );
    const bucketName = resolveProfilePhotosBucket();
    const rows = await Promise.all(
      result.rows.map(async (row: any) => {
        let photo_url: string | null = null;
        if (row.profile_photo_url) {
          try {
            photo_url = await storageProvider.getSignedUrl(row.profile_photo_url, 3600, bucketName);
          } catch {
            photo_url = null;
          }
        }
        return { ...row, photo_url };
      })
    );
    return res.json(rows);
  } catch (err) {
    console.error('[admin/active]', err);
    return res.status(500).json({ error: 'Failed to fetch active aggregators' });
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
         u.profile_photo_url,
         ROUND(AVG(r.score)::numeric, 2) AS avg_rating,
         COUNT(DISTINCT o.id) AS total_orders,
         MAX(o.created_at) AS last_order_at
       FROM orders o
       -- Migration 0016: rated_user → ratee_id; column is 'score' not 'rating'
       JOIN ratings r ON r.order_id = o.id AND r.ratee_id = o.aggregator_id
       JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
       JOIN users u ON u.id = o.aggregator_id
       WHERE o.status = 'completed'
       GROUP BY o.aggregator_id, ap.business_name, ap.city_code, ap.kyc_status, u.profile_photo_url
       HAVING COUNT(DISTINCT o.id) >= 10 AND AVG(r.score) < 3.0
       ORDER BY AVG(r.score) ASC`
    );
    const bucketName = resolveProfilePhotosBucket();
    const rows = await Promise.all(
      result.rows.map(async (row: any) => {
        let photo_url: string | null = null;
        if (row.profile_photo_url) {
          try {
            photo_url = await storageProvider.getSignedUrl(row.profile_photo_url, 3600, bucketName);
          } catch {
            photo_url = null;
          }
        }
        return { ...row, photo_url };
      })
    );
    return res.json(rows);
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
    const [
      hasOrdersDeletedAt,
      hasScheduledAt,
      hasPickedUpAt,
      hasCancelledAt,
      hasCancellationReason,
      hasAmountDue,
      hasEstimatedValue,
      hasConfirmedValue,
      hasPickupAddress,
      hasPickupAddressText,
      hasPickupLat,
      hasPickupLng,
    ] = await Promise.all([
      columnExists('orders', 'deleted_at'),
      columnExists('orders', 'scheduled_at'),
      columnExists('orders', 'picked_up_at'),
      columnExists('orders', 'cancelled_at'),
      columnExists('orders', 'cancellation_reason'),
      columnExists('orders', 'amount_due'),
      columnExists('orders', 'estimated_value'),
      columnExists('orders', 'confirmed_value'),
      columnExists('orders', 'pickup_address'),
      columnExists('orders', 'pickup_address_text'),
      columnExists('orders', 'pickup_lat'),
      columnExists('orders', 'pickup_lng'),
    ]);

    const scheduledAtExpr = hasScheduledAt ? 'o.scheduled_at' : 'NULL::timestamptz AS scheduled_at';
    const pickedUpAtExpr = hasPickedUpAt ? 'o.picked_up_at' : 'NULL::timestamptz AS picked_up_at';
    const cancelledAtExpr = hasCancelledAt ? 'o.cancelled_at' : 'NULL::timestamptz AS cancelled_at';
    const cancellationReasonExpr = hasCancellationReason
      ? 'o.cancellation_reason'
      : 'NULL::text AS cancellation_reason';
    const amountDueExpr = hasAmountDue ? 'o.amount_due' : 'NULL::numeric AS amount_due';
    const estimatedValueExpr = hasEstimatedValue ? 'o.estimated_value' : 'NULL::numeric AS estimated_value';
    const confirmedValueExpr = hasConfirmedValue ? 'o.confirmed_value' : 'NULL::numeric AS confirmed_value';
    const pickupAddressExpr = hasPickupAddress
      ? 'o.pickup_address'
      : hasPickupAddressText
        ? 'o.pickup_address_text AS pickup_address'
        : 'NULL::text AS pickup_address';
    const pickupLatExpr = hasPickupLat ? 'o.pickup_lat' : 'NULL::double precision AS pickup_lat';
    const pickupLngExpr = hasPickupLng ? 'o.pickup_lng' : 'NULL::double precision AS pickup_lng';

    const conditions: string[] = ['1=1'];
    if (hasOrdersDeletedAt) {
      conditions.push('o.deleted_at IS NULL');
    }
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
             o.order_number,
            ${scheduledAtExpr},
            ${pickedUpAtExpr},
            COALESCE(osh_completed.created_at, NULL)::timestamptz AS completed_at,
            ${cancelledAtExpr},
            ${cancellationReasonExpr},
            ${amountDueExpr},
            ${estimatedValueExpr},
            ${confirmedValueExpr},
            ${pickupAddressExpr},
            ${pickupLatExpr},
            ${pickupLngExpr},
           o.city_code,
           o.seller_id,
           o.aggregator_id,
           sel.name AS seller_name,
           sel.display_phone AS seller_phone,
           ap.business_name AS aggregator_business_name,
           agg.display_phone AS aggregator_phone,
           ap.aggregator_type
         FROM orders o
         LEFT JOIN users sel ON sel.id = o.seller_id
         LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
         LEFT JOIN users agg ON agg.id = o.aggregator_id
         LEFT JOIN order_status_history osh_completed ON osh_completed.order_id = o.id AND osh_completed.new_status = 'completed'
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
    const [hasOrdersDeletedAt, hasPickupLat, hasPickupLng] = await Promise.all([
      columnExists('orders', 'deleted_at'),
      columnExists('orders', 'pickup_lat'),
      columnExists('orders', 'pickup_lng'),
    ]);

    if (!hasPickupLat || !hasPickupLng) {
      return res.json([]);
    }

    const deletedFilter = hasOrdersDeletedAt ? 'AND o.deleted_at IS NULL' : '';

    const result = await query(
      `SELECT
         o.id, o.status, o.pickup_lat AS lat, o.pickup_lng AS lng,
         o.created_at, o.city_code,
         sel.name AS seller_name,
         ap.business_name AS aggregator_name
       FROM orders o
       LEFT JOIN users sel ON sel.id = o.seller_id
       LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
       WHERE o.pickup_lat IS NOT NULL
         AND o.pickup_lng IS NOT NULL
         ${deletedFilter}
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
    const [
      hasScheduledAt,
      hasPickedUpAt,
      hasCompletedAt,
      hasCancelledAt,
      hasCancellationReason,
      hasAmountDue,
      hasSellerNote,
      hasPickupAddress,
      hasPickupAddressText,
      hasPickupLat,
      hasPickupLng,
      hasAggregatorAcceptedAt,
      hasHistoryStatus,
      hasHistoryNewStatus,
      hasHistoryChangedAt,
      hasHistoryCreatedAt,
      hasItemEstimatedWeight,
      hasItemActualWeight,
      hasItemConfirmedWeight,
      hasItemUnitPrice,
      hasItemRatePerKg,
      hasItemLineAmount,
      hasItemAmount,
    ] = await Promise.all([
      columnExists('orders', 'scheduled_at'),
      columnExists('orders', 'picked_up_at'),
      columnExists('orders', 'completed_at'),
      columnExists('orders', 'cancelled_at'),
      columnExists('orders', 'cancellation_reason'),
      columnExists('orders', 'amount_due'),
      columnExists('orders', 'seller_note'),
      columnExists('orders', 'pickup_address'),
      columnExists('orders', 'pickup_address_text'),
      columnExists('orders', 'pickup_lat'),
      columnExists('orders', 'pickup_lng'),
      columnExists('orders', 'aggregator_accepted_at'),
      columnExists('order_status_history', 'status'),
      columnExists('order_status_history', 'new_status'),
      columnExists('order_status_history', 'changed_at'),
      columnExists('order_status_history', 'created_at'),
      columnExists('order_items', 'estimated_weight_kg'),
      columnExists('order_items', 'actual_weight_kg'),
      columnExists('order_items', 'confirmed_weight_kg'),
      columnExists('order_items', 'unit_price_per_kg'),
      columnExists('order_items', 'rate_per_kg'),
      columnExists('order_items', 'line_amount'),
      columnExists('order_items', 'amount'),
    ]);

    const scheduledAtExpr = hasScheduledAt ? 'o.scheduled_at' : 'NULL::timestamptz AS scheduled_at';
    const pickedUpAtExpr = hasPickedUpAt ? 'o.picked_up_at' : 'NULL::timestamptz AS picked_up_at';
    const completedAtExpr = hasCompletedAt ? 'o.completed_at' : 'NULL::timestamptz AS completed_at';
    const cancelledAtExpr = hasCancelledAt ? 'o.cancelled_at' : 'NULL::timestamptz AS cancelled_at';
    const cancellationReasonExpr = hasCancellationReason
      ? 'o.cancellation_reason'
      : 'NULL::text AS cancellation_reason';
    const amountDueExpr = hasAmountDue ? 'o.amount_due' : 'NULL::numeric AS amount_due';
    const sellerNoteExpr = hasSellerNote ? 'o.seller_note' : 'NULL::text AS seller_note';
    const pickupAddressExpr = hasPickupAddress
      ? 'o.pickup_address'
      : hasPickupAddressText
        ? 'o.pickup_address_text AS pickup_address'
        : 'NULL::text AS pickup_address';
    const pickupLatExpr = hasPickupLat ? 'o.pickup_lat' : 'NULL::double precision AS pickup_lat';
    const pickupLngExpr = hasPickupLng ? 'o.pickup_lng' : 'NULL::double precision AS pickup_lng';
    const aggregatorAcceptedAtExpr = hasAggregatorAcceptedAt
      ? 'o.aggregator_accepted_at'
      : 'NULL::timestamptz AS aggregator_accepted_at';

    const historyStatusExpr = hasHistoryStatus
      ? 'status'
      : hasHistoryNewStatus
        ? 'new_status AS status'
        : "'unknown'::text AS status";
    const historyChangedAtExpr = hasHistoryChangedAt
      ? 'changed_at'
      : hasHistoryCreatedAt
        ? 'created_at AS changed_at'
        : 'NOW() AS changed_at';

    const itemEstimatedWeightExpr = hasItemEstimatedWeight
      ? 'oi.estimated_weight_kg'
      : 'NULL::numeric AS estimated_weight_kg';
    const itemActualWeightExpr = hasItemActualWeight
      ? 'oi.actual_weight_kg'
      : hasItemConfirmedWeight
        ? 'oi.confirmed_weight_kg AS actual_weight_kg'
        : 'NULL::numeric AS actual_weight_kg';
    const itemUnitPriceExpr = hasItemUnitPrice
      ? 'oi.unit_price_per_kg'
      : hasItemRatePerKg
        ? 'oi.rate_per_kg AS unit_price_per_kg'
        : 'NULL::numeric AS unit_price_per_kg';
    const itemLineAmountExpr = hasItemLineAmount
      ? 'oi.line_amount'
      : hasItemAmount
        ? 'oi.amount AS line_amount'
        : 'NULL::numeric AS line_amount';

    const [orderRes, itemsRes, timelineRes, mediasRes, disputesRes] = await Promise.all([
      query(
        `SELECT
             o.id, o.status, o.created_at, o.order_number, ${scheduledAtExpr},
             ${pickedUpAtExpr}, ${completedAtExpr}, ${cancelledAtExpr},
           ${cancellationReasonExpr}, ${amountDueExpr}, ${sellerNoteExpr},
           ${pickupAddressExpr}, ${pickupLatExpr}, ${pickupLngExpr}, o.city_code,
           o.preferred_pickup_window, ${aggregatorAcceptedAtExpr},
           o.seller_id, o.aggregator_id,
           sel.name AS seller_name,
           sel.display_phone AS seller_phone,
           sel.created_at AS seller_joined_at,
           sa.building_name AS seller_flat, sa.street AS seller_street,
           sa.colony AS seller_area, sa.city AS seller_city,
           sa.pincode AS seller_pincode,
           ap.business_name AS aggregator_business_name,
           ap.aggregator_type, ap.city_code AS aggregator_city,
           ap.kyc_status AS aggregator_kyc_status,
           agg.display_phone AS aggregator_phone,
           agg.name AS aggregator_name,
           NULL::numeric AS distance_km
         FROM orders o
         JOIN users sel ON sel.id = o.seller_id
         LEFT JOIN seller_addresses sa ON sa.seller_id = o.seller_id AND sa.is_default = true
         LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
         LEFT JOIN users agg ON agg.id = o.aggregator_id
         WHERE o.id = $1`,
        [id]
      ),
      query(
        `SELECT oi.material_code, ${itemEstimatedWeightExpr}, ${itemActualWeightExpr},
                ${itemUnitPriceExpr}, ${itemLineAmountExpr}
         FROM order_items oi WHERE oi.order_id = $1 ORDER BY oi.material_code`,
        [id]
      ),
      query(
        `SELECT ${historyStatusExpr}, ${historyChangedAtExpr}, changed_by, note
         FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC`,
        [id]
      ),
      query(
        `SELECT id, media_type, storage_path, created_at
         FROM order_media WHERE order_id = $1 ORDER BY created_at ASC`,
        [id]
      ),
      query(
        `SELECT
           ${disputePublicIdExpr('d')} AS id,
           d.id AS uuid,
           d.order_id,
           d.issue_type,
           d.description,
           d.status,
           d.created_at,
           d.resolved_at,
           d.resolution_note,
           d.raised_by
         FROM disputes d
         WHERE d.order_id = $1
         ORDER BY d.created_at DESC`,
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

    // Audit log should not block the response path.
    void query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, 'order_detail_viewed', 'orders', $2, $3, NOW())`,
      [adminUserId, id, JSON.stringify({ context: 'admin_portal' })]
    ).catch((auditErr) => {
      console.error('[admin/orders/:id] audit insert failed', auditErr);
    });

    return res.json({
      ...order,
      items: itemsRes.rows,
      timeline: timelineRes.rows,
      media,
      disputes: disputesRes.rows,
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
    if (analyticsCache && analyticsCache.expiresAt > Date.now()) {
      return res.json(analyticsCache.payload);
    }

    const [hasAmountDue, hasConfirmedValue, hasEstimatedValue, hasCompletedAt, hasDeletedAt, hasRatingsTable] = await Promise.all([
      columnExists('orders', 'amount_due'),
      columnExists('orders', 'confirmed_value'),
      columnExists('orders', 'estimated_value'),
      columnExists('orders', 'completed_at'),
      columnExists('orders', 'deleted_at'),
      tableExists('ratings'),
    ]);

    let orderValueExpr = '0';
    let orderValueExprNoAlias = '0';
    if (hasAmountDue) {
      orderValueExpr = 'o.amount_due';
      orderValueExprNoAlias = 'amount_due';
    } else if (hasConfirmedValue && hasEstimatedValue) {
      orderValueExpr = 'COALESCE(o.confirmed_value, o.estimated_value, 0)';
      orderValueExprNoAlias = 'COALESCE(confirmed_value, estimated_value, 0)';
    } else if (hasConfirmedValue) {
      orderValueExpr = 'COALESCE(o.confirmed_value, 0)';
      orderValueExprNoAlias = 'COALESCE(confirmed_value, 0)';
    } else if (hasEstimatedValue) {
      orderValueExpr = 'COALESCE(o.estimated_value, 0)';
      orderValueExprNoAlias = 'COALESCE(estimated_value, 0)';
    }

    const revenueTimeExpr = hasCompletedAt ? 'completed_at' : 'created_at';
    const ordersWhereDeleted = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
    const ordersWhereDeletedAlias = hasDeletedAt ? 'AND o.deleted_at IS NULL' : '';
    const ratingsJoin = hasRatingsTable
      ? `LEFT JOIN ratings r ON r.order_id = o.id AND r.ratee_id = o.aggregator_id`
      : '';
    const avgRatingExpr = hasRatingsTable
      ? 'COALESCE(AVG(r.score), 0)::numeric(3,2) AS avg_rating'
      : '0::numeric(3,2) AS avg_rating';

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
          ${ordersWhereDeleted}
        GROUP BY day ORDER BY day ASC
      `),
      // Status distribution
      query(`
        SELECT status, COUNT(*) AS count
        FROM orders WHERE 1=1 ${ordersWhereDeleted}
        GROUP BY status ORDER BY count DESC
      `),
      // City breakdown
      query(`
        SELECT city_code, COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status='completed') AS completed
        FROM orders WHERE 1=1 ${ordersWhereDeleted}
        GROUP BY city_code ORDER BY total DESC
      `),
      // Top 10 sellers by order count
      query(`
        SELECT sel.id, sel.name,
               COUNT(o.id) AS total_orders,
               COUNT(o.id) FILTER (WHERE o.status='completed') AS completed_orders,
               COALESCE(SUM(${orderValueExpr}) FILTER (WHERE o.status='completed'), 0) AS total_gmv
        FROM orders o JOIN users sel ON sel.id = o.seller_id
        WHERE 1=1 ${ordersWhereDeletedAlias}
        GROUP BY sel.id, sel.name
        ORDER BY total_orders DESC LIMIT 10
      `),
      // Top 10 aggregators by completed orders
      query(`
        SELECT agg.id, agg.name, ap.business_name,
               COUNT(o.id) FILTER (WHERE o.status='completed') AS completed_orders,
               ${avgRatingExpr}
        FROM orders o
        JOIN users agg ON agg.id = o.aggregator_id
        LEFT JOIN aggregator_profiles ap ON ap.user_id = o.aggregator_id
        ${ratingsJoin}
        WHERE o.status = 'completed' ${ordersWhereDeletedAlias}
        GROUP BY agg.id, agg.name, ap.business_name
        ORDER BY completed_orders DESC LIMIT 10
      `),
      // Hourly order distribution (0-23)
      query(`
        SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
               COUNT(*) AS orders
        FROM orders WHERE 1=1 ${ordersWhereDeleted}
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY hour ORDER BY hour ASC
      `),
      // Weekly GMV (last 12 weeks)
      query(`
        SELECT
          DATE_TRUNC('week', ${revenueTimeExpr} AT TIME ZONE 'Asia/Kolkata') AS week_start,
          COUNT(*) AS completed_orders,
          COALESCE(SUM(${orderValueExprNoAlias}), 0) AS gmv
        FROM orders
        WHERE status = 'completed' ${ordersWhereDeleted}
          AND ${revenueTimeExpr} > NOW() - INTERVAL '12 weeks'
        GROUP BY week_start ORDER BY week_start ASC
      `),
    ]);

    const payload = {
      daily_orders: dailyOrdersRes.rows,
      status_breakdown: statusBreakdownRes.rows,
      city_breakdown: cityBreakdownRes.rows,
      top_sellers: topSellersRes.rows,
      top_aggregators: topAggregatorsRes.rows,
      hourly_distribution: hourlyDistributionRes.rows,
      revenue_weekly: revenueWeeklyRes.rows,
    };

    analyticsCache = {
      expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS,
      payload,
    };

    return res.json(payload);
  } catch (err) {
    console.error('[admin/analytics]', err);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics/users
// User registration analytics with date range filtering
// Query params:
//   range: 'today' | '2days' | 'week' | 'month' | 'all' | 'custom'
//   from: ISO date string (required for custom)
//   to:   ISO date string (required for custom)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics/users', async (req: Request, res: Response) => {
  const { range = 'all', from, to } = req.query as Record<string, string>;

  let whereClause = '';
  const params: any[] = [];

  if (range === 'today') {
    whereClause = `AND created_at >= NOW() AT TIME ZONE 'Asia/Kolkata' - INTERVAL '1 day'`;
  } else if (range === '2days') {
    whereClause = `AND created_at >= NOW() AT TIME ZONE 'Asia/Kolkata' - INTERVAL '2 days'`;
  } else if (range === 'week') {
    whereClause = `AND created_at >= NOW() AT TIME ZONE 'Asia/Kolkata' - INTERVAL '7 days'`;
  } else if (range === 'month') {
    whereClause = `AND created_at >= NOW() AT TIME ZONE 'Asia/Kolkata' - INTERVAL '30 days'`;
  } else if (range === 'custom' && from && to) {
    whereClause = `AND created_at >= $1::timestamptz AND created_at < ($2::date + INTERVAL '1 day')::timestamptz`;
    params.push(from, to);
  }
  // range === 'all' → no filter

  try {
    const [hasPhoneLast4, hasEmail] = await Promise.all([
      columnExists('users', 'phone_last4'),
      columnExists('users', 'email'),
    ]);
    const phoneLast4Expr = hasPhoneLast4 ? 'phone_last4' : `NULL::text AS phone_last4`;
    const emailExpr = hasEmail ? 'email' : `NULL::text AS email`;

    const [countRes, detailRes] = await Promise.all([
      // Summary count by user_type
      query(
        `SELECT user_type,
                COUNT(*) AS count,
                DATE(MIN(created_at) AT TIME ZONE 'Asia/Kolkata') AS earliest,
                DATE(MAX(created_at) AT TIME ZONE 'Asia/Kolkata') AS latest
         FROM users
         WHERE user_type IN ('seller', 'aggregator') ${whereClause}
         GROUP BY user_type`,
        params
      ),
      // Detailed user list
      query(
        `SELECT id, name, user_type, ${phoneLast4Expr}, ${emailExpr}, is_active,
                created_at AT TIME ZONE 'Asia/Kolkata' AS created_at
         FROM users
         WHERE user_type IN ('seller', 'aggregator') ${whereClause}
         ORDER BY created_at DESC
         LIMIT 200`,
        params
      ),
    ]);

    const sellersRow = countRes.rows.find((r: any) => r.user_type === 'seller') ?? { count: 0 };
    const aggregatorsRow = countRes.rows.find((r: any) => r.user_type === 'aggregator') ?? { count: 0 };

    return res.json({
      range,
      total: Number(sellersRow.count) + Number(aggregatorsRow.count),
      sellers: Number(sellersRow.count),
      aggregators: Number(aggregatorsRow.count),
      users: detailRes.rows.map((u: any) => ({
        id: u.id,
        name: u.name,
        user_type: u.user_type,
        phone_last4: u.phone_last4,
        email: u.email ?? null,
        is_active: u.is_active,
        created_at: u.created_at,
      })),
    });
  } catch (err) {
    console.error('[admin/analytics/users]', err);
    return res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/:id
// Get comprehensive user details for admin inspection
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminUserId = req.user!.id;
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const perPage = Math.min(50, Math.max(1, Number.parseInt(String(req.query.per_page ?? '10'), 10) || 10));
  const offset = (page - 1) * perPage;

  try {
    const [
      hasDisplayPhone,
      hasEmail,
      hasProfilePhotoUrl,
      hasAggAggregatorType,
      hasAggVehicleType,
      hasAggHomeLat,
      hasAggHomeLng,
      hasAggOnboardingComplete,
      hasAmountDue,
      hasConfirmedValue,
      hasEstimatedValue,
      hasCompletedAt,
      hasDeletedAt,
      hasRatingsTable,
      hasDisputesTable,
    ] = await Promise.all([
      columnExists('users', 'display_phone'),
      columnExists('users', 'email'),
      columnExists('users', 'profile_photo_url'),
      columnExists('aggregator_profiles', 'aggregator_type'),
      columnExists('aggregator_profiles', 'vehicle_type'),
      columnExists('aggregator_profiles', 'home_lat'),
      columnExists('aggregator_profiles', 'home_lng'),
      columnExists('aggregator_profiles', 'is_onboarding_complete'),
      columnExists('orders', 'amount_due'),
      columnExists('orders', 'confirmed_value'),
      columnExists('orders', 'estimated_value'),
      columnExists('orders', 'completed_at'),
      columnExists('orders', 'deleted_at'),
      tableExists('ratings'),
      tableExists('disputes'),
    ]);

    const displayPhoneExpr = hasDisplayPhone ? 'display_phone' : `NULL::text AS display_phone`;
    const emailExpr = hasEmail ? 'email' : `NULL::text AS email`;
    const photoUrlExpr = hasProfilePhotoUrl ? 'profile_photo_url AS photo_url' : `NULL::text AS photo_url`;
    const aggTypeExpr = hasAggAggregatorType ? 'aggregator_type' : `NULL::text AS aggregator_type`;
    const vehicleTypeExpr = hasAggVehicleType ? 'vehicle_type' : `NULL::text AS vehicle_type`;
    const homeLatExpr = hasAggHomeLat ? 'home_lat' : `NULL::numeric AS home_lat`;
    const homeLngExpr = hasAggHomeLng ? 'home_lng' : `NULL::numeric AS home_lng`;
    const onboardingExpr = hasAggOnboardingComplete
      ? 'is_onboarding_complete'
      : `NULL::boolean AS is_onboarding_complete`;

    let orderValueExpr = '0';
    if (hasAmountDue) {
      orderValueExpr = 'o.amount_due';
    } else if (hasConfirmedValue && hasEstimatedValue) {
      orderValueExpr = 'COALESCE(o.confirmed_value, o.estimated_value, 0)';
    } else if (hasConfirmedValue) {
      orderValueExpr = 'COALESCE(o.confirmed_value, 0)';
    } else if (hasEstimatedValue) {
      orderValueExpr = 'COALESCE(o.estimated_value, 0)';
    }

    const recentAmountExpr = hasAmountDue
      ? 'amount_due'
      : (hasConfirmedValue && hasEstimatedValue
          ? 'COALESCE(confirmed_value, estimated_value, 0) AS amount_due'
          : hasConfirmedValue
            ? 'COALESCE(confirmed_value, 0) AS amount_due'
            : hasEstimatedValue
              ? 'COALESCE(estimated_value, 0) AS amount_due'
              : '0::numeric AS amount_due');
    const completedAtExpr = hasCompletedAt ? 'completed_at' : 'NULL::timestamptz AS completed_at';
    const deletedFilter = hasDeletedAt ? 'AND o.deleted_at IS NULL' : '';
    const deletedFilterNoAlias = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
    const complaintsExprAggregator = hasDisputesTable
      ? '(SELECT COUNT(*) FROM disputes d JOIN orders so ON d.order_id = so.id WHERE so.aggregator_id = $1) AS complaints_count'
      : '0::bigint AS complaints_count';
    const complaintsExprSeller = hasDisputesTable
      ? '(SELECT COUNT(*) FROM disputes d JOIN orders so ON d.order_id = so.id WHERE so.seller_id = $1) AS complaints_count'
      : '0::bigint AS complaints_count';
    const avgRatingExpr = hasRatingsTable
      ? '(SELECT COALESCE(AVG(score), 0)::numeric(3,2) FROM ratings WHERE ratee_id = $1) AS avg_rating'
      : '0::numeric(3,2) AS avg_rating';
    const ratingsCountExpr = hasRatingsTable
      ? '(SELECT COUNT(*) FROM ratings WHERE ratee_id = $1) AS ratings_count'
      : '0::bigint AS ratings_count';

    const userRes = await query(
      `SELECT id, name, user_type, ${displayPhoneExpr}, ${emailExpr}, is_active, created_at, ${photoUrlExpr}
       FROM users WHERE id = $1`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    if (user.photo_url) {
      const bucketName = resolveProfilePhotosBucket();
      try {
        user.photo_url = await storageProvider.getSignedUrl(user.photo_url, 3600, bucketName);
      } catch {
        user.photo_url = null;
      }
    }
    let profile = null;
    let stats = null;
    let reviews: Array<{
      id: string;
      order_id: string | null;
      score: number;
      review: string | null;
      created_at: string;
      reviewer_id: string | null;
      reviewer_name: string | null;
    }> = [];

    if (user.user_type === 'aggregator') {
      const profileRes = await query(
        `SELECT business_name, ${aggTypeExpr}, city_code, kyc_status, ${vehicleTypeExpr},
                ${homeLatExpr}, ${homeLngExpr}, ${onboardingExpr}
         FROM aggregator_profiles WHERE user_id = $1`,
        [id]
      );
      if (profileRes.rows.length > 0) profile = profileRes.rows[0];

      const statsRes = await query(
        `SELECT
           COUNT(o.id) AS total_orders,
           COUNT(o.id) FILTER (WHERE o.status = 'completed') AS completed_orders,
           COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
           COALESCE(SUM(${orderValueExpr}) FILTER (WHERE o.status = 'completed'), 0) AS total_earnings,
           ${complaintsExprAggregator},
           ${avgRatingExpr},
           ${ratingsCountExpr}
         FROM orders o WHERE o.aggregator_id = $1 ${deletedFilter}`,
        [id]
      );
      if (statsRes.rows.length > 0) stats = statsRes.rows[0];

    } else if (user.user_type === 'seller') {
      const statsRes = await query(
        `SELECT
           COUNT(o.id) AS total_orders,
           COUNT(o.id) FILTER (WHERE o.status = 'completed') AS completed_orders,
           COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
           COALESCE(SUM(${orderValueExpr}) FILTER (WHERE o.status = 'completed'), 0) AS total_earnings,
           ${complaintsExprSeller},
           ${avgRatingExpr},
           ${ratingsCountExpr}
         FROM orders o WHERE o.seller_id = $1 ${deletedFilter}`,
        [id]
      );
      if (statsRes.rows.length > 0) stats = statsRes.rows[0];
    }

    // Paginated orders for context
    const recentOrdersQuery = user.user_type === 'aggregator' ? 'aggregator_id' : 'seller_id';
    const [recentOrdersRes, recentOrdersCountRes] = await Promise.all([
      query(
        `SELECT id, status, ${recentAmountExpr}, created_at, ${completedAtExpr}
         FROM orders WHERE ${recentOrdersQuery} = $1 ${deletedFilterNoAlias}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [id, perPage, offset]
      ),
      query(
        `SELECT COUNT(*)::int AS total
         FROM orders
         WHERE ${recentOrdersQuery} = $1 ${deletedFilterNoAlias}`,
        [id]
      ),
    ]);
    const recentOrdersTotal = Number(recentOrdersCountRes.rows[0]?.total ?? 0);
    const recentOrdersTotalPages = Math.max(1, Math.ceil(recentOrdersTotal / perPage));

    if (hasRatingsTable) {
      const reviewsRes = await query(
        `SELECT
           r.id,
           r.order_id,
           r.score,
           r.review,
           r.created_at,
           r.rater_id AS reviewer_id,
           u.name AS reviewer_name
         FROM ratings r
         LEFT JOIN users u ON u.id = r.rater_id
         WHERE r.ratee_id = $1
         ORDER BY r.created_at DESC
         LIMIT 25`,
        [id]
      );
      reviews = reviewsRes.rows.map((row: any) => ({
        id: String(row.id),
        order_id: row.order_id ? String(row.order_id) : null,
        score: Number(row.score ?? 0),
        review: row.review ?? null,
        created_at: row.created_at,
        reviewer_id: row.reviewer_id ? String(row.reviewer_id) : null,
        reviewer_name: row.reviewer_name ?? null,
      }));
    }

    // Audit log should not block the response path.
    void query(
      `INSERT INTO admin_audit_log (actor_id, action, target_entity, target_id, metadata, created_at)
       VALUES ($1, 'user_detail_viewed', 'users', $2, $3, NOW())`,
      [adminUserId, id, JSON.stringify({ context: 'admin_portal' })]
    ).catch((auditErr) => {
      console.error('[admin/users/:id] audit insert failed', auditErr);
    });

    return res.json({
      user,
      profile,
      stats,
      recent_orders: recentOrdersRes.rows,
      recent_orders_total: recentOrdersTotal,
      recent_orders_page: page,
      recent_orders_per_page: perPage,
      recent_orders_total_pages: recentOrdersTotalPages,
      reviews,
    });
  } catch (err) {
    console.error('[admin/users/:id]', err);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

export default router;
