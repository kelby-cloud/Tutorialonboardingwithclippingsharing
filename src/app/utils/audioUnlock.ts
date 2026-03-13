/**
 * Audio Unlock Utility
 * 
 * Browsers block audio.play() unless it happens within a user gesture.
 * This utility "unlocks" audio playback on the FIRST user interaction
 * (click/touch/keydown) anywhere in the app. Once unlocked, subsequent
 * audio.play() calls succeed without needing a direct user gesture.
 * 
 * Usage: call `initAudioUnlock()` once at app startup.
 * Then use `getUnlockedAudioContext()` for Web Audio API work, and
 * `unlockAudioElement(audio)` to prime any HTMLAudioElement for autoplay.
 */

let _ctx: AudioContext | null = null;
let _unlocked = false;
const _pendingElements: HTMLAudioElement[] = [];

function doUnlock() {
  if (_unlocked) return;
  _unlocked = true;

  // Create and resume a shared AudioContext
  if (!_ctx) {
    _ctx = new AudioContext();
  }
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }

  // Play a silent buffer to fully unlock audio on iOS Safari
  try {
    const buffer = _ctx.createBuffer(1, 1, 22050);
    const source = _ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(_ctx.destination);
    source.start(0);
  } catch {
    // Ignore errors
  }

  // Unlock any pending audio elements by playing + pausing them
  for (const el of _pendingElements) {
    try {
      el.muted = true;
      const p = el.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          el.pause();
          el.muted = false;
          el.currentTime = 0;
        }).catch(() => {
          el.muted = false;
        });
      }
    } catch {
      // Ignore
    }
  }
  _pendingElements.length = 0;

  // Remove listeners — only need to unlock once
  removeListeners();
}

const events = ["click", "touchstart", "touchend", "keydown"] as const;

function addListeners() {
  for (const e of events) {
    document.addEventListener(e, doUnlock, { capture: true, once: false, passive: true });
  }
}

function removeListeners() {
  for (const e of events) {
    document.removeEventListener(e, doUnlock, { capture: true });
  }
}

/** Call once at app startup to begin listening for unlock gestures */
export function initAudioUnlock() {
  if (_unlocked) return;
  addListeners();
}

/** Returns true if audio has been unlocked by a user gesture */
export function isAudioUnlocked() {
  return _unlocked;
}

/**
 * Get the shared, unlocked AudioContext.
 * If not yet unlocked, creates one anyway (it may be suspended until user gesture).
 */
export function getUnlockedAudioContext(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext();
  }
  return _ctx;
}

/**
 * Register an HTMLAudioElement to be "primed" on next user gesture.
 * If audio is already unlocked, primes it immediately.
 */
export function unlockAudioElement(audio: HTMLAudioElement) {
  if (_unlocked) {
    // Already unlocked — prime immediately with silent play
    try {
      const wasMuted = audio.muted;
      audio.muted = true;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          audio.pause();
          audio.muted = wasMuted;
          audio.currentTime = 0;
        }).catch(() => {
          audio.muted = wasMuted;
        });
      }
    } catch {
      // Ignore
    }
  } else {
    _pendingElements.push(audio);
  }
}
