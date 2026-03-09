const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require';

async function run() {
    const client = new Client({ connectionString });
    await client.connect();

    const files = [
        '0007_security.sql',
        '0008_prices.sql',
        '0009_rls.sql',
        '0010_indexes.sql',
        '0011_triggers.sql',
        '0012_materialized_views.sql'
    ];

    for (const file of files) {
        const filePath = path.join(__dirname, '..', 'migrations', file);
        let sql = fs.readFileSync(filePath, 'utf8');
        try {
            console.log(`Executing ${file}...`);
            await client.query(sql);
            console.log(`SUCCESS: ${file}`);
        } catch (e) {
            console.error(`ERROR in ${file}:`, e.message);
            if (e.position) {
                const pos = parseInt(e.position, 10);
                console.error("Snippet:", sql.substring(Math.max(0, pos - 50), Math.min(sql.length, pos + 50)));
            }
            process.exit(1);
        }
    }

    await client.end();
    console.log('All migrations executed successfully.');
}

run();
