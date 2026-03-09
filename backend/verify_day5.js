const { Client } = require('pg');

const connectionString = 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require';

async function verify() {
    const client = new Client({ connectionString });
    await client.connect();

    console.log('--- G5.1 / RLS Completeness ---');
    const rls = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;");
    if (rls.rows.length === 0) console.log('PASS: 0 rows (All tables have RLS)');
    else console.log('FAIL:', rls.rows.map(r => r.tablename));

    console.log('\n--- G5.2 / KYC Trigger ---');
    const trg = await client.query("SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'aggregator_profiles';");
    if (trg.rows.some(r => r.trigger_name === 'kyc_status_guard_trigger')) console.log('PASS: kyc_status_guard_trigger found');
    else console.log('FAIL: trigger not found. Got:', trg.rows.map(r => r.trigger_name));

    console.log('\n--- G5.3 / Indexes ---');
    const idx = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY indexname;");
    if (idx.rows.length >= 9) console.log(`PASS: Found ${idx.rows.length} indexes matching idx_%`);
    else console.log('FAIL: Expected at least 9, got:', idx.rows.length);

    console.log('\n--- G5.4 / Materialized Views ---');
    const mv = await client.query("SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';");
    const mvNames = mv.rows.map(r => r.matviewname);
    if (mvNames.includes('aggregator_rating_stats') && mvNames.includes('current_price_index')) console.log('PASS: both materialized views found');
    else console.log('FAIL:', mvNames);

    console.log('\n--- G5.5 / price_index Columns ---');
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'price_index' ORDER BY ordinal_position;");
    const colNames = cols.rows.map(r => r.column_name).join(',');
    const expected = 'id,city_code,material_code,rate_per_kg,source,is_manual_override,scraped_at';
    if (colNames === expected) console.log('PASS: price_index columns match exact order');
    else console.log('FAIL. Expected:', expected, '\nGot:', colNames);

    console.log('\n--- BONUS / Security Tables ---');
    const tbls = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('seller_flags', 'admin_audit_log');");
    if (tbls.rows.length === 2) console.log('PASS: seller_flags and admin_audit_log exist');
    else console.log('FAIL:', tbls.rows.map(r => r.table_name));

    await client.end();
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
