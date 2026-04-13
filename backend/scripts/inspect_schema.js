const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const views = await p.query(`SELECT relname, pg_get_viewdef(oid, true) AS def FROM pg_class WHERE relkind='m' AND relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')`);
  views.rows.forEach(r => { console.log('=== ' + r.relname + ' ==='); console.log(r.def); });
  await p.end();
}
run().catch(e => console.error(e.message));
