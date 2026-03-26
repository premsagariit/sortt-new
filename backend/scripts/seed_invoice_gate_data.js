const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function randomHex() {
  return crypto.randomBytes(8).toString('hex');
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const orderRes = await client.query(`
    SELECT o.id, o.order_number
    FROM orders o
    ORDER BY o.created_at DESC
    LIMIT 2
  `);

  if (orderRes.rows.length < 2) {
    console.log('Not enough orders to seed invoice gate data');
    await client.end();
    process.exit(1);
  }

  for (const row of orderRes.rows) {
    const pathKey = `invoices/${row.id}/${randomHex()}.pdf`;
    const invNo = `INV-${new Date().getFullYear()}-${String(row.order_number || 1).padStart(6, '0')}`;
    const payload = {
      invoice_number: invNo,
      invoice_date: new Date().toISOString().slice(0, 10),
      line_items: [{ material_code: 'metal', amount: 100 }],
      total_amount: 118,
    };

    await client.query(
      `INSERT INTO invoices (order_id, seller_gstin, aggregator_details, total_amount, storage_path, invoice_data)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb)`,
      [row.id, null, JSON.stringify({ name: 'gate-seed' }), 118, pathKey, JSON.stringify(payload)]
    );

    console.log('Seeded invoice row:', row.id, pathKey);
  }

  const check = await client.query(`
    SELECT storage_path
    FROM invoices
    ORDER BY created_at DESC
    LIMIT 2
  `);

  console.log('Latest invoice paths:', check.rows.map((r) => r.storage_path));

  await client.end();
}

main().catch((e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});
