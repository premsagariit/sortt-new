Sortt
├── Recent implementation updates (2026-04-04)
│   ├── Day 16 completion delivered:
│   │   ├── Admin Web Dashboard (`apps/web`) fully operational with live data.
│   │   ├── Admin navigation, login, KYC queue, and Dispute management modules completed.
│   │   ├── Design system tokens (`apps/web/constants/tokens.ts`) applied across all admin screens.
│   │   ├── Next.js optimized `<Image />` components implemented for R2/Clerk assets.
│   │   ├── Monorepo-wide verification: `pnpm type-check`, `pnpm lint`, and `pnpm test` all 100% green.
│   │   └── Repository cleanup: removed all temp `.tmp` JWTs and standalone test scripts.
│   ├── Day 17 status: **Active** — Security Audit + Monitoring + Launch phase underway.
│   ├── Web scope clarification (2026-03-30): business seller + aggregator web UI deferred; admin web pages only in current phase
│   ├── Seller address flow split: `address-map.tsx` (map pin + reverse geocode) + `address-form.tsx` (details + save)
│   ├── Address draft lifecycle in `apps/mobile/store/addressStore.ts` for map/details handoff
│   ├── Listing wizard step3 + seller addresses list integrated with map-first address flow
│   ├── Live tracking stabilization in:
│   │   ├── `apps/mobile/app/(aggregator)/execution/navigate.tsx` (pickup geocode fallback + route rendering)
│   │   └── `apps/mobile/app/(seller)/order/[id].tsx` (resilient live tracking map gating + fallback)
│   ├── Order live-location field preservation in `apps/mobile/store/orderStore.ts`
│   └── Seller earnings route collision fix in `backend/src/routes/orders/index.ts` (`/earnings` before `/:id`)
│   ├── Maps migration completed: Google Maps → Ola Maps provider implementation in `packages/maps/src/providers/OlaMapsProvider.ts`
│   ├── Backend maps route expansion in `backend/src/routes/maps.ts` (`/geocode`, `/reverse`, `/autocomplete`)
│   ├── Mobile map rendering migrated to MapLibre + Ola tiles with Expo Go-safe gate in `apps/mobile/utils/mapAvailable.ts`
│   └── Provider-aware external map navigation helper added at `apps/mobile/utils/mapNavigation.ts`
│   ├── Aggregator distance display fix: numeric parsing hardening in `apps/mobile/store/orderStore.ts` and `apps/mobile/store/aggregatorStore.ts`
│   ├── Pre-accept header distance fallback added in `apps/mobile/app/(aggregator)/order/[id].tsx` (`liveDistanceKm` fallback)
│   └── External navigation chooser flow added in `apps/mobile/utils/mapNavigation.ts` (Google Maps / MapmyIndia / Ola Maps / other app)
│   ├── End-to-end chat image messages implemented across mobile + backend + realtime (`apps/mobile/store/chatStore.ts`, `apps/mobile/hooks/useOrderChannel.ts`, `backend/src/routes/messages.ts`)
│   ├── Shared chat UI modernization and small-screen hardening completed in `apps/mobile/app/(shared)/chat/[id].tsx` and `apps/mobile/components/ui/MessageBubble.tsx`
│   ├── Realtime cleanup adjusted in `apps/mobile/lib/realtime.ts` to reduce detached-channel transition errors
│   └── Narrow-screen action-button overflow fixes applied in seller listing and aggregator weighing photo flows (`apps/mobile/app/(seller)/listing/step2.tsx`, `apps/mobile/app/(aggregator)/execution/weighing/[id].tsx`)
│
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
│
│
├── apps
│
├── apps
│   ├── mobile # React Native app (Expo + Expo Router + Zustand)
│   │   ├── app.json # Mobile Expo configuration
│   │   ├── package.json # Mobile app dependencies and scripts
│   │   ├── tsconfig.json # Mobile TypeScript configuration
│   │   ├── metro.config.js # Metro bundler resolver/transform config
│   │   ├── expo-env.d.ts # Expo-specific type declarations
│   │   ├── .env # Mobile runtime environment variables
│   │   ├── .env.example # Mobile environment variable template
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
│   │   │       ├── PushTokenRegistrar.tsx # Root-level push token registration helper
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
│   │   │   ├── useAggregatorFeedChannel.ts # Aggregator feed Ably subscription hook (`orders:hyd:new`)
│   │   │   ├── useNetworkStatus.ts # Online/offline connectivity state hook
│   │   │   ├── useOrderChannel.ts # Order/chat Ably subscription hook using backend channel tokens
│   │   │   └── usePhotoCapture.ts # Camera/gallery capture helper hook
│   │   ├── lib
│   │   │   ├── api.ts # Axios API client with auth + centralized 401 handler
│   │   │   ├── clerk.ts # Clerk SDK configuration and token cache
│   │   │   ├── push.ts # Push notification registration/utilities
│   │   │   └── realtime.ts # Ably token-auth singleton client + disconnect helper
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
│   └── web # Next.js admin web app (production scope)
│       ├── package.json # Web app dependencies and scripts
│       ├── tsconfig.json # Web app TypeScript config
│       ├── next.config.ts # Next.js optimized remotePatterns for R2/Clerk
│       ├── app # App Router layout and routes
│       │   ├── layout.tsx # Root layout with Clerk + Next.js UI integration
│       │   ├── page.tsx # Admin landing / redirect page
│       │   ├── globals.css # Design system global overrides
│       │   ├── admin # Admin Portal (Active)
│       │   │   ├── layout.tsx # Admin SIDENAV + design system tokens
│       │   │   ├── login
│       │   │   │   └── page.tsx # Clerk-integrated admin login (Suspense wrapped)
│       │   │   ├── create-password
│       │   │   │   └── page.tsx # Admin password creation (Suspense wrapped)
│       │   │   ├── reset-password
│       │   │   │   └── page.tsx # Admin password reset (Suspense wrapped)
│       │   │   ├── kyc # KYC queue for aggregator verification
│       │   │   ├── disputes # Dispute resolution queue for order issues
│       │   │   ├── prices # Price index management (stubbed)
│       │   │   └── request-access # Admin access request flow
│       │   ├── aggregator # Aggregator Portal
│       │   │   ├── layout.tsx # Aggregator layout with client icons (use client)
│       │   │   └── page.tsx # Aggregator dashboard entry
│       │   └── aggregator # Deferred placeholder segment
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
│   │   │   ├── realtime.ts # Realtime publish/token wrapper via @sortt/realtime
│   │   │   └── storage.ts # File storage adapter via @sortt/storage
│   │   ├── middleware
│   │   │   ├── auth.ts # Clerk token verification and user loading middleware
│   │   │   ├── errorHandler.ts # Centralized API error handler middleware
│   │   │   ├── sanitize.ts # Input sanitization middleware
│   │   │   └── verifyRole.ts # Role guard middleware for protected routes
│   │   ├── providers
│   │   │   └── maps.ts # Maps/geocoding adapter via @sortt/maps
│   │   ├── routes
│   │   │   ├── aggregators.ts # Aggregator profile/rates/availability endpoints
│   │   │   ├── auth.ts # OTP request/verify and auth flow endpoints
│   │   │   ├── disputes.ts # Dispute creation and status handling endpoints
│   │   │   ├── maps.ts # Geocode/reverse/autocomplete endpoints via @sortt/maps
│   │   │   ├── messages.ts # Chat/message endpoints
│   │   │   ├── notifications.ts # Notification fetch/update endpoints
│   │   │   ├── rates.ts # Public and role-based rates endpoints
│   │   │   ├── ratings.ts # Rating/review create and summary endpoints
│   │   │   ├── realtime.ts # Realtime token/channel endpoints
│   │   │   ├── scrap.ts # POST /api/scrap/analyze — Gemini Vision scrap analysis with EXIF strip + circuit breaker
│   │   │   ├── users.ts # User profile and account endpoints
│   │   │   └── orders
│   │   │       └── index.ts # Order lifecycle routes (create, accept, finalize, invoice download)
│   │   └── utils
│   │       ├── channelHelper.ts # Channel naming/access helper utilities
│   │       ├── invoiceGenerator.ts # pdf-lib based A4 GST invoice PDF builder
│   │       ├── orderDto.ts # Order response normalization/sanitization helpers
│   │       ├── orderStateMachine.ts # Allowed order state transition rules
│   │       ├── pushHelper.ts # Legacy push helper (superseded by pushNotifications.ts)
│   │       ├── pushNotifications.ts # Chunked expo-server-sdk push notifications utility
│   │       ├── __tests__ # Backend test suite
│   │       │   └── integration # Integration tests detected by CI
│   │       │       ├── auth.integration.test.ts # Auth flow integration tests
│   │       │       ├── orders.integration.test.ts # Order lifecycle integration tests
│   │       │       ├── profiles.integration.test.ts # Profile management integration tests
│   │       │       ├── rls.integration.test.ts # Row-level security integration tests
│   │       │       └── setup.ts # Shared integration test setup
│   └── uploads # Runtime uploaded media directory (gitignored)
│
├── packages # Shared workspace libraries
│   ├── analysis
│   │   ├── package.json # Analysis package manifest
│   │   ├── tsconfig.json # Analysis package TypeScript config
│   │   ├── dist # Built JS + d.ts artifacts
│   │   └── src
│   │       ├── index.ts # IAnalysisProvider exports + factory
│   │       ├── types.ts # AnalysisResult + IAnalysisProvider contracts
│   │       └── providers
│   │           └── GeminiVisionProvider.ts # Full Gemini Vision adapter (env-driven model, EXIF stripped upstream)
│   ├── auth
│   │   ├── package.json # Auth package manifest
│   │   ├── tsconfig.json # Auth package TypeScript config
│   │   ├── dist # Built JS + d.ts artifacts
│   │   └── src
│   │       ├── index.ts # IAuthProvider exports + factory
│   │       ├── types.ts # Session DTO + IAuthProvider interface
│   │       └── providers
│   │           └── ClerkAuthProvider.ts # Clerk auth adapter via backend APIs
│   ├── maps
│   │   ├── package.json # Maps package manifest
│   │   ├── tsconfig.json # Maps package TypeScript config
│   │   ├── dist # Built JS + d.ts artifacts
│   │   └── src
│   │       ├── index.ts # IMapProvider exports + factory
│   │       ├── types.ts # GeoResult + IMapProvider interface
│   │       └── providers
│   │           ├── GoogleMapsProvider.ts # Legacy/Secondary maps implementation
│   │           └── OlaMapsProvider.ts # Full Ola Maps implementation
│   ├── realtime
│   │   ├── package.json # Realtime package manifest
│   │   ├── tsconfig.json # Realtime package TypeScript config
│   │   ├── dist # Built JS + d.ts artifacts
│   │   └── src
│   │       ├── index.ts # IRealtimeProvider exports + factory + token helper
│   │       ├── types.ts # RealtimeMessage + IRealtimeProvider interface
│   │       └── providers
│   │           ├── AblyBackendProvider.ts # Backend realtime provider
│   │           ├── AblyMobileProvider.ts # Mobile token-auth provider
│   │           └── SoketiProvider.ts # Swap stub (NotImplementedError)
│   └── storage
│       ├── package.json # Storage package manifest
│       ├── tsconfig.json # Storage package TypeScript config
│       ├── dist # Built JS + d.ts artifacts
│       └── src
│           ├── index.ts # IStorageProvider exports + factory
│           ├── types.ts # IStorageProvider contract (private-file only)
│           └── providers
│               ├── R2StorageProvider.ts # Default Cloudflare R2 storage adapter
│               └── S3StorageProvider.ts # Swap stub (NotImplementedError)
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