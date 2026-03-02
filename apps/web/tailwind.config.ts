/**
 * tailwind.config.ts — apps/web
 * ─────────────────────────────────────────────────────────────────
 * Reads ALL colour values from constants/tokens.ts.
 * No hex values are duplicated here — tokens.ts is the single source of truth.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Config } from "tailwindcss";
import { colors, spacing, radius } from "./constants/tokens";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base semantic tokens — sourced directly from tokens.ts (no hex duplication)
        navy:    colors.navy,
        red:     colors.red,
        amber:   colors.amber,
        teal:    colors.teal,
        slate:   colors.slate,
        muted:   colors.muted,
        border:  colors.border,
        bg:      colors.bg,
        surface: colors.surface,
        // Material category tokens
        material: {
          metal:   { fg: colors.material.metal.fg,   bg: colors.material.metal.bg },
          plastic: { fg: colors.material.plastic.fg, bg: colors.material.plastic.bg },
          paper:   { fg: colors.material.paper.fg,   bg: colors.material.paper.bg },
          ewaste:  { fg: colors.material.ewaste.fg,  bg: colors.material.ewaste.bg },
          fabric:  { fg: colors.material.fabric.fg,  bg: colors.material.fabric.bg },
          glass:   { fg: colors.material.glass.fg,   bg: colors.material.glass.bg },
        },
      },
      spacing: {
        // Extend with named spacing tokens from tokens.ts
        "token-xs":  `${spacing.xs}px`,
        "token-sm":  `${spacing.sm}px`,
        "token-md":  `${spacing.md}px`,
        "token-lg":  `${spacing.lg}px`,
        "token-xl":  `${spacing.xl}px`,
        "token-xxl": `${spacing.xxl}px`,
      },
      borderRadius: {
        card:  `${radius.card}px`,
        input: `${radius.input}px`,
        chip:  `${radius.chip}px`,
        btn:   `${radius.btn}px`,
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
