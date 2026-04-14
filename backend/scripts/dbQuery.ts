import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM users WHERE name ILIKE '%sagar%' OR id ILIKE '%sagar%' OR user_type = 'admin'");
    console.log(res.rows);
  } finally {
    client.release();
    pool.end();
  }
}

run();
