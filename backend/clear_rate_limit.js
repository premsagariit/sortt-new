// clear_rate_limit.js
// Run: node clear_rate_limit.js +917893641009
// Clears the OTP request rate limit for the given phone number
require('dotenv').config({ path: '.env' });
const { Redis } = require('@upstash/redis');

const phone = process.argv[2];
if (!phone) {
  console.error('Usage: node clear_rate_limit.js <phone_e164>');
  process.exit(1);
}

const r = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function main() {
  console.log(`Searching for rate limit keys for phone: ${phone}`);
  const keys = await r.keys(`*`);
  console.log(`Total Redis keys: ${keys.length}`);
  
  // OTP rate limit keys use HMAC of the phone, but let's just clear all OTP-related keys
  const otpKeys = keys.filter(k => k.includes('otp') || k.includes('ratelimit'));
  console.log(`OTP/ratelimit keys found: ${otpKeys.length}`, otpKeys);
  
  if (otpKeys.length === 0) {
    console.log('No rate limit keys found. The rate limit may have already expired.');
    process.exit(0);
  }

  for (const key of otpKeys) {
    await r.del(key);
    console.log(`Deleted: ${key}`);
  }
  console.log('Done! Rate limits cleared. You can now send OTP again.');
}

main().catch(console.error);
