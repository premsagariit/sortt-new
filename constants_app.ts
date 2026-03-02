/**
 * constants/app.ts
 * ─────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for brand identity / app name.
 * Place this file at:
 *   apps/mobile/constants/app.ts
 *   apps/web/constants/app.ts
 *
 * ⚠️  APP NAME PLACEHOLDER NOTICE
 * "Sortt" is a PLACEHOLDER name. The final product name has not been decided.
 *
 * TO REBRAND THE ENTIRE APPLICATION — change only these three values:
 *   1. APP_NAME  → the user-facing product name (e.g. "ScrapMitra")
 *   2. APP_DOMAIN → the production domain   (e.g. "scrapmitra.in")
 *   3. APP_SLUG   → lowercase, no spaces, used in template names / storage
 *                   paths / internal identifiers (e.g. "scrapmitra")
 *
 * After changing:
 *   • Resubmit the WhatsApp OTP template to Meta with the new APP_NAME embedded.
 *   • Update META_OTP_TEMPLATE_NAME env var to "[APP_SLUG]_otp_auth" (or chosen name).
 *   • Update ALLOWED_ORIGINS env var on Render with the new APP_DOMAIN.
 *   • Rename the monorepo root directory if desired (purely cosmetic).
 * ─────────────────────────────────────────────────────────────────
 */

// ← CHANGE THESE THREE VALUES TO REBRAND ↓
export const APP_NAME   = "Sortt";       // User-facing product name — PLACEHOLDER
export const APP_DOMAIN = "sortt.in";    // Production domain         — PLACEHOLDER
export const APP_SLUG   = "sortt";       // Internal slug / identifiers — PLACEHOLDER

// ─── Derived values (do NOT edit these — they auto-update with the above) ───

/** WhatsApp OTP message body. Submitted to Meta as an authentication template. */
export const WHATSAPP_OTP_TEMPLATE_BODY =
  `Your ${APP_NAME} verification code is {{1}}. Valid for 10 minutes.`;

/** Human-readable product tagline shown on the splash / onboarding screens. */
export const APP_TAGLINE = "India's Scrap Marketplace"; // edit freely — not derived

/**
 * Push notification sender label.
 * Appears as the "from" name in Android notification drawer.
 */
export const PUSH_SENDER_NAME = APP_NAME;

/**
 * Storage bucket prefix — prepended to all Supabase Storage bucket names.
 * Keeps bucket names namespaced to the app, enabling multi-tenant or
 * white-label deployments on a single Supabase project.
 * Example: "sortt-scrap-photos", "sortt-invoices"
 */
export const STORAGE_BUCKET_PREFIX = APP_SLUG;

// ─── Type export for consumers ───────────────────────────────────────────────
export type AppConfig = {
  APP_NAME: string;
  APP_DOMAIN: string;
  APP_SLUG: string;
};

export const APP_CONFIG: AppConfig = { APP_NAME, APP_DOMAIN, APP_SLUG };
