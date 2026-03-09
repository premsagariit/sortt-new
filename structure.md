Sortt
├── MEMORY.md # Authoritative project context and learned lessons
├── PLAN.md # Master roadmap and daily build status tracker
├── PRD.md # Product Requirements Document
├── README.md # Project overview and setup instructions
├── TRD.md # Technical requirements and schema specs
├── UI_REFERENCE.md # Branding and UI build guide
├── adapters
│   ├── CLAUDE.md # Adapter configuration for Claude
│   ├── GEMINI.md # Adapter configuration for Gemini
│   └── GPT_OSS.md # Adapter configuration for GPT-based models
├── apps
│   ├── mobile
│   │   ├── app
│   │   │   ├── (aggregator) # Scrap dealer specific screens
│   │   │   │   ├── _layout.tsx # Aggregator tab layout and navigation
│   │   │   │   ├── active-order-detail.tsx # Post-acceptance view (Navigate/Cancel/Full Address)
│   │   │   │   ├── price-index.tsx # National market index view
│   │   │   │   ├── earnings.tsx # Dealer earnings history and dashboard
│   │   │   │   ├── execution # Order Execution Flow
│   │   │   │   │   ├── _layout.tsx # Hidden bottom tab layout for execution
│   │   │   │   │   ├── navigate.tsx # Map guidance to seller
│   │   │   │   │   ├── weighing.tsx # Material weighing and camera capture
│   │   │   │   │   └── otp.tsx # Waiting for seller OTP confirmation
│   │   │   │   ├── home.tsx # Nearby orders feed for dealers
│   │   │   │   ├── order-detail.tsx # Pre-acceptance view (Accept/Reject/Locality)
│   │   │   │   ├── order-history-detail.tsx # Redesigned history view (Paid/Ratings)
│   │   │   │   ├── orders.tsx # Ongoing and completed pickup management (4-tab system)
│   │   │   │   ├── profile.tsx # Dealer public profile and shop details
│   │   │   │   └── route.tsx # Internal routing logic for aggregator flow
│   │   │   ├── (auth) # Consolidated authentication flow
│   │   │   │   ├── _layout.tsx # Auth stack layout (Headerless)
│   │   │   │   ├── onboarding.tsx # Universal 4-slide introduction carousel
│   │   │   │   ├── phone.tsx # Mobile number entry with country code
│   │   │   │   ├── otp.tsx # SMS/WhatsApp OTP verification
│   │   │   │   ├── user-type.tsx # Primary role fork: Seller vs. Scrap Dealer
│   │   │   │   ├── aggregator # Scrap Dealer Onboarding Wizard
│   │   │   │   │   ├── _layout.tsx # Aggregator stack
│   │   │   │   │   ├── profile-setup.tsx
│   │   │   │   │   ├── area-setup.tsx
│   │   │   │   │   ├── kyc.tsx # KYC document upload and verification
│   │   │   │   │   └── materials-setup.tsx
│   │   │   │   └── seller # Seller Onboarding Wizard
│   │   │   │       ├── _layout.tsx # Seller stack
│   │   │   │       ├── account-type.tsx # Individual vs Business
│   │   │   │       ├── business-setup.tsx # GST and Industry details
│   │   │   │       └── seller-setup.tsx # Basic naming and locality
│   │   │   ├── (seller) # Household and Business seller workflow
│   │   │   │   ├── _layout.tsx # Seller bottom-tab navigation layout
│   │   │   │   ├── agg-profile.tsx # View dealer details before/after booking
│   │   │   │   ├── browse.tsx # Material category and rate exploration
│   │   │   │   ├── earnings.tsx # Seller-side transaction history
│   │   │   │   ├── edit-profile.tsx # Profile field editor
│   │   │   │   ├── help.tsx # Support tickets and FAQ access
│   │   │   │   ├── home.tsx # Seller dashboard: Rates, active orders, CTA
│   │   │   │   ├── language.tsx # Localization and language toggle
│   │   │   │   ├── listing # Progressive selling wizard
│   │   │   │   │   ├── _layout.tsx # Multi-step wizard stack
│   │   │   │   │   ├── index.tsx # Selling flow entry point
│   │   │   │   │   ├── step1.tsx # Select items and materials
│   │   │   │   │   ├── step2.tsx # Capture or upload scrap photos
│   │   │   │   │   ├── step3.tsx # Weight estimation, pricing, and DateTimePicker
│   │   │   │   │   └── step4.tsx # Final review and post to marketplace
│   │   │   │   ├── notifications.tsx # Activity feed
│   │   │   │   ├── orders.tsx # Seller order tracking (Active/Past)
│   │   │   │   ├── prices.tsx # Detailed material rate list
│   │   │   │   ├── privacy-policy.tsx # Legal privacy document
│   │   │   │   ├── profile.tsx # Seller account overview and settings
│   │   │   │   ├── settings.tsx # App preferences and logout
│   │   │   │   ├── terms-of-service.tsx # Usage terms and conditions
│   │   │   │   └── terms-privacy.tsx # Unified legal view shell
│   │   │   ├── (shared) # Common screens used across roles
│   │   │   │   ├── _layout.tsx # Stack wrapper for shared screens
│   │   │   │   ├── chat
│   │   │   │   │   └── [id].tsx # Peer-to-peer messaging room
│   │   │   │   ├── order
│   │   │   │   │   └── [id].tsx # Deep order detail view with status map
│   │   │   │   ├── otp-confirm
│   │   │   │   │   └── [id].tsx # Handshake OTP for pickup verification
│   │   │   │   ├── receipt
│   │   │   │   │   └── [id].tsx # Immutable digital receipt post-payment
│   │   │   │   └── review
│   │   │   │       └── [id].tsx # Post-pickup review
│   │   │   ├── _layout.tsx # Root layout/providers
│   │   │   └── index.tsx # Application index (Splash bridge)
│   │   ├── app.json # Expo project configuration
│   │   ├── components
│   │   │   ├── SplashAnimation.tsx # SVG-driven scrap falling animation
│   │   │   ├── _1.tsx # Backup/Ref manual of SplashAnimation
│   │   │   ├── domain # Business-logic heavy components
│   │   │   └── ui # Atomic design system (Pure presentational)
│   │   │       ├── Avatar.tsx # User profile image handler
│   │   │       ├── Button.tsx # Theme-compliant pressables
│   │   │       ├── Card.tsx # Standard content wrappers
│   │   │       ├── EmptyState.tsx # Placeholder for null data states
│   │   │       ├── Input.tsx # Text/Form fields with validation
│   │   │       ├── MaterialChip.tsx # Filter/Selection material bubbles
│   │   │       ├── NavBar.tsx # Dynamic header with navigation hooks
│   │   │       ├── SkeletonLoader.tsx # Shimmering loading states
│   │   │       ├── StatusChip.tsx # Color-coded status labels
│   │   │       ├── StepIndicator.tsx # Horizontal progress dots
│   │   │       ├── TabBar.tsx # Custom bottom navigation tabs
│   │   │       ├── Typography.tsx # Standardized Text and Numeric styles
│   │   │       └── WizardStepIndicator.tsx # Progressive progress bar
│   │   ├── constants
│   │   │   ├── app.ts # Global strings and service URLs
│   │   │   └── tokens.ts # Design tokens (Colors, Radius, Spacing)
│   │   ├── hooks # Custom React hooks
│   │   │   └── usePhotoCapture.ts # Standardized camera and picker hook
│   │   ├── store # Zustand state containers
│   │   │   ├── aggregatorStore.ts # Dealer-side order and session state
│   │   │   ├── authStore.ts # User session, role, and onboarding data
│   │   │   ├── chatStore.ts # Realtime messaging state and history
│   │   │   ├── listingStore.ts # Draft state for the selling wizard
│   │   │   ├── orderStore.ts # Cross-role order lifecycle state
│   │   │   └── uiStore.ts # Navigation signals and global overlays
│   │   ├── utils # Helper functions
│   │   │   └── navigation.tsx # Safe navigation helpers (safeBack pattern)
│   │   ├── package.json # NPM dependencies for mobile app
│   │   ├── .env # Environment variables for mobile app
│   │   └── tsconfig.json # TypeScript configuration for mobile app
│   └── web # Web dashboard and management (TBI)
│       ├── package.json
│       └── tsconfig.json
├── backend # Backend service (Azure App Service)
│   ├── package.json
│   ├── src
│   │   ├── index.ts # Gateway entry point
│   │   ├── instrument.ts # Sentry initialization
│   │   ├── lib # Core utility libraries
│   │   │   ├── db.ts # PostgreSQL wrapper client
│   │   │   └── redis.ts # Upstash Redis and rate limiters
│   │   ├── middleware # JWT validation and security layers
│   │   │   ├── auth.ts # Clerk authentication
│   │   │   ├── sanitize.ts # Input HTML sanitization
│   │   │   ├── verifyRole.ts # Strict role enforcement
│   │   │   └── errorHandler.ts # Secure error handling
│   │   ├── routes # Domain-specific API endpoints
│   │   └── utils # Helper functions and provider clients
│   │   ├── .env # Environment variables for backend
│   │   └── tsconfig.json # TypeScript configuration for backend
│   └── tsconfig.json
├── pnpm-workspace.yaml # Monorepo workspace configuration
├── package.json # Root package management
├── packages # Shared internal libraries
│   ├── analysis # Gemini Vision Material Recognition
│   ├── auth # Clerk authentication provider logic
│   ├── maps # Map provider and geocoding abstraction
│   ├── realtime # Ably Messaging and Presence
│   ├── storage # Uploadthing file management
├── scraper # Scrap material rate scrapers
│   └── main.py # Python rate crawler entry
├── scripts # CI/CD and repository maintenance tools
├── docs # Technical documentation and guides
├── migrations # PostgreSQL database migrations
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
│   └── 0012_materialized_views.sql
├── .github # GitHub specific configurations
│   └── workflows # GitHub Actions CI/CD pipelines
│       └── main_sortt-backend.yml
├── sortt_aggregator_ui.html # Reference HTML for dealer UI
├── sortt_seller_ui.html # Reference HTML for seller UI
├── sortt_logo_splash_v2.html # Reference HTML for animation
└── structure.md # This file (Project Structure & Descriptions)