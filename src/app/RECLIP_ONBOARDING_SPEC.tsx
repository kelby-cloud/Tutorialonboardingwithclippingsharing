/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    RECLIP ONBOARDING FLOW — FULL SPEC                       ║
 * ║          For recreating in SwiftUI / UIKit (iOS native) or any platform     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * This document is a complete, exhaustive specification derived from the working
 * React/Tailwind prototype. A developer (or Claude) can use this to recreate
 * the entire experience in native Swift/SwiftUI with pixel-accurate fidelity.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TABLE OF CONTENTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. DESIGN SYSTEM (Colors, Typography, Spacing, Radii)
 *  2. HAPTIC FEEDBACK PATTERNS
 *  3. SHARED UI COMPONENTS
 *  4. SCREEN FLOW OVERVIEW (7 screens)
 *  5. SCREEN 0: TUTORIAL FLOW (3-page carousel)
 *  6. SCREEN 1: INSTANT START (Mic permission + Capture)
 *  7. SCREEN 3: MAGIC MOMENT (Audio playback + Waveform trimmer)
 *  8. SCREEN 4: VIRAL TRIGGER (Share options)
 *  9. SCREEN 5: ONBOARDING (5-step form: Name, Birthday, Phone, OTP, Username)
 * 10. SCREEN 6: FRIEND LOOP (Contact picker)
 * 11. SCREEN 7: DONE
 * 12. ANIMATION REFERENCE (Spring configs, easing curves, timing)
 * 13. CANVAS RENDERING RECIPES (Waveforms, confetti, particles)
 * 14. AUDIO ARCHITECTURE (Web Audio API / AVAudioEngine equivalent)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. DESIGN SYSTEM
// ═══════════════════════════════════��═══════════════════════════════════════

export const DesignSystem = {
  // ── COLORS ──
  colors: {
    background:           "rgba(0, 0, 0, 1.00)",        // Pure black
    foreground:           "rgba(255, 255, 255, 1.00)",   // White text
    primary:              "rgba(218, 252, 121, 1.00)",   // Lime green — main brand
    primaryForeground:    "rgba(0, 0, 0, 1.00)",         // Black text on primary
    accent:               "rgba(0, 200, 255, 1.00)",     // Cyan blue
    accentForeground:     "rgba(255, 255, 255, 1.00)",
    muted:                "rgba(155, 155, 155, 1.00)",   // Gray for disabled/placeholder
    destructive:          "rgba(252, 49, 88, 1.00)",     // Red for errors
    destructiveForeground:"rgba(255, 255, 255, 1.00)",
    popover:              "rgba(51, 51, 51, 0.8)",       // Toast/tooltip bg
    ring:                 "rgba(218, 252, 121, 1.00)",   // Focus ring = primary
    sidebar:              "rgba(48, 48, 48, 1.00)",
  },

  // ── TYPOGRAPHY ──
  // Three font families used throughout:
  fonts: {
    drukCy: {
      // Display / heading font — HEAVY weight, always uppercase
      // SwiftUI equivalent: Custom font "Druk Wide Cy" weight .black (900)
      // If unavailable, use SF Pro Display Expanded Black as fallback
      name: "Druk Wide Cy",
      fallback: "SF Pro Display, system-ui, sans-serif",
      weight: 900, // "heavy"
      usage: "All headings (h1-h4), entry text, onboarding hero text",
    },
    inter: {
      // Body / UI font
      // SwiftUI equivalent: .system(.body) with appropriate weight
      name: "Inter",
      fallback: "SF Pro Text, system-ui, sans-serif",
      weights: { normal: 400, semiBold: 600, bold: 700 },
      usage: "Body text, buttons, labels, questions",
    },
    sfPro: {
      // Caption / system font — matches iOS native feel
      // SwiftUI: .system(.caption)
      name: "-apple-system, BlinkMacSystemFont, SF Pro",
      weights: { normal: 400, semiBold: 600 },
      usage: "Captions, status text, time displays, permission modals",
    },
  },

  // ── FONT SIZES ──
  textSizes: {
    onboard: 104,  // Hero text on tutorial screens (px)
    h1:      64,
    h2:      56,
    entry:   50,   // Text entry fields (name, birthday, phone, username)
    h3:      48,   // Placeholder text size (before typing)
    h4:      36,   // Section headings
    base:    16,   // Body text, buttons
    label:   14,   // Labels, back button
    caption: 13,   // Captions, status text, time displays
  },

  // ── SPACING ──
  spacing: {
    pagePaddingTop:    "clamp(48px, 8vh, 80px)",  // Dynamic based on viewport
    pagePaddingBottom: "clamp(24px, 5vh, 40px)",
    pagePaddingX:      16,   // Mobile default
    pagePaddingXSm:    32,   // 640px+ screens
    pagePaddingXMd:    48,   // 768px+ screens
    pageMaxWidth:      512,  // 32rem = 512px max content width
  },

  // ── BORDER RADII ──
  radii: {
    default: 8,
    button:  99,     // Fully rounded pill buttons
    card:    32,
  },

  // ── ELEVATION ──
  shadows: {
    sm: "0px 3px 6px 0px rgba(0, 0, 0, 0.4)",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. HAPTIC FEEDBACK PATTERNS
// ═══════════════════════════════════════════════════════════════════════════
//
// Maps directly to Apple's UIImpactFeedbackGenerator / UINotificationFeedbackGenerator
// SwiftUI: UIImpactFeedbackGenerator(style: .medium).impactOccurred()

export const HapticPatterns = {
  selection: {
    // Ultra-light tap for picker/toggle changes
    // UIImpactFeedbackGenerator(style: .light) with intensity 0.3
    vibrationMs: 1,
    usage: "Page dot tap, contact toggle, focus field change",
  },
  light: {
    // Light impact for subtle confirmations
    // UIImpactFeedbackGenerator(style: .light)
    vibrationMs: 10,
    usage: "Skip button, back button, light toggle play",
  },
  medium: {
    // Medium impact for button presses
    // UIImpactFeedbackGenerator(style: .medium)
    vibrationMs: 20,
    usage: "Continue button, mic permission, share actions, all primary CTAs",
  },
  heavy: {
    // Heavy impact for significant actions
    // UIImpactFeedbackGenerator(style: .heavy)
    vibrationMs: 40,
    usage: "Clip button tap (recording saved)",
  },
  success: {
    // Double-tap pattern for successful completion
    // UINotificationFeedbackGenerator().notificationOccurred(.success)
    vibrationPattern: [10, 60, 20], // ms
    usage: "Done screen mount, invite sent, download complete",
  },
  warning: {
    // Warning notification pattern
    // UINotificationFeedbackGenerator().notificationOccurred(.warning)
    vibrationPattern: [15, 40, 15],
    usage: "Disabled continue button tap, max friends reached",
  },
  error: {
    // Error notification pattern
    // UINotificationFeedbackGenerator().notificationOccurred(.error)
    vibrationPattern: [20, 40, 20, 40, 20],
    usage: "Validation errors",
  },
  rigid: {
    // Sharp precise tap for drag snaps
    // UIImpactFeedbackGenerator(style: .rigid)
    vibrationMs: 5,
    usage: "Trim handle drag snap",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const SharedComponents = {

  // ── RECLIP LOGO ──
  // Persistent at top-center of all screens, 32px max height
  // SVG wordmark with fill = foreground (white)
  // Aspect ratio locked: 335.835 × 123.82 (≈ 2.71:1)
  // maxWidth: 60% of screen
  // Positioned: top 12px, centered, pointer-events none, z-index 40
  ReclipLogo: {
    maxHeight: 32,
    aspectRatio: 335.835 / 123.82,
    fill: "foreground",
    position: { top: 12, zIndex: 40, centerX: true },
  },

  // ── TOAST ──
  // Slides down from top, auto-dismisses after 2500ms
  Toast: {
    position: "fixed top-12 center-x",
    background: "popover (rgba(51,51,51,0.8))",
    backdropBlur: 20,
    borderRadius: "radius-button (99px)",
    padding: "12px 20px",
    animation: {
      enter: { y: -60, opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: -60, opacity: 0 },
      duration: 0.3,
      ease: "easeOut",
    },
    content: {
      icon: "checkmark in 20px primary circle",
      text: { font: "sfPro", size: "caption", color: "foreground" },
    },
    autoDismiss: 2500, // ms
  },

  // ── CONTINUE BUTTON (used in tutorial + onboarding) ──
  ContinueButton: {
    width: "100%",
    height: "auto (py-4 px-6)",
    borderRadius: "radius-button (99px)",
    font: { family: "inter", weight: "bold", size: "base" },
    icon: "ChevronRight (20px) right side",

    // ── Enabled state ──
    enabled: {
      backgroundColor: "primary",
      color: "primary-foreground (black)",
      borderColor: "transparent",
    },

    // ── Disabled state ──
    disabled: {
      backgroundColor: "transparent",
      color: "rgba(155, 155, 155, 0.5)",
      borderColor: "rgba(155, 155, 155, 0.2)",
    },

    // ── Transition between states ──
    stateTransition: {
      duration: 0.5,
      curve: "cubic-bezier(0.4, 0, 0.2, 1)",
      properties: ["backgroundColor", "color", "borderColor"],
    },

    // ── Fill animation (tutorial-style) ──
    // Some buttons start as outline and fill to solid after 3s
    fillAnimation: {
      initialState: "outline with primary border at 0.35 alpha",
      filledState: "solid primary background",
      delay: 3000, // ms
      transitionDuration: 0.6,
      curve: "cubic-bezier(0.4, 0, 0.2, 1)",
    },

    // ── Keyboard-aware bottom padding ──
    keyboardAware: {
      defaultPaddingBottom: 32, // px when keyboard is closed
      keyboardOpenPadding: "max(keyboardHeight - 40, 8)", // px when open
      animationDuration: 0.25,
      curve: "cubic-bezier(0.4, 0, 0.2, 1)",
      // Uses window.visualViewport API to detect keyboard height
      // SwiftUI: Use .keyboardAdaptive() or observe keyboard notifications
    },

    // ── Enter animation ──
    enterAnimation: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      delay: 0.5,
      duration: 0.4,
    },

    // ── Press animation ──
    tapScale: 0.96,
    haptic: "medium (enabled) / warning (disabled)",
  },

  // ── BLINKING CURSOR ──
  // Shown next to active text entry field
  BlinkingCursor: {
    width: 2,
    height: "1.1em", // relative to parent font
    color: "accent (cyan)",
    marginLeft: 4,
    animation: {
      opacity: [1, 0],
      duration: 0.8,
      repeat: "infinity",
      repeatType: "reverse",
    },
  },

  // ── ERROR PILL ──
  ErrorPill: {
    layout: "horizontal, centered, icon + text",
    icon: "AlertCircle 13px, destructive color",
    text: { font: "sfPro", size: "caption", color: "destructive" },
    background: "rgba(252, 49, 88, 0.12)",
    border: "1px solid rgba(252, 49, 88, 0.25)",
    borderRadius: "radius-button (99px)",
    padding: "6px 12px",
    enterAnimation: {
      initial: { opacity: 0, y: -8, scale: 0.9 },
      animate: { opacity: 1, y: 0, scale: 1 },
      spring: { stiffness: 400, damping: 25 },
    },
  },

  // ── BACK BUTTON ──
  BackButton: {
    position: "absolute left-0 top-0",
    content: "ChevronLeft (20px) + 'Back' text",
    color: "muted",
    font: { family: "inter", weight: "normal", size: "label" },
    tapScale: 0.9,
    haptic: "light",
    enterAnimation: { initial: { opacity: 0, x: -10 }, delay: 0.15, duration: 0.3 },
  },

  // ── PROGRESS DOTS ──
  ProgressDots: {
    count: "dynamic (3 for tutorial, 5 for onboarding)",
    activeWidth: 28,
    inactiveWidth: 8,
    height: 8,
    borderRadius: "fully rounded",
    activeColor: "primary",
    inactiveColor: "rgba(155, 155, 155, 0.3)",
    gap: 10,
    transitionDuration: 0.3,
    ease: "easeOut",
    tappable: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. SCREEN FLOW OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════
//
// Screen transitions: AnimatePresence mode="wait"
//   enter:  { opacity: 0, x: 60, scale: 0.97 }
//   center: { opacity: 1, x: 0, scale: 1 }
//   exit:   { opacity: 0, x: -60, scale: 0.97 }
//   duration: 0.3s, ease: cubic-bezier(0.4, 0, 0.2, 1)
//
// SwiftUI equivalent: .transition(.asymmetric(insertion: ..., removal: ...))
//   with .offset(x:) + .opacity + .scaleEffect

export const ScreenFlow = [
  "tutorial",    // 3-page swipeable carousel
  "start",       // Screen1: Mic permission → Live capture → Clip button
  "magic",       // Screen3: Audio playback with waveform trimmer
  "viral",       // Screen4: Share options (Messages, Copy Link, Download)
  "onboarding",  // Screen5: 5-step form (Name, Birthday, Phone, OTP, Username)
  "friends",     // Screen6: Contact picker (select 3 best friends)
  "done",        // Screen7: Completion screen with "Replay" button
] as const;

// Data passed between screens:
// start → magic:  { audioBlob: Blob | null, captions: CaptionSegment[], durationSec: number }
// magic → viral:  (audioBlob passed through)
// viral → onboarding: (nothing passed)
// onboarding → friends: (nothing passed)

// ═══════════════════════════════════════════════════════════════════════════
// 5. SCREEN 0: TUTORIAL FLOW (3-page carousel)
// ═══════════════════════════════════════════════════════════════════════════

export const TutorialScreen = {
  // Full-screen swipeable carousel with 3 pages
  // Swipe gesture: 50px threshold triggers page change
  // Each page has: caption (top) → illustration (center) → title (bottom-center)

  pages: [
    {
      caption: { text: "Always listening", color: "accent", font: "sfPro caption uppercase 0.08em tracking" },
      illustration: "WaveformPeopleIllustration",
      title: "Always have the receipts \u{1F9FE}",
    },
    {
      caption: { text: "Just tap [clip-icon]", containsInlineIcon: true },
      illustration: "ClipButtonBurstIllustration",
      title: "Tap [clip-icon] To Save The Past",
    },
    {
      caption: { text: "Moments with friends" },
      illustration: "ShareMomentIllustration",
      title: "\u{1F389} Share your clips with friends",
    },
  ],

  // ── Skip button ──
  skipButton: {
    position: "absolute top-4 right-4 (sm: top-6 right-6)",
    text: "Skip",
    font: { family: "inter", weight: "semiBold", size: "label" },
    color: "muted",
    fadeIn: { delay: 0.5 },
    haptic: "light",
    action: "skip to Screen1",
  },

  // ── Page slide animation ──
  slideAnimation: {
    enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
    duration: 0.35,
    ease: [0.4, 0, 0.2, 1],
  },

  // ── Continue button ──
  // Uses fill animation: outline → filled after 3s (resets per page)
  // Last page label: "Get Started", others: "Continue"
  continueButton: {
    fillDelay: 3000,
    lastPageLabel: "Get Started",
    otherLabel: "Continue",
  },

  // ── Navigation dots ──
  dots: { count: 3, tappable: true },
};

// ── TUTORIAL ILLUSTRATION 1: WaveformPeopleIllustration ──
export const WaveformPeopleIllustration = {
  // Canvas-based animation with 60px bleed system
  // 4 avatar positions connected by dashed lines
  // Horizontal waveform bars + expanding ring pulses
  // Avatar photos loaded from Unsplash URLs

  canvas: {
    width: "min(parentWidth, 520)",
    height: "min(width * 0.85, 440)",
    bleed: 60, // Extra canvas area for overflow animations
  },

  avatars: {
    count: 6, // 6 loaded, 4 displayed at a time
    size: { default: 24, center: 30 }, // scale factor applied
    positions: [
      { x: "18%", y: "35% - 32px" },  // top-left
      { x: "50%", y: "48% - 32px" },  // top-center
      { x: "82%", y: "35% - 32px" },  // top-right
      { x: "50%", y: "76%" },          // bottom-center
    ],
    border: { color: "rgba(218, 252, 121, 0.7)", width: 2 },
    glow: "radial gradient, primary green at 0.12 alpha",
    bobAnimation: "sin(t * 1.5 + i * 2.1) * 4px vertical",
    ringPulse: {
      speed: "t * 2 + i * 1.1",
      extraRadius: 12,
      alpha: "(1 - phase) * 0.3",
    },
  },

  // Cycling system: each of 4 positions cycles through avatars + captions
  cycling: {
    intervals: [5200, 4800, 5500, 5000], // ms per position
    captionPool: [
      "Clip that \u{1F525}", "You just got reclipped \u{1F480}", "Yoo!! clip that \u{1F602}",
      "Reclip that rn \u{1F923}", "Bro clip it \u{1FAE0}", "That needs a reclip \u{1F440}",
      "no way he said that\u2026", "wait go back\u2026", "bro listen to this\u2026",
      "she was like what\u2026", "yo replay that\u2026", "say that again\u2026",
      "hold on what \u{1F633}", "that was crazy\u2026", "I'm screaming \u{1F602}",
      "not him saying that\u2026", "send that to me\u2026", "play it back \u{1F501}",
    ],
    // Each position avoids using same avatar/caption as others
    crossfade: {
      fadeIn: "0-8% of cycle",
      fadeOut: "92-100% of cycle",
      bubbleStyle: {
        bg: "rgba(30, 30, 30, 0.92)",
        border: "rgba(218, 252, 121, 0.35)",
        textColor: "rgba(218, 252, 121, 0.95)",
        font: "sfPro 600 11.5px",
        borderRadius: 10,
        floatOffset: "sin(t * 1.2 + i * 1.5) * 3px",
      },
    },
  },

  waveformBars: {
    count: 64,
    orientation: "horizontal",
    yCenter: "50% of canvas height",
    animation: "3-frequency sine wave synthesis",
    colors: "hue 70-110, saturation 80%, lightness 65%, alpha 0.15-0.45",
  },

  connectingLines: {
    style: "dashed [3, 5]",
    color: "rgba(155, 155, 155, alpha)",
    alpha: "0.06 + sin(t * 1.5 + i) * 0.03",
    path: "quadratic bezier curves between adjacent positions",
  },

  expandingRings: {
    count: 3,
    speed: 0.4,
    maxRadius: 120,
    color: "primary green at (1-phase) * 0.1 alpha",
  },
};

// ── TUTORIAL ILLUSTRATION 2: ClipButtonBurstIllustration ──
export const ClipButtonBurstIllustration = {
  // Circular waveform with center button that auto-taps
  // Auto-triggers tap after 800ms, then loops every TOTAL_ANIM seconds

  canvas: { width: "min(parent, 520)", height: "min(w*0.85, 440)", bleed: 60 },

  autoTapDelay: 800, // ms after mount

  phases: {
    press: { duration: 0.6, buttonSquish: "1 - sin(progress * PI) * 0.18" },
    celebrate: { duration: 2.5, buttonPulse: "sin(elapsed * 6) * 0.05" },
    windDown: { duration: 1.5, easing: "smoothstep" },
  },

  // Total cycle: 0.6 + 2.5 + 1.5 = 4.6s, then auto-repeats

  centerButton: {
    radius: 44, // * scale
    gradient: "radial from rgba(218,252,121,1) to rgba(180,220,80,1)",
    icon: "Rotate-back (Clip) icon — 7 SVG paths",
    checkmark: "shown during celebrate phase, drawn with 3.5px black strokes",
    label: { text: "Last 2 min saved!", font: "sfPro 700 14px", color: "primary", position: "below button + 16px" },
  },

  confetti: {
    count: 30,
    properties: "random angle, speed 0.5-2.0, size 4-10, hue 0-360, rotation",
    physics: "linear spread + gravity (t^2 * 20)",
    fade: "1 - elapsed / 4.2",
  },

  // Waveform rings + radiating bars — same as Screen1 capture waveform
  circularWaveform: "See Screen1 circular waveform spec",
};

// ── TUTORIAL ILLUSTRATION 3: ShareMomentIllustration ──
export const ShareMomentIllustration = {
  // Center: audio-reactive circular waveform (48 radiating bars)
  // 6 friend avatars orbiting in an ellipse
  // Clip icons travel between friends along bezier curves
  // HTML emoji overlays above each avatar (not canvas-drawn for iOS compat)

  canvas: { width: "min(parent, 520)", height: "min(w*0.85, 440)", bleed: 60 },

  orbit: {
    radius: 105, // * scale
    ellipseYFactor: 0.6, // squashed vertically
    speed: 10, // degrees per second clockwise
    baseAngles: [-90, -30, 30, 90, 150, 210],
    avatarRadius: 22, // * scale
  },

  centerWaveform: {
    bars: 48,
    innerRadius: 30, // * scale
    maxBarLength: 35, // * scale
    // Multi-frequency synthesis per bar:
    // 3 sine/cosine waves with random seeds per bar
    // envelope modulation for natural volume swells
    colorShift: "primary green → accent blue based on intensity",
    outerContour: "72-segment wavy ring at innerR + maxBarLen * 0.6",
    innerGlow: "radial gradient primary green at 0.08 alpha",
  },

  travelingClips: {
    count: 10,
    cycleDuration: 13, // seconds
    transferDuration: 1.0, // seconds per transfer
    path: "quadratic bezier with perpendicular offset + center pull",
    trail: "6 dots decreasing in size and alpha",
    icon: "Clip SVG icon in 18px circle with green glow",
    easing: "ease-in-out quadratic",
  },

  emojiOverlays: {
    // Important: use native text rendering (UILabel/Text), NOT canvas drawText
    // Canvas emoji rendering is broken on iOS Safari
    pool: ["\u{1F602}", "\u{1F525}", "\u2764\uFE0F", "\u{1F62E}", "\u{1F480}", "\u{1F923}", "\u{1F62D}", "\u{1FAE0}", "\u{1F4AF}", "\u{1F440}", "\u{1F92F}", "\u{1F624}", "\u{1F979}", "\u2728", "\u{1F49C}"],
    size: "22px * scale * popScale",
    popScale: "1.6 on receive, decays to 1.0 at 0.03/frame",
    floatOffset: "sin(t * 2 + i * 1.3) * 3px",
    position: "above avatar by avatarR + 14px",
  },

  connectionLines: {
    style: "dashed [3, 5]",
    from: "center to each friend",
    alpha: "0.08 + sin(t * 1.5 + i) * 0.04",
  },

  pulseRings: {
    count: 2,
    from: "center",
    color: "accent (cyan) at (1-phase) * 0.06 alpha",
    speed: 0.35,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. SCREEN 1: INSTANT START
// ═══════════════════════════════════════════════════════════════════════════

export const Screen1InstantStart = {
  // Phases: idle → transitioning → capture → celebrating
  // Idle: shows text + CTA button at bottom, waveform fills center
  // Transitioning: waveform animates to center (900ms)
  // Capture: header changes, clip button appears in waveform center
  // Celebrating: confetti + checkmark overlay (2.8s)

  layout: {
    padding: "page-pt, page-pb, page-px",
    background: "background (black)",
    overflow: "visible", // for bleed system
  },

  // ── IDLE PHASE ──
  idlePhase: {
    heading: {
      text: "Clip it before you miss it!",
      font: "drukCy, heavy, h3, uppercase",
      color: "foreground",
    },
    subtext: [
      "Save up to 2 mins of audio.",
      "The jokes, The cap, The receipts. Clipped \u{1F3A4}\u2728",
    ],
    subtextFont: { family: "inter", weight: "normal", size: "base", color: "muted", lineHeight: 1.6 },

    // Animated emojis:
    micEmoji: {
      animation: "rotate [-12, 12, -8, 0] + scale [1, 1.15, 1.15, 1.1, 1]",
      duration: 1.8,
      repeatDelay: 2.5,
    },
    sparkleEmoji: {
      animation: "opacity [0.4, 1, 0.4] + scale [0.9, 1.2, 0.9] + y [0, -3, 0]",
      duration: 1.4,
      repeatDelay: 1.8,
    },

    // CTA button
    micButton: {
      text: "Turn on your mic",
      icon: { left: "Mic (22px) with rotate animation", right: "ChevronRight (20px)" },
      fillAnimation: "outline → filled after 3000ms",
      haptic: "medium",
      action: "requestMic → start singleton audio system + rolling recorder + speech recognition",
    },
  },

  // ── MIC PERMISSION FLOW ──
  micPermission: {
    // Uses navigator.mediaDevices.getUserMedia({ audio: true })
    // SwiftUI: AVAudioSession.sharedInstance().requestRecordPermission
    onGranted: {
      startAudioReactive: true,  // singleton mic → AnalyserNode
      startRecorder: true,       // rolling 2-minute buffer
      startSpeechRecognition: true, // Web Speech API → live captions
      headerCopy: "goAhead",
    },
    onDenied: {
      // Graceful fallback — simulated mode
      mockCaptions: [
        { time: 1.2, text: "Hey what's up" },
        { time: 3.5, text: "Bro did you hear what she said" },
        { time: 6.1, text: "No way that actually happened" },
        { time: 9.0, text: "Clip that right now" },
      ],
      headerCopy: "simulated",
    },
  },

  // ── CAPTURE PHASE ──
  capturePhase: {
    headers: {
      learn: { text: "Learn how to clip", color: "foreground", font: "drukCy h4 uppercase" },
      goAhead: {
        text: "Say something, anything!",
        color: "accent (cyan)",
        indicator: {
          dot: { color: "destructive", animation: "opacity [1, 0.3, 1] 1.5s infinite" },
          text: "Listening...",
          textStyle: { font: "sfPro", size: "caption", color: "muted" },
        },
      },
      simulated: {
        text: "Say something, anything!",
        color: "primary",
        indicator: { text: "Mic off — simulated audio" },
      },
    },
    headerTiming: "show 'learn' first → switch to goAhead/simulated after 1800ms",

    // ── Clip Button (center of waveform) ──
    clipButton: {
      size: 88,
      borderRadius: "radius-button (99px)",
      backgroundColor: "primary",
      icon: "ClipIcon (rotate-back) 36px, primary-foreground color",
      boxShadow: "0 0 40px rgba(218, 252, 121, 0.35)",
      enterAnimation: {
        initial: { opacity: 0, scale: 0 },
        animate: { opacity: 1, scale: 1 },
        spring: { stiffness: 260, damping: 22 },
        delay: 0.2,
      },
      tapAnimation: { scale: 0.82 },
      hoverAnimation: { scale: 1.06 },
      haptic: "heavy",

      // Surrounding glow ring
      glowRing: {
        size: 120,
        background: "radial-gradient primary at 0.18 alpha",
        animation: "scale [1, 1.2, 1] + opacity [0.4, 0.75, 0.4], 2s infinite",
      },
      // Hint ring
      hintRing: {
        size: 96,
        border: "2px solid rgba(218, 252, 121, 0.15)",
        animation: "scale [1, 1.15, 1] + opacity [0.15, 0.35, 0.15], 1.8s infinite",
      },
    },

    // ── Bottom hint text ──
    hintText: {
      content: ["Tap", "[clip-icon]", "Above To", "Clip"],
      clipIconColor: "primary",
      textColor: "muted (first parts) / primary (last word)",
      font: "drukCy, heavy, caption, uppercase",
    },
  },

  // ── CIRCULAR WAVEFORM VISUALIZER ──
  circularWaveform: {
    canvas: { width: "min(parent, 520)", height: "min(w*0.85, 440)", bleed: 60 },

    ambientGlow: {
      gradient: "radial from center",
      color: "primary green",
      idleAlpha: 0.08,
      activeAlpha: "0.08 + avgLevel * 0.15",
    },

    waveformRings: {
      count: 6,
      innerRadius: 48, // * scale
      outerRadius: 160, // * scale
      speed: "0.4 + avgLevel * 0.4",
      distortion: {
        frequencies: [4, 7], // angular multipliers
        speeds: [4, 6], // time multipliers
        amplitudes: [3, 1.5], // * scale
        // Multiply by waveAmp (from 3-freq synthesis)
        reactivity: "0.4 + avgLevel * 1.2 (active) / 0.4 (idle)",
      },
      alpha: "(1 - phase) * (0.18 + avgLevel * 0.25) * max(waveAmp, 0.3)",
      lineWidth: "(2 + max(waveAmp, 0) * 0.5) * scale",
      segments: 64,
    },

    radiatingBars: {
      count: 48,
      innerRadius: 50, // * scale
      maxLength: 35, // * scale

      // Two modes:
      activeMode: {
        // When mic is live: read from AnalyserNode frequency data
        binMapping: "floor((i / 48) * freqData.length * 0.6)",
        barLength: "max(3 * s, amplitude * maxLen * 1.5 + 2 * s)",
      },
      idleMode: {
        // Multi-frequency synthesis with random seeds per bar
        // 3 waves: freq1 (1.5-5.5), freq2 (3-9), freq3 (0.5-2.5)
        // envelope modulation: 0.5 + 0.5 * sin(t * 0.8 + i * 0.12)
        intensityMultiplier: 0.7, // idle = calmer
      },

      // Color per bar (intensity-based)
      color: {
        r: "218 * (1 - intensity * 0.5)",
        g: "252 * (1 - intensity * 0.3) + 200 * intensity * 0.3",
        b: "121 * (1 - intensity * 0.6) + 255 * intensity * 0.6",
        alpha: "active ? 0.4 + intensity * 0.5 : 0.2 + intensity * 0.3",
      },
      lineWidth: 2.5, // * scale
      lineCap: "round",
    },

    outerContour: {
      segments: 72,
      distortion: "2-freq sine from waveSeeds",
      baseRadius: "innerR + maxBarLen * 0.6",
      color: "primary green at 0.12 (active) / 0.06 (idle) alpha",
      lineWidth: 1.5,
    },

    innerGlowCore: {
      gradient: "radial from innerR * 0.3 to innerR",
      color: "primary green at 0.1 (active) / 0.04 (idle) alpha",
    },
  },

  // ── CELEBRATE OVERLAY ──
  celebrateOverlay: {
    duration: 2.8, // seconds
    burstGlow: "radial gradient, primary green, 0.25 → 0.08 → 0 alpha",
    expandingRings: { count: 3, stagger: 0.15, speed: 120, fadeDistance: 1.5 },
    checkmark: {
      circleRadius: 44, // * scale
      circleGradient: "primary green to dark green",
      strokeColor: "rgba(0, 0, 0, 0.9)",
      strokeWidth: 3.5, // * scale
      points: [[-12, -1], [-3, 9], [14, -8]], // relative to center * scale
      scaleIn: "min(elapsed / 0.3, 1)",
    },
    savedLabel: {
      text: "{duration} of {maxDuration} saved!",
      font: "sfPro 700 14px",
      color: "primary green",
      position: "center + 52px * scale below",
      fadeIn: { delay: 0.4, duration: 0.3 },
    },
    confetti: {
      count: 50,
      hues: [70, 80, 170, 190, 350],
      saturation: "70-100%",
      size: "3-9px",
      speed: "0.8-2.6",
      rotationSpeed: "random -4 to 4",
      stagger: "0-0.15s",
      physics: "radial outward + gravity (t^2 * 20 * 0.3)",
      fade: "1 - elapsed / 3",
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. SCREEN 3: MAGIC MOMENT (Audio Playback + Waveform Trimmer)
// ═══════════════════════════════════════════════════════════════════════════

export const Screen3MagicMoment = {
  // Full-screen audio player with:
  // - Decoded waveform visualization (120 bars)
  // - Draggable trim handles (left/right)
  // - Audio-reactive waveform (70% live frequency + 30% static decoded)
  // - Prominent playhead with glow, 2px line, diamond indicators
  // - Live speech-to-text captions overlay
  // - Auto-plays on mount (via audio unlock system)

  layout: {
    padding: "page-pt, page-pb, page-px",
    maxWidth: "page-max-w",
  },

  // Receives: audioBlob, captions[], from Screen1

  waveformPlayer: {
    barCount: 120,
    barStyle: {
      width: "calculated from container",
      gap: "calculated proportionally",
      cornerRadius: "barWidth / 2",
    },

    // ── Waveform decoding ──
    decoding: {
      // Decode audioBlob → AudioBuffer → extract channel 0
      // Divide into 120 segments, compute RMS amplitude per segment
      // Normalize to 0-1 range with 0.05 floor
      // Fallback: random values if decode fails
    },

    // ── Audio-reactive rendering ──
    rendering: {
      // For each bar:
      playedBars: {
        // Blend: 30% static decoded + 70% live frequency data
        liveFrequencyMapping: "floor((i / numBars) * freqData.length * 0.8)",
        smoothing: "liveLevel * 0.7 + previousLevel * 0.3",
        heightFormula: "max(staticBar * h * 0.15, blended * h * 0.85)",
        color: "primary green, alpha: 0.7 + liveLevel * 0.3",
      },
      unplayedBars: {
        height: "staticBar * h * 0.7",
        color: "rgba(155, 155, 155, 0.35)",
      },
    },

    // ── Playhead ──
    playhead: {
      line: { width: 2, color: "primary green", alpha: "playing ? 0.9 : 0.6" },
      glow: {
        width: 20, // gradient width
        gradient: "horizontal, primary green 0 → 0.15 → 0 alpha",
      },
      diamonds: {
        size: "playing ? 4 : 3",
        color: "primary green, alpha: playing ? 1 : 0.7",
        positions: ["top of waveform", "bottom of waveform"],
        shape: "rotated square (4 points)",
      },
    },

    // ── Trim handles ──
    trimHandles: {
      width: 16,
      height: "100%",
      color: "primary",
      borderRadius: "left: radius 0 0 radius, right: 0 radius radius 0",
      grabIndicator: "0.5px wide, 16px tall rounded bar, primary-foreground at 0.6 alpha",
      touchArea: 20, // extra touch padding
      cursor: "ew-resize",
      haptic: "rigid on drag",
    },

    // ── Audio routing for visualization ──
    audioRouting: {
      // HTMLAudioElement → MediaElementAudioSourceNode → AnalyserNode → destination
      // AnalyserNode: fftSize 256, smoothingTimeConstant 0.75
      // On iOS: must use audio unlock system first
      // Auto-play: start at 2s mark, loop between trim points
    },
  },

  // ── Captions overlay ──
  captions: {
    // Display captured CaptionSegment[] synced to audio playback time
    // Each caption fades in when currentTime >= segment.time
    font: { family: "inter", weight: "normal", size: "base", color: "foreground" },
    layout: "scrolling container below waveform",
  },

  // ── Controls ──
  controls: {
    playPause: {
      size: 44,
      borderRadius: "full circle",
      backgroundColor: "primary",
      iconColor: "primary-foreground",
      icons: { play: "Play 18px (ml-0.5 offset)", pause: "Pause 18px" },
      tapScale: 0.9,
      haptic: "light",
    },
    timeDisplay: {
      format: "m:ss.t (minutes:seconds.tenths)",
      font: "sfPro, caption, normal, muted color",
      layout: "left = current, right = total",
    },
    trimButton: { icon: "Scissors", position: "above waveform" },
  },

  // ── Share CTA ──
  shareCTA: {
    text: "Share this moment",
    icon: "ChevronRight",
    style: "same as ContinueButton",
    haptic: "medium",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 8. SCREEN 4: VIRAL TRIGGER (Share Options)
// ═══════════════════════════════════════════════════════════════════════════

export const Screen4ViralTrigger = {
  layout: { padding: "page-pt, page-pb, page-px" },

  headline: {
    text: "Share Your Clip with Friends",
    font: "drukCy, heavy, h4, uppercase",
    color: "foreground",
    maxWidth: "75%",
    enterAnimation: { y: -20, opacity: 0 → 0, duration: 0.4 },
  },

  // ── Celebration entrance ──
  celebrationEntrance: {
    duration: 1.8,
    canvas: { width: 320, height: 140, bleed: 60 },
    burstGlow: "primary green radial, 0.2 intensity",
    expandingRings: { count: 3, stagger: 0.1, speed: 100 },
    confetti: { count: 35, speed: "0.6-2.0", size: "2-7" },
    fadeOut: 0.4,
    fallbackTimeout: 2200, // auto-complete if canvas fails
  },

  // ── Compact waveform player ──
  compactWaveform: {
    height: 80,
    barCount: 80,
    enterAnimation: { opacity: 0, y: 40, scale: 0.92, duration: 0.6 },
    // Same rendering as Screen3 waveform but compact
    // Same playhead with glow + diamonds
    // Play/pause button below with time display
  },

  // ── Share options ──
  shareOptions: [
    {
      emoji: "\u{1F4AC}",
      label: "Send via Messages",
      sublabel: "Text it to your group chat",
      borderColor: "accent (cyan)",
      textColor: "accent",
      action: "navigator.share with WAV file, fallback to sms: link",
    },
    {
      emoji: "\u{1F517}",
      label: "Copy Link",
      sublabel: "Paste it anywhere",
      borderColor: "primary",
      textColor: "primary",
      action: "clipboard.writeText, toast 'Link copied!'",
    },
    {
      emoji: "\u2B07\uFE0F",
      label: "Save to Device",
      sublabel: "Keep it forever",
      borderColor: "muted",
      textColor: "foreground",
      action: "download WAV file, toast 'Clip downloaded!'",
    },
  ],

  shareOptionStyle: {
    borderRadius: "radius-button (99px)",
    background: "transparent",
    border: "1.5px solid {borderColor}",
    padding: "16px 20px",
    layout: "emoji (28px) | label column | ChevronRight",
    labelFont: { family: "inter", weight: "bold", size: "base" },
    sublabelFont: { family: "sfPro", weight: "normal", size: "caption", color: "muted" },
    enterAnimation: {
      initial: { x: -40, opacity: 0 },
      stagger: 0.12,
      spring: { stiffness: 260, damping: 22 },
    },
    emojiAnimation: {
      y: [0, -3, 0],
      delay: "0.6 + i * 0.15",
      duration: 0.5,
      repeat: 2,
      repeatDelay: 4,
    },
    tapScale: 0.97,
    hoverScale: 1.02,
    haptic: "medium",
  },

  // ── Converting indicator ──
  convertingIndicator: {
    icon: "Loader2 14px rotating, primary color",
    text: "Preparing clip...",
    font: "sfPro, caption, muted",
  },

  // ── Audio conversion ──
  audioConversion: {
    // Converts webm/opus blob → PCM WAV blob
    // Pre-converts in background on mount
    // Manual WAV encoding: RIFF header + interleaved PCM 16-bit samples
    // SwiftUI: use AVAudioConverter or export via AVAssetWriter
  },

  // ── Continue button ──
  continueButton: {
    text: "Join Reclip",
    fillDelay: 3000,
    haptic: "medium",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 9. SCREEN 5: ONBOARDING (5-step form)
// ═══════════════════════════════════════════════════════════════════════════

export const ScreenOnboarding = {
  // 5 steps with progress dots: Name → Birthday → Phone → OTP → Username
  // Each step slides in from right (x: 50 → 0) and exits left (x: 0 → -50)
  // Step transition: 0.35s, ease cubic-bezier(0.4, 0, 0.2, 1)

  layout: {
    padding: "page-pt, page-pb, page-px",
    maxWidth: "page-max-w",
    background: "background",
  },

  progressDots: {
    count: 5,
    position: "top, below logo area",
    style: "same as tutorial dots but 5",
    activeWidth: 28,
    inactiveWidth: 8,
    height: 8,
  },

  // ── STEP 1: NAME ──
  nameStep: {
    question: {
      text: "What's your name?",
      font: "inter, semiBold, base, foreground",
    },
    fields: [
      {
        name: "firstName",
        placeholder: "First name",
        autoCapitalize: "words",
        autoComplete: "given-name",
      },
      {
        name: "lastName",
        placeholder: "Last name",
        autoCapitalize: "words",
        autoComplete: "family-name",
      },
    ],

    // ── Text display pattern (used by ALL text entry steps) ──
    textDisplay: {
      // Hidden native input (opacity: 0, w: 0, h: 0) for keyboard
      // Overlay div shows styled text + blinking cursor
      filledStyle: {
        font: "drukCy, heavy",
        size: "entry (50px)",
        color: "foreground",
        uppercase: true,
        opacity: 1,
      },
      placeholderStyle: {
        font: "drukCy, heavy",
        size: "h3 (48px)", // slightly smaller
        color: "muted",
        uppercase: true,
        opacity: 0.35,
      },
      fontSizeTransition: "0.3s",
      colorTransition: "0.3s",
      cursor: "BlinkingCursor, shown on focused field only",
    },

    validation: "firstName.trim().length >= 1 && lastName.trim().length >= 1",
    enterKeyBehavior: "first field → focus last field, last field → continue",
    autoFocus: { field: "firstName", delay: 400 },
  },

  // ── STEP 2: BIRTHDAY ──
  birthdayStep: {
    question: {
      text: "Hi {firstName}, when's your birthday?",
      font: "inter, semiBold, base, foreground",
    },

    // ── Input format: MM/DD/YYYY ──
    inputType: "tel (numeric keyboard)",
    inputMode: "numeric",
    maxDigits: 8,
    displayOrder: "MM / DD / YYYY",
    digitSlicing: {
      mm: "digits[0:2]",
      dd: "digits[2:4]",
      yyyy: "digits[4:8]",
    },
    segments: [
      { value: "mm", placeholder: "MM" },
      { value: "dd", placeholder: "DD" },
      { value: "yyyy", placeholder: "YYYY" },
    ],
    gap: 20, // px between segments

    // ── Cursor position ──
    cursorSegment: "digits.length < 2 ? 0 : digits.length < 4 ? 1 : digits.length < 8 ? 2 : -1",

    // ── Validation ──
    validation: {
      month: "1-12",
      day: "1-{daysInMonth}",
      notFuture: true,
      minAge: 13,
      maxAge: 120,
      errorMessages: {
        invalidMonth: "Invalid month",
        invalidDay: "Invalid day",
        tooFewDays: "{month}/{year} only has {daysInMonth} days",
        future: "Birthday can't be in the future",
        tooYoung: "You must be at least 13 to use Reclip",
        tooOld: "Please enter a valid birth year",
      },
    },

    // ── Age display ──
    ageDisplay: {
      text: "{age} years old",
      font: "sfPro, caption, muted",
      showWhen: "valid birthday entered",
      enterAnimation: { opacity: 0, y: 8, delay: 0.2 },
    },

    // ── Error styling ──
    errorStyle: {
      textColor: "destructive (only when attempted or complete)",
      pill: "ErrorPill component",
    },

    hasBackButton: true,
  },

  // ── STEP 3: PHONE ──
  phoneStep: {
    question: {
      text: "What's your phone number?",
      font: "inter, semiBold, base, foreground",
    },

    // ── Country code picker ──
    countryCodePicker: {
      default: "+1",
      options: [
        { code: "+1",  flag: "\u{1F1FA}\u{1F1F8}", label: "US" },
        { code: "+44", flag: "\u{1F1EC}\u{1F1E7}", label: "UK" },
        { code: "+91", flag: "\u{1F1EE}\u{1F1F3}", label: "IN" },
        { code: "+61", flag: "\u{1F1E6}\u{1F1FA}", label: "AU" },
        { code: "+81", flag: "\u{1F1EF}\u{1F1F5}", label: "JP" },
        { code: "+49", flag: "\u{1F1E9}\u{1F1EA}", label: "DE" },
        { code: "+33", flag: "\u{1F1EB}\u{1F1F7}", label: "FR" },
        { code: "+55", flag: "\u{1F1E7}\u{1F1F7}", label: "BR" },
        { code: "+82", flag: "\u{1F1F0}\u{1F1F7}", label: "KR" },
        { code: "+52", flag: "\u{1F1F2}\u{1F1FD}", label: "MX" },
      ],
      style: {
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(155, 155, 155, 0.1)",
        borderRadius: "radius-button",
        font: "inter, semiBold, base",
      },
      dropdownStyle: {
        background: "rgba(30, 30, 30, 0.97)",
        backdropBlur: 20,
        borderRadius: 16,
        maxHeight: 240,
        itemPadding: "12px 16px",
        selectedIndicator: "Check icon, primary color",
      },
    },

    // ── Phone number formatting ──
    formatting: {
      // US format: (000) 000 0000
      // Raw digits only, max 10
      displayFormat: "(XXX) XXX XXXX",
      maxDigits: 10,
      // Display uses 3 segments with separators
    },

    // ── Phone display ──
    display: {
      // Country code shown to left (drukCy, h4 size, accent color)
      // Phone number shown to right (drukCy, entry size)
      // Placeholder: (000) 000 0000 in muted at 0.35 opacity
    },

    validation: {
      minLengthsByCountry: {
        "+1": 10, "+44": 10, "+91": 10, "+61": 9, "+81": 10,
        "+49": 10, "+33": 9, "+55": 10, "+82": 9, "+52": 10,
      },
      maxLength: 15,
    },

    disclaimer: {
      text: "We'll send you a verification code",
      font: "sfPro, caption, muted",
    },

    hasBackButton: true,
  },

  // ── STEP 4: OTP VERIFICATION ──
  otpStep: {
    question: {
      text: "Enter the code we sent to {formattedPhone}",
      font: "inter, semiBold, base, foreground",
    },

    // ── OTP input ──
    otpInput: {
      length: 6,
      inputMode: "numeric",
      autoComplete: "one-time-code",
      // Each digit displayed in a box
      boxStyle: {
        width: 44,
        height: 56,
        borderRadius: "radius (8px)",
        background: "rgba(255, 255, 255, 0.04)",
        border: {
          empty: "1px solid rgba(155, 155, 155, 0.15)",
          active: "1.5px solid accent (cyan)",
          filled: "1px solid rgba(155, 155, 155, 0.25)",
          error: "1px solid destructive",
        },
        font: "drukCy, heavy, h4 (36px), foreground",
        gap: 8,
        activeAnimation: {
          scale: 1.05,
          spring: { stiffness: 300, damping: 20 },
        },
      },
    },

    // ── Auto-verify ──
    autoVerify: {
      // Simulated: auto-verifies after 1200ms once all 6 digits entered
      delay: 1200,
      loadingIndicator: {
        icon: "Loader2 16px rotating, accent color",
        text: "Verifying...",
      },
    },

    // ── Resend ──
    resend: {
      cooldownSeconds: 30,
      text: "Resend code",
      countdownText: "Resend in {seconds}s",
      font: "inter, semiBold, label, accent color",
      disabledColor: "muted",
      haptic: "light on resend, success on sent toast",
    },

    hasBackButton: true,
  },

  // ── STEP 5: USERNAME ──
  usernameStep: {
    question: {
      text: "Choose a username",
      font: "inter, semiBold, base, foreground",
    },

    // Username starts empty, user types their own
    // No auto-suggestion from name

    display: {
      prefix: "@",
      prefixStyle: "drukCy, heavy, h4, accent color",
      usernameStyle: {
        filled: "drukCy, heavy, entry (50px), foreground",
        placeholder: "drukCy, heavy, h3 (48px), muted at 0.35 opacity",
      },
      placeholderText: "Your username",
      cursor: "BlinkingCursor",
    },

    // ── Validation rules ──
    validation: {
      minLength: 3,
      maxLength: 20,
      allowedCharacters: "lowercase letters, numbers, underscores, periods",
      regex: "/^[a-z0-9_.]+$/",
      rules: [
        "No spaces",
        "No consecutive underscores/periods",
        "Cannot start/end with underscore/period",
        "Minimum 3 characters",
      ],
      errorMessages: {
        tooShort: "Username must be at least 3 characters",
        invalidChars: "Only lowercase letters, numbers, _ and . allowed",
        consecutive: "No consecutive special characters",
        startEnd: "Can't start or end with _ or .",
        taken: "Username is already taken",
      },
    },

    // ── Availability check ──
    availabilityCheck: {
      debounceMs: 600,
      // Simulated: "admin", "reclip", "test", "user" are taken
      takenNames: ["admin", "reclip", "test", "user"],
      indicators: {
        checking: {
          icon: "Loader2 14px rotating, accent color",
          text: "Checking...",
          font: "sfPro, caption, muted",
        },
        available: {
          icon: "Check 14px in primary circle",
          text: "@{username} is available",
          font: "sfPro, caption, primary",
        },
        taken: {
          icon: "AlertCircle 14px, destructive",
          text: "Username is already taken",
          font: "sfPro, caption, destructive",
        },
      },
    },

    // ── Helper text ──
    helperText: {
      text: "This is how your friends will find you",
      font: "sfPro, caption, muted",
      position: "below username display",
    },

    hasBackButton: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 10. SCREEN 6: FRIEND LOOP (Contact Picker)
// ═══════════════════════════════════════════════════════════════════════════

export const Screen5FriendLoop = {
  layout: { padding: "page-pt, page-pb, page-px", maxWidth: "page-max-w" },

  header: {
    title: { text: "Add your people", font: "drukCy, heavy, h4, uppercase, foreground" },
    subtitle: {
      text: "Choose up to 3 best friends to share clips with",
      font: "inter, normal, base, muted",
    },
  },

  maxBestFriends: 3,

  // ── Contacts permission modal ──
  permissionModal: {
    showDelay: 800, // ms after mount
    style: "iOS native permission dialog",
    backdrop: { color: "rgba(0, 0, 0, 0.6)", blur: 8 },
    modal: {
      width: 280,
      background: "rgba(44, 44, 46, 0.97)",
      borderRadius: 14,
      backdropBlur: 40,
      icon: {
        size: 56,
        borderRadius: 14,
        gradient: "135deg from primary to accent",
        innerIcon: "Users 26px, primary-foreground",
      },
      title: "\"Reclip\" Would Like to Access Your Contacts",
      titleFont: "sfPro, semiBold, 17px, foreground",
      body: "This lets you find friends who are already on Reclip and send clips directly to them.",
      bodyFont: "sfPro, normal, 13px, rgba(235, 235, 245, 0.6)",
      buttons: {
        deny: { text: "Don't Allow", color: "rgba(10, 132, 255, 1)", weight: "normal" },
        allow: { text: "OK", color: "rgba(10, 132, 255, 1)", weight: "semiBold" },
        separator: "0.5px solid rgba(84, 84, 88, 0.65)",
      },
    },
    animation: {
      initial: { scale: 0.85, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      spring: { stiffness: 400, damping: 28 },
    },
    // Both Allow and Deny show contacts (prototype behavior)
  },

  // ── Selected friends counter ──
  selectedCounter: {
    avatarSlots: {
      count: 3,
      size: 44,
      borderRadius: "full",
      overlap: -8, // negative spacing
      emptyStyle: {
        border: "2px dashed rgba(155, 155, 155, 0.3)",
        background: "rgba(255, 255, 255, 0.04)",
        icon: "UserPlus 16px, muted at 0.3 opacity",
      },
      filledStyle: {
        border: "2px solid primary",
        image: "contact photo with scale spring animation",
        spring: { stiffness: 400, damping: 20 },
      },
    },
    counter: {
      text: "{selected}/{max}",
      font: "sfPro, semiBold, caption",
      color: "primary when full, muted otherwise",
    },
  },

  // ── Search bar ──
  searchBar: {
    icon: "Search 16px, muted, left side",
    placeholder: "Search contacts",
    font: "inter, normal, label",
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(155, 155, 155, 0.1)",
    borderRadius: "radius-button",
    clearButton: "X 14px, muted, shown when query exists",
    enterAnimation: { opacity: 0, y: 10, delay: 0.1, duration: 0.3 },
  },

  // ── Contact list ──
  contactList: {
    scrollable: true,
    fadeEdges: "linear-gradient mask (transparent → black → transparent)",
    sections: [
      {
        label: "Friends on Reclip",
        labelStyle: "sfPro, semiBold, 12px, primary, uppercase, 0.06em tracking",
      },
      {
        label: "Invite to Reclip",
        labelStyle: "sfPro, semiBold, 12px, muted, uppercase, 0.06em tracking",
      },
    ],
  },

  // ── Contact row ──
  contactRow: {
    layout: "avatar (48px) | name column | status badge",
    padding: "12px 16px",
    borderRadius: "radius (8px)",
    background: {
      selected: "rgba(218, 252, 121, 0.08)",
      unselected: "rgba(255, 255, 255, 0.03)",
    },
    border: {
      selected: "1px solid rgba(218, 252, 121, 0.25)",
      unselected: "1px solid rgba(155, 155, 155, 0.08)",
    },
    avatar: {
      size: 48,
      border: { selected: "2px solid primary", unselected: "2px solid transparent" },
      checkOverlay: {
        size: 20,
        position: "bottom-right, offset -2px",
        background: "primary",
        icon: "Check 11px, strokeWidth 3, primary-foreground",
        animation: { type: "spring", stiffness: 500, damping: 25 },
      },
    },
    name: { font: "inter, semiBold, base, foreground" },
    handle: { font: "sfPro, normal, caption, muted" },
    statusBadge: {
      onReclip: {
        text: "On Reclip",
        background: "rgba(218, 252, 121, 0.12)",
        color: "primary",
        font: "sfPro, semiBold, 11px, 0.02em tracking",
      },
      invite: {
        text: "Invite",
        icon: "UserPlus 10px",
        background: "rgba(255, 255, 255, 0.06)",
        color: "muted",
        font: "sfPro, normal, 11px",
      },
    },
    enterAnimation: { x: 20, opacity: 0, stagger: 0.06 },
    tapScale: 0.97,
    haptic: "selection",
    disabledOpacity: 0.4, // when full and not selected
  },

  // ── Mock contacts ──
  contacts: [
    { name: "Ava Martinez",   handle: "@ava.m",  onReclip: true },
    { name: "Jordan Lee",     handle: "@jlee",   onReclip: true },
    { name: "Destiny Brown",  handle: "@des.b",  onReclip: true },
    { name: "Kai Nguyen",     handle: "@kai.n",  onReclip: true },
    { name: "Sophie Chen",    handle: "@soph",   onReclip: true },
    { name: "Marcus Taylor",                      onReclip: false },
    { name: "Ella Rivera",                         onReclip: false },
    { name: "Noah Kim",                            onReclip: false },
  ],

  // ── Bottom buttons ──
  inviteButton: {
    text: "Continue",
    fillWhen: "3 friends selected",
    fillDelay: 400,
    haptic: "medium",
  },
  skipButton: {
    text: "Skip for now",
    style: "ghost (no background, muted text)",
    haptic: "light",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 11. SCREEN 7: DONE
// ═══════════════════════════════════════════════════════════════════════════

export const DoneScreen = {
  layout: { padding: "page-pt, page-pb, page-px", maxWidth: "page-max-w" },

  heroEmoji: {
    emoji: "\u{1F389}",
    size: 44,
    container: {
      size: 96,
      borderRadius: "full",
      background: "primary",
      boxShadow: "0 0 80px rgba(218, 252, 121, 0.3)",
    },
    enterAnimation: {
      initial: { scale: 0.5, opacity: 0 },
      spring: { stiffness: 200, damping: 15 },
    },
  },

  title: {
    text: "You're in.",
    font: "drukCy, heavy, h3, uppercase, foreground",
    enterAnimation: { y: 20, opacity: 0, delay: 0.2 },
  },

  subtitle: {
    text: "Start catching moments.",
    font: "inter, normal, base, muted",
    enterAnimation: { opacity: 0, delay: 0.4 },
  },

  replayButton: {
    text: "Replay",
    style: {
      background: "rgba(255, 255, 255, 0.08)",
      border: "1px solid rgba(155, 155, 155, 0.15)",
      borderRadius: "radius-button",
      color: "foreground",
      font: "inter, bold, base",
    },
    enterAnimation: { y: 20, opacity: 0, delay: 0.6 },
    haptic: "medium",
  },

  onMountHaptic: { type: "success", delay: 300 },
};

// ═══════════════════════════════════════════════════════════════════════════
// 12. ANIMATION REFERENCE
// ═══════════════════════════════════════════════════════════════════════════

export const AnimationReference = {
  // ── Spring configurations ──
  springs: {
    buttonPress: { stiffness: 400, damping: 15 },    // Quick, bouncy
    cardEntrance: { stiffness: 260, damping: 22 },    // Smooth entrance
    modalEntrance: { stiffness: 400, damping: 28 },   // Snappy modal
    checkmark: { stiffness: 500, damping: 25 },       // Precise check
    avatarPop: { stiffness: 400, damping: 20 },       // Avatar slot fill
    general: { stiffness: 200, damping: 15 },         // Default spring
  },

  // ── Easing curves ──
  easings: {
    standard: [0.4, 0, 0.2, 1],    // Material Design standard
    // SwiftUI: .easeInOut or custom UnitCurve
  },

  // ── Common durations ──
  durations: {
    screenTransition: 0.3,
    stepTransition: 0.35,
    buttonFill: 0.5,
    elementEntrance: 0.4,
    fadeInOut: 0.3,
    stateChange: 0.25,
  },

  // ── Common delays ──
  delays: {
    autoFocus: 400,       // ms, input focus after step transition
    headerChange: 1800,   // ms, capture phase header swap
    buttonFill: 3000,     // ms, outline → filled CTA
    celebrateDuration: 2800, // ms, celebrate overlay total
    otpVerify: 1200,      // ms, simulated OTP verification
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 13. CANVAS RENDERING RECIPES
// ═══════════════════════════════════════════════════════════════════════════

export const CanvasRecipes = {
  // ── 60px Bleed System ──
  bleedSystem: {
    // All canvas elements use extra 60px on each side
    // This prevents clipping when animations extend beyond logical bounds
    setup: `
      const BLEED = 60;
      const fullW = logicalWidth + BLEED * 2;
      const fullH = logicalHeight + BLEED * 2;
      canvas.width = fullW * dpr;
      canvas.height = fullH * dpr;
      canvas.style.width = fullW + 'px';
      canvas.style.height = fullH + 'px';
      canvas.style.margin = -BLEED + 'px';
      ctx.scale(dpr, dpr);
      ctx.translate(BLEED, BLEED);
      // clearRect must use: ctx.clearRect(-BLEED, -BLEED, fullW, fullH);
    `,
    // SwiftUI equivalent: extend Canvas frame by 60px each side,
    // offset by -60, and use .clipped(false)
  },

  // ── Responsive sizing ──
  responsiveSizing: {
    width: "min(parentWidth, 520)",
    height: "min(width * 0.85, 440)",
    scaleFactor: "width / 320", // all sizes multiplied by this
    observe: "ResizeObserver on parent element",
  },

  // ── Multi-frequency wave synthesis ──
  waveSynthesis: {
    // Per-bar random seeds (generated once on mount):
    seedStructure: {
      freq1: "1.5 + random() * 4",    // slow wave
      freq2: "3 + random() * 6",       // medium wave
      freq3: "0.5 + random() * 2",     // very slow wave
      phase1: "random() * 2PI",
      phase2: "random() * 2PI",
      phase3: "random() * 2PI",
      amp1: "0.3 + random() * 0.7",
      amp2: "0.15 + random() * 0.35",
      amp3: "0.05 + random() * 0.2",
    },
    formula: `
      const v1 = sin(time * seed.freq1 + seed.phase1 + i * 0.3) * seed.amp1;
      const v2 = sin(time * seed.freq2 + seed.phase2 + i * 0.7) * seed.amp2;
      const v3 = cos(time * seed.freq3 + seed.phase3 + i * 0.15) * seed.amp3;
      const envelope = 0.5 + 0.5 * sin(time * 0.8 + i * 0.12);
      const amplitude = abs(v1 + v2 + v3) * envelope;
    `,
  },

  // ── Circular avatar drawing ──
  circleImage: {
    // ctx.save → clip circle → drawImage (cover-fit) → restore → stroke border
    coverFit: `
      const imgMin = min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - imgMin) / 2;
      const sy = (img.naturalHeight - imgMin) / 2;
      ctx.drawImage(img, sx, sy, imgMin, imgMin, x-r, y-r, r*2, r*2);
    `,
  },

  // ── Confetti system ──
  confettiSystem: {
    // Pre-generate particles on mount (immutable random properties)
    // Per frame: compute position from elapsed time
    // Physics: radial outward + downward gravity
    // Shape: small rectangles, rotated
    particleUpdate: `
      const pt = max(0, elapsed - particle.delay);
      const dist = pt * particle.speed * 90 * scale;
      const gravity = pt * pt * 20 * scale;
      const x = centerX + cos(particle.angle) * dist;
      const y = centerY + sin(particle.angle) * dist + gravity * 0.3;
      const alpha = max(0, (1 - pt / fadeTime) * intensity);
      // Rotate by pt * particle.rotSpeed
    `,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 14. AUDIO ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════

export const AudioArchitecture = {
  // ── Singleton Mic System ──
  // Only ONE mic stream shared across all components
  singletonMic: {
    // Web: navigator.mediaDevices.getUserMedia({ audio: true })
    // iOS: AVAudioSession.sharedInstance().setCategory(.playAndRecord)
    //      AVAudioEngine with input node
    stream: "shared MediaStream",
    audioContext: "shared AudioContext",
    analyserNode: {
      fftSize: 256,
      smoothingTimeConstant: 0.7,
      // Provides: getByteFrequencyData(Uint8Array)
    },
    refCounting: "listenerCount — cleanup when reaches 0",
  },

  // ── Rolling Buffer Recorder ──
  rollingRecorder: {
    // Records in 1-second chunks, keeps last 2 minutes
    bufferDuration: 120, // seconds (2 minutes)
    chunkInterval: 1000, // ms
    mimeType: "audio/webm;codecs=opus (preferred) → audio/webm → audio/mp4",
    // Pruning: on each chunk, remove chunks older than bufferDuration
    // iOS equivalent: AVAudioRecorder with circular buffer, or
    //   AVAudioEngine tap on input node writing to ring buffer
    getBlob: "concatenate all chunks into single Blob",
  },

  // ── Speech Recognition (Live Captions) ──
  speechRecognition: {
    // Web: SpeechRecognition / webkitSpeechRecognition
    // iOS: SFSpeechRecognizer with SFSpeechAudioBufferRecognitionRequest
    config: {
      continuous: true,
      interimResults: false,
      lang: "en-US",
      maxAlternatives: 1,
    },
    // Auto-restart on end if still recording
    // Timestamp each caption relative to recording start
    captionFormat: { time: "seconds from start", text: "string" },
  },

  // ── Audio Unlock System ──
  audioUnlock: {
    // Browsers block audio.play() unless triggered by user gesture
    // Solution: listen for first click/touch/keydown, then:
    //   1. Create + resume AudioContext
    //   2. Play silent buffer (1 sample at 22050Hz)
    //   3. Prime any pending HTMLAudioElements with muted play→pause
    // iOS equivalent: not needed in native — AVAudioSession handles this
    events: ["click", "touchstart", "touchend", "keydown"],
    oneShot: true,
  },

  // ── Playback Audio Routing ──
  playbackRouting: {
    // For waveform visualization during playback:
    // HTMLAudioElement → createMediaElementSource → AnalyserNode → destination
    // AnalyserNode: fftSize 256, smoothingTimeConstant 0.75
    // Read frequency data per animation frame
    // iOS equivalent: AVAudioPlayerNode → install tap → FFT analysis
  },

  // ── WAV Conversion ──
  wavConversion: {
    // Converts browser-recorded blob (webm/opus) → PCM WAV
    // Steps: decodeAudioData → extract channel data → write RIFF/WAV header
    // Output: 16-bit PCM, original sample rate, interleaved channels
    // iOS equivalent: use AVAudioConverter or AVAssetExportSession
    headerSize: 44,
    format: "PCM 16-bit little-endian",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 15. CLIP ICON (SVG Paths)
// ═══════════════════════════════════════════════════════════════════════════
//
// The "Reclip" / rotate-back icon is a custom SVG used throughout.
// ViewBox: 0 0 73.9189 81.448
// Stroke-only (no fill), strokeWidth: 4, strokeLinecap: round, strokeLinejoin: round
//
// 7 path segments representing a circular arrow (rewind icon):
// Path data must be extracted from the Figma SVG import at:
//   /src/imports/svg-zclrwjs4v7
//
// The icon appears in: tutorial illustrations, capture screen hint text,
//   clip button, celebrate overlay (both canvas-drawn and inline SVG versions)

// ═══════════════════════════════════════════════════════════════════════════
// 16. iOS SWIFT IMPLEMENTATION NOTES
// ═══════════════════════════════════════════════════════════════════════════

export const SwiftImplementationNotes = {
  // ── Architecture ──
  architecture: {
    pattern: "MVVM with ObservableObject ViewModels",
    navigation: "NavigationStack or custom transition coordinator",
    stateManagement: "@Published properties, @State, @Binding",
  },

  // ── Animations ──
  animations: {
    springMapping: {
      // motion/react springs → SwiftUI springs
      // { stiffness: 260, damping: 22 } → .spring(response: 0.5, dampingFraction: 0.7)
      // Approximate formula:
      // response = 2 * PI / sqrt(stiffness)
      // dampingFraction = damping / (2 * sqrt(stiffness))
    },
    canvasRendering: {
      // Use SwiftUI Canvas view or SpriteKit SKScene
      // For complex animations (waveforms, confetti): Metal shaders or CADisplayLink + CoreGraphics
      // TimelineView(.animation) for continuous 60fps updates
    },
    transitions: {
      // AnimatePresence mode="wait" → .transition(.asymmetric(...)) with matchedGeometryEffect
      // Use withAnimation(.easeInOut(duration: 0.35)) for step transitions
    },
  },

  // ── Fonts ──
  fonts: {
    drukCy: "Must be bundled as custom font in Xcode project",
    inter: "Bundle or use .system(.body) as close match",
    sfPro: "Use .system() — it IS SF Pro on iOS",
  },

  // ── Haptics ──
  haptics: {
    impact: "UIImpactFeedbackGenerator(style: .light/.medium/.heavy/.rigid)",
    notification: "UINotificationFeedbackGenerator().notificationOccurred(.success/.warning/.error)",
    selection: "UISelectionFeedbackGenerator().selectionChanged()",
  },

  // ── Audio ──
  audio: {
    recording: "AVAudioEngine with installTap(onBus:bufferSize:format:block:)",
    playback: "AVAudioPlayerNode connected to AVAudioEngine",
    analysis: "vDSP FFT or Accelerate framework for frequency analysis",
    speechRecognition: "SFSpeechRecognizer + SFSpeechAudioBufferRecognitionRequest",
    permissions: "Info.plist: NSMicrophoneUsageDescription, NSSpeechRecognitionUsageDescription",
  },

  // ── Keyboard handling ──
  keyboard: {
    // Use NotificationCenter observers for UIResponder.keyboardWillShowNotification
    // Or use .onReceive(keyboardPublisher) in SwiftUI
    // Animate button padding with keyboard height
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * END OF SPEC
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This spec covers the COMPLETE Reclip onboarding flow:
 *
 * - 7 screens with precise transitions
 * - 3 canvas-based animated illustrations
 * - 5-step registration form with inline validation
 * - Real-time audio capture, visualization, and playback
 * - Speech-to-text live captions
 * - iOS-native haptic patterns
 * - Full design system with 3 font families, 12 color tokens
 * - Sharing with WAV conversion
 * - Contact picker with iOS-style permission modal
 *
 * To implement in SwiftUI:
 * 1. Set up the design system as a Theme struct with Color/Font extensions
 * 2. Build each screen as a separate View with its ViewModel
 * 3. Use Canvas or SpriteKit for the animated illustrations
 * 4. Use AVAudioEngine for audio capture/analysis
 * 5. Implement NavigationStack with custom transitions
 * 6. Add UIFeedbackGenerator calls at every haptic trigger point
 */
