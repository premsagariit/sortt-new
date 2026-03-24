const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL ||
  'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const tableRes = await client.query("SELECT to_regclass('public.seller_addresses') AS table_name");
    const rlsRes = await client.query("SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'seller_addresses'");
    const triggerRes = await client.query("SELECT COUNT(*)::int AS count FROM information_schema.triggers WHERE event_object_schema = 'public' AND event_object_table = 'seller_addresses' AND trigger_name = 'set_updated_at_seller_addresses_trigger'");

    console.log(JSON.stringify({
      table: tableRes.rows[0],
      rls: rlsRes.rows[0],
      trigger: triggerRes.rows[0],
    }, null, 2));
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
