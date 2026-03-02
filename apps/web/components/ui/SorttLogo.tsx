/**
 * components/ui/SorttLogo.tsx
 * ─────────────────────────────────────────────────────────────────
 * Web version of Sortt Logo using standard SVG.
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { colors } from '../../constants/tokens';

export type SorttLogoVariant =
    | 'compact-dark'
    | 'compact-light'
    | 'app-icon'
    | 'on-white';

interface SorttLogoProps {
    variant: SorttLogoVariant;
    size?: number;
}

export function SorttLogo({ variant, size }: SorttLogoProps) {
    const width = size || 130;
    const height = width * (34 / 130);

    switch (variant) {
        case 'compact-dark':
            return (
                <svg width={width} height={height} viewBox="0 0 130 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="4" width="13" height="16" rx="2.5" fill="white" fillOpacity="0.9" />
                    <rect x="2.5" y="5.5" width="7.5" height="5.5" rx="1.2" fill={colors.navy} />
                    <circle cx="12" cy="17" r="2" fill="#B7791F" />
                    <rect x="14" y="1" width="22" height="19" rx="2" fill="#1A6B63" />
                    <rect x="16" y="7" width="5.5" height="5.5" rx="1" fill="white" fillOpacity="0.28" />
                    <rect x="24" y="7" width="5.5" height="5.5" rx="1" fill="white" fillOpacity="0.2" />
                    <path d="M14 1 L36 1" stroke="white" strokeWidth="0.8" strokeDasharray="2.5 2" strokeOpacity="0.4" />
                    <circle cx="7" cy="23" r="4" fill="#0D1620" />
                    <circle cx="7" cy="23" r="1.8" fill="#8E9BAA" />
                    <circle cx="24" cy="23" r="4" fill="#1A6B63" />
                    <circle cx="24" cy="23" r="1.8" fill="#0D4E47" />
                    <circle cx="32" cy="23" r="4" fill="#1A6B63" />
                    <circle cx="32" cy="23" r="1.8" fill="#0D4E47" />
                    <text x="44" y="18" fill="white" fontSize="17" fontWeight="700" fontFamily="DM Sans, sans-serif" letterSpacing="-0.2">Sortt</text>
                </svg>
            );

        case 'compact-light':
            return (
                <svg width={width} height={height} viewBox="0 0 130 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="4" width="13" height="16" rx="2.5" fill={colors.navy} />
                    <rect x="2.5" y="5.5" width="7.5" height="5.5" rx="1.2" fill="white" fillOpacity="0.85" />
                    <circle cx="12" cy="17" r="2" fill="#B7791F" />
                    <rect x="14" y="1" width="22" height="19" rx="2" fill="#1A6B63" />
                    <rect x="16" y="7" width="5.5" height="5.5" rx="1" fill="white" fillOpacity="0.3" />
                    <rect x="24" y="7" width="5.5" height="5.5" rx="1" fill="white" fillOpacity="0.22" />
                    <circle cx="7" cy="23" r="4" fill={colors.navy} />
                    <circle cx="7" cy="23" r="1.8" fill="#5C6B7A" />
                    <circle cx="24" cy="23" r="4" fill="#1A6B63" />
                    <circle cx="24" cy="23" r="1.8" fill="#0D4E47" />
                    <circle cx="32" cy="23" r="4" fill="#1A6B63" />
                    <circle cx="32" cy="23" r="1.8" fill="#0D4E47" />
                    <text x="44" y="18" fill={colors.navy} fontSize="17" fontWeight="700" fontFamily="DM Sans, sans-serif" letterSpacing="-0.2">Sortt</text>
                </svg>
            );

        default:
            return null;
    }
}
