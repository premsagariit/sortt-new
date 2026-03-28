
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Try to load .env from backend
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sortt',
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('Migrating aggregator_profiles.operating_area to JSONB...');
        
        // Check if column already renamed or exists
        const checkResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'aggregator_profiles' AND column_name = 'operating_area'
        `);
        
        if (checkResult.rows[0].data_type === 'jsonb') {
            console.log('Column already migrated to JSONB. Skipping.');
            await client.query('ROLLBACK');
            return;
        }

        // 1. Add temporary column
        await client.query('ALTER TABLE aggregator_profiles ADD COLUMN operating_area_jsonb JSONB DEFAULT \'[]\'::jsonb');
        
        // 2. Data Migration: Convert "Area1, Area2" to '["Area1", "Area2"]'
        await client.query(`
            UPDATE aggregator_profiles 
            SET operating_area_jsonb = (
                SELECT jsonb_agg(trim(val))
                FROM unnest(string_to_array(operating_area, \',\')) AS val
                WHERE val IS NOT NULL AND trim(val) <> \'\'.
            )
            WHERE operating_area IS NOT NULL AND operating_area <> \'\'
        `);
        
        // 3. Drop old column and rename new one
        await client.query('ALTER TABLE aggregator_profiles DROP COLUMN operating_area');
        await client.query('ALTER TABLE aggregator_profiles RENAME COLUMN operating_area_jsonb TO operating_area');
        
        await client.query('COMMIT');
        console.log('Migration successful!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
