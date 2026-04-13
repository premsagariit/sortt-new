require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='user_order_counters'`)
  .then(r => { console.log(JSON.stringify(r.rows)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
