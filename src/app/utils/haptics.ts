/**
 * Haptic Feedback Utility
 *
 * Provides iOS-style haptic patterns using the Vibration API (Android/supported browsers)
 * and a silent AudioContext click for iOS Safari fallback.
 *
 * Patterns follow Apple's HIG haptic categories:
 * - selection: Ultra-light tap for picker/toggle changes
 * - light:     Light impact for subtle confirmations
 * - medium:    Medium impact for button presses
 * - heavy:     Heavy impact for significant actions (clip, record)
 * - success:   Notification pattern for successful completion
 * - warning:   Notification pattern for warnings
 * - error:     Notification pattern for errors
 * - rigid:     Sharp, precise tap for UI snaps (trim handles, drag)
 */

type HapticStyle =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "rigid";

// Vibration patterns (ms) — tuned to feel iOS-native
const VIBRATION_PATTERNS: Record<HapticStyle, number | number[]> = {
  selection: 1,
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 60, 20],
  warning: [15, 40, 15],
  error: [20, 40, 20, 40, 20],
  rigid: 5,
};

// AudioContext for iOS fallback — creates an inaudible "click" that
// tricks the Taptic Engine on some iOS versions
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

function playTactileClick(intensity: number = 0.3, durationMs: number = 8) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    // Resume if suspended (required for iOS)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    // Very low frequency — felt more than heard
    oscillator.frequency.setValueAtTime(150, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    // Quick ramp up and down — creates a "click" feel
    gain.gain.linearRampToValueAtTime(
      intensity * 0.01, // Nearly inaudible
      ctx.currentTime + 0.001
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + durationMs / 1000
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + durationMs / 1000 + 0.01);
  } catch {
    // Silently fail — haptics are non-critical
  }
}

// Intensity map for audio fallback
const AUDIO_INTENSITY: Record<HapticStyle, { intensity: number; duration: number }> = {
  selection: { intensity: 0.1, duration: 4 },
  light: { intensity: 0.2, duration: 6 },
  medium: { intensity: 0.3, duration: 10 },
  heavy: { intensity: 0.5, duration: 15 },
  success: { intensity: 0.4, duration: 12 },
  warning: { intensity: 0.35, duration: 10 },
  error: { intensity: 0.45, duration: 12 },
  rigid: { intensity: 0.25, duration: 5 },
};

/**
 * Trigger haptic feedback.
 *
 * Uses navigator.vibrate() where supported (Android Chrome, etc.)
 * Falls back to an inaudible audio pulse for iOS Safari.
 */
export function haptic(style: HapticStyle = "medium") {
  // Try Vibration API first
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      const pattern = VIBRATION_PATTERNS[style];
      navigator.vibrate(pattern);
      return;
    } catch {
      // Fall through to audio fallback
    }
  }

  // Audio fallback — especially useful on iOS
  const config = AUDIO_INTENSITY[style];
  playTactileClick(config.intensity, config.duration);
}

/**
 * Convenience methods — named after Apple's UIImpactFeedbackGenerator styles.
 */
export const Haptics = {
  /** Ultra-light tap for selection changes (pickers, toggles) */
  selection: () => haptic("selection"),

  /** Light tap for subtle UI confirmations */
  light: () => haptic("light"),

  /** Medium tap for button presses */
  medium: () => haptic("medium"),

  /** Heavy tap for significant actions (clip, record) */
  heavy: () => haptic("heavy"),

  /** Double-tap pattern for successful completion */
  success: () => haptic("success"),

  /** Warning notification pattern */
  warning: () => haptic("warning"),

  /** Error notification pattern */
  error: () => haptic("error"),

  /** Sharp precise tap for drag snaps, trim handles */
  rigid: () => haptic("rigid"),
} as const;
