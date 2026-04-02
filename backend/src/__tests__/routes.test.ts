/**
 * backend/src/__tests__/routes.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Route auth tests using supertest.
 * These tests mock the Clerk JWT verification so they run without
 * a real Clerk account. DB tests still skip if TEST_DATABASE_URL absent.
 *
 * Tests:
 *   - Protected routes without JWT → 401
 *   - Admin routes without admin role → 403
 *   - PATCH /api/orders/:id/status with status='completed' → 400 (V13)
 * ─────────────────────────────────────────────────────────────────
 */

import request from 'supertest';

// We need to mock Clerk before importing the app
jest.mock('@clerk/backend', () => ({
  createClerkClient: () => ({}),
  verifyToken: jest.fn().mockRejectedValue(new Error('invalid token')),
}));

jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
}));

// Also mock database to avoid needing a real DB for auth tests
jest.mock('../lib/db', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn().mockResolvedValue({ rows: [] }),
  },
  query: jest.fn().mockResolvedValue({ rows: [] }),
  withUser: jest.fn(),
}));

// Mock redis to avoid connection errors
jest.mock('../lib/redis', () => ({ redis: null }));

import app from '../index';

describe('Route Auth Tests — No JWT → 401', () => {
  const PROTECTED_ROUTES: Array<['GET' | 'POST' | 'PATCH' | 'DELETE', string]> = [
    ['GET',   '/api/orders'],
    ['GET',   '/api/aggregators/availability'],
    ['GET',   '/api/users/me'],
    ['GET',   '/api/messages'],
    ['GET',   '/api/disputes'],
    ['GET',   '/api/admin/stats'],
    ['GET',   '/api/admin/kyc/pending'],
  ];

  test.each(PROTECTED_ROUTES)(
    '%s %s without JWT → 401',
    async (method: string, path: string) => {
      const agent = request(app) as any;
      const res = await agent[method.toLowerCase()](path);
      expect(res.status).toBe(401);
    }
  );
});

describe('Admin routes — non-admin token → 403', () => {
  // Mock verifyToken to return a valid token but user is 'seller'
  beforeAll(() => {
    const { verifyToken } = require('@clerk/backend');
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'clerk_test_seller' });

    const { query } = require('../lib/db');
    (query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('clerk_user_id')) {
        return Promise.resolve({
          rows: [{
            id: 'seller-uuid',
            user_type: 'seller',
            is_active: true,
            name: 'Test Seller',
            locality: 'HYD',
            city_code: 'HYD',
            clerk_user_id: 'clerk_test_seller',
            preferred_language: 'en',
          }],
        });
      }
      // For verifyUserRole cache miss
      if (sql.includes('user_type, is_active FROM users')) {
        return Promise.resolve({
          rows: [{ user_type: 'seller', is_active: true }],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  test('GET /api/admin/stats with seller token → 403', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer mock_seller_token');
    expect(res.status).toBe(403);
  });

  test('GET /api/admin/kyc/pending with seller token → 403', async () => {
    const res = await request(app)
      .get('/api/admin/kyc/pending')
      .set('Authorization', 'Bearer mock_seller_token');
    expect(res.status).toBe(403);
  });
});

describe('Order Status — V13 Protection', () => {
  // Mock as aggregator with valid state
  beforeAll(() => {
    const { verifyToken } = require('@clerk/backend');
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'clerk_test_agg' });

    const { query } = require('../lib/db');
    (query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('clerk_user_id')) {
        return Promise.resolve({
          rows: [{
            id: 'agg-uuid',
            user_type: 'aggregator',
            is_active: true,
            name: 'Test Agg',
            locality: 'HYD',
            city_code: 'HYD',
            clerk_user_id: 'clerk_test_agg',
            preferred_language: 'en',
          }],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  test('PATCH /api/orders/fake-id/status with status=completed → 400 (V13)', async () => {
    const res = await request(app)
      .patch('/api/orders/fake-id/status')
      .set('Authorization', 'Bearer mock_agg_token')
      .send({ status: 'completed' });
    // V13: completed can only be set by verify-otp route
    expect(res.status).toBe(400);
  });
});
