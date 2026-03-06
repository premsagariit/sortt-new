Based on your latest updates to PLAN.md, Day 4 has been refocused into a high-intensity Infrastructure + Schema Part 1 launch.

Here are the specific targets planned for Day 4:

1. Azure PostgreSQL Live Provisioning (~45 min)
Instance Setup: Spin up a Burstable B1ms instance in Central India (Pune).
Security Hardening:
Enforce SSL Required for all connections.
Whitelist your local computer's IP and the Azure App Service outbound IP only.
Enable pgcrypto (for phone hashing) and uuid-ossp extensions.
Session Bridge: Create the current_app_user_id() helper function, which is the "master key" for our RLS security logic.

2. Core Schema Migrations (0001–0006) (~75 min)
We will author and apply the first 6 idempotent migration files:

0001 (Foundations): Seed the city HYD (Hyderabad) and the 6 core material types.
0002 (Identity): Create the users table and the users_public view (which strictly excludes PII like phone hashes and Clerk IDs).
0003 (Profiles): Set up Seller/Business profiles and Aggregator rate cards.
0004 (Orders): Implement the core Order engine and status history tracking (using city_code instead of heavy Geography columns).
0005 (Transactions): Set up the Legal Record system (JSONB-based Invoices) and Dispute resolution tables.
0006 (Communication): Deploy the Range-Partitioned Messages table (pre-creating partitions for March, April, and May 2026) and the OTP audit logs.
🚦 Day 4 Verification Gates (L-Gates)
To move to Day 5, we must pass these "Hard Stop" checks:

G4.1: Confirmation that the DB rejects non-SSL connections.
G4.2: Direct SQL verification that users_public hides the forbidden columns.
G4.5: A test INSERT into the message table successfully routes to the correct monthly partition.
G4.6: Confirmation that Hyderabad and all 6 materials are available in the reference tables.


Total Estimated Time: 2 hours.

I have completed all Day 3 tasks and marked them off. I am ready to begin Step 4.1 (Azure Provisioning) as soon as you give the go-ahead!

