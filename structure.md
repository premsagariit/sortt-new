Sortt
├── MEMORY.md # Authoritative project memory, decisions, and lessons learned
├── PLAN.md # Master execution roadmap with status checkpoints
├── PRD.md # Product requirements, user journeys, and acceptance goals
├── README.md # Setup, run commands, and project overview
├── TRD.md # Technical architecture, contracts, and implementation rules
├── UI_REFERENCE.md # UI system reference for tokens, components, and style guidance
├── implementationPlan.md # Active implementation plan with gates and execution notes
├── structure.md # Repository tree and file purpose summary
├── app.json # Root Expo app metadata
├── eas.json # EAS build and submission profiles
├── package.json # Root monorepo scripts and dependencies
├── pnpm-lock.yaml # Locked dependency graph for pnpm workspace
├── pnpm-workspace.yaml # Workspace package boundaries and package globs
├── tsconfig.json # Root TypeScript compiler baseline
├── constants_app.ts # Shared app-level constants used across workspace
├── requirements.txt # Python dependencies for scraper and utility scripts
├── .env.example # Environment variable template for local setup
├── .npmrc # npm/pnpm behavior configuration for workspace
├── .antigravityignore # Internal tooling ignore rules
├── .antigravityrules # Internal tooling rule definitions
├── r.txt # Local scratch/reference notes
├── user_data_delete.sql # SQL helper for user-data cleanup workflows
│
├── Root utility scripts # Local schema/data checks and reseeding tools
│   ├── check_aggregator_schema.js # Prints aggregator-related table schema details
│   ├── check_cities_schema.js # Verifies cities table columns/types
│   ├── check_material_types_schema.js # Verifies material_types table columns/types
│   ├── check_schema.js # General schema inspection helper
│   ├── fix.js # One-off local repair script for data/state issues
│   ├── reseed_reference_tables.js # Re-seeds reference tables (cities/material types)
│   ├── test_seed.js # Sanity-checks seeded reference data
│   ├── verify_env.js # Validates required environment variables are present
│   └── verify_seed_data.js # Verifies seeded records and expected counts
│
├── apps
│   ├── mobile # React Native app (Expo + Expo Router + Zustand)
│   │   ├── app.json # Mobile Expo configuration
│   │   ├── package.json # Mobile app dependencies and scripts
│   │   ├── tsconfig.json # Mobile TypeScript configuration
│   │   ├── metro.config.js # Metro bundler resolver/transform config
│   │   ├── expo-env.d.ts # Expo-specific type declarations
│   │   ├── .env # Mobile runtime environment variables
│   │   ├── assets
│   │   │   ├── avatar_placeholder.png # Default avatar placeholder asset
│   │   │   └── images
│   │   │       ├── adaptive-icon.png # Android adaptive icon asset
│   │   │       ├── favicon.png # Web/favicon asset
│   │   │       ├── icon.png # App icon asset
│   │   │       └── splash.png # Splash image asset
│   │   ├── app
│   │   │   ├── _layout.tsx # Root app providers, guards, and navigation shell
│   │   │   ├── index.tsx # Entry route deciding initial navigation target
│   │   │   ├── (auth) # Authentication and onboarding route group
│   │   │   │   ├── _layout.tsx # Auth stack layout wrapper
│   │   │   │   ├── onboarding.tsx # Intro carousel and first-time app walkthrough
│   │   │   │   ├── phone.tsx # Phone login/signup + OTP initiation/verification flow
│   │   │   │   ├── otp.tsx # Legacy OTP page route (kept for compatibility)
│   │   │   │   ├── user-type.tsx # Seller vs aggregator role selection screen
│   │   │   │   ├── aggregator
│   │   │   │   │   ├── _layout.tsx # Aggregator onboarding stack layout
│   │   │   │   │   ├── profile-setup.tsx # Aggregator profile basics capture
│   │   │   │   │   ├── area-setup.tsx # Aggregator operating area setup
│   │   │   │   │   ├── materials-setup.tsx # Aggregator material/rate preferences setup
│   │   │   │   │   └── kyc.tsx # Aggregator KYC media upload and submission
│   │   │   │   └── seller
│   │   │   │       ├── _layout.tsx # Seller onboarding stack layout
│   │   │   │       ├── account-type.tsx # Seller account type selection
│   │   │   │       ├── business-setup.tsx # Business seller details and GST setup
│   │   │   │       └── seller-setup.tsx # Seller profile details and locality setup
│   │   │   ├── (seller) # Seller experience route group
│   │   │   │   ├── _layout.tsx # Seller tab layout and route shell
│   │   │   │   ├── home.tsx # Seller dashboard with quick actions and highlights
│   │   │   │   ├── browse.tsx # Materials/rates browsing screen
│   │   │   │   ├── agg-profile.tsx # Aggregator profile preview for seller context
│   │   │   │   ├── prices.tsx # Detailed seller-facing price list
│   │   │   │   ├── orders.tsx # Seller order list and status tabs
│   │   │   │   ├── earnings.tsx # Seller earnings summary/history screen
│   │   │   │   ├── edit-profile.tsx # Seller profile editing form
│   │   │   │   ├── profile.tsx # Seller profile overview screen
│   │   │   │   ├── settings.tsx # Seller settings and account actions
│   │   │   │   ├── listing
│   │   │   │   │   ├── _layout.tsx # Listing creation wizard stack layout
│   │   │   │   │   ├── index.tsx # Listing flow entry/overview
│   │   │   │   │   ├── step1.tsx # Listing wizard step 1 (material selection)
│   │   │   │   │   ├── step2.tsx # Listing wizard step 2 (photos/media)
│   │   │   │   │   ├── step3.tsx # Listing wizard step 3 (weights/scheduling)
│   │   │   │   │   └── step4.tsx # Listing wizard step 4 (review/submit)
│   │   │   │   └── order
│   │   │   │       ├── [id].tsx # Seller order detail page by order id
│   │   │   │       └── otp
│   │   │   │           └── [id].tsx # Seller OTP confirmation page for order completion
│   │   │   ├── (aggregator) # Aggregator/dealer experience route group
│   │   │   │   ├── _layout.tsx # Aggregator tab layout and route shell
│   │   │   │   ├── home.tsx # Aggregator dashboard/feed home
│   │   │   │   ├── orders.tsx # Aggregator order list across status tabs
│   │   │   │   ├── active-order-detail.tsx # Active accepted order detail/actions (store-backed, no mock fixtures)
│   │   │   │   ├── order-history-detail.tsx # Historical/completed order detail view (legacy service fee removed)
│   │   │   │   ├── price-index.tsx # Aggregator market price index page
│   │   │   │   ├── earnings.tsx # Aggregator earnings analytics page
│   │   │   │   ├── edit-profile.tsx # Aggregator profile edit form
│   │   │   │   ├── profile.tsx # Aggregator profile overview screen
│   │   │   │   ├── route.tsx # Route/navigation helper page for execution flow
│   │   │   │   ├── settings.tsx # Aggregator settings and account actions
│   │   │   │   ├── order
│   │   │   │   │   └── [id].tsx # Pre-accept aggregator order detail page
│   │   │   │   ├── profile
│   │   │   │   │   ├── buy-rates.tsx # Aggregator buy-rate management page
│   │   │   │   │   ├── hours-availability.tsx # Working hours and online availability setup
│   │   │   │   │   ├── kyc-documents.tsx # KYC documents management page
│   │   │   │   │   ├── operating-areas.tsx # Operating areas management page
│   │   │   │   │   └── order-summary.tsx # Aggregator order summary and stats view
│   │   │   │   └── execution
│   │   │   │       ├── _layout.tsx # Execution flow stack layout
│   │   │   │       ├── navigate.tsx # Navigation/map guidance during pickup
│   │   │   │       ├── confirm.tsx # Confirmation stage before completion flow
│   │   │   │       ├── otp
│   │   │   │       │   └── [id].tsx # Aggregator OTP verification for handoff/complete
│   │   │   │       ├── weighing
│   │   │   │       │   └── [id].tsx # Weighing input and material confirmation page
│   │   │   │       └── receipt
│   │   │   │           └── [id].tsx # Final receipt page after completion
│   │   │   └── (shared) # Shared cross-role route group
│   │   │       ├── _layout.tsx # Shared stack layout wrapper
│   │   │       ├── help.tsx # Help/support information page
│   │   │       ├── language.tsx # Language selection page
│   │   │       ├── notifications.tsx # Notifications center page with role-based order deep-link handling
│   │   │       ├── privacy-policy.tsx # Privacy policy content page
│   │   │       ├── terms-of-service.tsx # Terms of service content page
│   │   │       ├── terms-privacy.tsx # Combined legal terms/privacy helper page
│   │   │       ├── dispute.tsx # Dispute raise/track page
│   │   │       ├── chat
│   │   │       │   └── [id].tsx # Shared chat room page by thread/order id
│   │   │       ├── order # currently reserved/empty directory
│   │   │       └── review
│   │   │           └── [id].tsx # Rating/review page by order id
│   │   ├── components
│   │   │   ├── SplashAnimation.tsx # Branded animated splash component
│   │   │   ├── _1.tsx # Local experimental/utility component file
│   │   │   ├── domain
│   │   │   │   └── CancelOrderModal.tsx # Domain modal for order cancellation reason flow
│   │   │   ├── order
│   │   │   │   ├── ContactCard.tsx # Reusable order contact details card
│   │   │   │   ├── OrderItemList.tsx # Reusable order items/weights/rates list
│   │   │   │   └── OrderTimeline.tsx # Reusable order status timeline component
│   │   │   └── ui
│   │   │       ├── AuthNetworkErrorScreen.tsx # Offline screen for auth routes
│   │   │       ├── Avatar.tsx # Reusable avatar renderer with fallbacks
│   │   │       ├── Button.tsx # Reusable primary/secondary button components
│   │   │       ├── Card.tsx # Reusable card container component
│   │   │       ├── DayToggle.tsx # Day-of-week toggle control component
│   │   │       ├── EmptyState.tsx # Empty-state message and CTA component
│   │   │       ├── Input.tsx # Reusable text input component with variants
│   │   │       ├── MaterialChip.tsx # Material chip/tag component
│   │   │       ├── MessageBubble.tsx # Chat message bubble component
│   │   │       ├── NavBar.tsx # Top navigation bar component
│   │   │       ├── NetworkErrorScreen.tsx # Offline screen for in-app routes
│   │   │       ├── NotificationBell.tsx # Notification icon/badge component
│   │   │       ├── NotificationWatcher.tsx # Notification polling/subscription helper
│   │   │       ├── ProgressBar.tsx # Progress indicator component
│   │   │       ├── SkeletonLoader.tsx # Skeleton loading placeholder component
│   │   │       ├── SorttLogo.tsx # Brand logo component
│   │   │       ├── StatusChip.tsx # Status badge/chip component
│   │   │       ├── StepIndicator.tsx # Step indicator dots/progress component
│   │   │       ├── TabBar.tsx # Custom bottom tab bar component
│   │   │       ├── Typography.tsx # Shared Text/Numeric typography primitives
│   │   │       ├── WizardStepIndicator.tsx # Wizard progress indicator component
│   │   │       └── ZoneChip.tsx # Zone/area chip component
│   │   ├── constants
│   │   │   ├── app.ts # Mobile app constants and static labels
│   │   │   └── tokens.ts # Design tokens (colors/spacing/radius/typography)
│   │   ├── hooks
│   │   │   ├── useAggregatorFeedChannel.ts # Aggregator feed realtime subscription hook
│   │   │   ├── useNetworkStatus.ts # Online/offline connectivity state hook
│   │   │   ├── useOrderChannel.ts # Order-specific realtime channel hook
│   │   │   └── usePhotoCapture.ts # Camera/gallery capture helper hook
│   │   ├── lib
│   │   │   ├── api.ts # Axios API client and auth header wiring
│   │   │   ├── clerk.ts # Clerk SDK configuration and token cache
│   │   │   ├── push.ts # Push notification registration/utilities
│   │   │   └── realtime.ts # Realtime client initialization/wrappers
│   │   ├── store
│   │   │   ├── aggregatorStore.ts # Aggregator state/actions (feed, orders, rates, profile)
│   │   │   ├── authStore.ts # Auth/session state and onboarding flags
│   │   │   ├── chatStore.ts # Chat threads/messages state and actions
│   │   │   ├── listingStore.ts # Seller listing wizard draft state
│   │   │   ├── notificationStore.ts # Notification state/read updates with metadata payload typing
│   │   │   ├── orderStore.ts # Shared order state mapping and lifecycle actions
│   │   │   └── uiStore.ts # Global UI state (modals, flags, view toggles)
│   │   └── utils
│   │       ├── error.ts # Error normalization/classification helpers
│   │       └── navigation.tsx # Navigation safety helpers and route utilities
│   │
│   └── web # Next.js web app
│       ├── package.json # Web app dependencies and scripts
│       ├── tsconfig.json # Web app TypeScript config
│       ├── next-env.d.ts # Next.js type declarations
│       ├── tailwind.config.ts # Tailwind theme/config for web app
│       ├── app
│       │   ├── layout.tsx # Web app root layout
│       │   ├── page.tsx # Web app landing page
│       │   ├── globals.css # Global CSS styles for web app
│       │   ├── admin # Admin route segment
│       │   └── aggregator # Aggregator portal route segment
│       ├── components
│       │   └── ui
│       │       └── SorttLogo.tsx # Reusable web logo component
│       └── constants
│           ├── app.ts # Web constants/static configuration
│           └── tokens.ts # Web design token exports
│
├── backend # Express API (TypeScript + PostgreSQL)
│   ├── package.json # Backend dependencies and scripts
│   ├── package-lock.json # npm lockfile for backend package
│   ├── tsconfig.json # Backend TypeScript configuration
│   ├── .env # Backend runtime environment variables
│   ├── check_db.ts # DB connection/schema sanity checker
│   ├── clear_rate_limit.js # Clears limiter keys for local testing
│   ├── fix_partitions.js # Partition repair utility script
│   ├── run_migrations.js # Migration runner helper script
│   ├── test_day9.js # Day-9 focused backend behavior tests
│   ├── test_db.js # Database smoke test script
│   ├── test-kyc.js # KYC flow verification script
│   ├── test-meta.js # Meta WhatsApp integration test script
│   ├── tmp_migrate.js # Temporary migration helper script
│   ├── verify_day5.js # Day-5 verification script
│   ├── verify_day6.js # Day-6 verification script
│   ├── scripts
│   │   ├── apply_migration_0018.js # Applies migration 0018 helper
│   │   ├── apply_migration_0021.js # Applies migration 0021 helper
│   │   ├── schema_check.js # Prints DB schema checks for diagnostics
│   │   ├── truncate_all_tables.js # Truncates tables for clean local resets
│   │   └── verify_tables_empty.js # Confirms truncation/reset completion
│   ├── src
│   │   ├── index.ts # Express app bootstrap, middleware, and route mounts
│   │   ├── instrument.ts # Monitoring/instrumentation initialization
│   │   ├── scheduler.ts # Cron jobs for periodic maintenance tasks
│   │   ├── lib
│   │   │   ├── db.ts # PostgreSQL query/pool helpers
│   │   │   ├── redis.ts # Redis client and limiter utilities
│   │   │   ├── notifications.ts # Notification dispatch abstractions
│   │   │   └── storage.ts # File storage helper abstractions
│   │   ├── middleware
│   │   │   ├── auth.ts # Clerk token verification and user loading middleware
│   │   │   ├── errorHandler.ts # Centralized API error handler middleware
│   │   │   ├── sanitize.ts # Input sanitization middleware
│   │   │   └── verifyRole.ts # Role guard middleware for protected routes
│   │   ├── providers
│   │   │   ├── ablyProvider.ts # Ably provider initialization/helpers
│   │   │   └── maps.ts # Maps/geocoding provider abstraction
│   │   ├── routes
│   │   │   ├── aggregators.ts # Aggregator profile/rates/availability endpoints
│   │   │   ├── auth.ts # OTP request/verify and auth flow endpoints
│   │   │   ├── disputes.ts # Dispute creation and status handling endpoints
│   │   │   ├── messages.ts # Chat/message endpoints
│   │   │   ├── notifications.ts # Notification fetch/update endpoints
│   │   │   ├── rates.ts # Public and role-based rates endpoints
│   │   │   ├── ratings.ts # Rating/review create and summary endpoints
│   │   │   ├── realtime.ts # Realtime token/channel endpoints
│   │   │   ├── users.ts # User profile and account endpoints
│   │   │   └── orders
│   │   │       └── index.ts # Order lifecycle routes (create, accept, finalize, detail)
│   │   └── utils
│   │       ├── channelHelper.ts # Channel naming/access helper utilities
│   │       ├── orderDto.ts # Order response normalization/sanitization helpers
│   │       ├── orderStateMachine.ts # Allowed order state transition rules
│   │       └── pushHelper.ts # Push notification helper functions
│   └── uploads # Runtime uploaded media directory (gitignored)
│
├── packages # Shared workspace libraries
│   ├── analysis
│   │   ├── package.json # Analysis package manifest
│   │   ├── tsconfig.json # Analysis package TypeScript config
│   │   └── src # Analysis package source files
│   ├── auth
│   │   ├── package.json # Auth package manifest
│   │   ├── tsconfig.json # Auth package TypeScript config
│   │   └── src # Auth package source files
│   ├── maps
│   │   ├── package.json # Maps package manifest
│   │   ├── tsconfig.json # Maps package TypeScript config
│   │   └── src # Maps package source files
│   ├── realtime
│   │   ├── package.json # Realtime package manifest
│   │   ├── tsconfig.json # Realtime package TypeScript config
│   │   └── src # Realtime package source files
│   └── storage
│       ├── package.json # Storage package manifest
│       ├── tsconfig.json # Storage package TypeScript config
│       └── src # Storage package source files
│
├── migrations # Database schema/data migrations
│   ├── 0001_reference_tables.sql # Creates base reference tables and seed structure
│   ├── 0002_users.sql # Creates users table and base auth-related columns
│   ├── 0003_profiles.sql # Creates seller/aggregator profile tables
│   ├── 0004_orders.sql # Creates orders and core order-linked entities
│   ├── 0005_transactions.sql # Creates payment/transaction-related structures
│   ├── 0006_messaging.sql # Creates messaging tables and availability entities
│   ├── 0007_security.sql # Adds security controls/policies/index hardening
│   ├── 0008_prices.sql # Adds pricing/rates tables and related fields
│   ├── 0009_rls.sql # Enables/updates row-level security policies
│   ├── 0010_indexes.sql # Adds performance indexes for critical queries
│   ├── 0011_triggers.sql # Adds triggers/functions for consistency updates
│   ├── 0012_materialized_views.sql # Creates materialized views for reporting
│   ├── 0013_add_aggregator_type.sql # Adds aggregator classification/type support
│   ├── 0014_kyc_media_types.sql # Adds KYC media-type support/constraints
│   ├── 0015_otp_log_make_hmac_nullable.sql # Adjusts OTP log schema for nullable hmac
│   ├── 0016_standardise_column_names.sql # Normalizes column naming conventions
│   ├── 0017_standardise_trd_columns.sql # Aligns columns with TRD-standard names
│   ├── 0018_order_number_per_seller.sql # Adds per-seller order numbering
│   ├── 0019_users_display_phone.sql # Adds/aligns display phone fields for users
│   ├── 0020_sync_notifications_schema.sql # Syncs notifications schema with app contract
│   ├── 0021_order_value_consistency.sql # Enforces order value consistency logic
│   ├── 0022_aggregator_availability_default_online.sql # Sets default online availability behavior
│   ├── 0022_unique_phone_hash.sql # Adds phone_hash uniqueness constraint (duplicate migration number)
│   └── 0023_add_last_seen.sql # Adds last_seen tracking for user presence/activity
│
├── scripts # Workspace utility/validation scripts
│   ├── search_repo.ps1 # PowerShell repository search helper
│   ├── search_repo.sh # Bash repository search helper
│   ├── setup_search.ps1 # PowerShell setup for search tooling
│   ├── setup_search.sh # Bash setup for search tooling
│   ├── validate-all.ps1 # PowerShell all-validations runner
│   ├── validate-all.sh # Bash all-validations runner
│   ├── validate-skills.ps1 # PowerShell skills validation script
│   ├── validate-skills.sh # Bash skills validation script
│   ├── validate-templates.ps1 # PowerShell template validation script
│   ├── validate-templates.sh # Bash template validation script
│   ├── validate-workflows.ps1 # PowerShell workflow validation script
│   └── validate-workflows.sh # Bash workflow validation script
│
├── docs # Internal technical docs and runbooks
│   ├── model-selection-playbook.md # Guidance for model/agent selection strategies
│   ├── runbook.md # Operational runbook for common incidents/tasks
│   └── token-optimization-guide.md # Prompt/token optimization practices
│
└── scraper # Python scraper service
    ├── .gitkeep # Keeps scraper directory tracked when empty
    └── main.py # Scraper entry script for external data ingestion