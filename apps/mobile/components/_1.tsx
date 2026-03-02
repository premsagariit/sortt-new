/**
 * components/SplashAnimation.tsx
 * ──────────────────────────────────────────────────────────────────
 * First-launch splash animation — 4-phase animated sequence.
 * Source of truth: sortt_logo_splash_v2.html at project root.
 *
 * ── ROOT CAUSE OF PREVIOUS CRASH ──────────────────────────────────
 * The previous version wrapped ALL truck parts inside a single
 * <Svg> component and placed <AnimatedView> children directly
 * inside it. react-native-svg only accepts SVG primitives
 * (Rect, Circle, Path, G, etc.) as children — NOT React Native
 * Views. Mounting a View inside Svg caused the Android bridge
 * to try to cast a String prop to Boolean → crash.
 *
 * ── CORRECT ARCHITECTURE ──────────────────────────────────────────
 * Each animated part is its own:
 *   <AnimatedView style={{ transform, opacity }}>
 *     <Svg>  ←  SVG primitives only inside here
 *       <Rect /> <Circle /> etc.
 *     </Svg>
 *   </AnimatedView>
 *
 * The truck group container is a plain AnimatedView (not Svg).
 * No AnimatedView is ever placed inside an Svg — ever.
 *
 * ── OTHER BUGS FIXED ─────────────────────────────────────────────
 * 1. Outer Svg wrapper removed — was the crash source.
 * 2. Motion lines had duplicate translateX (already inside truckGroup
 *    which moves) — removed. Now driven by motionLinesOpacity only.
 * 3. Motion lines had no opacity animation — were always visible
 *    at 0.6. Now fade in at t=2000ms via motionLinesOpacity value.
 * 4. Scrap items started at translateY:-200 — not enough to be
 *    off-screen. Now start at -420 (matching HTML @keyframes spec).
 * 5. Assembly parts missing opacity: 0→1 (HTML has opacity:0 from,
 *    opacity:1 to). Added opacityPart animated value.
 * 6. APP_TAGLINE removed — hardcoded per HTML spec to avoid
 *    missing-export crash if app.ts doesn't define it.
 *
 * ── ANIMATION PHASES ─────────────────────────────────────────────
 *   Phase 1 (0ms):     Truck parts assemble (stagger 120ms)
 *   Phase 2 (1220ms):  Scrap items fall from off-screen into cargo
 *   Phase 3 (2000ms):  Truck drives left + wheel spin + motion lines
 *   Phase 4 (2300ms):  Brand wordmark rises + tagline + loader bar
 *   Fade out (4200ms): Full screen opacity 1→0 → onComplete()
 *
 * ── TOKEN EXCEPTIONS (documented) ───────────────────────────────
 * 'white'  — pure white for windscreen glare + decorative circles.
 * colors.fridgeGrey — appliance icon grey (imported from tokens, not hardcoded).
 *
 * ── NATIVEDRIVER RULE ────────────────────────────────────────────
 * useNativeDriver: true on ALL Animated values EXCEPT loaderScaleX.
 * Reason: loader fill uses scaleX on a View whose width is '100%'
 * (a layout prop at rest). scaleX itself is a transform and CAN use
 * NativeDriver, BUT the loaderFill width:'100%' string causes Metro
 * to warn on some RN versions. If you see a NativeDriver warning on
 * the loader, switch loaderScaleX to useNativeDriver:false only.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  ViewStyle,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Circle, G } from 'react-native-svg';

import { colors } from '../constants/tokens';
import { APP_NAME } from '../constants/app';
import { Text } from './ui/Typography';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Alias ─────────────────────────────────────────────────────────
const AnimatedView = Animated.createAnimatedComponent(View);

// ── Props ─────────────────────────────────────────────────────────
interface SplashAnimationProps {
  /** Called after the 600ms fade-out at ~4.8s. Caller should navigate. */
  onComplete: () => void;
}

// ── Truck group dimensions (the assembled truck bounding box) ─────
// Cab: 90w × 80h, left-aligned at x:0
// Cargo: 138w × 72h, starting at x:82
// Combined width: ~220, assembled height: 80 body + 28 wheel = ~108
const TRUCK_W = 220;
const TRUCK_H = 108;

// ─────────────────────────────────────────────────────────────────
export default function SplashAnimation({ onComplete }: SplashAnimationProps) {

  // ── Phase 1: Part assembly ────────────────────────────────────
  // Each part translates from off-screen edge to 0
  const cabX      = useRef(new Animated.Value(-280)).current;
  const cabOpacity = useRef(new Animated.Value(0)).current;
  const cargoX     = useRef(new Animated.Value(280)).current;
  const cargoOpacity = useRef(new Animated.Value(0)).current;
  const chassisY   = useRef(new Animated.Value(120)).current;
  const chassisOpacity = useRef(new Animated.Value(0)).current;
  // Front wheel: diagonal from bottom-left (−X, +Y → 0)
  const wFrontX    = useRef(new Animated.Value(-120)).current;
  const wFrontY    = useRef(new Animated.Value(80)).current;
  const wFrontOp   = useRef(new Animated.Value(0)).current;
  // Rear wheels: diagonal from bottom-right (+X, +Y → 0)
  const wRearX     = useRef(new Animated.Value(120)).current;
  const wRearY     = useRef(new Animated.Value(80)).current;
  const wRearOp    = useRef(new Animated.Value(0)).current;

  // ── Phase 2: Scrap items fall ─────────────────────────────────
  // Start at -420 to match HTML spec (off-screen top), opacity 0→1
  const scrapNewspaperY  = useRef(new Animated.Value(-420)).current;
  const scrapNewspaperOp = useRef(new Animated.Value(0)).current;
  const scrapRodsY       = useRef(new Animated.Value(-420)).current;
  const scrapRodsOp      = useRef(new Animated.Value(0)).current;
  const scrapFridgeY     = useRef(new Animated.Value(-420)).current;
  const scrapFridgeOp    = useRef(new Animated.Value(0)).current;

  // ── Phase 3: Truck drives left ───────────────────────────────
  const truckGroupX        = useRef(new Animated.Value(0)).current;
  const wheelRotation      = useRef(new Animated.Value(0)).current;
  const motionLinesOpacity = useRef(new Animated.Value(0)).current;

  // ── Phase 4: Brand reveal ────────────────────────────────────
  const wordmarkY       = useRef(new Animated.Value(22)).current;  // matches HTML: translateY(22px)
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const taglineY        = useRef(new Animated.Value(4)).current;   // matches HTML: translateY(4px)
  const taglineOpacity  = useRef(new Animated.Value(0)).current;
  const underlineScaleX = useRef(new Animated.Value(0)).current;
  const loaderScaleX    = useRef(new Animated.Value(0)).current;
  const loaderOpacity   = useRef(new Animated.Value(0)).current;

  // ── Full-screen fade-out ─────────────────────────────────────
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // ╔══════════════════════════════════════════════════════════╗
    // ║  PHASE 1 — TRUCK ASSEMBLY                                ║
    // ║  stagger(120ms) across 5 animated groups                 ║
    // ║  HTML ref: .part-cab → 0.28s delay, .part-cargo → 0.4s  ║
    // ╚══════════════════════════════════════════════════════════╝
    Animated.stagger(120, [
      // Cab: slides from left + fades in
      Animated.parallel([
        Animated.spring(cabX, {
          toValue: 0, damping: 12, stiffness: 180, useNativeDriver: true,
        }),
        Animated.timing(cabOpacity, {
          toValue: 1, duration: 300, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Cargo bed: slides from right + fades in
      Animated.parallel([
        Animated.spring(cargoX, {
          toValue: 0, damping: 12, stiffness: 180, useNativeDriver: true,
        }),
        Animated.timing(cargoOpacity, {
          toValue: 1, duration: 300, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Chassis: rises from below + fades in
      Animated.parallel([
        Animated.spring(chassisY, {
          toValue: 0, damping: 14, stiffness: 200, useNativeDriver: true,
        }),
        Animated.timing(chassisOpacity, {
          toValue: 1, duration: 250, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Front wheel: diagonal spring from bottom-left
      Animated.parallel([
        Animated.spring(wFrontX, {
          toValue: 0, damping: 9, stiffness: 220, useNativeDriver: true,
        }),
        Animated.spring(wFrontY, {
          toValue: 0, damping: 9, stiffness: 220, useNativeDriver: true,
        }),
        Animated.timing(wFrontOp, {
          toValue: 1, duration: 250, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Rear wheels: diagonal spring from bottom-right
      Animated.parallel([
        Animated.spring(wRearX, {
          toValue: 0, damping: 9, stiffness: 220, useNativeDriver: true,
        }),
        Animated.spring(wRearY, {
          toValue: 0, damping: 9, stiffness: 220, useNativeDriver: true,
        }),
        Animated.timing(wRearOp, {
          toValue: 1, duration: 250, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // ╔══════════════════════════════════════════════════════════╗
    // ║  PHASE 2 — SCRAP ITEMS FALL                              ║
    // ║  Staggered 220ms apart, starting at t=1220ms             ║
    // ║  HTML ref: scrap-item-1 @ 1.22s, -2 @ 1.44s, -3 @ 1.66s ║
    // ║  Spring: damping 7 (fridge 5 for heavier bounce feel)    ║
    // ╚══════════════════════════════════════════════════════════╝
    const scrapItems = [
      { y: scrapNewspaperY, op: scrapNewspaperOp, damping: 7 },
      { y: scrapRodsY,      op: scrapRodsOp,      damping: 7 },
      { y: scrapFridgeY,    op: scrapFridgeOp,    damping: 5 }, // heavier = more bounce
    ];

    scrapItems.forEach(({ y, op, damping }, i) => {
      timers.push(
        setTimeout(() => {
          // Opacity fades in quickly at start of fall
          Animated.timing(op, {
            toValue: 1, duration: 160, easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
          // Spring fall with bounce on landing
          Animated.spring(y, {
            toValue: 0, damping, stiffness: 130, useNativeDriver: true,
          }).start();
        }, 1220 + i * 220)
      );
    });

    // ╔══════════════════════════════════════════════════════════╗
    // ║  PHASE 3 — TRUCK DRIVES LEFT                             ║
    // ║  t=2000ms: motion lines appear, truck exits, wheels spin  ║
    // ║  HTML ref: .truck-driving class added at 2000ms via JS   ║
    // ║  Drive easing: cubic-bezier(0.2, 0, 0.8, 0.95)           ║
    // ╚══════════════════════════════════════════════════════════╝
    timers.push(
      setTimeout(() => {
        // Motion lines: fade in (HTML: motion-lines-drive 0.25s ease-out)
        Animated.timing(motionLinesOpacity, {
          toValue:  1,
          duration: 250,
          easing:   Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();

        // Truck exits left — must travel past screen edge
        // toValue = -(half screen width + half truck width) from center ≈ -(SCREEN_W)
        Animated.timing(truckGroupX, {
          toValue:  -(SCREEN_W + TRUCK_W),
          duration: 1000,
          easing:   Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start();

        // Wheel spin loop: 300ms per rotation (HTML: 0.32s)
        Animated.loop(
          Animated.timing(wheelRotation, {
            toValue:  1,
            duration: 320,
            easing:   Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      }, 2000)
    );

    // ╔══════════════════════════════════════════════════════════╗
    // ║  PHASE 4a — WORDMARK RISES                               ║
    // ║  t=2300ms, 480ms, translateY(22)→(0) + opacity 0→1       ║
    // ║  HTML ref: wordmark-rise 0.48s cubic-bezier(0.16,1,0.3,1)║
    // ╚══════════════════════════════════════════════════════════╝
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(wordmarkY, {
            toValue:  0,
            duration: 480,
            easing:   Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkOpacity, {
            toValue:  1,
            duration: 480,
            easing:   Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 2300)
    );

    // ╔══════════════════════════════════════════════════════════╗
    // ║  PHASE 4b — TAGLINE + UNDERLINE                          ║
    // ║  t=2750ms                                                ║
    // ║  HTML ref: tagline-fade 0.35s, underline-draw 0.3s       ║
    // ╚══════════════════════════════════════════════════════════╝
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(taglineY, {
            toValue:  0,
            duration: 350,
            easing:   Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(taglineOpacity, {
            toValue:  1,
            duration: 350,
            easing:   Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
        Animated.timing(underlineScaleX, {
          toValue:  1,
          duration: 300,
          easing:   Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 2750)
    );

    // ╔══════════════════════════════════════════════════════════╗
    // ║  PHASE 4c — LOADING BAR                                  ║
    // ║  t=3100ms appear, t=3200ms fill over 850ms               ║
    // ║  HTML ref: loader-appear 0.3s, loader-fill 0.85s ease-out║
    // ╚══════════════════════════════════════════════════════════╝
    timers.push(
      setTimeout(() => {
        Animated.timing(loaderOpacity, {
          toValue:  1,
          duration: 300,
          easing:   Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 3100)
    );
    timers.push(
      setTimeout(() => {
        Animated.timing(loaderScaleX, {
          toValue:  1,
          duration: 850,
          easing:   Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 3200)
    );

    // ╔══════════════════════════════════════════════════════════╗
    // ║  FADE OUT + onComplete                                   ║
    // ║  t=4200ms, 600ms ease-in                                 ║
    // ║  HTML ref: splash-fadeout 0.6s ease-in 4.2s both         ║
    // ╚══════════════════════════════════════════════════════════╝
    timers.push(
      setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue:  0,
          duration: 600,
          easing:   Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onComplete();
        });
      }, 4200)
    );

    // ── Cleanup ────────────────────────────────────────────────
    return () => {
      timers.forEach(clearTimeout);
      wheelRotation.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel rotation interpolation: 0→1 maps to 0deg→360deg
  const wheelRotateDeg = wheelRotation.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, { opacity: splashOpacity }]}>

      {/* ── Background decorative circles ─────────────────────
          Match HTML: .splash-inner::before (320dp) and ::after (180dp)
          Pointer events none — purely decorative               */}
      <View style={styles.bgCircle1} pointerEvents="none" />
      <View style={styles.bgCircle2} pointerEvents="none" />

      {/* ════════════════════════════════════════════════════════
          TRUCK GROUP
          This AnimatedView translates the entire truck + scrap
          items LEFT during Phase 3.
          ──────────────────────────────────────────────────────
          ARCHITECTURE NOTE: This is a plain View container.
          Each child part is its own AnimatedView → Svg pair.
          NO AnimatedView is ever placed inside an Svg element.
          Doing so causes the Android bridge crash:
            java.lang.String cannot be cast to java.lang.Boolean
          ════════════════════════════════════════════════════════ */}
      <AnimatedView style={[
        styles.truckGroup,
        { transform: [{ translateX: truckGroupX }] },
      ]}>

        {/* ── CHASSIS — rises from below ────────────────────────
            Full-width amber-tinted bar at the base of the truck.
            Assembly: translateY(120) → (0), opacity 0 → 1
            HTML ref: .part-chassis, delay 0.56s               */}
        <AnimatedView style={[
          styles.partChassis,
          {
            opacity:   chassisOpacity,
            transform: [{ translateY: chassisY }],
          },
        ]}>
          <Svg width={220} height={10}>
            <Rect
              x={10} y={1}
              width={200} height={8}
              rx={3}
              fill={colors.amber}
              opacity={0.7}
            />
          </Svg>
        </AnimatedView>

        {/* ── CARGO BED — slides from right ─────────────────────
            Open-top rectangular cargo section.
            Assembly: translateX(280) → (0), opacity 0 → 1
            HTML ref: .part-cargo, delay 0.40s                 */}
        <AnimatedView style={[
          styles.partCargo,
          {
            opacity:   cargoOpacity,
            transform: [{ translateX: cargoX }],
          },
        ]}>
          <Svg width={140} height={76}>
            {/* Cargo body — open top (slate colour) */}
            <Rect
              x={0} y={6}
              width={138} height={70}
              rx={4}
              fill={colors.slate}
              opacity={0.85}
            />
            {/* Open-top rim highlight */}
            <Rect
              x={0} y={6}
              width={138} height={3}
              rx={2}
              fill={colors.muted}
              opacity={0.35}
            />
            {/* Left wall accent */}
            <Rect
              x={0} y={6}
              width={3} height={70}
              fill={colors.navy}
              opacity={0.25}
            />
          </Svg>
        </AnimatedView>

        {/* ── CAB — slides from left ────────────────────────────
            Truck cab with windscreen (teal), glare, headlight.
            Assembly: translateX(-280) → (0), opacity 0 → 1
            HTML ref: .part-cab, delay 0.28s                   */}
        <AnimatedView style={[
          styles.partCab,
          {
            opacity:   cabOpacity,
            transform: [{ translateX: cabX }],
          },
        ]}>
          <Svg width={90} height={82}>
            {/* Cab body */}
            <Rect
              x={0} y={4}
              width={84} height={74}
              rx={8}
              fill={colors.navy}
            />
            {/* Windscreen — teal accent */}
            <Rect
              x={8} y={10}
              width={50} height={36}
              rx={5}
              fill={colors.teal}
              opacity={0.9}
            />
            {/* Windscreen glare — white highlight */}
            <Rect
              x={12} y={14}
              width={18} height={13}
              rx={3}
              fill="white"
              opacity={0.18}
            />
            {/* Door divider line */}
            <Rect
              x={4} y={54}
              width={76} height={1}
              fill={colors.muted}
              opacity={0.2}
            />
            {/* Headlight — amber with white centre */}
            <Circle cx={72} cy={60} r={6} fill={colors.amber} />
            <Circle cx={72} cy={60} r={3} fill="white" opacity={0.7} />
          </Svg>
        </AnimatedView>

        {/* ── MOTION LINES — appear only when truck is driving ──
            3 amber horizontal lines to the LEFT of the cab.
            Opacity: 0 → 1 at t=2000ms (motionLinesOpacity).
            NOT individually translated — they move with the
            truck group (truckGroupX). No separate translateX.
            HTML ref: .motion-lines, motion-lines-drive 0.25s  */}
        <AnimatedView style={[
          styles.motionLines,
          { opacity: motionLinesOpacity },
        ]}>
          <Svg width={36} height={22}>
            <Rect x={0}  y={0}  width={36} height={2.5} rx={1.5} fill={colors.amber} />
            <Rect x={8}  y={8}  width={26} height={2.5} rx={1.5} fill={colors.amber} />
            <Rect x={14} y={16} width={18} height={2.5} rx={1.5} fill={colors.amber} />
          </Svg>
        </AnimatedView>

        {/* ── FRONT WHEEL ───────────────────────────────────────
            Single wheel at the front underside of the cab.
            Assembly: diagonal from bottom-left (−X, +Y → 0,0)
            Phase 3: rotates via wheelRotateDeg (loop)
            HTML ref: .part-wheel-front + .wheel-grp           */}
        <AnimatedView style={[
          styles.wheelFront,
          {
            opacity:   wFrontOp,
            transform: [
              { translateX: wFrontX },
              { translateY: wFrontY },
              { rotate:     wheelRotateDeg },
            ],
          },
        ]}>
          <Svg width={28} height={28} viewBox="0 0 28 28">
            <Circle cx={14} cy={14} r={13} fill={colors.teal} />
            <Circle cx={14} cy={14} r={7}  fill={colors.navy} />
            <Circle cx={14} cy={14} r={2.5} fill={colors.border} />
          </Svg>
        </AnimatedView>

        {/* ── REAR WHEELS (3) ───────────────────────────────────
            Three wheels at the rear underside of the cargo.
            Assembly: diagonal from bottom-right (+X, +Y → 0,0)
            Phase 3: all three rotate via wheelRotateDeg (loop)
            HTML ref: .part-wheels-rear + .wheel-grp (×3)      */}
        <AnimatedView style={[
          styles.wheelRear,
          {
            opacity:   wRearOp,
            transform: [
              { translateX: wRearX },
              { translateY: wRearY },
              { rotate:     wheelRotateDeg },
            ],
          },
        ]}>
          <Svg width={90} height={28} viewBox="0 0 90 28">
            {/* Wheel 1 */}
            <Circle cx={14} cy={14} r={13} fill={colors.teal} />
            <Circle cx={14} cy={14} r={7}  fill={colors.navy} />
            <Circle cx={14} cy={14} r={2.5} fill={colors.border} />
            {/* Wheel 2 */}
            <Circle cx={44} cy={14} r={13} fill={colors.teal} />
            <Circle cx={44} cy={14} r={7}  fill={colors.navy} />
            <Circle cx={44} cy={14} r={2.5} fill={colors.border} />
            {/* Wheel 3 */}
            <Circle cx={74} cy={14} r={13} fill={colors.teal} />
            <Circle cx={74} cy={14} r={7}  fill={colors.navy} />
            <Circle cx={74} cy={14} r={2.5} fill={colors.border} />
          </Svg>
        </AnimatedView>

        {/* ════════════════════════════════════════════════════════
            SCRAP ITEMS
            ──────────────────────────────────────────────────────
            Each item is absolutely positioned so its `top`/`left`
            values define its LANDING position inside the cargo bed.
            translateY starts at -420 (off-screen above) → 0.
            The outer container (splash screen) has overflow:hidden
            which clips the items until they fall into view.
            HTML ref: scrap-fall @keyframes, 0% translateY(-420px)
            ════════════════════════════════════════════════════════ */}

        {/* ── SCRAP ITEM 1 — Newspaper bundle ──────────────────
            Amber-brown stack of folded newspapers.
            Falls into LEFT section of cargo bed.
            t=1220ms, spring: damping 7, stiffness 130          */}
        <AnimatedView style={[
          styles.scrapNewspaper,
          {
            opacity:   scrapNewspaperOp,
            transform: [{ translateY: scrapNewspaperY }],
          },
        ]}>
          <Svg width={42} height={36}>
            {/* Bundle background */}
            <Rect
              x={2} y={2}
              width={38} height={32}
              rx={3}
              fill={colors.material.paper.bg}
            />
            {/* Page lines */}
            <Rect x={7}  y={8}  width={28} height={2}  rx={1} fill={colors.material.paper.fg} opacity={0.7} />
            <Rect x={7}  y={13} width={28} height={2}  rx={1} fill={colors.material.paper.fg} opacity={0.7} />
            <Rect x={7}  y={18} width={28} height={2}  rx={1} fill={colors.material.paper.fg} opacity={0.7} />
            <Rect x={7}  y={23} width={22} height={2}  rx={1} fill={colors.material.paper.fg} opacity={0.5} />
            {/* Amber binding band */}
            <Rect x={18} y={2}  width={4}  height={32} rx={1} fill={colors.amber} opacity={0.65} />
          </Svg>
        </AnimatedView>

        {/* ── SCRAP ITEM 2 — Iron rods ──────────────────────────
            Bundle of 5 silver-slate rods with amber band.
            Falls into CENTRE section of cargo bed.
            t=1440ms, spring: damping 7, stiffness 130          */}
        <AnimatedView style={[
          styles.scrapRods,
          {
            opacity:   scrapRodsOp,
            transform: [{ translateY: scrapRodsY }],
          },
        ]}>
          <Svg width={40} height={30}>
            {/* 5 metal rods stacked */}
            <Rect x={4}  y={1}  width={32} height={4}  rx={2} fill={colors.material.metal.fg} />
            <Rect x={4}  y={7}  width={32} height={4}  rx={2} fill={colors.material.metal.fg} />
            <Rect x={4}  y={13} width={32} height={4}  rx={2} fill={colors.material.metal.fg} />
            <Rect x={4}  y={19} width={32} height={4}  rx={2} fill={colors.material.metal.fg} />
            <Rect x={4}  y={25} width={32} height={4}  rx={2} fill={colors.material.metal.fg} />
            {/* Amber binding band */}
            <Rect x={16} y={1}  width={4}  height={29} rx={1} fill={colors.amber} opacity={0.7} />
          </Svg>
        </AnimatedView>

        {/* ── SCRAP ITEM 3 — Old fridge ─────────────────────────
            Full-height grey appliance with door divider + handles.
            Falls into RIGHT section of cargo bed (tallest item).
            t=1660ms, spring: damping 5 (heavier → bigger bounce)
            #7A8E9C — fridge appliance grey — intentional exception,
            not in tokens. Documented per MEMORY.md §9.          */}
        <AnimatedView style={[
          styles.scrapFridge,
          {
            opacity:   scrapFridgeOp,
            transform: [{ translateY: scrapFridgeY }],
          },
        ]}>
          <Svg width={28} height={58}>
            {/* Fridge body */}
            <Rect x={0} y={0} width={28} height={58} rx={3} fill={colors.fridgeGrey} />
            {/* Door divider line */}
            <Rect x={0} y={22} width={28} height={2}  rx={1} fill={colors.muted} opacity={0.5} />
            {/* Handle — top section */}
            <Rect x={22} y={8}  width={4} height={11} rx={2} fill={colors.slate} opacity={0.8} />
            {/* Handle — bottom section */}
            <Rect x={22} y={27} width={4} height={16} rx={2} fill={colors.slate} opacity={0.8} />
          </Svg>
        </AnimatedView>

      </AnimatedView>
      {/* ── END TRUCK GROUP ─────────────────────────────────── */}

      {/* ════════════════════════════════════════════════════════
          BRAND REVEAL
          ──────────────────────────────────────────────────────
          Appears as truck exits. Wordmark, underline, tagline.
          HTML ref: .wordmark-group, wordmark-rise 0.48s @ 2.3s
          ════════════════════════════════════════════════════════ */}
      <AnimatedView style={[
        styles.wordmarkGroup,
        {
          opacity:   wordmarkOpacity,
          transform: [{ translateY: wordmarkY }],
        },
      ]}>
        {/* App name — DM Sans 700, 36dp, white */}
        <Text variant="heading" style={styles.wordmark}>
          {APP_NAME}
        </Text>

        {/* Amber underline: scaleX 0 → 1 from left
            HTML ref: .splash-name::after, underline-draw 0.3s @ 2.85s
            RN scaleX scales from center by default; for a short
            2dp line this is visually acceptable.                */}
        <AnimatedView style={[
          styles.underline,
          { transform: [{ scaleX: underlineScaleX }] },
        ]} />

        {/* Tagline — rises and fades in
            HTML ref: .splash-tagline, tagline-fade 0.35s @ 2.75s */}
        <AnimatedView style={{
          opacity:   taglineOpacity,
          transform: [{ translateY: taglineY }],
        }}>
          <Text variant="caption" style={styles.tagline}>
            {"INDIA'S SCRAP MARKETPLACE"}
          </Text>
        </AnimatedView>
      </AnimatedView>

      {/* ════════════════════════════════════════════════════════
          LOADING BAR
          ──────────────────────────────────────────────────────
          Amber fill inside translucent white track.
          Appears at 3100ms, fills over 850ms.
          HTML ref: .splash-loader, loader-appear + loader-fill
          ════════════════════════════════════════════════════════ */}
      <AnimatedView style={[styles.loaderTrack, { opacity: loaderOpacity }]}>
        {/* Fill: scaleX 0→1 from center; overflow:hidden on track
            makes it look like a left-to-right fill.            */}
        <AnimatedView style={[
          styles.loaderFill,
          { transform: [{ scaleX: loaderScaleX }] },
        ]} />
      </AnimatedView>

    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Full-screen splash background — navy, centred, clips overflow
  container: {
    flex:            1,
    backgroundColor: colors.navy,
    alignItems:      'center',
    justifyContent:  'center',
    // overflow hidden clips scrap items that start above the screen top
    overflow:        'hidden',
  } as ViewStyle,

  // ── Decorative background circles ───────────────────────────────
  // Match HTML: .splash-inner::before (320dp) and ::after (180dp)
  bgCircle1: {
    position:        'absolute',
    width:           320,
    height:          320,
    borderRadius:    160,
    backgroundColor: 'white',
    opacity:         0.025,
    top:             -80,
    right:           -80,
  } as ViewStyle,

  bgCircle2: {
    position:        'absolute',
    width:           180,
    height:          180,
    borderRadius:    90,
    backgroundColor: 'white',
    opacity:         0.02,
    bottom:          -40,
    left:            -40,
  } as ViewStyle,

  // ── Truck group container ────────────────────────────────────────
  // Plain View — NOT Svg. Moves as a whole during Phase 3.
  // Parts and scrap items are absolutely positioned inside this.
  truckGroup: {
    width:    TRUCK_W,
    height:   TRUCK_H,
  } as ViewStyle,

  // ── Truck parts — absolute positioned landing positions ─────────

  // Chassis: full-width bar at bottom of truck body
  partChassis: {
    position: 'absolute',
    bottom:   18,    // sits just above the wheel row
    left:     0,
  } as ViewStyle,

  // Cargo: right portion of the truck body
  partCargo: {
    position: 'absolute',
    top:      4,
    left:     82,    // starts where cab ends
  } as ViewStyle,

  // Cab: left portion of the truck body
  partCab: {
    position: 'absolute',
    top:      0,
    left:     0,
  } as ViewStyle,

  // Motion lines: to the LEFT of the cab (outside truck body)
  // Negative left value pushes lines behind/left of cab
  motionLines: {
    position: 'absolute',
    top:      32,
    left:     -40,
  } as ViewStyle,

  // Front wheel: beneath the cab
  wheelFront: {
    position: 'absolute',
    bottom:   0,
    left:     16,
  } as ViewStyle,

  // Rear wheels: beneath the cargo bed
  wheelRear: {
    position: 'absolute',
    bottom:   0,
    left:     106,
  } as ViewStyle,

  // ── Scrap items: absolute positioned to their LANDING positions ──
  // translateY starts at -420 (off-screen above) → 0 (landed).
  // The splash container's overflow:hidden clips them during fall.

  // Newspaper: left section of cargo bed
  scrapNewspaper: {
    position: 'absolute',
    top:      20,
    left:     86,
  } as ViewStyle,

  // Iron rods: centre section of cargo bed
  scrapRods: {
    position: 'absolute',
    top:      26,
    left:     132,
  } as ViewStyle,

  // Fridge: right section of cargo bed (tallest item, starts higher)
  scrapFridge: {
    position: 'absolute',
    top:      10,
    left:     174,
  } as ViewStyle,

  // ── Brand reveal ─────────────────────────────────────────────────
  wordmarkGroup: {
    marginTop:  24,
    alignItems: 'flex-start',
  } as ViewStyle,

  wordmark: {
    fontSize:      36,
    color:         'white',
    letterSpacing: -1,
    lineHeight:    40,
  },

  // Amber underline under the wordmark text
  // HTML: 24px wide, 3px tall, amber, scaleX 0→1
  underline: {
    width:           28,
    height:          3,
    backgroundColor: colors.amber,
    borderRadius:    2,
    marginTop:       3,
    opacity:         0.85,
    alignSelf:       'flex-start',
  } as ViewStyle,

  tagline: {
    fontSize:      11,
    color:         'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
    marginTop:     8,
  },

  // ── Loading bar ──────────────────────────────────────────────────
  // HTML: 40px wide, 3px tall, centred at bottom 32px
  loaderTrack: {
    position:        'absolute',
    bottom:          36,
    width:           SCREEN_W * 0.5,
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius:    2,
    // overflow:hidden makes scaleX fill appear as left-to-right fill
    overflow:        'hidden',
  } as ViewStyle,

  loaderFill: {
    position:        'absolute',
    left:            0,
    top:             0,
    bottom:          0,
    width:           '100%',
    backgroundColor: colors.amber,
    borderRadius:    2,
  } as ViewStyle,
});
