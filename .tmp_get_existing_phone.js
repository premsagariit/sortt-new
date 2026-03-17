const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.resolve('backend/.env') });

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query("SELECT display_phone FROM users WHERE display_phone IS NOT NULL ORDER BY created_at DESC LIMIT 1");
  console.log(r.rows);
  await c.end();
})();
