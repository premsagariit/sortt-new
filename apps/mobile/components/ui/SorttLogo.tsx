import React from 'react';
import Svg, { Rect, Circle, Path, G, Text, Ellipse, Line } from 'react-native-svg';
import { colors } from '../../constants/tokens';

export type SorttLogoVariant =
  | 'compact-dark'      // NavBar dark (navy bg)
  | 'compact-light'     // NavBar light (white bg)
  | 'tab-home'          // Bottom tab bar Home icon
  | 'app-icon'          // Primary app icon (navy bg)
  | 'on-white'          // Notification shade / on white bg
  | 'monochrome'        // Invoice stamps / watermarks
  | 'favicon'           // 16x16 simplified
  | 'loading';          // Truck + amber pulse

interface SorttLogoProps {
  variant: SorttLogoVariant;
  size?: number;
  active?: boolean;      // For tab-home
  color?: string;       // For monochrome or custom overrides
}

export function SorttLogo({ variant, size, active, color }: SorttLogoProps) {
  switch (variant) {
    case 'compact-dark':
      // From sortt_logo_splash_v2.html Section 2 (lines 775-791)
      return (
        <Svg width={size || 130} height={(size || 130) * (34 / 130)} viewBox="0 0 130 34" fill="none">
          <Rect x="1" y="4" width="13" height="16" rx="2.5" fill="white" opacity={0.9} />
          <Rect x="2.5" y="5.5" width="7.5" height="5.5" rx="1.2" fill={colors.navy} />
          <Circle cx="12" cy="17" r="2" fill="#B7791F" />
          <Rect x="14" y="1" width="22" height="19" rx="2" fill="#1A6B63" />
          <Rect x="16" y="7" width="5.5" height="5.5" rx="1" fill="white" opacity={0.28} />
          <Rect x="24" y="7" width="5.5" height="5.5" rx="1" fill="white" opacity={0.2} />
          <Path d="M14 1 L36 1" stroke="white" strokeWidth="0.8" strokeDasharray="2.5 2" opacity={0.4} />
          <Circle cx="7" cy="23" r="4" fill="#0D1620" />
          <Circle cx="7" cy="23" r="1.8" fill="#8E9BAA" />
          <Circle cx="24" cy="23" r="4" fill="#1A6B63" />
          <Circle cx="24" cy="23" r="1.8" fill="#0D4E47" />
          <Circle cx="32" cy="23" r="4" fill="#1A6B63" />
          <Circle cx="32" cy="23" r="1.8" fill="#0D4E47" />
          <Text
            x="44"
            y="18"
            fontFamily="DMSans-Bold"
            fontWeight="700"
            fontSize="17"
            fill="white"
            letterSpacing="-0.2"
          >
            Sortt
          </Text>
          <Rect x="82" y="21" width="12" height="1.8" rx="0.9" fill="#B7791F" opacity={0.8} />
        </Svg>
      );

    case 'compact-light':
      // From sortt_logo_splash_v2.html Section 2 (lines 799-815)
      return (
        <Svg width={size || 130} height={(size || 130) * (34 / 130)} viewBox="0 0 130 34" fill="none">
          <Rect x="1" y="4" width="13" height="16" rx="2.5" fill={colors.navy} />
          <Rect x="2.5" y="5.5" width="7.5" height="5.5" rx="1.2" fill="white" opacity={0.85} />
          <Circle cx="12" cy="17" r="2" fill="#B7791F" />
          <Rect x="14" y="1" width="22" height="19" rx="2" fill="#1A6B63" />
          <Rect x="16" y="7" width="5.5" height="5.5" rx="1" fill="white" opacity={0.3} />
          <Rect x="24" y="7" width="5.5" height="5.5" rx="1" fill="white" opacity={0.22} />
          <Path d="M14 1 L36 1" stroke="white" strokeWidth="0.8" strokeDasharray="2.5 2" opacity={0.35} />
          <Circle cx="7" cy="23" r="4" fill={colors.navy} />
          <Circle cx="7" cy="23" r="1.8" fill="#5C6B7A" />
          <Circle cx="24" cy="23" r="4" fill="#1A6B63" />
          <Circle cx="24" cy="23" r="1.8" fill="#0D4E47" />
          <Circle cx="32" cy="23" r="4" fill="#1A6B63" />
          <Circle cx="32" cy="23" r="1.8" fill="#0D4E47" />
          <Text
            x="44"
            y="18"
            fontFamily="DMSans-Bold"
            fontWeight="700"
            fontSize="17"
            fill={colors.navy}
            letterSpacing="-0.2"
          >
            Sortt
          </Text>
          <Rect x="82" y="21" width="12" height="1.8" rx="0.9" fill="#B7791F" opacity={0.75} />
        </Svg>
      );

    case 'tab-home':
      // From sortt_logo_splash_v2.html Section 3 (lines 838-854 & 858-868)
      if (active) {
        return (
          <Svg width={size || 26} height={(size || 26) * (20 / 26)} viewBox="0 0 52 40" fill="none">
            <Rect x="2" y="8" width="14" height="18" rx="3" fill="#1A6B63" />
            <Rect x="3.5" y="9.5" width="8" height="7" rx="1.5" fill="white" opacity={0.8} />
            <Circle cx="13" cy="22" r="2.5" fill="#B7791F" />
            <Rect x="16" y="4" width="26" height="22" rx="2.5" fill="#1A6B63" />
            <Rect x="18" y="11" width="7" height="7" rx="1.5" fill="white" opacity={0.35} />
            <Rect x="27" y="11" width="7" height="7" rx="1.5" fill="white" opacity={0.25} />
            <Circle cx="8" cy="34" r="5" fill="#1A6B63" />
            <Circle cx="8" cy="34" r="2" fill="#EAF5F4" />
            <Circle cx="28" cy="34" r="5" fill="#1A6B63" />
            <Circle cx="28" cy="34" r="2" fill="#0D4E47" />
            <Circle cx="38" cy="34" r="5" fill="#1A6B63" />
            <Circle cx="38" cy="34" r="2" fill="#0D4E47" />
          </Svg>
        );
      }
      return (
        <Svg width={size || 26} height={(size || 26) * (20 / 26)} viewBox="0 0 52 40" fill="none">
          <Rect x="2" y="8" width="14" height="18" rx="3" fill="#8E9BAA" />
          <Rect x="3.5" y="9.5" width="8" height="7" rx="1.5" fill="white" opacity={0.6} />
          <Rect x="16" y="4" width="26" height="22" rx="2.5" fill="#8E9BAA" opacity={0.7} />
          <Circle cx="8" cy="34" r="5" fill="#8E9BAA" />
          <Circle cx="8" cy="34" r="2" fill="#F4F6F9" />
          <Circle cx="28" cy="34" r="5" fill="#8E9BAA" opacity={0.7} />
          <Circle cx="28" cy="34" r="2" fill="#F4F6F9" />
          <Circle cx="38" cy="34" r="5" fill="#8E9BAA" opacity={0.7} />
          <Circle cx="38" cy="34" r="2" fill="#F4F6F9" />
        </Svg>
      );

    case 'app-icon':
      // From sortt_logo_splash_v2.html Section 1 (lines 526-548)
      return (
        <Svg width={size || 96} height={size || 96} viewBox="0 0 96 96" fill="none">
          <Rect width="96" height="96" rx="22" fill="#1C2E4A" />
          <Rect x="12" y="28" width="26" height="32" rx="5" fill="white" opacity={0.95} />
          <Rect x="15" y="31" width="15" height="11" rx="2.5" fill="#1C2E4A" />
          <Circle cx="34" cy="53" r="3.5" fill="#B7791F" />
          <Rect x="38" y="22" width="46" height="38" rx="4" fill="#1A6B63" />
          <Rect x="42" y="34" width="11" height="11" rx="2" fill="white" opacity={0.3} />
          <Rect x="56" y="34" width="11" height="11" rx="2" fill="white" opacity={0.22} />
          <Rect x="70" y="34" width="9" height="11" rx="2" fill="white" opacity={0.18} />
          <Rect x="42" y="24" width="11" height="8" rx="2" fill="white" opacity={0.2} />
          <Rect x="56" y="24" width="11" height="8" rx="2" fill="white" opacity={0.15} />
          <Path d="M38 22 L84 22" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" opacity={0.35} />
          <Circle cx="24" cy="64" r="8" fill="#1C2E4A" />
          <Circle cx="24" cy="64" r="3.5" fill="#8E9BAA" />
          <Circle cx="24" cy="64" r="1.5" fill="white" opacity={0.6} />
          <Circle cx="60" cy="64" r="8" fill="#1A6B63" />
          <Circle cx="60" cy="64" r="3.5" fill="#0D4E47" />
          <Circle cx="60" cy="64" r="1.5" fill="white" opacity={0.5} />
          <Circle cx="76" cy="64" r="8" fill="#1A6B63" />
          <Circle cx="76" cy="64" r="3.5" fill="#0D4E47" />
          <Circle cx="76" cy="64" r="1.5" fill="white" opacity={0.5} />
          <Ellipse cx="50" cy="73" rx="36" ry="3" fill="black" opacity={0.15} />
        </Svg>
      );

    case 'on-white':
      // From sortt_logo_splash_v2.html Section 1 (lines 643-660)
      return (
        <Svg width={size || 72} height={size || 72} viewBox="0 0 96 96" fill="none">
          <Rect width="96" height="96" rx="22" fill="white" stroke="#DDE3EA" />
          <Rect x="12" y="28" width="26" height="32" rx="5" fill="#1C2E4A" />
          <Rect x="15" y="31" width="15" height="11" rx="2.5" fill="white" opacity={0.85} />
          <Circle cx="34" cy="53" r="3.5" fill="#B7791F" />
          <Rect x="38" y="22" width="46" height="38" rx="4" fill="#1A6B63" />
          <Rect x="42" y="32" width="11" height="11" rx="2" fill="white" opacity={0.35} />
          <Rect x="56" y="32" width="11" height="11" rx="2" fill="white" opacity={0.25} />
          <Rect x="70" y="32" width="9" height="11" rx="2" fill="white" opacity={0.2} />
          <Path d="M38 22 L84 22" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" opacity={0.4} />
          <Circle cx="24" cy="64" r="8" fill="#1C2E4A" />
          <Circle cx="24" cy="64" r="3.5" fill="#5C6B7A" />
          <Circle cx="24" cy="64" r="1.5" fill="white" opacity={0.7} />
          <Circle cx="60" cy="64" r="8" fill="#1A6B63" />
          <Circle cx="60" cy="64" r="3.5" fill="#0D4E47" />
          <Circle cx="76" cy="64" r="8" fill="#1A6B63" />
          <Circle cx="76" cy="64" r="3.5" fill="#0D4E47" />
        </Svg>
      );

    case 'monochrome':
      // From sortt_logo_splash_v2.html Section 1 (lines 690-706)
      // Defaults to white-on-navy style if color is not provided
      const strokeColor = color || 'white';
      return (
        <Svg width={size || 60} height={size || 60} viewBox="0 0 96 96" fill="none">
          <Rect x="12" y="28" width="26" height="32" rx="5" fill={strokeColor} />
          <Rect x="15" y="31" width="15" height="11" rx="2.5" fill="#1C2E4A" />
          <Circle cx="34" cy="53" r="3.5" fill={strokeColor} opacity={0.7} />
          <Rect x="38" y="22" width="46" height="38" rx="4" fill={strokeColor} opacity={0.2} />
          <Rect x="38" y="22" width="46" height="38" rx="4" stroke={strokeColor} strokeWidth="1.5" fill="none" />
          <Rect x="42" y="32" width="11" height="11" rx="2" fill={strokeColor} opacity={0.4} />
          <Rect x="56" y="32" width="11" height="11" rx="2" fill={strokeColor} opacity={0.3} />
          <Path d="M38 22 L84 22" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity={0.5} />
          <Circle cx="24" cy="64" r="8" fill={strokeColor} />
          <Circle cx="24" cy="64" r="3.5" fill="#1C2E4A" />
          <Circle cx="60" cy="64" r="8" fill={strokeColor} opacity={0.6} />
          <Circle cx="60" cy="64" r="3.5" fill="#1C2E4A" />
          <Circle cx="76" cy="64" r="8" fill={strokeColor} opacity={0.6} />
          <Circle cx="76" cy="64" r="3.5" fill="#1C2E4A" />
        </Svg>
      );

    case 'favicon':
      // From sortt_logo_splash_v2.html Section 3 (lines 882-892)
      return (
        <Svg width={size || 16} height={size || 16} viewBox="0 0 32 32" fill="none">
          <Rect width="32" height="32" rx="6" fill="#1C2E4A" />
          <Rect x="3" y="9" width="9" height="11" rx="2" fill="white" opacity={0.9} />
          <Rect x="12" y="6" width="17" height="14" rx="2" fill="#1A6B63" />
          <Circle cx="7" cy="24" r="4" fill="#0D1620" />
          <Circle cx="7" cy="24" r="1.5" fill="#8E9BAA" />
          <Circle cx="21" cy="24" r="4" fill="#155952" />
          <Circle cx="21" cy="24" r="1.5" fill="#0D4E47" />
          <Circle cx="27" cy="24" r="4" fill="#155952" />
          <Circle cx="27" cy="24" r="1.5" fill="#0D4E47" />
        </Svg>
      );

    case 'loading':
      // From sortt_logo_splash_v2.html Section 3 (lines 915-932)
      return (
        <Svg width={size || 56} height={(size || 56) * (40 / 56)} viewBox="0 0 80 56" fill="none">
          <Rect x="4" y="10" width="18" height="22" rx="3.5" fill="white" opacity={0.9} />
          <Rect x="6" y="12" width="10" height="9" rx="2" fill="#1C2E4A" />
          <Circle cx="19" cy="28" r="3" fill="#B7791F" />
          <Rect x="22" y="5" width="34" height="27" rx="3" fill="#1A6B63" />
          <Rect x="25" y="13" width="8" height="8" rx="1.5" fill="white" opacity={0.3} />
          <Rect x="36" y="13" width="8" height="8" rx="1.5" fill="white" opacity={0.2} />
          <Path d="M22 5 L56 5" stroke="white" strokeWidth="1" strokeDasharray="3 2" opacity={0.35} />
          <Circle cx="10" cy="38" r="6" fill="#0D1620" />
          <Circle cx="10" cy="38" r="2.5" fill="#8E9BAA" />
          <Circle cx="38" cy="38" r="6" fill="#1A6B63" />
          <Circle cx="38" cy="38" r="2.5" fill="#0D4E47" />
          <Circle cx="50" cy="38" r="6" fill="#1A6B63" />
          <Circle cx="50" cy="38" r="2.5" fill="#0D4E47" />
          <Line x1="1" y1="18" x2="3" y2="18" stroke="#B7791F" strokeWidth="2" strokeLinecap="round" opacity={0.8} />
          <Line x1="0" y1="24" x2="2" y2="24" stroke="#B7791F" strokeWidth="1.5" strokeLinecap="round" opacity={0.6} />
          <Line x1="1" y1="30" x2="3" y2="30" stroke="#B7791F" strokeWidth="1.5" strokeLinecap="round" opacity={0.5} />
        </Svg>
      );

    default:
      return null;
  }
}
