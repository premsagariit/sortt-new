const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=verify-full'
});

async function run() {
  await client.connect();
  let res = await client.query(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      rc.update_rule, 
      rc.delete_rule,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON rc.unique_constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'users';
  `);
  console.log("FOREIGN KEYS referencing users:");
  console.table(res.rows);
  await client.end();
}
run();
