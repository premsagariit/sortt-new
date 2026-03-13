const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function checkSchema() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    console.log('--- aggregator_profiles Columns ---');
    const resAgg = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'aggregator_profiles';");
    console.log(resAgg.rows.map(r => r.column_name));

    console.log('\n--- device_tokens Indices ---');
    const resIdx = await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'device_tokens';");
    console.log(resIdx.rows);
    
    await client.end();
}

checkSchema().catch(console.error);
