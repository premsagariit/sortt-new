const fs = require('fs');

try {
// PLAN.md
let plan = fs.readFileSync('PLAN.md', 'utf8');
plan = plan.replace('> - **Auth:** Clerk (session management) + Meta WhatsApp OTP (delivery, called directly from Express)', '> - **Auth:** Custom JWT Auth + Meta WhatsApp OTP (delivery, called directly from Express)');
plan = plan.replace(/Day 17 READY TO START/g, 'Day 17 IN PROGRESS');
fs.writeFileSync('PLAN.md', plan);

// MEMORY.md
let memory = fs.readFileSync('MEMORY.md', 'utf8');
if(!memory.includes('2026-04-13')) {
  memory = memory.replace('Status:** Day 16 COMPLETE (2026-04-05), Day 17 READY TO START (Security & Launch)', 'Status:** Day 17 IN PROGRESS (Security & Launch) | Custom JWT Migration Complete | Admin Dashboard Enahnced');
  const syncNote = > ? **Implementation Sync Note (2026-04-13) — Custom JWT & Admin Enhancements**\n> - Refactored entire auth system: Removed Clerk and replaced with Custom JWT Auth.\n> - Removed clerk_user_id columns and codebase references.\n> - Converted Database Primary Keys (PKs) from UUID to text globally to resolve database inconsistencies.\n> - Updated Admin Dashboard: Leaflet maps integrated, active/completed orders specific rendering upon click, order details include distance and cancellation reasons.\n> - Data masking updated: Phone numbers extract per-user sequence using even indices from end-to-start (13579).\n> - Cleaned up testing suites and testing-related files for deployment readiness.\n\n;
  memory = memory.substring(0, memory.indexOf('> ? **Scope Sync Note')) + syncNote + memory.substring(memory.indexOf('> ? **Scope Sync Note'));
  fs.writeFileSync('MEMORY.md', memory);
}

// README.md
let readme = fs.readFileSync('README.md', 'utf8');
readme = readme.replace('Day 16 COMPLETE, Day 17 Security Audit & Monitoring ready to start (2026-04-11)', 'Day 17 IN PROGRESS: Security Audit, MVP Launch & Admin enhancements (2026-04-13)');
readme = readme.replace('| **Auth** | Clerk (Phone OTP via WhatsApp Cloud API) |', '| **Auth** | Custom JWT (Phone OTP via WhatsApp Cloud API) |');
readme = readme.replace('Clerk Auth', 'Custom JWT Auth');
fs.writeFileSync('README.md', readme);

// PRD.md
let prd = fs.readFileSync('PRD.md', 'utf8');
if(!prd.includes('v1.5 CHANGE SUMMARY')) {
  prd = prd.replace('**Version 1.4 | MVP Release**', '**Version 1.5 | MVP Release**');
  const prdChange = > ?? **v1.5 CHANGE SUMMARY (from v1.4)**\n> - Authentication stack transitioned from Clerk to Custom JWT.\n> - Admin Dashboard extended with Leaflet mapping, advanced analytics and real-time detailed order resolution cards.\n> - Data masking updated for privacy using sequential indexing logic.\n\n;
  prd = prd.substring(0, prd.indexOf('> ?? **v1.4 CHANGE SUMMARY')) + prdChange + prd.substring(prd.indexOf('> ?? **v1.4 CHANGE SUMMARY'));
  fs.writeFileSync('PRD.md', prd);
}

// TRD.md
let trd = fs.readFileSync('TRD.md', 'utf8');
if(!trd.includes('v4.1 CHANGE SUMMARY')) {
  trd = trd.replace('**v4.0 · Minimalist Professional UI · Azure PostgreSQL · Clerk Auth · Ably Realtime · Cloudflare R2 Storage · WhatsApp OTP**', '**v4.1 · Minimalist Professional UI · Azure PostgreSQL · Custom JWT Auth · Ably Realtime · Cloudflare R2 Storage · WhatsApp OTP**');
  const trdChange = > ?? **v4.1 CHANGE SUMMARY (from v4.0)**\n> - Complete removal of Clerk Auth. Migrated to Custom JWT via Upstash Redis + Express backend.\n> - Removed clerk_user_id entirely.\n> - Database Primary Keys updated from UUID to TEXT columns. All relationships verified.\n> - Added Leaflet dependency for Admin Map tracking.\n> - Testing suites removed prior to MVP push.\n\n;
  trd = trd.substring(0, trd.indexOf('> ?? **v4.0 CHANGE SUMMARY')) + trdChange + trd.substring(trd.indexOf('> ?? **v4.0 CHANGE SUMMARY'));
  fs.writeFileSync('TRD.md', trd);
}

// structure.md
let struct = fs.readFileSync('structure.md', 'utf8');
if(!struct.includes('Recent implementation updates (2026-04-13)')) {
  const structChange = +-- Recent implementation updates (2026-04-13)\n¦   +-- Auth Strategy: Migrated from Clerk to Custom JWT; completely purged clerk_user_id database and codebase records.\n¦   +-- Database Core: Converted UUID primary keys to Text (strings) ensuring table integrity scaling.\n¦   +-- Clean up: Purged non-essential testing files from backend to finalize MVP readiness.\n¦   +-- Admin UI Overhaul: Added Leaflet maps, analytical trends, specific order filtering on cards, and complete end-to-end data views for Dispute resolution.\n¦   +-- Data Masking: Updated privacy logic to extract phone number slices based on even-position count from start to finish.\n;
  struct = struct.replace('+-- Recent implementation updates (2026-04-05)', structChange + '+-- Recent implementation updates (2026-04-05)');
  fs.writeFileSync('structure.md', struct);
}
console.log('Done');
} catch (e) {
  console.error(e);
}
