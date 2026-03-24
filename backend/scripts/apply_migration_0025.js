const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL ||
  'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require';

async function run() {
  const client = new Client({ connectionString });
  const fileName = '0025_seller_addresses.sql';
  const filePath = path.join(__dirname, '..', '..', 'migrations', fileName);
  const sql = fs.readFileSync(filePath, 'utf8');

  await client.connect();
  try {
    console.log(`Executing ${fileName}...`);
    await client.query(sql);
    console.log(`SUCCESS: ${fileName}`);
  } catch (error) {
    console.error(`ERROR in ${fileName}:`, error.message);
    if (error.position) {
      const pos = Number.parseInt(error.position, 10);
      console.error('Snippet:', sql.substring(Math.max(0, pos - 80), Math.min(sql.length, pos + 80)));
    }
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
