import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  Loader2,
  Play,
  Pause,
} from "lucide-react";
import { Haptics } from "../../utils/haptics";
import { convertBlobToWav } from "../../utils/audioConvert";
import { unlockAudioElement } from "../../utils/audioUnlock";

// ─── Helpers ───

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ─── Celebration Entrance Canvas ───
// Plays once on mount: burst glow + expanding rings + confetti — then fades out

function CelebrationEntrance({
  onComplete,
  width,
  height,
}: {
  onComplete: () => void;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef(Date.now() / 1000);
  const BLEED = 60;

  const [confetti] = useState(() =>
    Array.from({ length: 35 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.4,
      size: 2 + Math.random() * 5,
      rotSpeed: (Math.random() - 0.5) * 6,
      hue: [70, 80, 170, 190, 350][
        Math.floor(Math.random() * 5)
      ],
      sat: 70 + Math.random() * 30,
      delay: Math.random() * 0.1,
    })),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = width;
    const h = height;
    const fullW = w + BLEED * 2;
    const fullH = h + BLEED * 2;
    canvas.width = fullW * dpr;
    canvas.height = fullH * dpr;
    canvas.style.width = `${fullW}px`;
    canvas.style.height = `${fullH}px`;
    canvas.style.margin = `-${BLEED}px`;
    ctx.scale(dpr, dpr);
    ctx.translate(BLEED, BLEED);

    const cx = w / 2;
    const cy = h / 2;
    const s = w / 320;
    const TOTAL = 1.8; // shorter than Screen1's celebrate

    const draw = () => {
      const elapsed = Date.now() / 1000 - startRef.current;
      if (elapsed >= TOTAL) {
        onComplete();
        return;
      }
      ctx.clearRect(-BLEED, -BLEED, fullW, fullH);

      const t = elapsed / TOTAL;
      const intensity =
        t < 0.15 ? t / 0.15 : t > 0.5 ? 1 - (t - 0.5) / 0.5 : 1;

      // Burst glow
      const burstGlow = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        w * 0.5,
      );
      burstGlow.addColorStop(
        0,
        `rgba(218, 252, 121, ${0.2 * intensity})`,
      );
      burstGlow.addColorStop(
        0.5,
        `rgba(218, 252, 121, ${0.06 * intensity})`,
      );
      burstGlow.addColorStop(1, "transparent");
      ctx.fillStyle = burstGlow;
      ctx.fillRect(-BLEED, -BLEED, fullW, fullH);

      // Expanding rings
      for (let i = 0; i < 3; i++) {
        const ringT = Math.max(0, elapsed - i * 0.1);
        if (ringT <= 0) continue;
        const ringR = ringT * 100 * s;
        const ringAlpha = Math.max(
          0,
          (1 - ringT / 1.2) * 0.25 * intensity,
        );
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(218, 252, 121, ${ringAlpha})`;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();
      }

      // Confetti particles
      confetti.forEach((p) => {
        const pt = Math.max(0, elapsed - p.delay);
        if (pt <= 0) return;
        const dist = pt * p.speed * 70 * s;
        const gravity = pt * pt * 15 * s;
        const px = cx + Math.cos(p.angle) * dist;
        const py =
          cy + Math.sin(p.angle) * dist + gravity * 0.3;
        const baseFade = 1 - pt / 2.5;
        const alpha = Math.max(0, baseFade * intensity);
        if (alpha <= 0) return;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(pt * p.rotSpeed);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 65%, 1)`;
        ctx.fillRect(
          -p.size * s * 0.5,
          -p.size * s * 0.3,
          p.size * s,
          p.size * s * 0.6,
        );
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [width, height, confetti, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

// ─── Compact Waveform Player (no trimming, just playback visualization) ───

function CompactWaveformPlayer({
  audioBlob,
  onPlayStateChange,
}: {
  audioBlob: Blob | null;
  onPlayStateChange?: (playing: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const barsData = useRef<number[]>([]);
  const [dims, setDims] = useState({ w: 320, h: 80 });
  const [waveformReady, setWaveformReady] = useState(false);

  // Web Audio API refs
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackSourceRef =
    useRef<MediaElementAudioSourceNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const liveBarLevels = useRef<number[]>([]);

  // Decode waveform from blob
  useEffect(() => {
    if (!audioBlob) {
      if (barsData.current.length === 0) {
        barsData.current = Array.from(
          { length: 80 },
          () => 0.1 + Math.random() * 0.9,
        );
        setWaveformReady(true);
      }
      return;
    }

    let cancelled = false;
    const decode = async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const offlineCtx = new AudioContext();
        const audioBuffer =
          await offlineCtx.decodeAudioData(arrayBuffer);
        offlineCtx.close();
        if (cancelled) return;

        const rawData = audioBuffer.getChannelData(0);
        const numBars = 80;
        const samplesPerBar = Math.floor(
          rawData.length / numBars,
        );
        const bars: number[] = [];

        for (let i = 0; i < numBars; i++) {
          let sum = 0;
          const start = i * samplesPerBar;
          const end = Math.min(
            start + samplesPerBar,
            rawData.length,
          );
          for (let j = start; j < end; j++)
            sum += Math.abs(rawData[j]);
          bars.push(sum / (end - start));
        }

        const maxVal = Math.max(...bars, 0.001);
        for (let i = 0; i < bars.length; i++) {
          bars[i] = Math.max(0.05, bars[i] / maxVal);
        }

        if (!cancelled) {
          barsData.current = bars;
          setWaveformReady(true);
        }
      } catch {
        if (!cancelled && barsData.current.length === 0) {
          barsData.current = Array.from(
            { length: 80 },
            () => 0.1 + Math.random() * 0.9,
          );
          setWaveformReady(true);
        }
      }
    };
    decode();
    return () => {
      cancelled = true;
    };
  }, [audioBlob]);

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      setDims({ w: container.clientWidth, h: 80 });
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Create audio element
  useEffect(() => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    audioUrlRef.current = url;
    let disposed = false;

    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    unlockAudioElement(audio);

    const setupCtx = () => {
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
        freqDataRef.current = new Uint8Array(
          analyser.frequencyBinCount,
        );
        if (ctx.state === "suspended")
          ctx.resume().catch(() => {});
      } catch {
        /* ok */
      }
    };

    audio.addEventListener("loadedmetadata", () => {
      if (!disposed) setDuration(audio.duration);
    });

    audio.addEventListener("ended", () => {
      if (disposed) return;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    });

    audio.src = url;
    audio.load();

    return () => {
      disposed = true;
      audio.pause();
      audioRef.current = null;
      URL.revokeObjectURL(url);
      if (playbackSourceRef.current) {
        try {
          playbackSourceRef.current.disconnect();
        } catch {
          /* ok */
        }
        playbackSourceRef.current = null;
      }
      if (playbackAnalyserRef.current) {
        try {
          playbackAnalyserRef.current.disconnect();
        } catch {
          /* ok */
        }
        playbackAnalyserRef.current = null;
      }
      if (playbackCtxRef.current) {
        playbackCtxRef.current.close();
        playbackCtxRef.current = null;
      }
      freqDataRef.current = null;
    };
  }, [audioBlob]);

  // Playback tick
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    let raf: number;
    const tick = () => {
      if (!audio || audio.paused) return;
      const dur = audio.duration;
      if (dur && isFinite(dur)) {
        setProgress(audio.currentTime / dur);
      }

      // Capture live frequency
      const analyser = playbackAnalyserRef.current;
      const freqData = freqDataRef.current;
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        const numBars = barsData.current.length || 80;
        if (liveBarLevels.current.length !== numBars) {
          liveBarLevels.current = new Array(numBars).fill(0);
        }
        const binCount = freqData.length;
        for (let i = 0; i < numBars; i++) {
          const binStart = Math.floor(
            (i / numBars) * binCount * 0.8,
          );
          const binEnd = Math.floor(
            ((i + 1) / numBars) * binCount * 0.8,
          );
          let sum = 0,
            count = 0;
          for (
            let b = binStart;
            b < binEnd && b < binCount;
            b++
          ) {
            sum += freqData[b];
            count++;
          }
          const level = count > 0 ? sum / count / 255 : 0;
          liveBarLevels.current[i] =
            liveBarLevels.current[i] * 0.3 + level * 0.7;
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  // Simulated playback (no blob)
  useEffect(() => {
    if (!isPlaying || audioBlob) return;
    const simDur = 8;
    let current = progress;
    let raf: number;

    const tick = () => {
      current += 1 / 60 / simDur;
      if (current >= 1) current = 0;
      setProgress(current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, audioBlob]);

  const doPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      setIsPlaying(true);
      onPlayStateChange?.(true);
      return;
    }

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
        freqDataRef.current = new Uint8Array(
          analyser.frequencyBinCount,
        );
      } catch {
        /* ok */
      }
    }

    if (playbackCtxRef.current?.state === "suspended") {
      playbackCtxRef.current.resume();
    }

    audio.play().catch(() => {});
    setIsPlaying(true);
    onPlayStateChange?.(true);
  }, [onPlayStateChange]);

  const togglePlay = useCallback(() => {
    Haptics.light();
    const audio = audioRef.current;
    if (!audio) {
      if (isPlaying) {
        setIsPlaying(false);
        onPlayStateChange?.(false);
      } else {
        doPlay();
      }
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
    } else {
      doPlay();
    }
  }, [isPlaying, doPlay, onPlayStateChange]);

  // Draw waveform
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
      const live = liveBarLevels.current;
      const hasLiveData =
        isPlaying && live.length === totalBars;

      for (let i = 0; i < totalBars; i++) {
        const x = i * (barWidth + gap);
        if (x > w) break;

        const frac = i / totalBars;
        const isPlayed = frac <= progress;

        let barH: number;
        if (hasLiveData && isPlayed) {
          const liveLevel = live[i] || 0;
          const blended = bars[i] * 0.3 + liveLevel * 0.7;
          barH = Math.max(
            bars[i] * h * 0.15,
            blended * h * 0.85,
          );
        } else {
          barH = bars[i] * h * 0.7;
        }

        const y = (h - barH) / 2;

        if (isPlayed) {
          const alpha = hasLiveData
            ? 0.7 + (live[i] || 0) * 0.3
            : 0.9;
          ctx.fillStyle = `rgba(218, 252, 121, ${alpha})`;
        } else {
          ctx.fillStyle = "rgba(155, 155, 155, 0.35)";
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, barWidth / 2);
        ctx.fill();
      }

      // Playhead
      const headX = progress * w;
      if (progress > 0) {
        const glowGrad = ctx.createLinearGradient(
          headX - 10,
          0,
          headX + 10,
          0,
        );
        glowGrad.addColorStop(0, "rgba(218, 252, 121, 0)");
        glowGrad.addColorStop(
          0.5,
          `rgba(218, 252, 121, ${isPlaying ? 0.15 : 0.08})`,
        );
        glowGrad.addColorStop(1, "rgba(218, 252, 121, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(headX - 10, 0, 20, h);

        ctx.strokeStyle = `rgba(218, 252, 121, ${isPlaying ? 0.9 : 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headX, 2);
        ctx.lineTo(headX, h - 2);
        ctx.stroke();

        // Diamond indicators
        const dSize = isPlaying ? 4 : 3;
        ctx.fillStyle = `rgba(218, 252, 121, ${isPlaying ? 1 : 0.7})`;
        ctx.beginPath();
        ctx.moveTo(headX, 0);
        ctx.lineTo(headX + dSize, dSize);
        ctx.lineTo(headX, dSize * 2);
        ctx.lineTo(headX - dSize, dSize);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(headX, h);
        ctx.lineTo(headX + dSize, h - dSize);
        ctx.lineTo(headX, h - dSize * 2);
        ctx.lineTo(headX - dSize, h - dSize);
        ctx.closePath();
        ctx.fill();
      }

      if (isPlaying) {
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progress, isPlaying, dims, waveformReady]);

  const displayDuration = duration > 0 ? duration : 8;
  const currentTimeSec = progress * displayDuration;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-3 w-full"
    >
      {/* Waveform canvas */}
      <div className="w-full relative" style={{ height: 80 }}>
        <canvas ref={canvasRef} className="w-full" />
      </div>

      {/* Time + play/pause controls */}
      <div className="flex items-center justify-between w-full">
        <span
          style={{
            fontFamily: "var(--font-sf-pro)",
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--muted)",
            minWidth: 40,
          }}
        >
          {formatTime(currentTimeSec)}
        </span>

        <motion.button
          onClick={togglePlay}
          whileTap={{ scale: 0.9 }}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} className="ml-0.5" />
          )}
        </motion.button>

        <span
          style={{
            fontFamily: "var(--font-sf-pro)",
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--muted)",
            minWidth: 40,
            textAlign: "right",
          }}
        >
          {formatTime(displayDuration)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Screen4 ───

interface Screen4Props {
  onContinue: () => void;
  onShowToast: (msg: string) => void;
  audioBlob: Blob | null;
  headline?: string;
}

export function Screen4ViralTrigger({
  onContinue,
  onShowToast,
  audioBlob,
  headline = "Share Your Clip with Friends",
}: Screen4Props) {
  const [buttonFilled, setButtonFilled] = useState(false);
  const [converting, setConverting] = useState(false);
  const [celebrationDone, setCelebrationDone] = useState(false);
  const [waveformVisible, setWaveformVisible] = useState(false);
  const wavBlobRef = useRef<Blob | null>(null);

  // Fill the continue button after 3s
  useEffect(() => {
    const timer = setTimeout(() => setButtonFilled(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Pre-convert to WAV in the background
  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;
    convertBlobToWav(audioBlob)
      .then((wav) => {
        if (!cancelled) wavBlobRef.current = wav;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [audioBlob]);

  // Show waveform after celebration entrance completes
  const handleCelebrationComplete = useCallback(() => {
    setCelebrationDone(true);
    setTimeout(() => setWaveformVisible(true), 100);
  }, []);

  // Auto-complete celebration after timeout if no canvas
  useEffect(() => {
    const t = setTimeout(() => {
      if (!celebrationDone) {
        setCelebrationDone(true);
        setWaveformVisible(true);
      }
    }, 2200);
    return () => clearTimeout(t);
  }, [celebrationDone]);

  const getWavBlob =
    useCallback(async (): Promise<Blob | null> => {
      if (wavBlobRef.current) return wavBlobRef.current;
      if (!audioBlob) return null;
      setConverting(true);
      try {
        const wav = await convertBlobToWav(audioBlob);
        wavBlobRef.current = wav;
        return wav;
      } catch {
        return audioBlob;
      } finally {
        setConverting(false);
      }
    }, [audioBlob]);

  // ── Share handlers (unchanged logic) ──

  const handleMessages = useCallback(async () => {
    Haptics.medium();
    const shareText =
      "Listen to this clip I just caught on Reclip! The last 2 min, saved instantly.";

    if (audioBlob && navigator.canShare) {
      setConverting(true);
      try {
        const wavBlob = await getWavBlob();
        setConverting(false);
        if (wavBlob) {
          const file = new File(
            [wavBlob],
            "reclip-moment.wav",
            { type: "audio/wav" },
          );
          const shareData: ShareData = {
            title: "Reclip Moment",
            text: shareText,
            files: [file],
          };
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        }
      } catch (err) {
        setConverting(false);
        if ((err as DOMException)?.name === "AbortError")
          return;
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Reclip Moment",
          text: shareText,
          url: window.location.origin + "/shared/moment",
        });
        return;
      } catch {
        return;
      }
    }

    const smsBody = encodeURIComponent(shareText);
    window.open(`sms:?body=${smsBody}`, "_blank");
  }, [audioBlob, getWavBlob]);

  const handleCopyLink = useCallback(async () => {
    Haptics.medium();
    const shareUrl = `${window.location.origin}/shared/moment?from=reclip`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      Haptics.success();
      onShowToast("Link copied!");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      onShowToast("Link copied!");
    }
  }, [onShowToast]);

  const handleDownload = useCallback(async () => {
    Haptics.medium();
    if (!audioBlob) {
      Haptics.warning();
      onShowToast("No clip to download");
      return;
    }
    setConverting(true);
    try {
      const wavBlob = await getWavBlob();
      setConverting(false);
      if (!wavBlob) {
        Haptics.warning();
        onShowToast("Conversion failed");
        return;
      }
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reclip-moment.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Haptics.success();
      onShowToast("Clip downloaded!");
    } catch {
      setConverting(false);
      Haptics.warning();
      onShowToast("Download failed");
    }
  }, [audioBlob, getWavBlob, onShowToast]);

  const shareOptions = [
    {
      emoji: "\u{1F4AC}",
      label: "Send via Messages",
      sublabel: "Text it to your group chat",
      bgColor: "transparent",
      fgColor: "var(--accent)",
      borderColor: "var(--accent)",
      action: handleMessages,
    },
    {
      emoji: "\u{1F517}",
      label: "Copy Link",
      sublabel: "Paste it anywhere",
      bgColor: "transparent",
      fgColor: "var(--primary)",
      borderColor: "var(--primary)",
      action: handleCopyLink,
    },
    {
      emoji: "\u2B07\uFE0F",
      label: "Save to Device",
      sublabel: "Keep it forever",
      bgColor: "transparent",
      fgColor: "var(--foreground)",
      borderColor: "var(--muted)",
      action: handleDownload,
    },
  ];

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
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-4 w-full"
        style={{ maxWidth: "var(--page-max-w)" }}
      >
        <h3
          className="text-[var(--foreground)] text-center mx-auto"
          style={{
            fontFamily: "var(--font-druk-cy)",
            fontWeight: "var(--font-weight-heavy)",
            fontSize: "var(--text-h4)",
            lineHeight: 1.2,
            textTransform: "uppercase",
            maxWidth: "75%",
          }}
        >
          {headline}
        </h3>
      </motion.div>

      {/* Waveform area with celebration entrance */}
      <div
        className="w-full relative overflow-visible flex items-center justify-center"
        style={{
          maxWidth: "var(--page-max-w)",
          minHeight: 140,
        }}
      >
        {/* Celebration entrance animation */}
        <AnimatePresence>
          {!celebrationDone && (
            <motion.div
              key="celebration"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center overflow-visible z-10"
            >
              <CelebrationEntrance
                onComplete={handleCelebrationComplete}
                width={320}
                height={140}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waveform player — slides up and fades in after celebration */}
        <AnimatePresence>
          {waveformVisible && (
            <motion.div
              key="waveform"
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
                opacity: { duration: 0.5 },
              }}
              className="w-full"
            >
              <CompactWaveformPlayer audioBlob={audioBlob} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share actions */}
      <div
        className="flex-1 flex flex-col items-center justify-center w-full gap-3"
        style={{ maxWidth: "var(--page-max-w)" }}
      >
        {shareOptions.map((opt, i) => (
          <motion.button
            key={opt.label}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              delay: 0.2 + i * 0.12,
              duration: 0.45,
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            onClick={opt.action}
            disabled={converting}
            className="w-full flex items-center gap-4 py-4 px-5"
            style={{
              borderRadius: "var(--radius-button)",
              backgroundColor: opt.bgColor,
              color: opt.fgColor,
              border: `1.5px solid ${opt.borderColor}`,
              opacity: converting ? 0.5 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            <motion.span
              animate={{ y: [0, -3, 0] }}
              transition={{
                delay: 0.6 + i * 0.15,
                duration: 0.5,
                repeat: 2,
                repeatDelay: 4,
                ease: "easeInOut",
              }}
              style={{
                fontSize: "28px",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {opt.emoji}
            </motion.span>

            <div className="flex flex-col items-start flex-1 min-w-0">
              <span
                style={{
                  fontFamily: "var(--font-inter)",
                  fontWeight: "var(--font-weight-bold)",
                  fontSize: "var(--text-base)",
                  lineHeight: 1.3,
                  color: "inherit",
                }}
              >
                {opt.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sf-pro)",
                  fontWeight: "var(--font-weight-normal)",
                  fontSize: "var(--text-caption)",
                  lineHeight: 1.3,
                  color: "var(--muted)",
                }}
              >
                {opt.sublabel}
              </span>
            </div>

            <ChevronRight
              size={20}
              style={{
                color: "inherit",
                flexShrink: 0,
                opacity: 0.6,
              }}
            />
          </motion.button>
        ))}

        {/* Converting indicator */}
        {converting && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Loader2 size={14} color="var(--primary)" />
            </motion.div>
            <span
              style={{
                fontFamily: "var(--font-sf-pro)",
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-normal)",
                color: "var(--muted)",
              }}
            >
              Preparing clip...
            </span>
          </motion.div>
        )}
      </div>

      {/* Continue button */}
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          Haptics.medium();
          onContinue();
        }}
        className="w-full flex items-center justify-center gap-2 py-4 px-6 hover:opacity-90"
        style={{
          maxWidth: "var(--page-max-w)",
          borderRadius: "var(--radius-button)",
          borderWidth: 1,
          borderStyle: "solid",
          fontFamily: "var(--font-inter)",
          fontWeight: "var(--font-weight-bold)",
          fontSize: "var(--text-base)",
          backgroundColor: buttonFilled
            ? "var(--primary)"
            : "transparent",
          color: buttonFilled
            ? "var(--primary-foreground)"
            : "var(--primary)",
          borderColor: buttonFilled
            ? "transparent"
            : "rgba(218, 252, 121, 0.35)",
          transition:
            "background-color 0.6s cubic-bezier(0.4,0,0.2,1), color 0.6s cubic-bezier(0.4,0,0.2,1), border-color 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        Join Reclip
        <ChevronRight size={20} />
      </motion.button>
    </div>
  );
}