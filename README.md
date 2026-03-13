# Sortt — India's Scrap Marketplace

> **Status:** MVP Build (In Progress)  
> **Architecture:** pnpm Monorepo  
> **Tech Stack:** Expo SDK 54+, Next.js 15, Node.js (Express), Azure PostgreSQL, Gemini AI.

---

## 🏗 Project Structure

```text
Sortt/
├── apps/
│   ├── mobile/       # React Native (Expo SDK 54) — User/Aggregator App
│   ├── web/          # Next.js 15 — Business & Admin Portals
│   └── admin/        # Admin Dashboard (built into web)
├── backend/          # Node.js/Express — Central API & Webhooks
├── packages/         # Shared Provider Abstractions (@sortt/*)
│   ├── auth/         # IAuthProvider (Clerk Auth)
│   ├── maps/         # IMapProvider (Google/Ola Maps)
│   ├── realtime/     # IRealtimeProvider (Ably Realtime)
│   ├── storage/      # IStorageProvider (Uploadthing Storage)
│   └── analysis/     # IAnalysisProvider (Gemini Vision)
├── scraper/          # Python Price Scraper Agent
└── migrations/       # PostgreSQL Migration Scripts
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js:** v20+ (LTS recommended)
- **pnpm:** v10+ (`npm install -g pnpm`)
- **Python:** v3.12+ (for scraper)
- **Expo Go:** Installed on your physical device for mobile testing.

### 2. Dependencies
Install all workspace dependencies from the root directory:
```bash
npm install -g pnpm (If not installed in the system)
pnpm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` in the root and in relevant app directories:
- `apps/mobile/.env`
- `apps/web/.env`
- `backend/.env`
- `scraper/.env`

- `CLERK_SECRET_KEY`: Backend auth verification.
- `GOOGLE_MAPS_API_KEY`: Geocoding and map services.
- `EXPO_ACCESS_TOKEN`: EAS deployments and updates.
- `DATABASE_URL`: Azure PostgreSQL connection string.
- `REDIS_URL`: Upstash Redis for rate limiting.

### 4. Running Locally

**Start Mobile App (Expo):**
```bash
pnpm dev:mobile
```

**Start Web Portal (Next.js):**
```bash
pnpm dev:web
```

**Start Backend API (Express):**
```bash
pnpm dev:backend
```

---

## 🛠 Tech Stack Details

| Layer | Technology |
|---|---|
| **Mobile** | React Native, Expo Router, DM Sans/Mono, Zustand, Phosphor Icons |
| **Web** | Next.js 15, Tailwind CSS, Radix UI |
| **Backend** | Node.js, Express, Upstash (Redis), Sharp, Etag |
| **Database** | Azure PostgreSQL, PostGIS, RLS |
| **Auth** | Clerk (Phone OTP via WhatsApp Cloud API) |
| **AI** | Gemini Flash Vision (Photo Analysis), Gemini Pro (Price Scraping) |

---

### 🗓 Current Status: Day 10 — Media + Aggregator + Supporting Routes (Complete)
✅ Order CRUD, address reveal logic, auth refactor, geocoding, media upload, server-derived filtering, caching, and atomic status transitions implemented. All 10-day API MVP goals achieved.

---

## 📜 Documentation Reference
- `PLAN.md`: 10-day build schedule and verification gates.
- `MEMORY.md`: Core architectural rules, security constraints, and learned lessons.
- `TRD.md`: Full technical requirements and schema definitions.
- `PRD.md`: Product requirements and user stories.

---

*Note: "Sortt" is a placeholder name. See `MEMORY.md` for rebranding instructions.*
