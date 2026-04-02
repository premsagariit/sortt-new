/**
 * backend/src/__tests__/setup.ts
 * ─────────────────────────────────────────────────────────────────
 * Jest global setup: initialise DB pool for integration tests.
 * Skips gracefully if TEST_DATABASE_URL is not set — unit tests
 * that don't need DB will still run; CI stays green without a DB.
 * ─────────────────────────────────────────────────────────────────
 */

import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load backend .env so TEST_DATABASE_URL is available
// (Jest runs in a fresh process — index.ts dotenv.config() hasn't run yet)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

declare global {
  // eslint-disable-next-line no-var
  var __testPool: Pool | undefined;
}


beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn(
      '[test-setup] TEST_DATABASE_URL not set — DB-dependent tests will be skipped.'
    );
    return;
  }
  global.__testPool = new Pool({ connectionString: url, max: 3 });
  // Verify connection
  await global.__testPool.query('SELECT 1');
  console.info('[test-setup] DB pool connected to test database.');
});

afterAll(async () => {
  if (global.__testPool) {
    await global.__testPool.end();
  }
});
