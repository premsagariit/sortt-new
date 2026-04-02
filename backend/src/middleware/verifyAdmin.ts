/**
 * backend/src/middleware/verifyAdmin.ts
 * ─────────────────────────────────────────────────────────────────
 * Middleware that enforces user_type === 'admin' for all /api/admin
 * routes. Wraps the existing verifyUserRole() pattern — never reads
 * user_type from JWT claim (V7). Returns 403 for non-admin users.
 * ─────────────────────────────────────────────────────────────────
 */

import { verifyUserRole } from './verifyRole';

export const verifyAdmin = verifyUserRole('admin');
