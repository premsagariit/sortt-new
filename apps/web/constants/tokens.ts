/**
 * constants/tokens.ts
 * ─────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all design tokens.
 * Place this file at:
 *   apps/mobile/constants/tokens.ts
 *   apps/web/constants/tokens.ts
 *
 * ⚠️  NEVER hardcode hex values anywhere else in the codebase.
 *     Always import from this file.
 * ─────────────────────────────────────────────────────────────────
 */

// apps/mobile/constants/tokens.ts
// apps/web/constants/tokens.ts
// ⚠️ These two files must stay identical. If you update one, update the other.

export const colors = {

  // ── Structural ────────────────────────────────────────────────────────────
  /** Nav bars, headers, hero sections, avatars */
  navy:      "#1C2E4A",
  /** Softer navy — secondary nav elements, subdued hero areas */
  navySoft:  "#2C4A72",

  // ── Primary actions ───────────────────────────────────────────────────────
  /** ONE primary CTA per screen — nothing else */
  red:       "#C0392B",
  /** Red-tinted background — error banners, highlights */
  redLight:  "#F9EDEC",

  // ── Semantic ──────────────────────────────────────────────────────────────
  /** Money, prices, earnings — nothing else */
  amber:      "#B7791F",
  /** Amber-tinted background — best-rate banners, tip cards */
  amberLight: "#FEF9EC",
  /** Success, verified, confirmed, completed */
  teal:       "#1A6B63",
  /** Teal-tinted background — success banners, confirmed states */
  tealLight:  "#EAF5F4",

  // ── Text ──────────────────────────────────────────────────────────────────
  /** Body text */
  slate:  "#5C6B7A",
  /** Labels, captions, placeholders, timestamps */
  muted:  "#8E9BAA",

  // ── Structure ─────────────────────────────────────────────────────────────
  /** 1px borders on all cards and inputs */
  border:   "#DDE3EA",
  /** Page / screen background */
  bg:       "#F4F6F9",
  /** Card surfaces, modals, panels */
  surface:  "#FFFFFF",
  /** Subtle alternate surface — meta pills, upload zones, input backgrounds */
  surface2: "#F9FAFB",

  // ── Material category tokens ──────────────────────────────────────────────
  // fg = chip foreground / left-border colour
  // bg = icon wrap background
  material: {
    metal:   { fg: "#6B7280", bg: "#F3F4F6" },
    plastic: { fg: "#2563A8", bg: "#EEF4FC" },
    paper:   { fg: "#B45309", bg: "#FEF3E2" },
    ewaste:  { fg: "#1A6B63", bg: "#EAF5F4" },
    fabric:  { fg: "#7C3AED", bg: "#F5F3FF" },
    glass:   { fg: "#0369A1", bg: "#EFF6FF" },
  },

  // ── Status Chip Tints (intentional exceptions per MEMORY.md §2) ────────────
  // These are semantic status indicator colors, NOT semantic role colors.
  // They live in colors for easy destructuring in StatusChip component.
  statusCreated: { bg: "#EEF2FF", fg: "#4338CA" },    // New, pending
  statusAccepted: { bg: "#EFF6FF", fg: "#1D4ED8" },   // In progress
  statusCancelled: { bg: "#F1F5F9", fg: "#64748B" },  // Neutral/inactive

  // ── Status indicators ──────────────────────────────────────────────────────
  statusOnline: "#4ADE80",     // Online / active indicator (location dot, online badge)
  skeleton: "#E8ECF1",          // Skeleton loader — darker than colors.bg for contrast
  black: "#000000",             // Pure black for overlays, accessible text on light bg
  green: "#2ECC71",             // Status text — online/success indicator
  fridgeGrey: "#7A8E9C",        // Appliance category icon colour (intentional, not semantic)

  // ── Additional surface variants ────────────────────────────────────────────
  surfaceLight: "#F8F9FA",      // Lighter alternate surface (upload zones, sections)
  surfaceBlueLight: "#F0F9FF",  // Blue-tinted light surface (pending states)
  surfaceGreenLight: "#F0FDF4", // Green-tinted light surface (individual account type)
  amberLargeLight: "#FEF3C7",   // Warmer amber tint for select UI (earnings card, etc.)

} as const;

// ── Extended colour tokens (deprecated — use colors.* directly) ────────────────
// These are maintained for backward compatibility during refactoring.
// RECOMMENDATION: Replace all imports of colorExtended with direct colors.* imports.
export const colorExtended = {
  navySoft:   colors.navySoft,
  redLight:   colors.redLight,
  amberLight: colors.amberLight,
  tealLight:  colors.tealLight,
  surface2:   colors.surface2,
} as const;

// ── Material background tokens ─────────────────────────────────────────────────
// Matches material[X].bg in colors — separate export for direct destructuring.
export const materialBg = {
  metal:   colors.material.metal.bg,
  plastic: colors.material.plastic.bg,
  paper:   colors.material.paper.bg,
  ewaste:  colors.material.ewaste.bg,
  fabric:  colors.material.fabric.bg,
  glass:   colors.material.glass.bg,
} as const;

// ── Status chip background tokens ──────────────────────────────────────────────
export const statusChipBg = {
  created:   colors.statusCreated.bg,
  accepted:  colors.statusAccepted.bg,
  cancelled: colors.statusCancelled.bg,
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const radius = {
  card:  12,
  input: 10,
  chip:  20,
  btn:   14,
} as const;

// ── Type exports ──────────────────────────────────────────────────────────────
export type Colors   = typeof colors;
export type Spacing  = typeof spacing;
export type Radius   = typeof radius;
export type Material = keyof typeof colors.material;