import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import svgPaths from "../../../imports/svg-zclrwjs4v7";

// ─── Circular Waveform Visualizer (matches Tutorial 2 style, audio-reactive) ───

function CaptureWaveform({
  analyserNode,
}: {
  analyserNode: AnalyserNode | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [dims, setDims] = useState({ w: 360, h: 340 });

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
    }))
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
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const s = w / 320;

    const freqData = analyserNode
      ? new Uint8Array(analyserNode.frequencyBinCount)
      : null;

    const draw = () => {
      const now = Date.now() / 1000;
      ctx.clearRect(0, 0, w, h);

      if (analyserNode && freqData) {
        analyserNode.getByteFrequencyData(freqData);
      }

      // Compute average audio level for global reactivity
      let avgLevel = 0;
      if (freqData) {
        for (let i = 0; i < freqData.length; i++) avgLevel += freqData[i];
        avgLevel = avgLevel / freqData.length / 255;
      }
      const isActive = avgLevel > 0.02 || !!analyserNode;

      // ── Ambient radial glow ──
      const glowAlpha = 0.08 + avgLevel * 0.15;
      const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.5);
      glow.addColorStop(0, `rgba(218, 252, 121, ${glowAlpha})`);
      glow.addColorStop(0.5, `rgba(218, 252, 121, ${glowAlpha * 0.3})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // ── Audio-reactive waveform rings ──
      const numWaveRings = 6;
      for (let i = 0; i < numWaveRings; i++) {
        const ringSpeed = 0.4 + avgLevel * 0.4;
        const phase = ((now * ringSpeed + i * (1 / numWaveRings)) % 1);
        const minR = 48 * s;
        const maxR = 160 * s;
        const radius = minR + phase * (maxR - minR);

        const amp1 = Math.sin(now * 3.5 + i * 1.7) * 0.4;
        const amp2 = Math.sin(now * 5.8 + i * 2.3) * 0.25;
        const amp3 = Math.cos(now * 2.1 + i * 0.9) * 0.15;
        const waveAmp = 1 + (0.4 + avgLevel * 1.2) * (amp1 + amp2 + amp3);

        const fadeAlpha = (1 - phase) * (0.18 + avgLevel * 0.25) * Math.max(waveAmp, 0.3);

        ctx.strokeStyle = `rgba(218, 252, 121, ${fadeAlpha})`;
        ctx.lineWidth = (2 + Math.max(waveAmp, 0) * 0.5) * s;
        ctx.beginPath();
        const segments = 64;
        for (let seg = 0; seg <= segments; seg++) {
          const a = (seg / segments) * Math.PI * 2;
          const distortAmt = 0.4 + avgLevel * 1.2;
          const distort =
            Math.sin(a * 4 + now * 4 + i) * 3 * s * waveAmp * distortAmt +
            Math.sin(a * 7 + now * 6) * 1.5 * s * waveAmp * distortAmt;
          const r = radius + distort;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (seg === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // ── Waveform bars radiating outward ──
      const numBars = 48;
      const innerR = 50 * s;
      const maxBarLen = 35 * s;

      for (let i = 0; i < numBars; i++) {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const seed = waveSeeds[i];

        let barLen: number;
        if (analyserNode && freqData) {
          const binIndex = Math.floor((i / numBars) * freqData.length * 0.6);
          const amplitude = freqData[binIndex] / 255;
          barLen = Math.max(3 * s, amplitude * maxBarLen * 1.5 + 2 * s);
        } else {
          const v1 = Math.sin(now * seed.freq1 + seed.phase1 + i * 0.3) * seed.amp1;
          const v2 = Math.sin(now * seed.freq2 + seed.phase2 + i * 0.7) * seed.amp2;
          const v3 = Math.cos(now * seed.freq3 + seed.phase3 + i * 0.15) * seed.amp3;
          const envelope = 0.5 + 0.5 * Math.sin(now * 0.8 + i * 0.12);
          const raw = Math.abs(v1 + v2 + v3) * envelope;
          barLen = Math.max(3 * s, raw * maxBarLen * 0.7);
        }

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + barLen);
        const y2 = cy + Math.sin(angle) * (innerR + barLen);

        const intensity = barLen / maxBarLen;
        const r = Math.round(218 * (1 - intensity * 0.5));
        const g = Math.round(252 * (1 - intensity * 0.3) + 200 * intensity * 0.3);
        const b = Math.round(121 * (1 - intensity * 0.6) + 255 * intensity * 0.6);
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

      // Inner glow core
      const innerGlow = ctx.createRadialGradient(cx, cy, innerR * 0.3, cx, cy, innerR);
      innerGlow.addColorStop(0, `rgba(218, 252, 121, ${0.04 + avgLevel * 0.12})`);
      innerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, analyserNode, waveSeeds]);

  return (
    <div className="w-full flex items-center justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Celebrate Overlay (confetti + checkmark burst) ───

function CelebrateOverlay({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef(Date.now() / 1000);
  const [dims, setDims] = useState({ w: 360, h: 360 });

  const [confetti] = useState(() =>
    Array.from({ length: 50 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.8,
      size: 3 + Math.random() * 6,
      rotSpeed: (Math.random() - 0.5) * 8,
      hue: [70, 80, 170, 190, 350][Math.floor(Math.random() * 5)],
      sat: 70 + Math.random() * 30,
      delay: Math.random() * 0.15,
    }))
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
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const s = w / 320;
    const TOTAL = 2.8;

    const draw = () => {
      const elapsed = Date.now() / 1000 - startRef.current;
      if (elapsed >= TOTAL) {
        onComplete();
        return;
      }
      ctx.clearRect(0, 0, w, h);

      const t = elapsed / TOTAL;
      const intensity = t < 0.15 ? t / 0.15 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;

      // Burst glow
      const burstGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
      burstGlow.addColorStop(0, `rgba(218, 252, 121, ${0.25 * intensity})`);
      burstGlow.addColorStop(0.5, `rgba(218, 252, 121, ${0.08 * intensity})`);
      burstGlow.addColorStop(1, "transparent");
      ctx.fillStyle = burstGlow;
      ctx.fillRect(0, 0, w, h);

      // Expanding rings
      for (let i = 0; i < 3; i++) {
        const ringT = Math.max(0, elapsed - i * 0.15);
        if (ringT <= 0) continue;
        const ringR = ringT * 120 * s;
        const ringAlpha = Math.max(0, (1 - ringT / 1.5) * 0.3 * intensity);
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

      // Circle behind check
      const btnGrad = ctx.createRadialGradient(0, -10 * s, 0, 0, 0, 44 * s);
      btnGrad.addColorStop(0, "rgba(218, 252, 121, 1)");
      btnGrad.addColorStop(1, "rgba(180, 220, 80, 1)");
      ctx.beginPath();
      ctx.arc(0, 0, 44 * s, 0, Math.PI * 2);
      ctx.fillStyle = btnGrad;
      ctx.fill();

      // Checkmark
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
        const labelAlpha = Math.min((elapsed - 0.4) / 0.3, 1) * intensity;
        ctx.save();
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = "rgba(218, 252, 121, 1)";
        ctx.font = `700 ${14 * s}px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("Last 2 min saved!", cx, cy + 52 * s);
        ctx.restore();
      }

      // Confetti
      confetti.forEach((p) => {
        const pt = Math.max(0, elapsed - p.delay);
        if (pt <= 0) return;

        const dist = pt * p.speed * 90 * s;
        const gravity = pt * pt * 20 * s;
        const px = cx + Math.cos(p.angle) * dist;
        const py = cy + Math.sin(p.angle) * dist + gravity * 0.3;
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
          p.size * s * 0.6
        );
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, confetti, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center z-20"
    >
      <canvas ref={canvasRef} />
    </motion.div>
  );
}

// ─── Main Capture Screen ───

interface Screen2Props {
  onClipSaved: (audioBlob: Blob | null) => void;
}

export function Screen2FirstClip({ onClipSaved }: Screen2Props) {
  const [headerPhase, setHeaderPhase] = useState<"learn" | "goAhead">("learn");
  const [showClipButton, setShowClipButton] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [analyserReady, setAnalyserReady] = useState<AnalyserNode | null>(null);

  // Start mic on mount
  useEffect(() => {
    let cancelled = false;

    async function startMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);

        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
        setAnalyserReady(analyser);

        // Start recording
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start();
      } catch {
        // Mic denied — continue without audio
      }
    }

    startMic();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  // Animate header phases
  useEffect(() => {
    const t1 = setTimeout(() => setHeaderPhase("goAhead"), 2200);
    return () => clearTimeout(t1);
  }, []);

  // Animate clip button appearance
  useEffect(() => {
    const t = setTimeout(() => setShowClipButton(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleClip = useCallback(() => {
    if (isCelebrating) return;
    setIsCelebrating(true);
  }, [isCelebrating]);

  const handleCelebrateComplete = useCallback(() => {
    // Stop recording and gather blob
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
        }
        onClipSaved(blob);
      };
      recorder.stop();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      onClipSaved(null);
    }
  }, [onClipSaved]);

  return (
    <div
      className="flex flex-col items-center h-full w-full relative"
      style={{
        backgroundColor: "var(--background)",
        paddingTop: "var(--page-pt)",
        paddingBottom: "var(--page-pb)",
        paddingLeft: "var(--page-px)",
        paddingRight: "var(--page-px)",
      }}
    >
      {/* Header copy */}
      <div className="text-center mb-4 w-full" style={{ minHeight: 72, maxWidth: "var(--page-max-w)" }}>
        <AnimatePresence mode="wait">
          {headerPhase === "learn" && (
            <motion.div
              key="learn"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-2"
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
                Learn how to clip
              </h4>
            </motion.div>
          )}

          {headerPhase === "goAhead" && !isCelebrating && (
            <motion.div
              key="goAhead"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-2"
            >
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
                Say something, anything!
              </h4>
              <div className="flex items-center justify-center gap-2 mt-1">
                <motion.div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: "var(--destructive)" }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
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
            </motion.div>
          )}

          {isCelebrating && (
            <motion.div
              key="celebrating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
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
      </div>

      {/* Waveform area */}
      <div className="flex-1 flex items-center justify-center w-full relative" style={{ maxWidth: "var(--page-max-w)" }}>
        {!isCelebrating && (
          <CaptureWaveform analyserNode={analyserReady} />
        )}

        <AnimatePresence>
          {isCelebrating && (
            <CelebrateOverlay onComplete={handleCelebrateComplete} />
          )}
        </AnimatePresence>
      </div>

      {/* Clip button — animated entrance */}
      <div className="w-full flex flex-col items-center gap-4" style={{ maxWidth: "var(--page-max-w)" }}>
        <AnimatePresence>
          {showClipButton && !isCelebrating && (
            <motion.div
              key="clip-btn-wrapper"
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className="relative flex items-center justify-center"
            >
              {/* Glow ring */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 134,
                  height: 134,
                  background:
                    "radial-gradient(circle, rgba(218, 252, 121, 0.15) 0%, transparent 70%)",
                }}
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.button
                onClick={handleClip}
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="relative z-10 flex items-center justify-center"
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: "var(--radius-button)",
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                  fontFamily: "var(--font-druk-cy)",
                  fontWeight: "var(--font-weight-heavy)",
                  fontSize: "var(--text-base)",
                  letterSpacing: "0.05em",
                  boxShadow: "0 0 30px rgba(218, 252, 121, 0.3)",
                }}
              >
                CLIP
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint text below button */}
        <AnimatePresence>
          {showClipButton && !isCelebrating && (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center flex items-center justify-center gap-1.5"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}