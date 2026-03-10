const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const connectionString = "postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require";
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Running 0013...');
    const f13 = fs.readFileSync('../migrations/0013_add_aggregator_type.sql', 'utf8');
    await client.query(f13);
    console.log('Ran 0013');

    console.log('Running 0014...');
    const f14 = fs.readFileSync('../migrations/0014_kyc_media_types.sql', 'utf8');
    await client.query(f14);
    console.log('Ran 0014');

    console.log('Running 0015...');
    const f15 = fs.readFileSync('../migrations/0015_otp_log_make_hmac_nullable.sql', 'utf8');
    await client.query(f15);
    console.log('Ran 0015');
  } finally {
    await client.end();
  }
}

main().catch(console.error);
