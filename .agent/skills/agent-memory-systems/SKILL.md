---
name: sortt-project
description: >
  Master project skill for the Sortt scrap marketplace app (APP_NAME placeholder).
  MUST be used at the start of every coding session, every file creation task,
  every architecture decision, every schema change, every UI component, every
  backend route, every security review, and every debugging session on this project.
  Triggers on any mention of: Sortt, scrap marketplace, kabadiwalla, the app,
  seller app, aggregator app, pickup order, price scraper, WhatsApp OTP,
  MEMORY.md, TRD, PRD, PLAN.md, or any request to write code for this project.
  This skill loads MEMORY.md as the authoritative project context — agents must
  read it before touching any file and update §9 (Learned Lessons) when new
  patterns are discovered.
---

# Sortt Project Skill

You are a senior engineer working on the Sortt scrap marketplace app (APP_NAME is a placeholder — never hardcode "Sortt" in generated code; always import from `constants/app.ts`).

## Step 0 — Load Project Memory (ALWAYS FIRST)

Before writing a single line of code, reading a single file, or making any decision:

```
Read: MEMORY.md  (root of the project workspace)
```

MEMORY.md is the single authoritative source for this project's rules, constraints, and learned patterns. It is always more up-to-date than the TRD, PRD, or any code you might scan. **Do not scan the codebase to re-discover what MEMORY.md already documents.**

The sections you will find there and what each one saves you:

| Section | What it saves you from |
|---|---|
| §0 — Document Precedence | Resolving conflicts between TRD/PRD/PLAN wrong |
| §1 — Tech Stack | Picking wrong libraries or versions |
| §2 — UI Design System | Hardcoding wrong colours, wrong fonts, wrong spacing |
| §3 — Architectural Rules | Calling vendors directly instead of through provider interfaces |
| §4 — Security Constraints | Shipping a known vulnerability |
| §5 — Env Vars | Using wrong variable names or exposing secrets |
| §6 — Scalability Thresholds | Building something that breaks at 30K DAU |
| §7 — Directory Structure | Creating files in wrong locations |
| §8 — pg_cron Jobs | Missing a required maintenance job |
| §9 — Learned Lessons | Repeating a bug that was already solved |

---

## Step 1 — Identify the Task Type

After reading MEMORY.md, classify what you have been asked to do:

| Task Type | Key memory sections to recheck |
|---|---|
| New UI component or screen | §2 (design system), §3.1 (no direct vendor calls) |
| Database migration or schema change | §3.7, §4, §7 (supabase/migrations/) |
| New backend route | §3.1, §3.5, §4 (auth + rate limiting), §5 (env vars) |
| Edge Function change | §3.4 (race conditions), §3.6 (order state machine) |
| Auth / OTP flow | §3.5 (WhatsApp hook, NEVER Twilio/Vonage), §4 RA2 |
| Push notification | §3.8 (generic copy only, dual-token storage) |
| File upload / storage | §3.9 (private buckets, signed URLs, 5-min expiry) |
| AI / Gemini call | §3.1 IAnalysisProvider, §4 RA1, V15b, V18 |
| Price scraper | §3.10, V19 (SSRF), X2 |
| Chat / Realtime | §3.3 (culling, HMAC channel names V32) |
| Order status change | §3.6 (state machine, IMMUTABLE_STATUSES V13) |
| Security review | §4 in full, cross-reference TRD §13 and §13.9 |
| Multi-city work | §6 (cities table prerequisite, 14.6.9) |

---

## Step 2 — Execute with Memory Constraints Active

As you work, treat MEMORY.md rules as hard constraints that cannot be negotiated away:

### Non-negotiables (will break production if violated)
- **Never** call Supabase, Google Maps, Gemini, or any storage API directly — always use the `packages/` provider interfaces.
- **Never** put `SUPABASE_SERVICE_KEY` in any `NEXT_PUBLIC_*` var or client bundle.
- **Never** trust JWT claims for `user_type` or `is_active` — always re-fetch from DB.
- **Never** accept `radius` from client input — derive server-side, cap at 50km.
- **Never** return `phone_hash` in any API response.
- **Never** set `order_status_history` timestamps from client — DB `DEFAULT NOW()` only.
- **Never** allow direct PATCH to set `completed` or `disputed` order status.
- **Never** allow aggregator to update `kyc_status` via their own profile endpoint.
- **Never** hardcode `"Sortt"` in generated code — import `APP_NAME` from `constants/app.ts`.
- **Never** use Twilio/Vonage/MSG91 for OTP — route exclusively through the Supabase Send SMS Hook → `/api/auth/whatsapp-otp` → Meta WhatsApp Cloud API.

### Always required
- All new Express routes: JWT middleware + Upstash rate limiter from day one.
- All new storage access: private bucket + signed URL generation (5-min TTL).
- All new Realtime channels: HMAC suffix on channel name (V32 pattern from §3.3).
- All new pg_cron jobs: document in MEMORY.md §8.
- All new env vars: document in MEMORY.md §5.

---

## Step 3 — Update MEMORY.md After Solving Anything Non-Obvious

When you solve a tricky bug, discover a codebase quirk, establish a new pattern, or make a decision that future agents would otherwise have to re-derive — **write it into MEMORY.md §9 (Learned Lessons)** before finishing the session.

### What qualifies as a §9 entry
- A bug caused by a library behaving unexpectedly (e.g., PgBouncer transaction mode breaking a feature)
- A pattern you had to establish because the TRD was ambiguous
- A workaround for an Expo SDK quirk
- A migration sequence that must be run in a specific order
- A test assertion that proved a security invariant
- Any time you spent >15 minutes figuring out something another agent will face

### How to write a §9 entry

```markdown
- **[YYYY-MM-DD] [short title]:** [What the problem was], [what the correct solution is],
  [why the obvious alternative doesn't work]. Affects: [file or system].
```

Example:
```markdown
- **[2025-03-01] PgBouncer + advisory locks:** PgBouncer transaction pooling mode (used on
  Supabase Pro) silently swallows pg_advisory_lock() calls — the lock appears to succeed but
  is released immediately. Use FOR UPDATE SKIP LOCKED instead (already done in accept-order
  Edge Function). Never use advisory locks anywhere in this codebase. Affects: all DB queries.
```

### How to update MEMORY.md

Read the current MEMORY.md, find §9, append your entry. Do NOT modify any other section unless you are explicitly fixing an error or adding a newly-decided env var/pg_cron job to §5/§8. Never delete existing entries.

---

## Step 4 — Pre-Commit Self-Check

Before declaring a task done, run through this checklist mentally:

```
[ ] Did I read MEMORY.md before starting?
[ ] Did I call any vendor directly instead of through a packages/ interface?
[ ] Did I hardcode any hex colour / font name / spacing value instead of using tokens?
[ ] Did I hardcode "Sortt" anywhere instead of importing APP_NAME?
[ ] Did I expose SUPABASE_SERVICE_KEY or any secret to the client?
[ ] Did I trust a JWT claim instead of re-fetching user_type/is_active from DB?
[ ] Did I add a new env var without documenting it in MEMORY.md §5?
[ ] Did I add a new pg_cron job without documenting it in MEMORY.md §8?
[ ] Did I return phone_hash in any response?
[ ] Did I allow a client to set a timestamp in order_status_history?
[ ] Did I add a rate-limited route without wiring Upstash Redis?
[ ] Did I learn something non-obvious that belongs in MEMORY.md §9?
```

Any "yes" on items 2–11 = stop, fix it, re-check.

---

## Reference

Full project memory lives in:
```
MEMORY.md  (project root — always read before any session)
```

Document authority (higher number wins on conflict):
```
1. TRD v3.2    — architecture, schema, security constraints
2. PRD         — feature requirements, user flows
3. PLAN.md     — build order, day targets, verification gates
4. MEMORY.md   — active rules, learned lessons (HIGHEST AUTHORITY)
```

Sequential build model (10 days — never start next day until current gate passes):
```
Days 1–3  → UI (static, fixture data only — NO backend calls)
Day 4     → Database schema, RLS, migrations
Day 5     → Backend foundation + auth (live)
Day 6     → Core API routes + DB integration
Day 7     → Edge Functions + Realtime + Push
Day 8     → AI + Invoice + Provider abstractions
Day 9     → Web Portal + Admin + Testing
Day 10    → Security audit + CI/CD + Launch hardening
```