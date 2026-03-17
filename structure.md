Sortt
├── MEMORY.md # Authoritative project context and learned lessons
├── PLAN.md # Master roadmap and daily build status tracker
├── PRD.md # Product Requirements Document
├── README.md # Project overview and setup instructions
├── TRD.md # Technical requirements and schema specs
├── UI_REFERENCE.md # Branding and UI build guide
├── implementationPlan.md # Current implementation execution plan
├── structure.md # This file (project structure and descriptions)
├── app.json # Root Expo metadata
├── eas.json # EAS build configuration
├── package.json # Root workspace package config
├── pnpm-lock.yaml # Monorepo lockfile
├── pnpm-workspace.yaml # Monorepo workspace definition
├── tsconfig.json # Root TypeScript config
├── constants_app.ts # Shared app-level constants
├── requirements.txt # Python dependencies for scraper/support scripts
├── .env.example # Environment template
├── .npmrc # pnpm/npm workspace settings
├── .antigravityignore # Internal tooling ignore rules
├── .antigravityrules # Internal tooling rules
├── r.txt # Local reference scratch file
├── user_data_delete.sql # SQL helper for data deletion workflows
│
├── Root utility scripts # Local schema/data checks and reseeding
│   ├── check_aggregator_schema.js
│   ├── check_cities_schema.js
│   ├── check_material_types_schema.js
│   ├── check_schema.js
│   ├── fix.js
│   ├── reseed_reference_tables.js
│   ├── test_seed.js
│   ├── verify_env.js
│   └── verify_seed_data.js
│
├── apps
│   ├── mobile # React Native app (Expo + Expo Router + Zustand)
│   │   ├── app.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── metro.config.js
│   │   ├── expo-env.d.ts
│   │   ├── .env
│   │   ├── assets
│   │   │   ├── avatar_placeholder.png
│   │   │   └── images
│   │   │       ├── adaptive-icon.png
│   │   │       ├── favicon.png
│   │   │       ├── icon.png
│   │   │       └── splash.png
│   │   ├── app
│   │   │   ├── _layout.tsx # Root layout/providers
│   │   │   ├── index.tsx # Splash bridge and initial routing
│   │   │   ├── (auth) # Authentication and onboarding flow
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── onboarding.tsx
│   │   │   │   ├── phone.tsx
│   │   │   │   ├── otp.tsx
│   │   │   │   ├── user-type.tsx
│   │   │   │   ├── aggregator
│   │   │   │   │   ├── _layout.tsx
│   │   │   │   │   ├── profile-setup.tsx
│   │   │   │   │   ├── area-setup.tsx
│   │   │   │   │   ├── materials-setup.tsx
│   │   │   │   │   └── kyc.tsx
│   │   │   │   └── seller
│   │   │   │       ├── _layout.tsx
│   │   │   │       ├── account-type.tsx
│   │   │   │       ├── business-setup.tsx
│   │   │   │       └── seller-setup.tsx
│   │   │   ├── (seller) # Seller surface
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── home.tsx
│   │   │   │   ├── browse.tsx
│   │   │   │   ├── agg-profile.tsx
│   │   │   │   ├── prices.tsx
│   │   │   │   ├── orders.tsx
│   │   │   │   ├── earnings.tsx
│   │   │   │   ├── edit-profile.tsx
│   │   │   │   ├── profile.tsx
│   │   │   │   ├── settings.tsx
│   │   │   │   ├── listing
│   │   │   │   │   ├── _layout.tsx
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── step1.tsx
│   │   │   │   │   ├── step2.tsx
│   │   │   │   │   ├── step3.tsx
│   │   │   │   │   └── step4.tsx
│   │   │   │   └── order
│   │   │   │       ├── [id].tsx
│   │   │   │       └── otp
│   │   │   │           └── [id].tsx
│   │   │   ├── (aggregator) # Aggregator/dealer surface
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── home.tsx
│   │   │   │   ├── orders.tsx
│   │   │   │   ├── active-order-detail.tsx
│   │   │   │   ├── order-history-detail.tsx
│   │   │   │   ├── price-index.tsx
│   │   │   │   ├── earnings.tsx
│   │   │   │   ├── edit-profile.tsx
│   │   │   │   ├── profile.tsx
│   │   │   │   ├── route.tsx
│   │   │   │   ├── settings.tsx
│   │   │   │   ├── order
│   │   │   │   │   └── [id].tsx
│   │   │   │   ├── profile
│   │   │   │   │   ├── buy-rates.tsx
│   │   │   │   │   ├── hours-availability.tsx
│   │   │   │   │   ├── kyc-documents.tsx
│   │   │   │   │   ├── operating-areas.tsx
│   │   │   │   │   └── order-summary.tsx
│   │   │   │   └── execution
│   │   │   │       ├── _layout.tsx
│   │   │   │       ├── navigate.tsx
│   │   │   │       ├── confirm.tsx
│   │   │   │       ├── otp
│   │   │   │       │   └── [id].tsx
│   │   │   │       ├── weighing
│   │   │   │       │   └── [id].tsx
│   │   │   │       └── receipt
│   │   │   │           └── [id].tsx
│   │   │   └── (shared) # Shared cross-role pages
│   │   │       ├── _layout.tsx
│   │   │       ├── help.tsx
│   │   │       ├── language.tsx
│   │   │       ├── notifications.tsx
│   │   │       ├── privacy-policy.tsx
│   │   │       ├── terms-of-service.tsx
│   │   │       ├── terms-privacy.tsx
│   │   │       ├── dispute.tsx
│   │   │       ├── chat
│   │   │       │   └── [id].tsx
│   │   │       ├── order # currently reserved/empty directory
│   │   │       └── review
│   │   │           └── [id].tsx
│   │   ├── components
│   │   │   ├── SplashAnimation.tsx
│   │   │   ├── _1.tsx
│   │   │   ├── domain
│   │   │   │   └── CancelOrderModal.tsx
│   │   │   ├── order
│   │   │   │   ├── ContactCard.tsx
│   │   │   │   ├── OrderItemList.tsx
│   │   │   │   └── OrderTimeline.tsx
│   │   │   └── ui
│   │   │       ├── AuthNetworkErrorScreen.tsx
│   │   │       ├── Avatar.tsx
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── DayToggle.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── MaterialChip.tsx
│   │   │       ├── MessageBubble.tsx
│   │   │       ├── NavBar.tsx
│   │   │       ├── NetworkErrorScreen.tsx
│   │   │       ├── NotificationBell.tsx
│   │   │       ├── NotificationWatcher.tsx
│   │   │       ├── ProgressBar.tsx
│   │   │       ├── SkeletonLoader.tsx
│   │   │       ├── SorttLogo.tsx
│   │   │       ├── StatusChip.tsx
│   │   │       ├── StepIndicator.tsx
│   │   │       ├── TabBar.tsx
│   │   │       ├── Typography.tsx
│   │   │       ├── WizardStepIndicator.tsx
│   │   │       └── ZoneChip.tsx
│   │   ├── constants
│   │   │   ├── app.ts
│   │   │   └── tokens.ts
│   │   ├── hooks
│   │   │   ├── useAggregatorFeedChannel.ts
│   │   │   ├── useNetworkStatus.ts
│   │   │   ├── useOrderChannel.ts
│   │   │   └── usePhotoCapture.ts
│   │   ├── lib
│   │   │   ├── api.ts
│   │   │   ├── clerk.ts
│   │   │   ├── push.ts
│   │   │   └── realtime.ts
│   │   ├── store
│   │   │   ├── aggregatorStore.ts
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   ├── listingStore.ts
│   │   │   ├── notificationStore.ts
│   │   │   ├── orderStore.ts
│   │   │   └── uiStore.ts
│   │   └── utils
│   │       ├── error.ts
│   │       └── navigation.tsx
│   │
│   └── web # Next.js web app
│       ├── package.json
│       ├── tsconfig.json
│       ├── next-env.d.ts
│       ├── tailwind.config.ts
│       ├── app
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   ├── admin
│       │   └── aggregator
│       ├── components
│       │   └── ui
│       │       └── SorttLogo.tsx
│       └── constants
│           ├── app.ts
│           └── tokens.ts
│
├── backend # Express API (TypeScript + PostgreSQL)
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── .env
│   ├── check_db.ts
│   ├── clear_rate_limit.js
│   ├── fix_partitions.js
│   ├── run_migrations.js
│   ├── test_day9.js
│   ├── test_db.js
│   ├── test-kyc.js
│   ├── test-meta.js
│   ├── tmp_migrate.js
│   ├── verify_day5.js
│   ├── verify_day6.js
│   ├── scripts
│   │   ├── apply_migration_0018.js
│   │   ├── apply_migration_0021.js
│   │   ├── schema_check.js
│   │   ├── truncate_all_tables.js
│   │   └── verify_tables_empty.js
│   ├── src
│   │   ├── index.ts
│   │   ├── instrument.ts
│   │   ├── scheduler.ts
│   │   ├── lib
│   │   │   ├── db.ts
│   │   │   ├── redis.ts
│   │   │   ├── notifications.ts
│   │   │   └── storage.ts
│   │   ├── middleware
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── sanitize.ts
│   │   │   └── verifyRole.ts
│   │   ├── providers
│   │   │   ├── ablyProvider.ts
│   │   │   └── maps.ts
│   │   ├── routes
│   │   │   ├── aggregators.ts
│   │   │   ├── auth.ts
│   │   │   ├── disputes.ts
│   │   │   ├── messages.ts
│   │   │   ├── notifications.ts
│   │   │   ├── rates.ts
│   │   │   ├── ratings.ts
│   │   │   ├── realtime.ts
│   │   │   ├── users.ts
│   │   │   └── orders
│   │   │       └── index.ts
│   │   └── utils
│   │       ├── channelHelper.ts
│   │       ├── orderDto.ts
│   │       ├── orderStateMachine.ts
│   │       └── pushHelper.ts
│   └── uploads # runtime-uploaded files (gitignored)
│
├── packages # Shared workspace packages
│   ├── analysis
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src
│   ├── auth
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src
│   ├── maps
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src
│   ├── realtime
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src
│   └── storage
│       ├── package.json
│       ├── tsconfig.json
│       └── src
│
├── migrations # Database schema and data migrations
│   ├── 0001_reference_tables.sql
│   ├── 0002_users.sql
│   ├── 0003_profiles.sql
│   ├── 0004_orders.sql
│   ├── 0005_transactions.sql
│   ├── 0006_messaging.sql
│   ├── 0007_security.sql
│   ├── 0008_prices.sql
│   ├── 0009_rls.sql
│   ├── 0010_indexes.sql
│   ├── 0011_triggers.sql
│   ├── 0012_materialized_views.sql
│   ├── 0013_add_aggregator_type.sql
│   ├── 0014_kyc_media_types.sql
│   ├── 0015_otp_log_make_hmac_nullable.sql
│   ├── 0016_standardise_column_names.sql
│   ├── 0017_standardise_trd_columns.sql
│   ├── 0018_order_number_per_seller.sql
│   ├── 0019_users_display_phone.sql
│   ├── 0020_sync_notifications_schema.sql
│   ├── 0021_order_value_consistency.sql
│   ├── 0022_aggregator_availability_default_online.sql
│   ├── 0022_unique_phone_hash.sql # duplicate number exists in repo
│   └── 0023_add_last_seen.sql
│
├── scripts # Workspace utility scripts
│   ├── search_repo.ps1
│   ├── search_repo.sh
│   ├── setup_search.ps1
│   ├── setup_search.sh
│   ├── validate-all.ps1
│   ├── validate-all.sh
│   ├── validate-skills.ps1
│   ├── validate-skills.sh
│   ├── validate-templates.ps1
│   ├── validate-templates.sh
│   ├── validate-workflows.ps1
│   └── validate-workflows.sh
│
├── docs # Internal docs and runbooks
│   ├── model-selection-playbook.md
│   ├── runbook.md
│   └── token-optimization-guide.md
│
└── scraper # Python scraper service
    ├── .gitkeep
    └── main.py