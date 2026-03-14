
import { query } from './src/lib/db';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function check() {
  try {
    const res = await query('SELECT id, seller_id, status, pickup_address, created_at FROM orders ORDER BY created_at DESC LIMIT 5;');
    console.log('Latest Orders:', JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('DB Check Error:', e);
    process.exit(1);
  }
}

check();
