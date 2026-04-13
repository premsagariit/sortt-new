/**
 * components/landing/HeroIllustration.tsx
 * ─────────────────────────────────────────────────────────────────
 * Inline SVG 3D-style illustration for the hero section.
 * No external image dependencies — purely declarative SVG.
 * Tokens: colors.navy, colors.teal, colors.amber, colors.red used inline.
 * ─────────────────────────────────────────────────────────────────
 */

'use client';

import { motion } from 'framer-motion';

export function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md mx-auto" aria-hidden="true">
      <motion.svg
        viewBox="0 0 420 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
      >
        {/* ── Background card (main panel) ─────────────────────── */}
        <rect x="30" y="40" width="360" height="300" rx="20" fill="#FFFFFF" />
        <rect x="30" y="40" width="360" height="300" rx="20" stroke="#DDE3EA" strokeWidth="1.5" />

        {/* Subtle inner shadow top */}
        <rect x="30" y="40" width="360" height="8" rx="20" fill="#F4F6F9" opacity="0.5" />

        {/* ── Header strip ─────────────────────────────────────── */}
        <rect x="30" y="40" width="360" height="56" rx="20" fill="#1C2E4A" />
        <rect x="30" y="76" width="360" height="20" fill="#1C2E4A" />

        {/* Logo circle in header */}
        <circle cx="62" cy="68" r="16" fill="#C0392B" />
        <text x="62" y="73" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>

        {/* Header text */}
        <rect x="88" y="60" width="80" height="9" rx="4" fill="white" opacity="0.9" />
        <rect x="88" y="74" width="50" height="6" rx="3" fill="white" opacity="0.3" />

        {/* Status pill in header */}
        <rect x="310" y="60" width="64" height="18" rx="9" fill="#1A6B63" opacity="0.8" />
        <circle cx="323" cy="69" r="3" fill="#4ADE80" />
        <rect x="330" y="65" width="38" height="8" rx="3" fill="white" opacity="0.6" />

        {/* ── Stat cards row ────────────────────────────────────── */}
        {/* Card 1 — Pending KYC (amber) */}
        <rect x="50" y="120" width="90" height="75" rx="12" fill="#FEF9EC" />
        <rect x="50" y="120" width="90" height="75" rx="12" stroke="#B7791F" strokeWidth="1" strokeOpacity="0.3" />
        <rect x="62" y="132" width="40" height="6" rx="3" fill="#B7791F" opacity="0.5" />
        <text x="62" y="168" fill="#B7791F" fontSize="26" fontWeight="bold" fontFamily="monospace">12</text>
        <rect x="62" y="174" width="55" height="5" rx="2.5" fill="#B7791F" opacity="0.3" />

        {/* Card 2 — Open Disputes (red) */}
        <rect x="158" y="120" width="90" height="75" rx="12" fill="#F9EDEC" />
        <rect x="158" y="120" width="90" height="75" rx="12" stroke="#C0392B" strokeWidth="1" strokeOpacity="0.3" />
        <rect x="170" y="132" width="40" height="6" rx="3" fill="#C0392B" opacity="0.5" />
        <text x="170" y="168" fill="#C0392B" fontSize="26" fontWeight="bold" fontFamily="monospace">3</text>
        <rect x="170" y="174" width="55" height="5" rx="2.5" fill="#C0392B" opacity="0.3" />

        {/* Card 3 — Completed (teal) */}
        <rect x="266" y="120" width="104" height="75" rx="12" fill="#EAF5F4" />
        <rect x="266" y="120" width="104" height="75" rx="12" stroke="#1A6B63" strokeWidth="1" strokeOpacity="0.3" />
        <rect x="278" y="132" width="44" height="6" rx="3" fill="#1A6B63" opacity="0.5" />
        <text x="278" y="168" fill="#1A6B63" fontSize="26" fontWeight="bold" fontFamily="monospace">247</text>
        <rect x="278" y="174" width="60" height="5" rx="2.5" fill="#1A6B63" opacity="0.3" />

        {/* ── List rows (activity feed) ─────────────────────────── */}
        {/* Row 1 */}
        <rect x="50" y="218" width="320" height="38" rx="8" fill="#F4F6F9" />
        <circle cx="72" cy="237" r="10" fill="#1A6B63" opacity="0.15" />
        <rect x="90" y="229" width="120" height="7" rx="3.5" fill="#1C2E4A" opacity="0.7" />
        <rect x="90" y="242" width="80" height="5" rx="2.5" fill="#8E9BAA" opacity="0.6" />
        <rect x="310" y="231" width="44" height="14" rx="5" fill="#EAF5F4" />
        <rect x="318" y="236" width="28" height="5" rx="2.5" fill="#1A6B63" opacity="0.7" />

        {/* Row 2 */}
        <rect x="50" y="264" width="320" height="38" rx="8" fill="#F4F6F9" />
        <circle cx="72" cy="283" r="10" fill="#C0392B" opacity="0.12" />
        <rect x="90" y="275" width="100" height="7" rx="3.5" fill="#1C2E4A" opacity="0.7" />
        <rect x="90" y="288" width="65" height="5" rx="2.5" fill="#8E9BAA" opacity="0.6" />
        <rect x="310" y="277" width="44" height="14" rx="5" fill="#F9EDEC" />
        <rect x="318" y="282" width="28" height="5" rx="2.5" fill="#C0392B" opacity="0.7" />

        {/* Row 3 */}
        <rect x="50" y="310" width="320" height="18" rx="8" fill="#F4F6F9" opacity="0.6" />

        {/* ── 3D depth cards (floating behind) ─────────────────── */}
        {/* Back shadow card left */}
        <rect x="14" y="56" width="60" height="280" rx="16" fill="#2C4A72" opacity="0.2" />
        {/* Back shadow card right */}
        <rect x="350" y="56" width="60" height="280" rx="16" fill="#2C4A72" opacity="0.2" />

        {/* ── Floating badges ───────────────────────────────────── */}
        {/* KYC badge */}
        <motion.g
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
        >
          <rect x="0" y="130" width="110" height="30" rx="15" fill="#1C2E4A" />
          <text x="14" y="150" fill="white" fontSize="11" fontWeight="600">🪪 KYC Verified</text>
        </motion.g>

        {/* Price badge */}
        <motion.g
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
        >
          <rect x="310" y="340" width="116" height="30" rx="15" fill="#B7791F" />
          <text x="323" y="360" fill="white" fontSize="11" fontWeight="600">₹ Live Prices</text>
        </motion.g>
      </motion.svg>

      {/* Ambient glow spots */}
      <div className="absolute -bottom-6 -left-6 w-36 h-36 rounded-full bg-teal/10 blur-2xl pointer-events-none" />
      <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-red/10 blur-2xl pointer-events-none" />
    </div>
  );
}
