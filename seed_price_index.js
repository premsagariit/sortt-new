/**
 * seed_price_index.js
 * ──────────────────────────────────────────────────────────────────
 * Seeds the price_index table with baseline rates for all active cities
 * and material types. This fixes the bug where order amounts showed ₹0
 * because price_index was empty.
 * 
 * Run: node seed_price_index.js
 * ──────────────────────────────────────────────────────────────────
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load DATABASE_URL from backend/.env file
const envPath = path.join(__dirname, 'backend', '.env');
let databaseUrl = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      databaseUrl = line.substring('DATABASE_URL='.length).trim();
      break;
    }
  }
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in backend/.env');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
});

// Baseline rates per material (in ₹/kg)
const BASELINE_RATES = {
  metal: 28,
  paper: 12,
  plastic: 8,
  ewaste: 60,
  fabric: 6,
  glass: 5,
};

async function seedPriceIndex() {
  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Get all active cities
    const citiesRes = await client.query(
      'SELECT code FROM cities WHERE is_active = true'
    );
    const cities = citiesRes.rows.map(r => r.code);
    console.log(`✓ Found ${cities.length} active cities`);

    // Get all material types (no is_active column in schema)
    const materialsRes = await client.query(
      'SELECT code FROM material_types'
    );
    const materials = materialsRes.rows.map(r => r.code);
    console.log(`✓ Found ${materials.length} material types`);

    // Insert baseline rates into price_index
    let insertedCount = 0;
    for (const cityCode of cities) {
      for (const materialCode of materials) {
        const ratePerKg = BASELINE_RATES[materialCode] || 10;
        
        // Check if a rate already exists for this city+material
        const existingRes = await client.query(
          'SELECT id FROM price_index WHERE city_code = $1 AND material_code = $2 LIMIT 1',
          [cityCode, materialCode]
        );
        
        if (existingRes.rows.length === 0) {
          // Insert only if doesn't exist
          await client.query(
            `INSERT INTO price_index 
               (city_code, material_code, rate_per_kg, source, is_manual_override)
             VALUES ($1, $2, $3, 'baseline_seed', true)`,
            [cityCode, materialCode, ratePerKg]
          );
          insertedCount++;
        }
      }
    }
    console.log(`✓ Inserted ${insertedCount} price index records`);

    // Refresh materialized view if it exists
    try {
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index');
      console.log('✓ Refreshed materialized view: current_price_index');
    } catch (e) {
      console.warn('⚠ Could not refresh materialized view (may not exist): ', e.message);
    }

    // Verify insertion
    const verifyRes = await client.query(
      'SELECT COUNT(*) as count FROM price_index'
    );
    console.log(`✓ Total records in price_index: ${verifyRes.rows[0].count}`);

    console.log('\n✅ Seed complete! Orders created after this will have correct amounts.');
    console.log('⚠️  Note: Existing orders with amount=0 will not be automatically fixed.');
    console.log('   To fix them, manually update order_items table or create test orders.');

  } catch (error) {
    console.error('❌ Error seeding price_index:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedPriceIndex();
