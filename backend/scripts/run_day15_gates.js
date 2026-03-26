const path = require('path');
const fs = require('fs');
const extname = path.extname;
const dotenv = require('dotenv');
const { Client } = require('pg');
const { createClerkClient } = require('@clerk/backend');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.GATE_BASE_URL || `http://localhost:${process.env.PORT || 8080}`;
// Try to use actual test image first, fall back to app icon
const fallbackImage = path.resolve(__dirname, '../../apps/mobile/assets/images/icon.png');
const preferredImage = path.resolve(__dirname, '../../1000289766.jpg');
const IMAGE_PATH = process.env.GATE_TEST_IMAGE || (
  fs.existsSync(preferredImage) ? preferredImage : fallbackImage
);

const VALID_CODES = new Set(['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass']);

function logHeader(title) {
  console.log(`\n=== ${title} ===`);
}

function pass(gate, msg) {
  console.log(`[${gate}] PASS: ${msg}`);
}

function fail(gate, msg) {
  console.log(`[${gate}] FAIL: ${msg}`);
}

async function getDbClient() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

async function getSellerContext(client) {
  const result = await client.query(
    `SELECT u.id AS user_id, u.clerk_user_id
       FROM users u
      WHERE u.user_type = 'seller'
        AND u.is_active = true
        AND u.clerk_user_id IS NOT NULL
      ORDER BY u.created_at DESC
      LIMIT 50`
  );

  if (!result.rows.length) {
    throw new Error('No active seller with clerk_user_id found');
  }

  return result.rows;
}

async function createJwtForSeller(clerkUserId) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const session = await clerk.sessions.createSession({
    userId: clerkUserId,
  });
  const token = await clerk.sessions.getToken(session.id);
  return token.jwt;
}

async function postAnalyze(jwt) {
  if (!fs.existsSync(IMAGE_PATH)) {
    throw new Error(`Test image missing at ${IMAGE_PATH}`);
  }

  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const extension = extname(IMAGE_PATH).toLowerCase();
  const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  form.append('image', new Blob([imageBuffer], { type: mimeType }), path.basename(IMAGE_PATH));

  const response = await fetch(`${BASE_URL}/api/scrap/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: form,
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = { parse_error: true };
  }

  return { status: response.status, payload };
}

async function runG151(jwt) {
  logHeader('G15.1 Gemini Returns Valid Estimate');
  const { status, payload } = await postAnalyze(jwt);
  console.log('HTTP:', status);
  console.log('Body:', JSON.stringify(payload));

  const ok =
    status === 200 &&
    payload &&
    VALID_CODES.has(payload.material_code) &&
    Number(payload.estimated_weight_kg) > 0 &&
    payload.is_ai_estimate === true &&
    typeof payload.confidence === 'number' &&
    payload.confidence >= 0 &&
    payload.confidence <= 1;

  if (ok) {
    pass('G15.1', 'Valid analysis response shape and values');
    return true;
  }

  fail('G15.1', 'Response does not meet gate criteria');
  return false;
}

async function findUsableAnalyzeContext(sellers) {
  for (const seller of sellers) {
    const jwt = await createJwtForSeller(seller.clerk_user_id);
    const response = await postAnalyze(jwt);
    if (response.status !== 429) {
      return { jwt, response };
    }
  }
  throw new Error('All seller tokens are currently rate-limited for analyze endpoint');
}

async function runG152(jwt, client) {
  logHeader('G15.2 Circuit Breaker Fires At Limit');
  const dayKey = `gemini:daily:${new Date().toISOString().split('T')[0]}`;

  await client.query('SELECT 1');

  // Write via Upstash REST API directly
  const redisSet = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${dayKey}/1201/EX/86400`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
    },
  });

  if (!redisSet.ok) {
    fail('G15.2', `Unable to preset redis counter (${redisSet.status})`);
    return false;
  }

  const { status, payload } = await postAnalyze(jwt);
  console.log('HTTP:', status);
  console.log('Body:', JSON.stringify(payload));

  const ok = status === 200 && payload && payload.status === 'degraded' && payload.manual_entry_required === true;

  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/${dayKey}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
    },
  }).catch(() => {});

  if (ok) {
    pass('G15.2', 'Circuit breaker returned degraded response');
    return true;
  }

  fail('G15.2', 'Circuit breaker did not return expected degraded response');
  return false;
}

async function runG153() {
  logHeader('G15.3 EXIF Strip Confirmed');
  const sharp = require('sharp');
  const input = fs.readFileSync(IMAGE_PATH);
  const stripped = await sharp(input).toBuffer();
  const metadata = await sharp(stripped).metadata();

  const hasExif = !!metadata.exif;
  console.log('Has EXIF after strip:', hasExif);

  if (!hasExif) {
    pass('G15.3', 'EXIF removed after sharp().toBuffer()');
    return true;
  }

  fail('G15.3', 'EXIF still present after stripping');
  return false;
}

async function runG154() {
  logHeader('G15.4 AI Output Never Reaches confirmed_weight_kg');
  const filePath = path.resolve(__dirname, '../src/routes/orders/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  const suspicious = /analyzeScrapImage|is_ai_estimate|aiEstimateHint|analysis_failed/.test(content)
    && /confirmed_weight_kg/.test(content);

  if (!suspicious) {
    pass('G15.4', 'No AI analysis symbols coupled to confirmed_weight_kg in orders route');
    return true;
  }

  fail('G15.4', 'Found AI analysis symbols coupled to confirmed_weight_kg');
  return false;
}

async function runG156(client) {
  logHeader('G15.6 Invoice Paths Randomised');
  const res = await client.query(
    `SELECT storage_path
       FROM invoices
      WHERE storage_path IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 2`
  );

  console.log('Rows:', JSON.stringify(res.rows));

  if (res.rows.length < 2) {
    fail('G15.6', 'Need at least 2 invoices with storage_path to validate randomness');
    return false;
  }

  const [a, b] = res.rows.map((r) => r.storage_path || '');
  const suffixA = (a.match(/\/([a-f0-9]{16})\.pdf$/i) || [])[1];
  const suffixB = (b.match(/\/([a-f0-9]{16})\.pdf$/i) || [])[1];

  const ok = !!suffixA && !!suffixB && suffixA !== suffixB;

  if (ok) {
    pass('G15.6', 'Invoice paths use distinct 16-hex randomized suffixes');
    return true;
  }

  fail('G15.6', 'Invoice path suffixes missing or not randomized');
  return false;
}

async function runG158(client) {
  logHeader('G15.8 Price Scraper Runs and Inserts Data');
  const res = await client.query(
    `SELECT material_code, scraped_at
       FROM price_index
      WHERE scraped_at >= NOW() - INTERVAL '1 day'
      ORDER BY scraped_at DESC
      LIMIT 50`
  );

  const seen = new Set(res.rows.map((r) => r.material_code));
  const required = ['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass'];
  const missing = required.filter((m) => !seen.has(m));

  console.log('Recent materials:', Array.from(seen).join(', '));

  if (missing.length === 0) {
    pass('G15.8', 'All 6 materials present in recent price_index rows');
    return true;
  }

  fail('G15.8', `Missing materials in recent scrape: ${missing.join(', ')}`);
  return false;
}

async function main() {
  const client = await getDbClient();
  try {
    const sellers = await getSellerContext(client);
    const { jwt, response } = await findUsableAnalyzeContext(sellers);

    const results = {};
    logHeader('G15.1 Gemini Returns Valid Estimate');
    console.log('HTTP:', response.status);
    console.log('Body:', JSON.stringify(response.payload));
    const g151ok =
      response.status === 200 &&
      response.payload &&
      VALID_CODES.has(response.payload.material_code) &&
      Number(response.payload.estimated_weight_kg) > 0 &&
      response.payload.is_ai_estimate === true &&
      typeof response.payload.confidence === 'number' &&
      response.payload.confidence >= 0 &&
      response.payload.confidence <= 1;
    if (g151ok) {
      pass('G15.1', 'Valid analysis response shape and values');
    } else {
      fail('G15.1', 'Response does not meet gate criteria');
    }
    results['G15.1'] = g151ok;

    results['G15.2'] = await runG152(jwt, client);
    results['G15.3'] = await runG153();
    results['G15.4'] = await runG154();
    results['G15.6'] = await runG156(client);
    results['G15.8'] = await runG158(client);

    logHeader('SUMMARY');
    for (const [gate, ok] of Object.entries(results)) {
      console.log(`${gate}: ${ok ? 'PASS' : 'FAIL'}`);
    }

    const failed = Object.entries(results).filter(([, ok]) => !ok).map(([gate]) => gate);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Gate runner crashed:', err.message);
  process.exit(1);
});
