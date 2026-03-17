const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.resolve('backend/.env') });

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const sql = fs.readFileSync(path.resolve('migrations/0022_unique_phone_hash.sql'), 'utf8');
  await client.query(sql);
  const result = await client.query(
    "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_phone_hash_unique'"
  );
  console.log(result.rows);
  await client.end();
})();
