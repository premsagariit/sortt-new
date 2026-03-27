const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { createClerkClient } = require('@clerk/backend');
const fetch = require('node-fetch');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 8080}`;
const IMAGE_PATH = path.resolve(__dirname, '../../1000289766.jpg');

async function getDbClient() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

async function testAnalyze() {
  const client = await getDbClient();
  
  try {
    // Get a seller
    const result = await client.query(
      `SELECT u.id AS user_id, u.clerk_user_id
         FROM users u
        WHERE u.user_type = 'seller'
          AND u.is_active = true
          AND u.clerk_user_id IS NOT NULL
        ORDER BY u.created_at DESC
        LIMIT 1`
    );
    
    if (!result.rows.length) {
      console.log('ERROR: No active seller found');
      process.exit(1);
    }
    
    const seller = result.rows[0];
    console.log('Found seller:', seller);
    
    // Create JWT
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const session = await clerk.sessions.createSession({
      userId: seller.clerk_user_id,
    });
    const token = await clerk.sessions.getToken(session.id);
    const jwt = token.jwt;
    
    console.log('Created JWT:', jwt.slice(0, 50) + '...');
    
    // Read image
    if (!fs.existsSync(IMAGE_PATH)) {
      console.log('ERROR: Image not found at', IMAGE_PATH);
      process.exit(1);
    }
    
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    console.log('Image size:', imageBuffer.length, 'bytes');
    
    // Create FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', imageBuffer, 'test.jpg');
    
    console.log('\nSending POST to', BASE_URL + '/api/scrap/analyze');
    console.log('With Authorization:', jwt.slice(0, 30) + '...');
    
    const response = await fetch(`${BASE_URL}/api/scrap/analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...form.getHeaders(),
      },
      body: form,
    });
    
    console.log('Response status:', response.status);
    const payload = await response.json();
    console.log('Response body:', JSON.stringify(payload, null, 2));
    
  } finally {
    await client.end();
  }
}

testAnalyze().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
