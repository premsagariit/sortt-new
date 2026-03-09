const { Client } = require('pg');

const connectionString = 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require';

async function fix() {
    const client = new Client({ connectionString });
    await client.connect();

    await client.query("ALTER TABLE messages_2026_03 ENABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE messages_2026_04 ENABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE messages_2026_05 ENABLE ROW LEVEL SECURITY;");

    await client.end();
}

fix().then(() => console.log('Fixed')).catch(console.error);
