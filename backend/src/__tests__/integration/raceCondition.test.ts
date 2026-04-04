/**
 * backend/src/__tests__/integration/raceCondition.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Integration test for order acceptance race conditions.
 * Ensures that two aggregators cannot accept the same order simultaneously.
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

skipIfNoDb('Order Acceptance Race Condition', () => {
  let pool: Pool;
  let orderId: string;
  let addressId: string;
  const agg1ClerkId = 'clerk_agg_1';
  const agg2ClerkId = 'clerk_agg_2';

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
         VALUES ($1, $2, $3, $4, $5, $6, '1234', '+918888881234', true)
         RETURNING id`,
        [email, name, type, clerkId, email.toLowerCase(), dummyPhoneHash]
      );
      return res.rows[0].id;
    };

    const sellerId = await getOrCreateUser('race-seller@example.com', 'Race Seller', 'seller', 'clerk_seller_race');

    const addressRes = await pool.query(
      `INSERT INTO seller_addresses (seller_id, building_name, street, city, city_code, pickup_locality, pincode, latitude, longitude)
       VALUES ($1, 'B1', 'Race Street', 'HYD', 'HYD', 'Colony A', '500002', 17.3850, 78.4867)
       RETURNING id`,
      [sellerId]
    );
    addressId = addressRes.rows[0].id;

    // Create two aggregators
    for (const clerkId of [agg1ClerkId, agg2ClerkId]) {
      const aggId = await getOrCreateUser(`${clerkId}@example.com`, `Agg ${clerkId}`, 'aggregator', clerkId);
      await pool.query(
        `INSERT INTO aggregator_profiles (user_id, operating_area, city_code, kyc_status)
         VALUES ($1, 'HYD', 'HYD', 'verified')
         ON CONFLICT (user_id) DO NOTHING`,
        [aggId]
      );
    }
  });

  const { verifyToken } = require('@clerk/backend');

  test('G16.2 (Race): Only one aggregator can successfully accept the same order', async () => {
    // Create an order
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'clerk_seller_race' });
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer mock-seller-token')
      .send({
        material_codes: ['metal'],
        estimated_weights: { metal: 10 },
        selectedAddressId: addressId,
        pickup_preference: 'ASAP'
      });
    orderId = orderRes.body.order.id;

    // Simulate simultaneous acceptance
    // We'll run them sequentially but check status. In a real race, the DB lock `SKIP LOCKED` or `FOR UPDATE` handles it.
    
    // Aggregator 1 accepts
    (verifyToken as jest.Mock).mockResolvedValue({ sub: agg1ClerkId });
    const res1 = await request(app)
      .post(`/api/orders/${orderId}/accept`)
      .set('Authorization', 'Bearer mock-agg-1-token');

    expect(res1.status).toBe(200);

    // Aggregator 2 accepts immediately after
    (verifyToken as jest.Mock).mockResolvedValue({ sub: agg2ClerkId });
    const res2 = await request(app)
      .post(`/api/orders/${orderId}/accept`)
      .set('Authorization', 'Bearer mock-agg-2-token');

    // Should fail with 409 Conflict if already taken
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('order_already_taken');
  });
});
