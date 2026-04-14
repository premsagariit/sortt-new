const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=verify-full'
});

async function run() {
  await client.connect();
  let res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users';
  `);
  console.log("USERS COLUMNS:");
  console.table(res.rows);

  let res2 = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'users'::regclass;
  `);
  console.log("\nUSERS CONSTRAINTS:");
  console.table(res2.rows);
  await client.end();
}
run();
