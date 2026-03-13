import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, ChevronRight, Scissors } from "lucide-react";
import type { CaptionSegment } from "./Screen1InstantStart";
import { Haptics } from "../../utils/haptics";
import { unlockAudioElement, isAudioUnlocked, getUnlockedAudioContext } from "../../utils/audioUnlock";

// ─── Helpers ───

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return mins > 0
    ? `${mins}:${secs.toString().padStart(2, "0")}.${ms}`
    : `0:${secs.toString().padStart(2, "0")}.${ms}`;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── TrimHandle component ───

function TrimHandle({
  side,
  onPointerDown,
}: {
  side: "left" | "right";
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute top-0 bottom-0 flex items-center z-10"
      style={{
        cursor: "ew-resize",
        [side]: -10,
        width: 20,
        touchAction: "none",
      }}
    >
      <div
        className="w-4 flex flex-col items-center justify-center gap-0.5"
        style={{
          height: "100%",
          backgroundColor: "var(--primary)",
          borderRadius:
            side === "left" ? "var(--radius) 0 0 var(--radius)" : "0 var(--radius) var(--radius) 0",
        }}
      >
        <div
          className="w-0.5 rounded-full"
          style={{
            height: 16,
            backgroundColor: "var(--primary-foreground)",
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}

// ─── Waveform + Trimmer + Player ───

function WaveformTrimmerPlayer({
  audioBlob,
  onPlayStateChange,
  onTimeUpdate,
  trimStart,
  trimEnd,
  onTrimChange,
  autoPlay = false,
}: {
  audioBlob: Blob | null;
  onPlayStateChange: (playing: boolean) => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  trimStart: number; // 0-1 fraction
  trimEnd: number; // 0-1 fraction
  onTrimChange: (start: number, end: number) => void;
  autoPlay?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const animRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const barsData = useRef<number[]>([]);
  const [dims, setDims] = useState({ w: 360, h: 160 });
  const draggingRef = useRef<"left" | "right" | null>(null);
  const [waveformReady, setWaveformReady] = useState(false);

  // Web Audio API refs for audio-reactive playback waveform
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const liveBarLevels = useRef<number[]>([]);
  const autoPlayRef = useRef(autoPlay);
  const autoPlayTriggeredRef = useRef(false);

  // Keep autoPlay ref in sync with prop
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  // Decode real audio data from blob into static waveform bars
  useEffect(() => {
    if (!audioBlob) {
      // Fallback: generate random bars when no real audio
      if (barsData.current.length === 0) {
        barsData.current = Array.from(
          { length: 120 },
          () => 0.1 + Math.random() * 0.9
        );
        setWaveformReady(true);
      }
      return;
    }

    let cancelled = false;

    const decodeWaveform = async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const offlineCtx = new AudioContext();
        const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
        offlineCtx.close();

        if (cancelled) return;

        // Extract amplitude data from the first channel
        const rawData = audioBuffer.getChannelData(0);
        const numBars = 120;
        const samplesPerBar = Math.floor(rawData.length / numBars);
        const bars: number[] = [];

        for (let i = 0; i < numBars; i++) {
          let sum = 0;
          const start = i * samplesPerBar;
          const end = Math.min(start + samplesPerBar, rawData.length);
          for (let j = start; j < end; j++) {
            sum += Math.abs(rawData[j]);
          }
          bars.push(sum / (end - start));
        }

        // Normalize bars to 0–1 range with a minimum floor
        const maxVal = Math.max(...bars, 0.001);
        for (let i = 0; i < bars.length; i++) {
          bars[i] = Math.max(0.05, bars[i] / maxVal);
        }

        if (!cancelled) {
          barsData.current = bars;
          setWaveformReady(true);
        }
      } catch {
        // Decoding failed — fall back to random waveform
        if (!cancelled && barsData.current.length === 0) {
          barsData.current = Array.from(
            { length: 120 },
            () => 0.1 + Math.random() * 0.9
          );
          setWaveformReady(true);
        }
      }
    };

    decodeWaveform();
    return () => { cancelled = true; };
  }, [audioBlob]);

  // Responsive canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const update = () => {
      const w = parent.clientWidth;
      const h = Math.min(parent.clientHeight, 220);
      setDims({ w, h });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // Create audio element from blob and route through AudioContext + AnalyserNode
  useEffect(() => {
    if (!audioBlob) return;
    autoPlayTriggeredRef.current = false;
    const url = URL.createObjectURL(audioBlob);
    audioUrlRef.current = url;
    let disposed = false;

    // Create audio element WITHOUT src first so we can attach listeners before loading
    const audio = new Audio();
    audio.preload = "auto";
    // NOTE: do NOT set crossOrigin on blob URLs — it can block loading in some browsers
    audioRef.current = audio;

    // Prime the audio element using the unlock utility
    // If user has interacted with the app (tutorial, recording, clipping),
    // audio is already unlocked and this will prime the element for autoplay
    unlockAudioElement(audio);

    // Set up Web Audio API routing (deferred — called AFTER first successful play)
    const setupAudioContext = () => {
      if (playbackCtxRef.current) return;
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        playbackCtxRef.current = ctx;
        playbackAnalyserRef.current = analyser;
        playbackSourceRef.current = source;
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);

        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
      } catch {
        // AudioContext setup failed — audio still plays, just no visualizer reactivity
      }
    };

    // Consolidated auto-play trigger — fires once, retries on failure
    const tryAutoPlay = () => {
      if (disposed) return;
      if (autoPlayTriggeredRef.current) return;
      if (!autoPlayRef.current) return;
      const dur = audio.duration;
      if (!dur || !isFinite(dur) || dur <= 0) return;

      autoPlayTriggeredRef.current = true;

      // Start playback at 2s mark (or clip end if shorter)
      const startOffset = Math.min(2, dur * trimEnd);
      audio.currentTime = startOffset;

      // First try to play WITHOUT AudioContext (more likely to succeed with autoplay policy)
      audio.play().then(() => {
        if (disposed) return;
        setIsPlaying(true);
        onPlayStateChange(true);
        // NOW set up AudioContext after play succeeded (more permissive)
        setupAudioContext();
      }).catch(() => {
        if (disposed) return;
        // Autoplay blocked — set up AudioContext anyway for when user manually plays
        setupAudioContext();
        autoPlayTriggeredRef.current = false;
      });
    };

    // Track whether metadata callback fired
    let metadataLoaded = false;

    const onMetadata = () => {
      if (metadataLoaded) return;
      metadataLoaded = true;
      setDuration(audio.duration);
      // Try autoplay immediately — no delay
      tryAutoPlay();
    };

    // Attach ALL event listeners BEFORE setting src (blob URLs can fire events synchronously)
    audio.addEventListener("loadedmetadata", onMetadata);
    audio.addEventListener("canplay", () => tryAutoPlay());
    audio.addEventListener("canplaythrough", () => tryAutoPlay());

    // Also listen to 'playing' to ensure state is synced if autoplay attribute kicks in
    audio.addEventListener("playing", () => {
      if (disposed) return;
      if (!autoPlayTriggeredRef.current) {
        autoPlayTriggeredRef.current = true;
      }
      setIsPlaying(true);
      onPlayStateChange(true);
      setupAudioContext();
    });

    // Handle looping manually
    audio.addEventListener("ended", () => {
      const startSec = trimStart * audio.duration;
      audio.currentTime = startSec;
      audio.play().catch(() => {});
    });

    // Set autoplay attribute BEFORE setting src
    if (autoPlayRef.current) {
      audio.autoplay = true;
    }

    // NOW set the src to start loading — events will be caught by listeners above
    audio.src = url;
    audio.load(); // Explicitly trigger loading

    // Safety nets for timing edge cases
    queueMicrotask(() => {
      if (audio.readyState >= 1) onMetadata();
    });
    // Additional retry after a short delay
    const retryTimer = setTimeout(() => {
      if (!autoPlayTriggeredRef.current && audio.readyState >= 1) {
        onMetadata();
      }
    }, 300);
    // Final retry for slow-loading scenarios
    const finalRetryTimer = setTimeout(() => {
      if (!autoPlayTriggeredRef.current && audio.readyState >= 1) {
        tryAutoPlay();
      }
    }, 800);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearTimeout(finalRetryTimer);
      audio.pause();
      audio.autoplay = false;
      audioRef.current = null;
      URL.revokeObjectURL(url);
      // Clean up AudioContext
      if (playbackSourceRef.current) {
        try { playbackSourceRef.current.disconnect(); } catch { /* ok */ }
        playbackSourceRef.current = null;
      }
      if (playbackAnalyserRef.current) {
        try { playbackAnalyserRef.current.disconnect(); } catch { /* ok */ }
        playbackAnalyserRef.current = null;
      }
      if (playbackCtxRef.current) {
        playbackCtxRef.current.close();
        playbackCtxRef.current = null;
      }
      freqDataRef.current = null;
    };
  }, [audioBlob]); // intentionally not depending on trimStart/autoPlay to avoid recreating element

  // Continuous time tracking + loop enforcement + live frequency capture
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    let raf: number;
    const tick = () => {
      if (!audio || audio.paused) return;
      const dur = audio.duration;
      if (!dur || !isFinite(dur)) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const endSec = trimEnd * dur;
      const startSec = trimStart * dur;

      // Loop: when current time >= trim end, jump back to trim start
      if (audio.currentTime >= endSec) {
        audio.currentTime = startSec;
      }

      const p = audio.currentTime / dur;
      setProgress(p);
      onTimeUpdate(audio.currentTime, dur);

      // Capture live frequency data from the AnalyserNode
      const analyser = playbackAnalyserRef.current;
      const freqData = freqDataRef.current;
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);

        // Map frequency bins to our bar count for audio-reactive visualization
        const numBars = barsData.current.length || 120;
        if (liveBarLevels.current.length !== numBars) {
          liveBarLevels.current = new Array(numBars).fill(0);
        }
        const binCount = freqData.length;
        for (let i = 0; i < numBars; i++) {
          // Map each bar to a range of frequency bins
          const binStart = Math.floor((i / numBars) * binCount * 0.8);
          const binEnd = Math.floor(((i + 1) / numBars) * binCount * 0.8);
          let sum = 0;
          let count = 0;
          for (let b = binStart; b < binEnd && b < binCount; b++) {
            sum += freqData[b];
            count++;
          }
          const level = count > 0 ? sum / count / 255 : 0;
          // Smooth the transition (keep some of the previous frame)
          liveBarLevels.current[i] = liveBarLevels.current[i] * 0.3 + level * 0.7;
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, trimStart, trimEnd, onTimeUpdate]);

  // Simulated playback loop if no blob
  useEffect(() => {
    if (!isPlaying || audioBlob) return;
    const simDuration = 8; // seconds
    const startFrac = trimStart;
    const endFrac = trimEnd;
    let current = startFrac;

    const tick = () => {
      current += 1 / 60 / simDuration;
      if (current >= endFrac) current = startFrac;
      setProgress(current);
      onTimeUpdate(current * simDuration, simDuration);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, audioBlob, trimStart, trimEnd, onTimeUpdate]);

  // Auto-play for simulated (no-blob) mode — start after short delay
  useEffect(() => {
    if (audioBlob || !autoPlayRef.current) return;
    const t = setTimeout(() => {
      setIsPlaying(true);
      onPlayStateChange(true);
      // Set initial progress to ~2s of 8s simulated duration = 0.25
      setProgress(0.25);
    }, 400);
    return () => clearTimeout(t);
  }, [audioBlob, onPlayStateChange]);

  const doPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      setIsPlaying(true);
      onPlayStateChange(true);
      return;
    }

    // Set up AudioContext on first manual play if not yet set up
    if (!playbackCtxRef.current) {
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        playbackCtxRef.current = ctx;
        playbackAnalyserRef.current = analyser;
        playbackSourceRef.current = source;
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch { /* ok */ }
    }

    // Resume AudioContext if suspended
    if (playbackCtxRef.current?.state === "suspended") {
      playbackCtxRef.current.resume();
    }

    const dur = audio.duration;
    if (dur && isFinite(dur)) {
      const startSec = trimStart * dur;
      const endSec = trimEnd * dur;
      if (audio.currentTime < startSec || audio.currentTime >= endSec) {
        // On first play, start at 2s mark; on subsequent plays, start at trim start
        const offset = Math.min(2, dur * trimEnd);
        audio.currentTime = audio.currentTime === 0 ? offset : startSec;
      }
    }

    audio.play().catch(() => {});
    setIsPlaying(true);
    onPlayStateChange(true);
  }, [trimStart, trimEnd, onPlayStateChange]);

  const togglePlay = useCallback(() => {
    Haptics.light();
    const audio = audioRef.current;
    if (!audio) {
      if (isPlaying) {
        setIsPlaying(false);
        onPlayStateChange(false);
      } else {
        doPlay();
      }
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayStateChange(false);
    } else {
      doPlay();
    }
  }, [isPlaying, doPlay, onPlayStateChange]);

  // Draw waveform — audio-reactive during playback, static when paused
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = dims.w;
    const h = dims.h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const bars = barsData.current;
      if (bars.length === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const barWidth = Math.max(2, (w / bars.length) * 0.55);
      const gap = Math.max(1, (w / bars.length) * 0.45);
      const totalBars = bars.length;
      const currentProgress = progress;
      const live = liveBarLevels.current;
      const hasLiveData = isPlaying && live.length === totalBars;

      for (let i = 0; i < totalBars; i++) {
        const x = i * (barWidth + gap);
        if (x > w) break;

        const frac = i / totalBars;
        const inTrimRange = frac >= trimStart && frac <= trimEnd;
        const isPlayed = frac <= currentProgress && inTrimRange;

        // Compute bar height: blend static waveform shape with live audio level
        let barH: number;
        if (hasLiveData && inTrimRange && isPlayed) {
          // Audio-reactive: use live frequency data modulated by static shape
          const liveLevel = live[i] || 0;
          // Blend: static shape provides min structure, live data adds reactivity
          const blended = bars[i] * 0.3 + liveLevel * 0.7;
          barH = Math.max(bars[i] * h * 0.15, blended * h * 0.85);
        } else {
          // Static waveform
          barH = bars[i] * h * 0.7;
        }

        const y = (h - barH) / 2;

        if (isPlayed) {
          // Primary color for played portion within trim — brighter when audio-reactive
          const alpha = hasLiveData ? 0.7 + (live[i] || 0) * 0.3 : 0.9;
          ctx.fillStyle = `rgba(218, 252, 121, ${alpha})`;
        } else if (inTrimRange) {
          ctx.fillStyle = "rgba(155, 155, 155, 0.4)";
        } else {
          ctx.fillStyle = "rgba(155, 155, 155, 0.12)";
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, barWidth / 2);
        ctx.fill();
      }

      // Playhead — always visible so users can track position
      const showPlayhead = currentProgress >= trimStart && currentProgress <= trimEnd;
      // When not yet started or progress is 0, show at trim start
      const playheadFrac = currentProgress > 0 ? currentProgress : trimStart;
      const headX = playheadFrac * w;

      if (showPlayhead || currentProgress === 0) {
        // Playhead glow (wider, softer)
        const glowGrad = ctx.createLinearGradient(headX - 12, 0, headX + 12, 0);
        glowGrad.addColorStop(0, "rgba(218, 252, 121, 0)");
        glowGrad.addColorStop(0.5, `rgba(218, 252, 121, ${isPlaying ? 0.15 : 0.08})`);
        glowGrad.addColorStop(1, "rgba(218, 252, 121, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(headX - 12, 0, 24, h);

        // Playhead line — solid, visible
        ctx.strokeStyle = `rgba(218, 252, 121, ${isPlaying ? 0.9 : 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headX, 2);
        ctx.lineTo(headX, h - 2);
        ctx.stroke();

        // Top diamond indicator
        const dSize = isPlaying ? 5 : 4;
        ctx.fillStyle = `rgba(218, 252, 121, ${isPlaying ? 1 : 0.7})`;
        ctx.beginPath();
        ctx.moveTo(headX, 0);
        ctx.lineTo(headX + dSize, dSize);
        ctx.lineTo(headX, dSize * 2);
        ctx.lineTo(headX - dSize, dSize);
        ctx.closePath();
        ctx.fill();

        // Bottom diamond indicator
        ctx.beginPath();
        ctx.moveTo(headX, h);
        ctx.lineTo(headX + dSize, h - dSize);
        ctx.lineTo(headX, h - dSize * 2);
        ctx.lineTo(headX - dSize, h - dSize);
        ctx.closePath();
        ctx.fill();

        // Center dot
        ctx.fillStyle = `rgba(218, 252, 121, ${isPlaying ? 1 : 0.8})`;
        ctx.beginPath();
        ctx.arc(headX, h / 2, isPlaying ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Continue animation loop during playback for smooth audio-reactive updates
      if (isPlaying) {
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progress, isPlaying, dims, trimStart, trimEnd, waveformReady]);

  // ─── Trim handle dragging ───

  const getPointerFrac = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  };

  const handleTrimPointerDown = useCallback(
    (side: "left" | "right") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = side;
      Haptics.rigid();

      const onMove = (ev: PointerEvent) => {
        const frac = getPointerFrac(ev.clientX);
        if (draggingRef.current === "left") {
          const newStart = clamp(frac, 0, trimEnd - 0.02);
          onTrimChange(newStart, trimEnd);
        } else {
          const newEnd = clamp(frac, trimStart + 0.02, 1);
          onTrimChange(trimStart, newEnd);
        }
      };

      const onUp = () => {
        draggingRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [trimStart, trimEnd, onTrimChange]
  );

  const displayDuration = duration > 0 ? duration : 8;
  const trimmedDuration = (trimEnd - trimStart) * displayDuration;
  const currentTimeInTrim =
    progress >= trimStart
      ? (progress - trimStart) * displayDuration
      : 0;

  return (
    <div className="flex flex-col items-center gap-5 w-full h-full justify-center">
      {/* Waveform with trim overlay */}
      <div
        ref={trackRef}
        className="w-full flex-1 flex items-center min-h-0 relative"
        style={{ touchAction: "none" }}
      >
        {/* Trim region overlay */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-[1]"
          style={{
            left: `${trimStart * 100}%`,
            right: `${(1 - trimEnd) * 100}%`,
            border: "1px solid rgba(218, 252, 121, 0.3)",
            borderRadius: "var(--radius)",
            backgroundColor: "rgba(218, 252, 121, 0.03)",
          }}
        />

        {/* Left dim overlay */}
        {trimStart > 0.005 && (
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none z-[1]"
            style={{
              width: `${trimStart * 100}%`,
              backgroundColor: "rgba(0, 0, 0, 0.45)",
            }}
          />
        )}

        {/* Right dim overlay */}
        {trimEnd < 0.995 && (
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none z-[1]"
            style={{
              width: `${(1 - trimEnd) * 100}%`,
              backgroundColor: "rgba(0, 0, 0, 0.45)",
            }}
          />
        )}

        {/* Left trim handle */}
        <div
          className="absolute top-0 bottom-0 z-20"
          style={{ left: `${trimStart * 100}%` }}
        >
          <TrimHandle side="left" onPointerDown={handleTrimPointerDown("left")} />
        </div>

        {/* Right trim handle */}
        <div
          className="absolute top-0 bottom-0 z-20"
          style={{ left: `${trimEnd * 100}%` }}
        >
          <TrimHandle
            side="right"
            onPointerDown={handleTrimPointerDown("right")}
          />
        </div>

        <canvas ref={canvasRef} className="w-full" />
      </div>

      {/* Trim info bar */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <Scissors
            size={13}
            style={{ color: "var(--primary)", opacity: 0.7 }}
          />
          <span
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-normal)",
              color: "var(--muted)",
            }}
          >
            {formatTime(trimStart * displayDuration)}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-sf-pro)",
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--primary)",
          }}
        >
          {formatTime(trimmedDuration)}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-normal)",
              color: "var(--muted)",
            }}
          >
            {formatTime(trimEnd * displayDuration)}
          </span>
          <Scissors
            size={13}
            style={{
              color: "var(--primary)",
              opacity: 0.7,
              transform: "scaleX(-1)",
            }}
          />
        </div>
      </div>

      {/* Time + play/pause */}
      <div className="flex items-center justify-between w-full">
        <span
          style={{
            fontFamily: "var(--font-sf-pro)",
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--muted)",
            minWidth: 48,
          }}
        >
          {formatTime(currentTimeInTrim)}
        </span>

        <motion.button
          onClick={togglePlay}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPlaying ? (
            <Pause size={22} />
          ) : (
            <Play size={22} className="ml-0.5" />
          )}
        </motion.button>

        <span
          style={{
            fontFamily: "var(--font-sf-pro)",
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--muted)",
            minWidth: 48,
            textAlign: "right",
          }}
        >
          {formatTime(trimmedDuration)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Screen ───

interface Screen3Props {
  onShare: () => void;
  audioBlob?: Blob | null;
  captions?: CaptionSegment[];
}

export function Screen3MagicMoment({
  onShare,
  audioBlob = null,
  captions = [],
}: Screen3Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [buttonFilled, setButtonFilled] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(1);
  const fillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sort captions by time
  const sortedCaptions = useMemo(
    () => [...captions].sort((a, b) => a.time - b.time),
    [captions]
  );

  const hasCaptions = sortedCaptions.length > 0;

  // Button fill animation
  useEffect(() => {
    setButtonFilled(false);
    fillTimerRef.current = setTimeout(() => setButtonFilled(true), 3000);
    return () => {
      if (fillTimerRef.current) clearTimeout(fillTimerRef.current);
    };
  }, []);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    setAudioDuration(dur);
  }, []);

  const handleTrimChange = useCallback((start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  }, []);

  // Filter captions to trimmed region
  const trimStartSec = trimStart * audioDuration;
  const trimEndSec = trimEnd * audioDuration;
  const visibleCaptions = sortedCaptions.filter(
    (c) => c.time >= trimStartSec && c.time <= trimEndSec && currentTime >= c.time
  );
  const latestCaption =
    visibleCaptions.length > 0
      ? visibleCaptions[visibleCaptions.length - 1]
      : null;

  const latestCaptionIndex = latestCaption
    ? sortedCaptions.indexOf(latestCaption)
    : -1;

  const currentProgress = audioDuration > 0 ? currentTime / audioDuration : 0;

  return (
    <div
      className="flex flex-col items-center h-full w-full"
      style={{
        backgroundColor: "var(--background)",
        paddingTop: "var(--page-pt)",
        paddingBottom: "var(--page-pb)",
        paddingLeft: "var(--page-px)",
        paddingRight: "var(--page-px)",
      }}
    >
      {/* Title */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full text-center mb-3"
        style={{ maxWidth: "var(--page-max-w)" }}
      >
        <h4
          className="text-[var(--foreground)]"
          style={{
            fontFamily: "var(--font-druk-cy)",
            fontWeight: "var(--font-weight-heavy)",
            fontSize: "var(--text-h4)",
            lineHeight: 1.2,
            textTransform: "uppercase",
          }}
        >
          Your First Reclip!
        </h4>
      </motion.div>

      {/* Caption display — synced to audio playback time */}
      <div
        className="w-full mb-2"
        style={{ maxWidth: "var(--page-max-w)", minHeight: 40 }}
      >
        <AnimatePresence mode="wait">
          {latestCaption && (
            <motion.div
              key={`caption-${latestCaptionIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <span
                className="inline-block px-4 py-1.5"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid rgba(155, 155, 155, 0.1)",
                  fontFamily: "var(--font-inter)",
                  fontWeight: "var(--font-weight-semi-bold)",
                  fontSize: "var(--text-base)",
                  color: "var(--foreground)",
                  maxWidth: "100%",
                }}
              >
                {latestCaption.text}
              </span>
            </motion.div>
          )}

          {!latestCaption &&
            isPlaying &&
            currentProgress > 0.1 &&
            !hasCaptions && (
              <motion.div
                key="no-captions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <span
                  className="inline-block px-4 py-1.5"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "var(--radius-button)",
                    border: "1px solid rgba(155, 155, 155, 0.06)",
                    fontFamily: "var(--font-sf-pro)",
                    fontWeight: "var(--font-weight-normal)",
                    fontSize: "var(--text-caption)",
                    color: "var(--muted)",
                  }}
                >
                  No speech detected in this clip
                </span>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Caption history */}
      {hasCaptions && visibleCaptions.length > 1 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="w-full mb-2 overflow-hidden"
          style={{ maxWidth: "var(--page-max-w)", maxHeight: 52 }}
        >
          <div className="flex flex-wrap justify-center gap-1.5">
            {visibleCaptions.slice(0, -1).map((c, i) => (
              <motion.span
                key={`history-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.4, scale: 1 }}
                className="inline-block px-2.5 py-0.5"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "var(--radius-button)",
                  fontFamily: "var(--font-sf-pro)",
                  fontWeight: "var(--font-weight-normal)",
                  fontSize: "var(--text-caption)",
                  color: "var(--muted)",
                }}
              >
                {c.text.length > 30 ? c.text.slice(0, 30) + "..." : c.text}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Waveform + Trimmer + Player */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-full flex-1 flex flex-col min-h-0"
        style={{ maxWidth: "var(--page-max-w)" }}
      >
        <WaveformTrimmerPlayer
          audioBlob={audioBlob}
          onPlayStateChange={handlePlayStateChange}
          onTimeUpdate={handleTimeUpdate}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onTrimChange={handleTrimChange}
          autoPlay
        />
      </motion.div>

      {/* Playback state indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2 my-3 w-full"
        style={{ maxWidth: "var(--page-max-w)" }}
      >
        {isPlaying && (
          <>
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--primary)" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span
              style={{
                fontFamily: "var(--font-sf-pro)",
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-normal)",
                color: "var(--muted)",
              }}
            >
              Looping
              {hasCaptions && " · captions on"}
              {(trimStart > 0.005 || trimEnd < 0.995) && " · trimmed"}
            </span>
          </>
        )}
        {!isPlaying && currentProgress > 0 && currentProgress < 1 && (
          <span
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-normal)",
              color: "var(--muted)",
            }}
          >
            Paused
          </span>
        )}
        {!isPlaying && (currentProgress === 0 || currentProgress >= 1) && (
          <span
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-normal)",
              color: "var(--muted)",
            }}
          >
            {audioBlob ? "Tap play to loop" : "Sample clip"}
            {hasCaptions &&
              ` · ${sortedCaptions.length} caption${sortedCaptions.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </motion.div>

      {/* Share button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-full"
        style={{ maxWidth: "var(--page-max-w)" }}
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => { Haptics.medium(); onShare(); }}
          animate={{
            backgroundColor: buttonFilled
              ? "rgba(218, 252, 121, 1)"
              : "rgba(218, 252, 121, 0)",
            color: buttonFilled
              ? "rgba(0, 0, 0, 1)"
              : "rgba(218, 252, 121, 1)",
            borderColor: buttonFilled
              ? "rgba(218, 252, 121, 0)"
              : "rgba(218, 252, 121, 0.35)",
          }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 hover:opacity-90"
          style={{
            borderRadius: "var(--radius-button)",
            borderWidth: 1,
            borderStyle: "solid",
            fontFamily: "var(--font-inter)",
            fontWeight: "var(--font-weight-bold)",
            fontSize: "var(--text-base)",
          }}
        >
          Share
          <ChevronRight size={20} />
        </motion.button>
      </motion.div>
    </div>
  );
}