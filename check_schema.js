const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function checkSchema() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    console.log('--- Material Types Columns ---');
    const resMatCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'material_types';");
    console.log(resMatCols.rows.map(r => r.column_name));

    console.log('\n--- Material Types Data ---');
    const resMat = await client.query("SELECT * FROM material_types;");
    console.log(resMat.rows);
    
    console.log('\n--- Device Tokens Schema ---');
    const resDev = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'device_tokens';");
    console.log(resDev.rows.map(r => r.column_name));
    
    await client.end();
}

checkSchema().catch(console.error);
