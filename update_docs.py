import os

# PLAN.md
with open('PLAN.md', 'r', encoding='utf-8') as f:
    plan = f.read()
plan = plan.replace('> - **Auth:** Clerk (session management) + Meta WhatsApp OTP (delivery, called directly from Express)', '> - **Auth:** Custom JWT Auth + Meta WhatsApp OTP (delivery, called directly from Express)')
plan = plan.replace('Day 17 READY TO START', 'Day 17 IN PROGRESS')
with open('PLAN.md', 'w', encoding='utf-8') as f:
    f.write(plan)

# MEMORY.md
with open('MEMORY.md', 'r', encoding='utf-8') as f:
    memory = f.read()
if '2026-04-13' not in memory:
    memory = memory.replace('Status:** Day 16 COMPLETE (2026-04-05), Day 17 READY TO START (Security & Launch)', 'Status:** Day 17 IN PROGRESS (Security & Launch) | Custom JWT Migration Complete | Admin Dashboard Enahnced')
    sync_note = """> ? **Implementation Sync Note (2026-04-13) — Custom JWT & Admin Enhancements**
> - Refactored entire auth system: Removed Clerk and replaced with Custom JWT Auth.
> - Removed clerk_user_id columns and codebase references.
> - Converted Database Primary Keys (PKs) from UUID to text globally to resolve database inconsistencies.
> - Updated Admin Dashboard: Leaflet maps integrated, active/completed orders specific rendering upon click, order details include distance and cancellation reasons.
> - Data masking updated: Phone numbers extract per-user sequence using even indices from end-to-start (13579).
> - Cleaned up testing suites and testing-related files for deployment readiness.\n\n"""
    idx = memory.find('> ? **Scope Sync Note')
    if idx != -1:
        memory = memory[:idx] + sync_note + memory[idx:]
    with open('MEMORY.md', 'w', encoding='utf-8') as f:
        f.write(memory)

# README.md
with open('README.md', 'r', encoding='utf-8') as f:
    readme = f.read()
readme = readme.replace('Day 16 COMPLETE, Day 17 Security Audit & Monitoring ready to start (2026-04-11)', 'Day 17 IN PROGRESS: Security Audit, MVP Launch & Admin enhancements (2026-04-13)')
readme = readme.replace('| **Auth** | Clerk (Phone OTP via WhatsApp Cloud API) |', '| **Auth** | Custom JWT (Phone OTP via WhatsApp Cloud API) |')
readme = readme.replace('Clerk Auth', 'Custom JWT Auth')
with open('README.md', 'w', encoding='utf-8') as f:
    f.write(readme)

# PRD.md
with open('PRD.md', 'r', encoding='utf-8') as f:
    prd = f.read()
if 'v1.5 CHANGE SUMMARY' not in prd:
    prd = prd.replace('**Version 1.4 | MVP Release**', '**Version 1.5 | MVP Release**')
    prd_change = """> ?? **v1.5 CHANGE SUMMARY (from v1.4)**
> - Authentication stack transitioned from Clerk to Custom JWT.
> - Admin Dashboard extended with Leaflet mapping, advanced analytics and real-time detailed order resolution cards.
> - Data masking updated for privacy using sequential indexing logic.\n\n"""
    idx = prd.find('> ?? **v1.4 CHANGE SUMMARY')
    if idx != -1:
        prd = prd[:idx] + prd_change + prd[idx:]
    with open('PRD.md', 'w', encoding='utf-8') as f:
        f.write(prd)

# TRD.md
with open('TRD.md', 'r', encoding='utf-8') as f:
    trd = f.read()
if 'v4.1 CHANGE SUMMARY' not in trd:
    trd = trd.replace('**v4.0 · Minimalist Professional UI · Azure PostgreSQL · Clerk Auth · Ably Realtime · Cloudflare R2 Storage · WhatsApp OTP**', '**v4.1 · Minimalist Professional UI · Azure PostgreSQL · Custom JWT Auth · Ably Realtime · Cloudflare R2 Storage · WhatsApp OTP**')
    trd_change = """> ?? **v4.1 CHANGE SUMMARY (from v4.0)**
> - Complete removal of Clerk Auth. Migrated to Custom JWT via Upstash Redis + Express backend.
> - Removed clerk_user_id entirely.
> - Database Primary Keys updated from UUID to TEXT columns. All relationships verified.
> - Added Leaflet dependency for Admin Map tracking.
> - Testing suites removed prior to MVP push.\n\n"""
    idx = trd.find('> ?? **v4.0 CHANGE SUMMARY')
    if idx != -1:
        trd = trd[:idx] + trd_change + trd[idx:]
    with open('TRD.md', 'w', encoding='utf-8') as f:
        f.write(trd)

# structure.md
with open('structure.md', 'r', encoding='utf-8') as f:
    struct = f.read()
if 'Recent implementation updates (2026-04-13)' not in struct:
    struct_change = """+-- Recent implementation updates (2026-04-13)
¦   +-- Auth Strategy: Migrated from Clerk to Custom JWT; completely purged clerk_user_id database and codebase records.
¦   +-- Database Core: Converted UUID primary keys to Text (strings) ensuring table integrity scaling.
¦   +-- Clean up: Purged non-essential testing files from backend to finalize MVP readiness.
¦   +-- Admin UI Overhaul: Added Leaflet maps, analytical trends, specific order filtering on cards, and complete end-to-end data views for Dispute resolution.
¦   +-- Data Masking: Updated privacy logic to extract phone number slices based on even-position count from start to finish.\n"""
    idx = struct.find('+-- Recent implementation updates (2026-04-05)')
    if idx != -1:
        struct = struct[:idx] + struct_change + struct[idx:]
    with open('structure.md', 'w', encoding='utf-8') as f:
        f.write(struct)

print('Success')
