/**
 * components/SplashAnimation.tsx
 * ──────────────────────────────────────────────────────────────────
 * First-launch splash animation — 4-phase "Assembly Edition".
 * Source of truth: sortt_logo_splash_v2.html at project root.
 * DO NOT diverge from the HTML spec without updating both files.
 *
 * ── ARCHITECTURE ─────────────────────────────────────────────────
 * Each animated truck part is its own:
 *   <AnimatedView style={{ transform, opacity }}>
 *     <Svg>  ←  SVG primitives ONLY inside here
 *       <Rect /> <Circle /> etc.
 *     </Svg>
 *   </AnimatedView>
 *
 * NO AnimatedView is EVER placed inside an <Svg> element.
 * react-native-svg only accepts SVG primitives as Svg children.
 * Mounting a View/AnimatedView inside Svg causes the Android
 * bridge crash: java.lang.String cannot be cast to java.lang.Boolean
 *
 * Wheel spin is a SEPARATE inner AnimatedView wrapping the wheel Svg.
 * This separates the fly-in translate (outer) from the spin (inner),
 * preventing transform conflicts on the same animated value.
 *
 * ── ANIMATION PHASES ─────────────────────────────────────────────
 * Phase 1 — Assembly (explicit delays matching HTML spec):
 *   Cab          delay 280ms  spring from LEFT     damping 12 stiff 180
 *   Cargo        delay 400ms  spring from RIGHT    damping 12 stiff 180
 *   Chassis      delay 560ms  spring from BELOW    damping 14 stiff 200
 *   WheelFront   delay 650ms  spring diagonal BL   damping  9 stiff 220
 *   WheelsRear   delay 720ms  spring diagonal BR   damping  9 stiff 220
 * Phase 2 — Scrap fall (1220ms base, 220ms stagger):
 *   Newspaper  t=1220ms  spring damping 7 stiff 130
 *   Rods       t=1440ms  spring damping 7 stiff 130
 *   Fridge     t=1660ms  spring damping 5 stiff 130  (heavier = more bounce)
 * Phase 3 — Drive exit (t=2000ms):
 *   truckGroupX → -(SCREEN_W + TRUCK_W), 1000ms, Easing.in(cubic)
 *   wheelRotation → loop 320ms/rev linear
 *   motionLinesOpacity → 1, 250ms ease-out
 * Phase 4 — Brand reveal:
 *   Wordmark   t=2300ms  480ms  translateY(22→0) + opacity
 *   Tagline    t=2750ms  350ms  translateY(4→0)  + opacity
 *   Underline  t=2850ms  300ms  scaleX 0→1
 *   Loader     t=3100ms  300ms  opacity; t=3200ms 850ms fill
 * Fade out — t=4200ms, 600ms ease-in → onComplete()
 *
 * ── TOKEN EXCEPTIONS (documented — all intentional) ──────────────
 * #0A1520  chassis shadow, darker than colors.navy
 * #155952  rear wheel outer, darker teal
 * #1A2B3E  front wheel inner ring
 * #0D1620  front wheel outer (near-black)
 * #7A8E9C  fridge outer grey
 * #8FA3B0  fridge face grey
 * #9BB0BB  fridge freezer section
 * #5C6E7C  fridge dent mark
 * #8B6050  fridge rust streak
 * #C4842A  newspaper layer 1
 * #B47020  newspaper layer 2
 * #C98828  newspaper layer 3
 * #D09030  newspaper layer 4
 * #7A4E08  newspaper binding twine
 * #B0B9C3  iron rod highlight
 * #F5C842  headlight inner glow
 * 'white'  windscreen glare, wheel centers, structural highlights
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
import Svg, {
  Rect, Circle, G, Line, Path, Text as SvgText, Ellipse,
} from 'react-native-svg';

import { colors } from '../constants/tokens';
import { APP_NAME } from '../constants/app';
import { Text } from './ui/Typography';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);

// Truck group dimensions match HTML SVG viewBox "0 0 180 90"
const TRUCK_W = 180;
const TRUCK_H = 90;

interface SplashAnimationProps {
  /** Called after the 600ms fade-out completes at ~4.8s. Caller navigates. */
  onComplete: () => void;
}

export default function SplashAnimation({ onComplete }: SplashAnimationProps) {

  // ── Phase 1: Part assembly ─────────────────────────────────────
  const cabX         = useRef(new Animated.Value(-260)).current; // cab from left
  const cabOpacity   = useRef(new Animated.Value(0)).current;
  const cargoX       = useRef(new Animated.Value(260)).current;  // cargo from right
  const cargoOpacity = useRef(new Animated.Value(0)).current;
  const chassisY     = useRef(new Animated.Value(120)).current;  // chassis from below
  const chassisOp    = useRef(new Animated.Value(0)).current;
  const wFrontX      = useRef(new Animated.Value(-120)).current; // front wheel diag BL
  const wFrontY      = useRef(new Animated.Value(80)).current;
  const wFrontOp     = useRef(new Animated.Value(0)).current;
  const wRearX       = useRef(new Animated.Value(120)).current;  // rear wheels diag BR
  const wRearY       = useRef(new Animated.Value(80)).current;
  const wRearOp      = useRef(new Animated.Value(0)).current;

  // ── Phase 2: Scrap items fall ─────────────────────────────────
  // Start at -420 (off-screen above truck) per HTML @keyframes spec
  const scrap1Y  = useRef(new Animated.Value(-420)).current;
  const scrap1Op = useRef(new Animated.Value(0)).current;
  const scrap2Y  = useRef(new Animated.Value(-420)).current;
  const scrap2Op = useRef(new Animated.Value(0)).current;
  const scrap3Y  = useRef(new Animated.Value(-420)).current;
  const scrap3Op = useRef(new Animated.Value(0)).current;

  // ── Phase 3: Drive ────────────────────────────────────────────
  const truckGroupX   = useRef(new Animated.Value(0)).current;
  const wheelRotation = useRef(new Animated.Value(0)).current;
  const motionLinesOp = useRef(new Animated.Value(0)).current;

  // ── Phase 4: Brand reveal ─────────────────────────────────────
  const wordmarkY      = useRef(new Animated.Value(22)).current;  // HTML: translateY(22px)
  const wordmarkOp     = useRef(new Animated.Value(0)).current;
  const taglineY       = useRef(new Animated.Value(4)).current;   // HTML: translateY(4px)
  const taglineOp      = useRef(new Animated.Value(0)).current;
  const underlineScale = useRef(new Animated.Value(0)).current;   // HTML: scaleX 0→1
  const loaderOp       = useRef(new Animated.Value(0)).current;
  const loaderScale    = useRef(new Animated.Value(0)).current;

  // ── Fade out ──────────────────────────────────────────────────
  const splashOp = useRef(new Animated.Value(1)).current;

  // Wheel rotation: 0→1 maps to 0deg→360deg (linear loop, 320ms/rev)
  const wheelRotateDeg = wheelRotation.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // ╔══════════════════════════════════════════════════════════╗
    // ║  PHASE 1 — TRUCK ASSEMBLY                                ║
    // ║  Explicit delays per HTML spec (NOT stagger).            ║
    // ║  HTML ref: .part-cab 0.28s, .part-cargo 0.40s,          ║
    // ║  .part-chassis 0.56s, .part-wheel-front 0.65s,          ║
    // ║  .part-wheels-rear 0.72s                                 ║
    // ╚══════════════════════════════════════════════════════════╝

    // Cab — from LEFT, delay 280ms
    Animated.sequence([
      Animated.delay(280),
      Animated.parallel([
        Animated.spring(cabX, {
          toValue: 0, damping: 12, stiffness: 180, useNativeDriver: true,
        }),
        Animated.timing(cabOpacity, {
          toValue: 1, duration: 300, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Cargo — from RIGHT, delay 400ms
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(cargoX, {
          toValue: 0, damping: 12, stiffness: 180, useNativeDriver: true,
        }),
        Animated.timing(cargoOpacity, {
          toValue: 1, duration: 300, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Chassis — from BELOW, delay 560ms
    Animated.sequence([
      Animated.delay(560),
      Animated.parallel([
        Animated.spring(chassisY, {
          toValue: 0, damping: 14, stiffness: 200, useNativeDriver: true,
        }),
        Animated.timing(chassisOp, {
          toValue: 1, duration: 250, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Front wheel — diagonal BOTTOM-LEFT, delay 650ms
    // HTML: cubic-bezier(0.34,1.56,0.64,1) = overshoot spring
    Animated.sequence([
      Animated.delay(650),
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
    ]).start();

    // Rear wheels — diagonal BOTTOM-RIGHT, delay 720ms
    Animated.sequence([
      Animated.delay(720),
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
    // ║  PHASE 2 — SCRAP ITEMS FALL INTO CARGO BED              ║
    // ║  Base: t=1220ms, stagger: 220ms apart                   ║
    // ║  HTML ref: .scrap-item-1 @ 1.22s, -2 @ 1.44s, -3 @1.66s║
    // ╚══════════════════════════════════════════════════════════╝
    const scrapData = [
      { y: scrap1Y, op: scrap1Op, delay: 1220, damping: 7 },
      { y: scrap2Y, op: scrap2Op, delay: 1440, damping: 7 },
      { y: scrap3Y, op: scrap3Op, delay: 1660, damping: 5 }, // fridge heavier = more bounce
    ];

    scrapData.forEach(({ y, op, delay, damping }) => {
      timers.push(
        setTimeout(() => {
          // Opacity fades in quickly on start of fall
          Animated.timing(op, {
            toValue: 1, duration: 160, easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
          // Spring fall with bounce at landing
          // HTML: cubic-bezier(0.25,1,0.5,1) with bounce keyframe at 78%
          Animated.spring(y, {
            toValue: 0, damping, stiffness: 130, useNativeDriver: true,
            overshootClamping: true,
          }).start();
        }, delay)
      );
    });

    // ╔══════════════════════════════════════════════════════════╗
    // ║  PHASE 3 — TRUCK DRIVES LEFT + WHEEL SPIN               ║
    // ║  t=2000ms: .truck-driving class added in HTML via JS     ║
    // ║  Drive: cubic-bezier(0.2,0,0.8,0.95) 1000ms -380px      ║
    // ╚══════════════════════════════════════════════════════════╝
    timers.push(
      setTimeout(() => {
        // Truck drives offscreen left
        // HTML: translateX(-380px) but we use -(SCREEN_W + TRUCK_W)
        // to guarantee full exit on all screen widths
        Animated.timing(truckGroupX, {
          toValue:  -(SCREEN_W + TRUCK_W),
          duration: 1000,
          easing:   Easing.in(Easing.cubic), // approx cubic-bezier(0.2,0,0.8,0.95)
          useNativeDriver: true,
        }).start();

        // Motion lines appear as truck accelerates
        // HTML: motion-lines-drive 0.25s ease-out
        Animated.timing(motionLinesOp, {
          toValue:  1,
          duration: 250,
          easing:   Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();

        // Wheels spin — continuous loop at 320ms/rev
        // HTML: wheel-roll 0.32s linear infinite
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
    // ║  PHASE 4 — BRAND REVEAL                                  ║
    // ║  HTML ref: wordmark-rise 0.48s @ 2.3s                   ║
    // ╚══════════════════════════════════════════════════════════╝

    // Wordmark rises in (t=2300ms)
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(wordmarkY, {
            toValue: 0, duration: 480, easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkOp, {
            toValue: 1, duration: 480, easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 2300)
    );

    // Tagline fades in (t=2750ms), underline draws (t=2850ms)
    // HTML: tagline-fade 0.35s @ 2.75s, underline-draw 0.3s @ 2.85s
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(taglineY, {
            toValue: 0, duration: 350, easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(taglineOp, {
            toValue: 1, duration: 350, easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }, 2750)
    );

    timers.push(
      setTimeout(() => {
        // HTML: underline-draw scaleX 0→1, transform-origin left
        // RN: scaleX from center is visually acceptable for 24px element
        Animated.timing(underlineScale, {
          toValue: 1, duration: 300, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 2850)
    );

    // Loading bar (t=3100ms appear, t=3200ms fill over 850ms)
    // HTML: loader-appear 0.3s @ 3.1s, loader-fill 0.85s ease-out @ 3.2s
    timers.push(
      setTimeout(() => {
        Animated.timing(loaderOp, {
          toValue: 1, duration: 300, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 3100)
    );

    timers.push(
      setTimeout(() => {
        // loaderScale drives scaleX on loaderFill inside overflow:hidden track
        // useNativeDriver: true — scaleX is a transform, safe for native driver
        Animated.timing(loaderScale, {
          toValue: 1, duration: 850, easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 3200)
    );

    // ╔══════════════════════════════════════════════════════════╗
    // ║  FADE OUT → navigate                                     ║
    // ║  HTML: splash-fadeout 0.6s ease-in 4.2s both            ║
    // ╚══════════════════════════════════════════════════════════╝
    timers.push(
      setTimeout(() => {
        Animated.timing(splashOp, {
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

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, { opacity: splashOp }]}>

      {/* Background decorative circles — rgba exception, intentional
          HTML: .splash-inner::before (320dp) and ::after (180dp)  */}
      <View style={styles.bgCircle1} pointerEvents="none" />
      <View style={styles.bgCircle2} pointerEvents="none" />

      {/* ════════════════════════════════════════════════════════════
          TRUCK GROUP
          ──────────────────────────────────────────────────────────
          Plain AnimatedView — NOT Svg.
          All children (parts, scrap items) are absolutely positioned
          inside the 180×90 bounding box that mirrors the HTML SVG.
          In Phase 3, this entire group translates left and exits.
          ════════════════════════════════════════════════════════════ */}
      <AnimatedView style={[
        styles.truckGroup,
        { transform: [{ translateX: truckGroupX }] },
      ]}>

        {/* ── CHASSIS — rises from BELOW ─────────────────────────
            HTML: <g class="part-chassis"> rect x=14 y=59 w=152 h=8
            Local SVG: (14,59) → origin, size 152×9
            #0A1520 — chassis shadow, darker than navy — token exception */}
        <AnimatedView style={[
          styles.partChassis,
          {
            opacity:   chassisOp,
            transform: [{ translateY: chassisY }],
          },
        ]}>
          <Svg width={152} height={9} viewBox="0 0 152 9">
            <Rect x={0} y={0} width={152} height={8} rx={4}
              fill="#0A1520" opacity={0.65} />
            {/* Highlight line — HTML: x1=18 y1=62 → local x1=4 y1=3 */}
            <Line x1={4} y1={3} x2={148} y2={3}
              stroke="white" strokeWidth={0.8} opacity={0.07} />
          </Svg>
        </AnimatedView>

        {/* ── CARGO BED — slides from RIGHT ──────────────────────
            HTML: <g class="part-cargo"> rect x=54 y=12 w=110 h=52
            Local SVG: (54,12) → origin, size 110×56 (incl bottom rail)
            fill #1A6B63 (teal) per HTML */}
        <AnimatedView style={[
          styles.partCargo,
          {
            opacity:   cargoOpacity,
            transform: [{ translateX: cargoX }],
          },
        ]}>
          <Svg width={110} height={56} viewBox="0 0 110 56">
            {/* Main bed body */}
            <Rect x={0} y={0} width={110} height={52} rx={5} fill="#1A6B63" />
            {/* Open-top dashed line — HTML: stroke-dasharray="6 4" */}
            <Path d="M0 0 L110 0"
              stroke="white" strokeWidth={2} strokeDasharray="6 4" opacity={0.4} />
            {/* Side structural ribs — HTML: x=86,116,146 → local 32,62,92 */}
            <Line x1={32} y1={2} x2={32} y2={52}
              stroke="white" strokeWidth={1} opacity={0.12} />
            <Line x1={62} y1={2} x2={62} y2={52}
              stroke="white" strokeWidth={1} opacity={0.12} />
            <Line x1={92} y1={2} x2={92} y2={52}
              stroke="white" strokeWidth={1} opacity={0.12} />
            {/* Bottom rail — HTML: y=60 → local y=48, #155952 token exception */}
            <Rect x={0} y={48} width={110} height={4} rx={2}
              fill="#155952" opacity={0.7} />
          </Svg>
        </AnimatedView>

        {/* ── SCRAP ITEM 1 — Newspaper bundle ────────────────────
            HTML: <g class="scrap-item-1"> x=60–83, y=22–57
            Local SVG: (60,22) → origin, size 24×36
            Layered newspaper sheets in amber-brown tones.
            translateY: -420 → 0 (falls from off-screen above)      */}
        <AnimatedView style={[
          styles.scrapNewspaper,
          {
            opacity:   scrap1Op,
            transform: [{ translateY: scrap1Y }],
          },
        ]}>
          <Svg width={24} height={36} viewBox="0 0 24 36">
            {/* 4 stacked newspaper layers — bottom to top */}
            {/* #C4842A #B47020 #C98828 #D09030 — amber tone exceptions */}
            <Rect x={0} y={21} width={23} height={13} rx={2}   fill="#C4842A" />
            <Rect x={0} y={14} width={23} height={9}  rx={1.5} fill="#B47020" />
            <Rect x={0} y={7}  width={23} height={9}  rx={1.5} fill="#C98828" />
            <Rect x={0} y={0}  width={23} height={9}  rx={1.5} fill="#D09030" />
            {/* Top folded edge curve */}
            <Path d="M0 0 Q11.5 -2.5 23 0"
              stroke="#B47020" strokeWidth={1} fill="none" opacity={0.7} />
            {/* Text line details on top sheet */}
            <Line x1={3}  y1={3}   x2={20} y2={3}
              stroke="white" strokeWidth={0.7} opacity={0.38} />
            <Line x1={3}  y1={5.5} x2={16} y2={5.5}
              stroke="white" strokeWidth={0.7} opacity={0.26} />
            {/* Binding twine band — #7A4E08 token exception */}
            <Rect x={-1} y={17.5} width={25} height={2.5} rx={1.2}
              fill="#7A4E08" opacity={0.85} />
            <SvgText
              x={11.5} y={15} textAnchor="middle"
              fontFamily="DM Sans" fontSize={5.5} fontWeight="700"
              fill="white" opacity={0.88}
            >NP</SvgText>
          </Svg>
        </AnimatedView>

        {/* ── SCRAP ITEM 2 — Iron rods bundle ────────────────────
            HTML: <g class="scrap-item-2"> x=89–118, y=15–58
            Local SVG: (89,15) → origin, size 28×46
            5 silver-slate vertical rods with amber binding band   */}
        <AnimatedView style={[
          styles.scrapRods,
          {
            opacity:   scrap2Op,
            transform: [{ translateY: scrap2Y }],
          },
        ]}>
          <Svg width={28} height={46} viewBox="0 0 28 46">
            {/* 5 individual rods — HTML: cx=91,96,101,106,111 → local 2,7,12,17,22 */}
            <Rect x={2}  y={1}  width={3.5} height={42} rx={1.5} fill="#9CA3AF" />
            <Rect x={7}  y={3}  width={3.5} height={40} rx={1.5} fill="#6B7280" />
            <Rect x={12} y={0}  width={3.5} height={43} rx={1.5} fill="#B0B9C3" />
            {/* #B0B9C3 — rod highlight, token exception */}
            <Rect x={17} y={2}  width={3.5} height={41} rx={1.5} fill="#6B7280" />
            <Rect x={22} y={1}  width={3.5} height={42} rx={1.5} fill="#9CA3AF" />
            {/* Rod-end highlights (top caps) */}
            <Rect x={2}  y={1}  width={3.5} height={3} rx={1} fill="white" opacity={0.42} />
            <Rect x={7}  y={3}  width={3.5} height={3} rx={1} fill="white" opacity={0.3}  />
            <Rect x={12} y={0}  width={3.5} height={3} rx={1} fill="white" opacity={0.42} />
            <Rect x={17} y={2}  width={3.5} height={3} rx={1} fill="white" opacity={0.3}  />
            <Rect x={22} y={1}  width={3.5} height={3} rx={1} fill="white" opacity={0.42} />
            {/* Amber binding band — colors.amber from tokens */}
            <Rect x={0} y={29} width={28} height={3} rx={1.5}
              fill={colors.amber} opacity={0.9} />
            <SvgText
              x={14} y={26} textAnchor="middle"
              fontFamily="DM Sans" fontSize={5.5} fontWeight="700"
              fill="white" opacity={0.88}
            >Fe</SvgText>
          </Svg>
        </AnimatedView>

        {/* ── SCRAP ITEM 3 — Old fridge ───────────────────────────
            HTML: <g class="scrap-item-3"> x=122–153, y=12–64
            Local SVG: (122,12) → origin, size 32×54
            Grey appliance with divider, handles, dent, rust.
            Heaviest item — damping 5 gives biggest landing bounce  */}
        <AnimatedView style={[
          styles.scrapFridge,
          {
            opacity:   scrap3Op,
            transform: [{ translateY: scrap3Y }],
          },
        ]}>
          <Svg width={32} height={54} viewBox="0 0 32 54">
            {/* Outer body — #7A8E9C token exception */}
            <Rect x={0} y={0} width={31} height={52} rx={3.5} fill="#7A8E9C" />
            {/* Face slightly lighter — #8FA3B0 token exception */}
            <Rect x={1} y={1} width={29} height={50} rx={3}   fill="#8FA3B0" />
            {/* Freezer section (top third) — #9BB0BB token exception */}
            <Rect x={1} y={1} width={29} height={17} rx={3}   fill="#9BB0BB" />
            {/* Door divider line */}
            <Rect x={2} y={20} width={27} height={1.5}        fill="white" opacity={0.55} />
            {/* Freezer handle — HTML: x=148 y=17 → local x=26 y=5 */}
            <Rect x={26} y={5}  width={2.5} height={7}  rx={1.2} fill="white" opacity={0.72} />
            {/* Fridge handle — HTML: x=148 y=36 → local x=26 y=24 */}
            <Rect x={26} y={24} width={2.5} height={10} rx={1.2} fill="white" opacity={0.72} />
            {/* Dent — #5C6E7C token exception */}
            <Ellipse cx={13} cy={9}  rx={3.5} ry={2.5} fill="#5C6E7C" opacity={0.55} />
            {/* Rust streak — #8B6050 token exception */}
            <Ellipse cx={8}  cy={35} rx={2}   ry={1.5} fill="#8B6050" opacity={0.4} />
            <SvgText
              x={14} y={42} textAnchor="middle"
              fontFamily="DM Sans" fontSize={5.5} fontWeight="700"
              fill="white" opacity={0.72}
            >FR</SvgText>
          </Svg>
        </AnimatedView>

        {/* ── CAB — slides from LEFT ──────────────────────────────
            HTML: <g class="part-cab"> rect x=18 y=20 w=36 h=44
            Local SVG: (18,20) → origin, size 40×50
            White cab, dark windscreen, amber headlight, junction shadow */}
        <AnimatedView style={[
          styles.partCab,
          {
            opacity:   cabOpacity,
            transform: [{ translateX: cabX }],
          },
        ]}>
          <Svg width={40} height={50} viewBox="0 0 40 50">
            {/* Cab body — white/ivory */}
            <Rect x={0} y={0} width={36} height={44} rx={7}
              fill="white" opacity={0.95} />
            {/* Windscreen — HTML: rect x=22 y=24 → local x=4 y=4 */}
            <Rect x={4} y={4} width={22} height={16} rx={3.5} fill="#1C2E4A" />
            {/* Glare highlight — HTML: x=23 y=25 → local x=5 y=5 */}
            <Rect x={5} y={5} width={8} height={4} rx={1}
              fill="white" opacity={0.2} />
            {/* Door line — HTML: x=32 y=38–62 → local x=14 y=18–42 */}
            <Line x1={14} y1={18} x2={14} y2={42}
              stroke="#DDE3EA" strokeWidth={0.8} opacity={0.35} />
            {/* Headlight outer — HTML: cx=48 cy=55 → local cx=30 cy=35 */}
            <Circle cx={30} cy={35} r={5.5} fill="#B7791F" />
            {/* Headlight inner glow — #F5C842 token exception */}
            <Circle cx={30} cy={35} r={2.8} fill="#F5C842" opacity={0.65} />
            {/* Bumper — HTML: y=58 → local y=38 */}
            <Rect x={0} y={38} width={36} height={5} rx={2.5}
              fill="white" opacity={0.22} />
            {/* Cab-cargo junction shadow — HTML: x=52 → local x=34 */}
            <Rect x={34} y={0} width={4} height={44}
              fill="#0A1520" opacity={0.12} />
          </Svg>
        </AnimatedView>

        {/* ── FRONT WHEEL — diagonal from BOTTOM-LEFT ────────────
            HTML: <g class="part-wheel-front"> cx=30 cy=70 r=13
            Local SVG: origin at (30-14, 70-14) = (16, 56) in truck group
            Fly-in: outer AnimatedView handles translate
            Spin:   inner AnimatedView handles rotate
            This separation prevents transform array conflicts.
            HTML wheel colors: #0D1620 outer, #1A2B3E ring, #8E9BAA hub */}
        <AnimatedView style={[
          styles.wheelFront,
          {
            opacity:   wFrontOp,
            transform: [{ translateX: wFrontX }, { translateY: wFrontY }],
          },
        ]}>
          {/* Inner spin wrapper — rotates independently from fly-in */}
          <AnimatedView style={{ transform: [{ rotate: wheelRotateDeg }] }}>
            <Svg width={28} height={28} viewBox="0 0 28 28">
              {/* #0D1620 outer ring — token exception (near-black) */}
              <Circle cx={14} cy={14} r={13}  fill="#0D1620" />
              {/* #1A2B3E inner ring — token exception */}
              <Circle cx={14} cy={14} r={9}   fill="#1A2B3E" />
              {/* Hub — colors.muted (#8E9BAA) */}
              <Circle cx={14} cy={14} r={4.5} fill="#8E9BAA" />
              <Circle cx={14} cy={14} r={2}   fill="white"   opacity={0.5} />
              {/* Spokes at N/S/E/W — colors.slate (#5C6B7A) */}
              <Line x1={14} y1={5}  x2={14} y2={1}
                stroke="#5C6B7A" strokeWidth={1.5} opacity={0.55} />
              <Line x1={14} y1={23} x2={14} y2={27}
                stroke="#5C6B7A" strokeWidth={1.5} opacity={0.55} />
              <Line x1={5}  y1={14} x2={1}  y2={14}
                stroke="#5C6B7A" strokeWidth={1.5} opacity={0.55} />
              <Line x1={23} y1={14} x2={27} y2={14}
                stroke="#5C6B7A" strokeWidth={1.5} opacity={0.55} />
            </Svg>
          </AnimatedView>
        </AnimatedView>

        {/* ── REAR WHEELS — diagonal from BOTTOM-RIGHT ───────────
            HTML: <g class="part-wheels-rear"> 3 wheels, cy=70, cx=92/130/150
            Group origin: left=79 (cx92-r13), top=57 (cy70-r13)
            Each wheel is an independent AnimatedView for correct
            per-wheel rotation (each rotates around its own center).
            All three share the same wheelRotateDeg value.
            Wheel colors: #155952 outer, #1A6B63 inner, #0D4E47 hub */}
        <AnimatedView style={[
          styles.wheelRearGroup,
          {
            opacity:   wRearOp,
            transform: [{ translateX: wRearX }, { translateY: wRearY }],
          },
        ]}>
          {/* W2: cx=92 → group-local left=0  (92-13-79=0) */}
          <AnimatedView style={[styles.rearWheel, { left: 0 }]}>
            <AnimatedView style={{ transform: [{ rotate: wheelRotateDeg }] }}>
              <Svg width={28} height={28} viewBox="0 0 28 28">
                {/* #155952 token exception */}
                <Circle cx={14} cy={14} r={13}  fill="#155952" />
                <Circle cx={14} cy={14} r={9}   fill="#1A6B63" />
                <Circle cx={14} cy={14} r={4.5} fill="#0D4E47" />
                <Circle cx={14} cy={14} r={2}   fill="white"   opacity={0.4} />
                <Line x1={14} y1={5}  x2={14} y2={1}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={14} y1={23} x2={14} y2={27}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={5}  y1={14} x2={1}  y2={14}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={23} y1={14} x2={27} y2={14}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
              </Svg>
            </AnimatedView>
          </AnimatedView>

          {/* W3: cx=130 → group-local left=38  (130-13-79=38) */}
          <AnimatedView style={[styles.rearWheel, { left: 38 }]}>
            <AnimatedView style={{ transform: [{ rotate: wheelRotateDeg }] }}>
              <Svg width={28} height={28} viewBox="0 0 28 28">
                <Circle cx={14} cy={14} r={13}  fill="#155952" />
                <Circle cx={14} cy={14} r={9}   fill="#1A6B63" />
                <Circle cx={14} cy={14} r={4.5} fill="#0D4E47" />
                <Circle cx={14} cy={14} r={2}   fill="white"   opacity={0.4} />
                <Line x1={14} y1={5}  x2={14} y2={1}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={14} y1={23} x2={14} y2={27}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={5}  y1={14} x2={1}  y2={14}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={23} y1={14} x2={27} y2={14}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
              </Svg>
            </AnimatedView>
          </AnimatedView>

          {/* W4: cx=150 → group-local left=58  (150-13-79=58) */}
          <AnimatedView style={[styles.rearWheel, { left: 58 }]}>
            <AnimatedView style={{ transform: [{ rotate: wheelRotateDeg }] }}>
              <Svg width={28} height={28} viewBox="0 0 28 28">
                <Circle cx={14} cy={14} r={13}  fill="#155952" />
                <Circle cx={14} cy={14} r={9}   fill="#1A6B63" />
                <Circle cx={14} cy={14} r={4.5} fill="#0D4E47" />
                <Circle cx={14} cy={14} r={2}   fill="white"   opacity={0.4} />
                <Line x1={14} y1={5}  x2={14} y2={1}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={14} y1={23} x2={14} y2={27}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={5}  y1={14} x2={1}  y2={14}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
                <Line x1={23} y1={14} x2={27} y2={14}
                  stroke="#1A6B63" strokeWidth={1.5} opacity={0.65} />
              </Svg>
            </AnimatedView>
          </AnimatedView>
        </AnimatedView>

        {/* ── MOTION LINES — visible only when truck is driving ───
            HTML: <g class="motion-lines"> 4 amber lines left of cab
            Positioned at global x=1–14, y=30–59 → local left=1, top=30
            Opacity: 0 → 1 at t=2000ms. Moves with truckGroup.
            HTML: motion-lines-drive 0.25s ease-out               */}
        <AnimatedView style={[
          styles.motionLines,
          { opacity: motionLinesOp },
        ]}>
          <Svg width={16} height={31} viewBox="0 0 16 31">
            {/* HTML: x1=3 y1=30 → local x1=2 y1=0 */}
            <Line x1={2}  y1={0}  x2={13} y2={0}
              stroke="#B7791F" strokeWidth={3}   strokeLinecap="round" opacity={0.85} />
            {/* HTML: x1=1 y1=40 → local x1=0 y1=10 */}
            <Line x1={0}  y1={10} x2={10} y2={10}
              stroke="#B7791F" strokeWidth={2}   strokeLinecap="round" opacity={0.65} />
            {/* HTML: x1=3 y1=50 → local x1=2 y1=20 */}
            <Line x1={2}  y1={20} x2={11} y2={20}
              stroke="#B7791F" strokeWidth={2}   strokeLinecap="round" opacity={0.5}  />
            {/* HTML: x1=2 y1=59 → local x1=1 y1=29 */}
            <Line x1={1}  y1={29} x2={8}  y2={29}
              stroke="#B7791F" strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          </Svg>
        </AnimatedView>

        {/* Ground shadow — static, subtle white line at y=85 in 90px group */}
        <Svg style={styles.groundShadow} width={180} height={2} viewBox="0 0 180 2">
          <Line x1={0} y1={1} x2={180} y2={1}
            stroke="white" strokeWidth={1} opacity={0.07} />
        </Svg>

      </AnimatedView>
      {/* ── END TRUCK GROUP ───────────────────────────────────── */}

      {/* ════════════════════════════════════════════════════════════
          BRAND REVEAL
          ──────────────────────────────────────────────────────────
          The whole wordmarkGroup rises and fades as a unit.
          The underline and tagline have their own sub-animations
          (underline scaleX, tagline translateY+opacity).
          HTML ref: .wordmark-group, wordmark-rise 0.48s @ 2.3s
          ════════════════════════════════════════════════════════════ */}
      <AnimatedView style={[
        styles.wordmarkGroup,
        {
          opacity:   wordmarkOp,
          transform: [{ translateY: wordmarkY }],
        },
      ]}>
        {/* App name — DM Sans 700, 36dp, white, letter-spacing -1
            HTML: .splash-name font-size 36px font-weight 700       */}
        <Text variant="heading" style={styles.wordmark}>
          {APP_NAME}
        </Text>

        {/* Amber underline — scaleX 0→1 at t=2850ms
            HTML: .splash-name::after — 24px wide, 3px tall, amber
            RN scales from center (acceptable for 24px element)     */}
        <AnimatedView style={[
          styles.underline,
          { transform: [{ scaleX: underlineScale }] },
        ]} />

        {/* Tagline — rises and fades at t=2750ms
            HTML: .splash-tagline tagline-fade 0.35s @ 2.75s        */}
        <AnimatedView style={{
          opacity:   taglineOp,
          transform: [{ translateY: taglineY }],
        }}>
          <Text variant="caption" style={styles.tagline}>
            {"INDIA'S SCRAP MARKETPLACE"}
          </Text>
        </AnimatedView>
      </AnimatedView>

      {/* ════════════════════════════════════════════════════════════
          LOADING BAR
          ──────────────────────────────────────────────────────────
          Amber fill inside translucent track at bottom of screen.
          Track appears at 3100ms. Fill animates 3200ms → +850ms.
          overflow:hidden on track makes scaleX look like left→right fill.
          HTML ref: .splash-loader, loader-appear + loader-fill
          ════════════════════════════════════════════════════════════ */}
      <AnimatedView style={[styles.loaderTrack, { opacity: loaderOp }]}>
        <AnimatedView style={[
          styles.loaderFill,
          { transform: [{ scaleX: loaderScale }] },
        ]} />
      </AnimatedView>

    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Full-screen navy container — overflow hidden clips scrap fall
  container: {
    flex:            1,
    backgroundColor: colors.navy,
    alignItems:      'center',
    justifyContent:  'center',
    overflow:        'hidden',
  } as ViewStyle,

  // Decorative background circles — match HTML ::before and ::after
  // rgba(255,255,255,0.025) and rgba(255,255,255,0.02) — rgba exceptions
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

  // Truck group: mirrors HTML SVG viewBox "0 0 180 90"
  truckGroup: {
    width:  TRUCK_W,  // 180
    height: TRUCK_H,  // 90
  } as ViewStyle,

  // ── Part absolute landing positions within 180×90 truck group ────

  // Chassis: HTML rect x=14 y=59 → left=14, top=59
  partChassis: {
    position: 'absolute',
    left:     14,
    top:      59,
  } as ViewStyle,

  // Cargo bed: HTML rect x=54 y=12 → left=54, top=12
  partCargo: {
    position: 'absolute',
    left:     54,
    top:      12,
  } as ViewStyle,

  // Cab: HTML rect x=18 y=20 → left=18, top=20
  partCab: {
    position: 'absolute',
    left:     18,
    top:      20,
  } as ViewStyle,

  // ── Scrap item landing positions (translateY: -420 → 0) ──────────

  // Newspaper: HTML x=60 y=22 → left=60, top=22
  scrapNewspaper: {
    position: 'absolute',
    left:     60,
    top:      22,
  } as ViewStyle,

  // Iron rods: HTML x=89 y=15 → left=89, top=15
  scrapRods: {
    position: 'absolute',
    left:     89,
    top:      15,
  } as ViewStyle,

  // Fridge: HTML x=122 y=12 → left=122, top=12
  scrapFridge: {
    position: 'absolute',
    left:     122,
    top:      12,
  } as ViewStyle,

  // ── Wheel positions ───────────────────────────────────────────────

  // Front wheel: HTML cx=30 cy=70 r=13 → left=30-14=16, top=70-14=56
  wheelFront: {
    position: 'absolute',
    left:     16,
    top:      56,
  } as ViewStyle,

  // Rear wheel GROUP container:
  // leftmost wheel edge: cx92-r13=79, topmost: cy70-r13=57
  // width covers cx=79 to cx=163 (cx150+r13) = 84
  wheelRearGroup: {
    position: 'absolute',
    left:     79,
    top:      57,
    width:    84,
    height:   28,
  } as ViewStyle,

  // Individual rear wheel — positioned absolutely within group
  rearWheel: {
    position: 'absolute',
    top:      0,
  } as ViewStyle,

  // Motion lines: HTML global x=1–14, y=30–59 → left=1, top=30
  motionLines: {
    position: 'absolute',
    left:     1,
    top:      30,
  } as ViewStyle,

  // Ground shadow: HTML y=85 in 90px group → top=84
  groundShadow: {
    position: 'absolute',
    left:     0,
    top:      84,
  } as ViewStyle,

  // ── Brand reveal ──────────────────────────────────────────────────

  // marginTop 20 matches HTML: .wordmark-group margin-top: 20px
  wordmarkGroup: {
    marginTop:  20,
    alignItems: 'flex-start',
  } as ViewStyle,

  // HTML: .splash-name font-size 36px letter-spacing -1px
  wordmark: {
    fontSize:      36,
    color:         'white',
    letterSpacing: -1,
    lineHeight:    40,
  },

  // HTML: .splash-name::after — 24px wide, 3px tall, amber, scaleX 0→1
  underline: {
    width:           24,
    height:          3,
    backgroundColor: colors.amber,
    borderRadius:    2,
    marginTop:       3,
    opacity:         0.85,
    alignSelf:       'flex-start',
  } as ViewStyle,

  // HTML: .splash-tagline — 11px, white 45% opacity, letter-spacing 1.2px
  tagline: {
    fontSize:      11,
    color:         'rgba(255,255,255,0.45)', // rgba exception
    letterSpacing: 1.2,
    marginTop:     8,
  },

  // HTML: .splash-loader — 40px wide, 3px tall, centered, bottom 32px
  loaderTrack: {
    position:        'absolute',
    bottom:          32,
    width:           40,
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.1)', // rgba exception
    borderRadius:    2,
    overflow:        'hidden', // clips scaleX fill to look like left→right
  } as ViewStyle,

  // HTML: .splash-loader::after — amber fill, scaleX 0→1
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
