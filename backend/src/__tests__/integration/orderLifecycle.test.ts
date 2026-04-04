/**
 * backend/src/__tests__/integration/orderLifecycle.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Integration test for the full order lifecycle:
 *   1. Seller creates order (status: 'created')
 *   2. Aggregator accepts order (status: 'accepted')
 *   3. Aggregator finalizes weighing (status: 'weighing_in_progress')
 *   4. Aggregator verifies OTP (status: 'completed')
 * ─────────────────────────────────────────────────────────────────
 */

import request from 'supertest';
import { Pool } from 'pg';
import app from '../../index';

// Mock Clerk verifyToken
jest.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
        getUser: jest.fn().mockResolvedValue({
            id: 'clerk_user_123',
            primaryPhoneNumberId: 'phone_123',
            phoneNumbers: [{ id: 'phone_123', phoneNumber: '+917893641009' }]
        })
    }
  }),
  verifyToken: jest.fn(),
}));

jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock Redis
jest.mock('../../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

const skipIfNoDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

skipIfNoDb('Order Lifecycle Integration', () => {
  let pool: Pool;
  let sellerId: string;
  let aggregatorId: string;
  let orderId: string;
  let addressId: string;
  const sellerClerkId = 'clerk_seller_lifecycle';
  const aggClerkId = 'clerk_agg_lifecycle';

  beforeAll(async () => {
    pool = global.__testPool as Pool;

    // Helper to get or create user
    const getOrCreateUser = async (email: string, name: string, type: string, clerkId: string) => {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount && existing.rowCount > 0) {
        await pool.query('UPDATE users SET clerk_user_id = $1 WHERE id = $2', [clerkId, existing.rows[0].id]);
        return existing.rows[0].id;
      }
      const dummyPhoneHash = `hash_${clerkId}`;
      const res = await pool.query(
        `INSERT INTO users (email, name, user_type, clerk_user_id, email_normalized, phone_hash, phone_last4, display_phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, '1234', '+917777771234', true)
         RETURNING id`,
        [email, name, type, clerkId, email.toLowerCase(), dummyPhoneHash]
      );
      return res.rows[0].id;
    };

    sellerId = await getOrCreateUser('lifecycle-seller@example.com', 'Lifecycle Seller', 'seller', sellerClerkId);

    await pool.query(
      `INSERT INTO seller_profiles (user_id, locality, city_code, profile_type)
       VALUES ($1, 'HYD', 'HYD', 'individual')
       ON CONFLICT (user_id) DO NOTHING`,
      [sellerId]
    );

    const addressRes = await pool.query(
      `INSERT INTO seller_addresses (seller_id, city, city_code, pickup_locality, pincode, latitude, longitude)
       VALUES ($1, 'HYD', 'HYD', 'Colony A', '500001', 17.3850, 78.4867)
       RETURNING id`,
      [sellerId]
    );
    addressId = addressRes.rows[0].id;

    aggregatorId = await getOrCreateUser('lifecycle-agg@example.com', 'Lifecycle Aggregator', 'aggregator', aggClerkId);

    await pool.query(
      `INSERT INTO aggregator_profiles (user_id, operating_area, city_code, kyc_status)
       VALUES ($1, 'HYD', 'HYD', 'verified')
       ON CONFLICT (user_id) DO NOTHING`,
      [aggregatorId]
    );

    // Seed material rates
    await pool.query(
      `INSERT INTO aggregator_material_rates (aggregator_id, material_code, rate_per_kg, is_custom)
       VALUES ($1, 'metal', 20, false), ($1, 'plastic', 10, false)
       ON CONFLICT (aggregator_id, material_code) WHERE is_custom = false AND material_code IS NOT NULL
       DO UPDATE SET rate_per_kg = EXCLUDED.rate_per_kg`,
      [aggregatorId]
    );

    // Seed price_index (required for estimated_value calculation)
    await pool.query("DELETE FROM price_index WHERE material_code IN ('metal', 'plastic') AND city_code = 'HYD'");
    await pool.query(
      `INSERT INTO price_index (material_code, rate_per_kg, city_code)
       VALUES ('metal', 30.0, 'HYD'), ('plastic', 15.0, 'HYD')`
    );
  });

  const { verifyToken } = require('@clerk/backend');

  test('G16.1: Seller creates an order → status: created', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: sellerClerkId });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer mock-seller-token')
      .send({
        material_codes: ['metal', 'plastic'],
        estimated_weights: { metal: 10, plastic: 5 },
        selectedAddressId: addressId,
        pickup_preference: 'ASAP'
      });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeDefined();
    orderId = res.body.order.id;
    expect(res.body.order.status).toBe('created');
  });

  test('G16.2: Aggregator accepts order → status: accepted', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: aggClerkId });

    const res = await request(app)
      .post(`/api/orders/${orderId}/accept`)
      .set('Authorization', 'Bearer mock-agg-token');

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('accepted');
    expect(res.body.order.aggregator_id).toBe(aggregatorId);
  });

  test('G16.3: Aggregator finalizes weighing → status: weighing_in_progress', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: aggClerkId });

    await pool.query("UPDATE orders SET status = 'arrived' WHERE id = $1", [orderId]);

    const res = await request(app)
      .post(`/api/orders/${orderId}/finalize-weighing`)
      .set('Authorization', 'Bearer mock-agg-token')
      .send({
        line_items: [
          { material_code: 'metal', confirmed_weight_kg: 12, rate_per_kg: 20 },
          { material_code: 'plastic', confirmed_weight_kg: 6, rate_per_kg: 10 }
        ]
      });
    const items = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [orderId]);
    console.log('[DEBUG] DB order_items after finalize:', items.rows);
    console.log('[DEBUG] finalize-weighing response:', res.status, JSON.stringify(res.body));

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('weighing_in_progress');
    // 12*20 + 6*10 = 240 + 60 = 300
    expect(Number(res.body.order.confirmed_value)).toBe(300);
  });

  test('G16.4: Aggregator completes order via verify-otp → status: completed', async () => {
    const { redis } = require('../../lib/redis');
    const mockOtp = '123456';
    const crypto = require('crypto');
    const hmacSecret = process.env.OTP_HMAC_SECRET || 'test-secret';
    const hmac = crypto.createHmac('sha256', hmacSecret).update(mockOtp).digest('hex');

    // Simulate OTP stored in Redis
    (redis.get as jest.Mock).mockImplementation((key: string) => {
      if (key === `otp:order:${orderId}`) return Promise.resolve(hmac);
      return Promise.resolve(null);
    });

    (verifyToken as jest.Mock).mockResolvedValue({ sub: aggClerkId });

    const res = await request(app)
      .post(`/api/orders/${orderId}/verify-otp`)
      .set('Authorization', 'Bearer mock-agg-token')
      .send({ otp: mockOtp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify DB state
    const dbCheck = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    expect(dbCheck.rows[0].status).toBe('completed');
  });
});
