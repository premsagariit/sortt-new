const { Client } = require('pg');

async function testG44() {
    console.log('--- G4.4 users_public View Test ---');
    const client = new Client({ connectionString: 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require' });
    await client.connect();
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users_public';");
    const cols = res.rows.map(r => r.column_name);
    if (!cols.includes('clerk_user_id') && !cols.includes('phone_hash')) {
        console.log('PASS: users_public excludes sensitive fields');
    } else {
        console.log('FAIL: sensitive fields found:', cols.join(', '));
    }
    await client.end();
}

async function testG45() {
    console.log('\n--- G4.5 Message Partitions Test ---');
    const client = new Client({ connectionString: 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require' });
    await client.connect();
    const res = await client.query("SELECT tablename FROM pg_tables WHERE tablename LIKE 'messages_2026%';");
    const tables = res.rows.map(r => r.tablename).sort();
    if (tables.length === 3 && tables.join(',') === 'messages_2026_03,messages_2026_04,messages_2026_05') {
        console.log('PASS: 3 partition tables exist');
    } else {
        console.log('FAIL: Partitions mismatch', tables.join(', '));
    }
    await client.end();
}

async function testG46() {
    console.log('\n--- G4.6 Seed Data Test ---');
    const client = new Client({ connectionString: 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require' });
    await client.connect();
    const resMat = await client.query("SELECT count(*) FROM material_types;");
    const resCity = await client.query("SELECT count(*) FROM cities;");
    if (parseInt(resMat.rows[0].count) === 6 && parseInt(resCity.rows[0].count) === 1) {
        console.log('PASS: Seed data present');
    } else {
        console.log('FAIL: Seed data mismatch:', resMat.rows[0].count, resCity.rows[0].count);
    }
    await client.end();
}

async function runAll() {
    await testG44();
    await testG45();
    await testG46();
}

runAll().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
