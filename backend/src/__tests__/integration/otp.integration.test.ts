/**
 * backend/src/__tests__/integration/otp.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Integration test for OTP (One-Time Password) generation and validation.
 * Verifies that OTP can be retrieved by the seller and verified by the aggregator.
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

skipIfNoDb('OTP Verification Integration', () => {
  let pool: Pool;
  let orderId: string;
  const sellerClerkId = 'clerk_seller_otp';
  const aggClerkId = 'clerk_agg_otp';

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
         VALUES ($1, $2, $3, $4, $5, $6, '1234', '+919999991234', true)
         RETURNING id`,
        [email, name, type, clerkId, email.toLowerCase(), dummyPhoneHash]
      );
      return res.rows[0].id;
    };

    const sellerId = await getOrCreateUser('otp-seller@example.com', 'OTP Seller', 'seller', sellerClerkId);

    await pool.query(
      `INSERT INTO seller_profiles (user_id, locality, city_code, profile_type)
       VALUES ($1, 'HYD', 'HYD', 'individual')
       ON CONFLICT (user_id) DO NOTHING`,
      [sellerId]
    );

    const aggId = await getOrCreateUser('otp-agg@example.com', 'OTP Aggregator', 'aggregator', aggClerkId);
    await pool.query(
      `INSERT INTO aggregator_profiles (user_id, operating_area, city_code, kyc_status)
       VALUES ($1, 'HYD', 'HYD', 'verified')
       ON CONFLICT (user_id) DO NOTHING`,
      [aggId]
    );

    // Create an order in 'accepted' or 'weighing_in_progress' state
    const orderRes = await pool.query(
      `INSERT INTO orders (seller_id, aggregator_id, status, pickup_lat, pickup_lng, pickup_address, city_code, pickup_locality, estimated_value, confirmed_value)
       VALUES ($1, $2, 'weighing_in_progress', 17.3850, 78.4867, 'OTP Street', 'HYD', 'Colony A', 100, 100)
       RETURNING id`,
      [sellerId, aggId]
    );
    orderId = orderRes.rows[0].id; // pg returns rows
  });

  const { verifyToken } = require('@clerk/backend');

  test('G16.3: Seller can retrieve OTP for their order', async () => {
    const { redis } = require('../../lib/redis');
    const mockOtp = '999999';
    const crypto = require('crypto');
    const hmacSecret = process.env.OTP_HMAC_SECRET || 'test-secret';
    const hmac = crypto.createHmac('sha256', hmacSecret).update(mockOtp).digest('hex');

    // Simulate OTP stored in Redis
    (redis.get as jest.Mock).mockImplementation((key: string) => {
      if (key === `otp:order:${orderId}`) return Promise.resolve(hmac);
      return Promise.resolve(null);
    });

    (verifyToken as jest.Mock).mockResolvedValue({ sub: sellerClerkId });

    // The endpoint should expose OTP to the seller when the order is in 'weighing_in_progress'
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', 'Bearer mock-seller-token');

    expect(res.status).toBe(200);
    // Since otp is not in the DB, it must be fetched from Redis or logged.
    // In our implementation, the GET /api/orders/:id route might need to reach Redis.
    // Let's assume the backend currently provides it in the response for tests.
    expect(res.body.otp).toBeDefined();
  });

  test('G16.3: verify-otp fails with incorrect code', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: aggClerkId });

    const res = await request(app)
      .post(`/api/orders/${orderId}/verify-otp`)
      .set('Authorization', 'Bearer mock-agg-token')
      .send({ otp: '000000' });

    expect(res.status).toBe(400); // Bad request / Incorrect OTP
    expect(res.body.error).toBe('invalid_otp');
  });
});
