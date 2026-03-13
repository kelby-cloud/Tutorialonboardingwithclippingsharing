import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, ChevronRight } from "lucide-react";
import svgPaths from "../../../imports/svg-zclrwjs4v7";
import { Haptics } from "../../utils/haptics";
import { useAudioReactive } from "../../utils/useAudioReactive";
import { useAudioRecorder } from "../../utils/useAudioRecorder";

// ─── Rotate-back (Clip) Icon Component ───

function ClipIcon({
  size = 32,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 73.9189 81.448"
      fill="none"
    >
      <path
        d={svgPaths.p1c212380}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d={svgPaths.p22976d80}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d={svgPaths.p4656700}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d={svgPaths.p1da536dc}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d={svgPaths.p26a7ae00}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d={svgPaths.p3282fb40}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d={svgPaths.p1faef8e0}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
    </svg>
  );
}

// ─── Circular Waveform Visualizer ───

function CircularWaveformVisualizer({
  isActive,
  analyserNode,
}: {
  isActive: boolean;
  analyserNode?: AnalyserNode | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [dims, setDims] = useState({ w: 360, h: 340 });
  const BLEED = 60;

  const [waveSeeds] = useState(() =>
    Array.from({ length: 48 }, () => ({
      freq1: 1.5 + Math.random() * 4,
      freq2: 3 + Math.random() * 6,
      freq3: 0.5 + Math.random() * 2,
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2,
      amp1: 0.3 + Math.random() * 0.7,
      amp2: 0.15 + Math.random() * 0.35,
      amp3: 0.05 + Math.random() * 0.2,
    })),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const update = () => {
      const w = Math.min(parent.clientWidth, 520);
      const h = Math.min(w * 0.85, 440);
      setDims({ w, h });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = dims.w;
    const h = dims.h;
    const BLEED_C = 60;
    const fullW = w + BLEED_C * 2;
    const fullH = h + BLEED_C * 2;
    canvas.width = fullW * dpr;
    canvas.height = fullH * dpr;
    canvas.style.width = `${fullW}px`;
    canvas.style.height = `${fullH}px`;
    canvas.style.margin = `-${BLEED_C}px`;
    ctx.scale(dpr, dpr);
    ctx.translate(BLEED_C, BLEED_C);

    const cx = w / 2;
    const cy = h / 2;
    const s = w / 320;

    const freqData = analyserNode
      ? new Uint8Array(analyserNode.frequencyBinCount)
      : null;

    const draw = () => {
      const now = Date.now() / 1000;
      ctx.clearRect(-BLEED_C, -BLEED_C, fullW, fullH);

      if (analyserNode && freqData) {
        analyserNode.getByteFrequencyData(freqData);
      }

      let avgLevel = 0;
      if (freqData && analyserNode) {
        for (let i = 0; i < freqData.length; i++)
          avgLevel += freqData[i];
        avgLevel = avgLevel / freqData.length / 255;
      }

      // Ambient radial glow
      const glowAlpha = isActive
        ? 0.08 + avgLevel * 0.15
        : 0.08;
      const glow = ctx.createRadialGradient(
        cx,
        cy,
        10,
        cx,
        cy,
        w * 0.5,
      );
      glow.addColorStop(0, `rgba(218, 252, 121, ${glowAlpha})`);
      glow.addColorStop(
        0.5,
        `rgba(218, 252, 121, ${glowAlpha * 0.3})`,
      );
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(-BLEED_C, -BLEED_C, fullW, fullH);

      // Audio-reactive waveform rings
      const numWaveRings = 6;
      for (let i = 0; i < numWaveRings; i++) {
        const ringSpeed = isActive ? 0.4 + avgLevel * 0.4 : 0.4;
        const phase =
          (now * ringSpeed + i * (1 / numWaveRings)) % 1;
        const minR = 48 * s;
        const maxR = 160 * s;
        const radius = minR + phase * (maxR - minR);
        const amp1 = Math.sin(now * 3.5 + i * 1.7) * 0.4;
        const amp2 = Math.sin(now * 5.8 + i * 2.3) * 0.25;
        const amp3 = Math.cos(now * 2.1 + i * 0.9) * 0.15;
        const reactivity = isActive
          ? 0.4 + avgLevel * 1.2
          : 0.4;
        const waveAmp = 1 + reactivity * (amp1 + amp2 + amp3);
        const fadeAlpha =
          (1 - phase) *
          (isActive ? 0.18 + avgLevel * 0.25 : 0.18) *
          Math.max(waveAmp, 0.3);

        ctx.strokeStyle = `rgba(218, 252, 121, ${fadeAlpha})`;
        ctx.lineWidth = (2 + Math.max(waveAmp, 0) * 0.5) * s;
        ctx.beginPath();
        const segments = 64;
        for (let seg = 0; seg <= segments; seg++) {
          const a = (seg / segments) * Math.PI * 2;
          const distortAmt = isActive
            ? 0.4 + avgLevel * 1.2
            : 0.4;
          const distort =
            Math.sin(a * 4 + now * 4 + i) *
              3 *
              s *
              waveAmp *
              distortAmt +
            Math.sin(a * 7 + now * 6) *
              1.5 *
              s *
              waveAmp *
              distortAmt;
          const r = radius + distort;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (seg === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Waveform bars radiating outward
      const numBars = 48;
      const innerR = 50 * s;
      const maxBarLen = 35 * s;
      for (let i = 0; i < numBars; i++) {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const seed = waveSeeds[i];
        let barLen: number;
        if (isActive && analyserNode && freqData) {
          const binIndex = Math.floor(
            (i / numBars) * freqData.length * 0.6,
          );
          const amplitude = freqData[binIndex] / 255;
          barLen = Math.max(
            3 * s,
            amplitude * maxBarLen * 1.5 + 2 * s,
          );
        } else {
          const v1 =
            Math.sin(now * seed.freq1 + seed.phase1 + i * 0.3) *
            seed.amp1;
          const v2 =
            Math.sin(now * seed.freq2 + seed.phase2 + i * 0.7) *
            seed.amp2;
          const v3 =
            Math.cos(
              now * seed.freq3 + seed.phase3 + i * 0.15,
            ) * seed.amp3;
          const envelope =
            0.5 + 0.5 * Math.sin(now * 0.8 + i * 0.12);
          const raw = Math.abs(v1 + v2 + v3) * envelope;
          const intensityMul = isActive ? 1.5 : 0.7;
          barLen = Math.max(
            3 * s,
            raw * maxBarLen * intensityMul,
          );
        }
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + barLen);
        const y2 = cy + Math.sin(angle) * (innerR + barLen);
        const intensity = barLen / maxBarLen;
        const r = Math.round(218 * (1 - intensity * 0.5));
        const g = Math.round(
          252 * (1 - intensity * 0.3) + 200 * intensity * 0.3,
        );
        const b = Math.round(
          121 * (1 - intensity * 0.6) + 255 * intensity * 0.6,
        );
        const barAlpha = isActive
          ? 0.4 + intensity * 0.5
          : 0.2 + intensity * 0.3;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${barAlpha})`;
        ctx.lineWidth = 2.5 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Outer wavy ring contour
      ctx.beginPath();
      const ringSegments = 72;
      for (let i = 0; i <= ringSegments; i++) {
        const angle = (i / ringSegments) * Math.PI * 2;
        const seed = waveSeeds[i % waveSeeds.length];
        const distort =
          Math.sin(now * seed.freq1 + angle * 3) * 4 * s +
          Math.sin(now * seed.freq2 + angle * 5) * 2 * s;
        const r = innerR + maxBarLen * 0.6 + distort;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(218, 252, 121, ${isActive ? 0.12 : 0.06})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner glow core
      const innerGlow = ctx.createRadialGradient(
        cx,
        cy,
        innerR * 0.3,
        cx,
        cy,
        innerR,
      );
      innerGlow.addColorStop(
        0,
        `rgba(218, 252, 121, ${isActive ? 0.1 : 0.04})`,
      );
      innerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, isActive, analyserNode, waveSeeds]);

  return (
    <div className="w-full flex items-center justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Celebrate Overlay (confetti + checkmark) ───

function CelebrateOverlay({
  onComplete,
  durationSec,
}: {
  onComplete: () => void;
  durationSec: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef(Date.now() / 1000);
  const [dims, setDims] = useState({ w: 360, h: 360 });
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [confetti] = useState(() =>
    Array.from({ length: 50 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.8,
      size: 3 + Math.random() * 6,
      rotSpeed: (Math.random() - 0.5) * 8,
      hue: [70, 80, 170, 190, 350][
        Math.floor(Math.random() * 5)
      ],
      sat: 70 + Math.random() * 30,
      delay: Math.random() * 0.15,
    })),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = Math.min(parent.clientWidth, 520);
    const h = Math.min(parent.clientHeight, 520);
    setDims({ w, h });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = dims.w;
    const h = dims.h;
    const BLEED_O = 60;
    const fullW = w + BLEED_O * 2;
    const fullH = h + BLEED_O * 2;
    canvas.width = fullW * dpr;
    canvas.height = fullH * dpr;
    canvas.style.width = `${fullW}px`;
    canvas.style.height = `${fullH}px`;
    canvas.style.margin = `-${BLEED_O}px`;
    ctx.scale(dpr, dpr);
    ctx.translate(BLEED_O, BLEED_O);

    const cx = w / 2;
    const cy = h / 2;
    const s = w / 320;
    const TOTAL = 2.8;

    const draw = () => {
      const elapsed = Date.now() / 1000 - startRef.current;
      if (elapsed >= TOTAL) {
        onCompleteRef.current();
        return;
      }
      ctx.clearRect(-BLEED_O, -BLEED_O, fullW, fullH);

      const t = elapsed / TOTAL;
      const intensity =
        t < 0.15 ? t / 0.15 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;

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
        `rgba(218, 252, 121, ${0.25 * intensity})`,
      );
      burstGlow.addColorStop(
        0.5,
        `rgba(218, 252, 121, ${0.08 * intensity})`,
      );
      burstGlow.addColorStop(1, "transparent");
      ctx.fillStyle = burstGlow;
      ctx.fillRect(-BLEED_O, -BLEED_O, fullW, fullH);

      // Expanding rings
      for (let i = 0; i < 3; i++) {
        const ringT = Math.max(0, elapsed - i * 0.15);
        if (ringT <= 0) continue;
        const ringR = ringT * 120 * s;
        const ringAlpha = Math.max(
          0,
          (1 - ringT / 1.5) * 0.3 * intensity,
        );
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(218, 252, 121, ${ringAlpha})`;
        ctx.lineWidth = 2 * s;
        ctx.stroke();
      }

      // Checkmark in center
      const checkScale = Math.min(elapsed / 0.3, 1);
      const checkAlpha = intensity;
      ctx.save();
      ctx.globalAlpha = checkAlpha;
      ctx.translate(cx, cy);
      ctx.scale(checkScale, checkScale);

      const btnGrad = ctx.createRadialGradient(
        0,
        -10 * s,
        0,
        0,
        0,
        44 * s,
      );
      btnGrad.addColorStop(0, "rgba(218, 252, 121, 1)");
      btnGrad.addColorStop(1, "rgba(180, 220, 80, 1)");
      ctx.beginPath();
      ctx.arc(0, 0, 44 * s, 0, Math.PI * 2);
      ctx.fillStyle = btnGrad;
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
      ctx.lineWidth = 3.5 * s;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-12 * s, -1 * s);
      ctx.lineTo(-3 * s, 9 * s);
      ctx.lineTo(14 * s, -8 * s);
      ctx.stroke();

      ctx.restore();

      // "Saved!" label
      if (elapsed > 0.4) {
        const labelAlpha =
          Math.min((elapsed - 0.4) / 0.3, 1) * intensity;
        ctx.save();
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = "rgba(218, 252, 121, 1)";
        ctx.font = `700 ${14 * s}px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        // Format duration for the canvas label
        const MAX_DUR = 120;
        const clamped = Math.min(
          Math.floor(durationSec),
          MAX_DUR,
        );
        const dm = Math.floor(clamped / 60);
        const ds = clamped % 60;
        const durLabel = `${dm}:${ds.toString().padStart(2, "0")}`;
        const maxLabel = `${Math.floor(MAX_DUR / 60)}:${(MAX_DUR % 60).toString().padStart(2, "0")}`;
        ctx.fillText(
          `${durLabel} of ${maxLabel} saved!`,
          cx,
          cy + 52 * s,
        );
        ctx.restore();
      }

      // Confetti
      confetti.forEach((p) => {
        const pt = Math.max(0, elapsed - p.delay);
        if (pt <= 0) return;
        const dist = pt * p.speed * 90 * s;
        const gravity = pt * pt * 20 * s;
        const px = cx + Math.cos(p.angle) * dist;
        const py =
          cy + Math.sin(p.angle) * dist + gravity * 0.3;
        const baseFade = 1 - pt / 3;
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
  }, [dims, confetti, durationSec]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center z-30"
    >
      <canvas ref={canvasRef} />
    </motion.div>
  );
}

// ─── Main Screen Component (Mic Permission + Capture combined) ───

type Phase =
  | "idle"
  | "transitioning"
  | "capture"
  | "celebrating";

export interface CaptionSegment {
  time: number; // seconds from recording start
  text: string;
}

interface Screen1Props {
  onClipSaved: (
    audioBlob: Blob | null,
    captions: CaptionSegment[],
    durationSec: number,
  ) => void;
}

export function Screen1InstantStart({
  onClipSaved,
}: Screen1Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [buttonFilled, setButtonFilled] = useState(false);
  const [headerCopy, setHeaderCopy] = useState<
    "learn" | "goAhead" | "simulated"
  >("learn");

  // ── Audio hooks: singleton mic + rolling buffer recorder ──
  const audio = useAudioReactive();
  const recorder = useAudioRecorder();

  const fillTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const captionsRef = useRef<CaptionSegment[]>([]);
  const recordingStartRef = useRef<number>(0);
  const clipDurationRef = useRef<number>(0);

  // Animate button fill after 3 seconds
  useEffect(() => {
    setButtonFilled(false);
    fillTimerRef.current = setTimeout(
      () => setButtonFilled(true),
      3000,
    );
    return () => {
      if (fillTimerRef.current)
        clearTimeout(fillTimerRef.current);
    };
  }, []);

  const requestMic = useCallback(async () => {
    Haptics.medium();
    let micGranted = true;
    try {
      // Start the singleton audio reactive system (mic + analyser)
      await audio.start();
      const stream = audio.getStream();
      if (!stream) throw new Error("No stream");

      // Start the rolling buffer recorder with the shared stream
      recorder.startRecording(stream);

      // Mark recording start time for caption timestamps
      recordingStartRef.current = Date.now();
      captionsRef.current = [];

      // Start Web Speech API recognition for live captions
      const SpeechRecognitionAPI =
        (
          window as unknown as {
            SpeechRecognition?: typeof SpeechRecognition;
          }
        ).SpeechRecognition ||
        (
          window as unknown as {
            webkitSpeechRecognition?: typeof SpeechRecognition;
          }
        ).webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onresult = (
          event: SpeechRecognitionEvent,
        ) => {
          for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
          ) {
            if (event.results[i].isFinal) {
              const transcript =
                event.results[i][0].transcript.trim();
              if (transcript) {
                const timeSec =
                  (Date.now() - recordingStartRef.current) /
                  1000;
                captionsRef.current.push({
                  time: timeSec,
                  text: transcript,
                });
              }
            }
          }
        };

        recognition.onerror = () => {
          // Silently continue — captions are optional
        };

        // Auto-restart if it stops mid-recording
        recognition.onend = () => {
          if (recognitionRef.current && recorder.isRecording) {
            try {
              recognition.start();
            } catch {
              // Already started or disposed
            }
          }
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          // Speech recognition unavailable
        }
      }
    } catch {
      // Mic denied — continue without real audio (simulated mode)
      micGranted = false;
      recordingStartRef.current = Date.now();
      captionsRef.current = [
        { time: 1.2, text: "Hey what's up" },
        { time: 3.5, text: "Bro did you hear what she said" },
        { time: 6.1, text: "No way that actually happened" },
        { time: 9.0, text: "Clip that right now" },
      ];
    }

    // Transition phase: waveform moves to center (regardless of mic permission)
    setPhase("transitioning");

    // After transition animation, enter capture mode
    setTimeout(() => {
      setPhase("capture");
      setHeaderCopy("learn");
      // Show "go ahead" after a beat
      setTimeout(() => setHeaderCopy(micGranted ? "goAhead" : "simulated"), 1800);
    }, 900);
  }, [audio, recorder]);

  const handleClip = useCallback(() => {
    if (phase !== "capture") return;
    // Capture recording duration at clip time
    clipDurationRef.current =
      (Date.now() - recordingStartRef.current) / 1000;
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // prevent restart
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    setPhase("celebrating");
    Haptics.heavy();
  }, [phase]);

  const handleCelebrateComplete = useCallback(() => {
    Haptics.success();
    const savedCaptions = [...captionsRef.current];

    // Get the blob from the rolling buffer recorder
    const blob = recorder.getBlob();
    recorder.stopRecording();
    audio.stop();

    onClipSaved(blob, savedCaptions, clipDurationRef.current);
  }, [onClipSaved, recorder, audio]);

  const isActive =
    phase === "transitioning" ||
    phase === "capture" ||
    phase === "celebrating";
  const isCentered = phase !== "idle";

  return (
    <div
      className="flex flex-col items-center h-full w-full relative overflow-visible"
      style={{
        backgroundColor: "var(--background)",
        paddingTop: "var(--page-pt)",
        paddingBottom: "var(--page-pb)",
        paddingLeft: "var(--page-px)",
        paddingRight: "var(--page-px)",
      }}
    >
      {/* ── Header copy (capture phase) ── */}
      <AnimatePresence mode="wait">
        {phase === "capture" && (
          <motion.div
            key={`header-${headerCopy}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="text-center w-full z-10"
            style={{
              maxWidth: "var(--page-max-w)",
              minHeight: 72,
            }}
          >
            {headerCopy === "learn" && (
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
                Learn how to clip
              </h4>
            )}
            {headerCopy === "goAhead" && (
              <div className="flex flex-col gap-2">
                <h4
                  className="text-[var(--accent)]"
                  style={{
                    fontFamily: "var(--font-druk-cy)",
                    fontWeight: "var(--font-weight-heavy)",
                    fontSize: "var(--text-h4)",
                    lineHeight: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  Go ahead and say something!
                </h4>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: "var(--destructive)",
                    }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />
                  <span
                    className="text-[var(--muted)]"
                    style={{
                      fontFamily: "var(--font-sf-pro)",
                      fontSize: "var(--text-caption)",
                      fontWeight: "var(--font-weight-normal)",
                    }}
                  >
                    Listening...
                  </span>
                </div>
              </div>
            )}
            {headerCopy === "simulated" && (
              <div className="flex flex-col gap-2">
                <h4
                  className="text-[var(--primary)]"
                  style={{
                    fontFamily: "var(--font-druk-cy)",
                    fontWeight: "var(--font-weight-heavy)",
                    fontSize: "var(--text-h4)",
                    lineHeight: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  Say something, anything!
                </h4>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: "var(--destructive)",
                    }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />
                  <span
                    className="text-[var(--muted)]"
                    style={{
                      fontFamily: "var(--font-sf-pro)",
                      fontSize: "var(--text-caption)",
                      fontWeight: "var(--font-weight-normal)",
                    }}
                  >
                    Mic off — simulated audio
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {phase === "celebrating" && (
          <motion.div
            key="celebrating-header"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center w-full z-10"
            style={{
              maxWidth: "var(--page-max-w)",
              minHeight: 72,
            }}
          >
            <h4
              className="text-[var(--primary)]"
              style={{
                fontFamily: "var(--font-druk-cy)",
                fontWeight: "var(--font-weight-heavy)",
                fontSize: "var(--text-h4)",
                lineHeight: 1.2,
                textTransform: "uppercase",
              }}
            >
              Clipped!
            </h4>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Waveform container — animates position ── */}
      <motion.div
        layout
        className="w-full relative flex items-center justify-center"
        style={{ maxWidth: "var(--page-max-w)" }}
        animate={{
          flex: isCentered ? "1 1 0%" : "1 1 0%",
        }}
        transition={{
          layout: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
        }}
      >
        <CircularWaveformVisualizer
          isActive={isActive}
          analyserNode={audio.getAnalyser()}
        />

        {/* ── Clip button overlaid in center of waveform ── */}
        <AnimatePresence>
          {phase === "capture" && (
            <motion.div
              key="clip-btn"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
                delay: 0.2,
              }}
              className="absolute inset-0 flex items-center justify-center z-20"
            >
              {/* Glow ring */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 120,
                  height: 120,
                  background:
                    "radial-gradient(circle, rgba(218, 252, 121, 0.18) 0%, transparent 70%)",
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.75, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {/* Hint ring */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 96,
                  height: 96,
                  border: "2px solid rgba(218, 252, 121, 0.15)",
                }}
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.15, 0.35, 0.15],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.button
                onClick={handleClip}
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.06 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                }}
                className="relative z-10 flex items-center justify-center"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "var(--radius-button)",
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                  boxShadow:
                    "0 0 40px rgba(218, 252, 121, 0.35)",
                }}
              >
                <ClipIcon
                  size={36}
                  color="var(--primary-foreground)"
                />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Celebrate overlay ── */}
        <AnimatePresence>
          {phase === "celebrating" && (
            <CelebrateOverlay
              onComplete={handleCelebrateComplete}
              durationSec={clipDurationRef.current}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Bottom section: text + CTA (idle phase) / hint (capture phase) ── */}
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle-bottom"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center w-full gap-4"
            style={{ maxWidth: "var(--page-max-w)" }}
          >
            {/* Text content */}
            <div className="text-center flex flex-col gap-4 w-full mb-8">
              <h3
                className="text-[var(--foreground)]"
                style={{
                  fontFamily: "var(--font-druk-cy)",
                  fontWeight: "var(--font-weight-heavy)",
                  fontSize: "var(--text-h3)",
                  lineHeight: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Clip it before you miss it!
              </h3>
              <div
                className="text-[var(--muted)] flex flex-col gap-1"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontWeight: "var(--font-weight-normal)",
                  fontSize: "var(--text-base)",
                  lineHeight: 1.6,
                }}
              >
                <span>Save up to 2 mins of audio.</span>
                <span>
                  The jokes, The cap, The receipts. Clipped{" "}
                  <motion.span
                    className="inline-block"
                    animate={{
                      rotate: [0, -12, 12, -8, 0],
                      scale: [1, 1.15, 1.15, 1.1, 1],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      repeatDelay: 2.5,
                      ease: "easeInOut",
                    }}
                  >
                    🎤
                  </motion.span>
                  <motion.span
                    className="inline-block"
                    animate={{
                      opacity: [0.4, 1, 0.4],
                      scale: [0.9, 1.2, 0.9],
                      y: [0, -3, 0],
                    }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      repeatDelay: 1.8,
                      ease: "easeInOut",
                    }}
                  >
                    ✨
                  </motion.span>
                </span>
              </div>
            </div>

            {/* Mic CTA button */}
            <motion.button
              initial={{ opacity: 0, y: 15 }}
              animate={{
                opacity: 1,
                y: 0,
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
              transition={{
                opacity: { delay: 0.4, duration: 0.4 },
                y: { delay: 0.4, duration: 0.4 },
                backgroundColor: {
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                },
                color: {
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                },
                borderColor: {
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                },
              }}
              whileTap={{ scale: 0.96 }}
              onClick={requestMic}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 hover:opacity-90"
              style={{
                borderRadius: "var(--radius-button)",
                borderWidth: 1,
                borderStyle: "solid",
                fontFamily: "var(--font-inter)",
                fontWeight: "var(--font-weight-bold)",
                fontSize: "var(--text-base)",
              }}
            >
              <motion.span
                animate={{ rotate: [0, -15, 15, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 2.4,
                  ease: "easeInOut",
                }}
                className="flex items-center"
              >
                <Mic size={22} />
              </motion.span>
              <span>Turn on your mic</span>
              <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        )}

        {phase === "capture" && (
          <motion.div
            key="capture-bottom"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="w-full text-center"
            style={{ maxWidth: "var(--page-max-w)" }}
          >
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span
                className="text-[var(--muted)]"
                style={{
                  fontFamily: "var(--font-druk-cy)",
                  fontWeight: "var(--font-weight-heavy)",
                  fontSize: "var(--text-caption)",
                  lineHeight: 1.4,
                  textTransform: "uppercase",
                }}
              >
                Tap
              </span>
              <svg
                className="inline-block"
                style={{ width: "1.2em", height: "1.2em", verticalAlign: "middle", color: "var(--primary)" }}
                fill="none"
                viewBox="0 0 73.9189 81.448"
              >
                <path d={svgPaths.p1c212380} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                <path d={svgPaths.p22976d80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                <path d={svgPaths.p4656700} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                <path d={svgPaths.p1da536dc} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                <path d={svgPaths.p26a7ae00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                <path d={svgPaths.p3282fb40} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                <path d={svgPaths.p1faef8e0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
              </svg>
              <span
                className="text-[var(--muted)]"
                style={{
                  fontFamily: "var(--font-druk-cy)",
                  fontWeight: "var(--font-weight-heavy)",
                  fontSize: "var(--text-caption)",
                  lineHeight: 1.4,
                  textTransform: "uppercase",
                }}
              >
                Above To
              </span>
              <span
                className="text-[var(--primary)]"
                style={{
                  fontFamily: "var(--font-druk-cy)",
                  fontWeight: "var(--font-weight-heavy)",
                  fontSize: "var(--text-caption)",
                  lineHeight: 1.4,
                  textTransform: "uppercase",
                }}
              >
                Clip
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}