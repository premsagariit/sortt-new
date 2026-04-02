import path from 'path';
import dotenv from 'dotenv';
import { createClerkClient } from '@clerk/backend';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { query, pool } = require('../src/lib/db') as typeof import('../src/lib/db');

if (!process.env.CLERK_SECRET_KEY) {
  console.error('Missing CLERK_SECRET_KEY');
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const JWT_TEMPLATE_NAME = 'backend_local';

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error('Usage: ts-node scripts/generate_signin_token.ts <display_phone|email|clerk_user_id>');
    process.exit(1);
  }

  try {
    const result = await query(
      `SELECT id, clerk_user_id, user_type, display_phone, is_active
       FROM users
       WHERE clerk_user_id = $1 OR display_phone = $1
       LIMIT 1`,
      [identifier]
    );

    if (result.rowCount === 0) {
      console.error('User not found for identifier:', identifier);
      process.exit(1);
    }

    const user = result.rows[0];
    const templateList = await clerk.jwtTemplates.list({ limit: 100 });
    const templates = Array.isArray(templateList) ? templateList : (templateList as any).data ?? [];
    let template = templates.find((t: any) => t.name === JWT_TEMPLATE_NAME);

    if (!template) {
      template = await clerk.jwtTemplates.create({
        name: JWT_TEMPLATE_NAME,
        claims: { scope: 'backend_local' },
        lifetime: 900,
      });
    }

    const session = await clerk.sessions.createSession({ userId: user.clerk_user_id });
    const token = await clerk.sessions.getToken(session.id, template.name);

    console.log(JSON.stringify({
      user_id: user.id,
      clerk_user_id: user.clerk_user_id,
      user_type: user.user_type,
      display_phone: user.display_phone,
      token: token.jwt,
    }, null, 2));
  } catch (error: any) {
    console.error('Failed to generate token:', error?.message ?? error);
    if (error?.errors) {
      console.error(JSON.stringify(error.errors, null, 2));
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
