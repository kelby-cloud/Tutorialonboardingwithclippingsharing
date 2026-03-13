import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import svgPaths from "../../../imports/svg-zclrwjs4v7";
import { Haptics } from "../../utils/haptics";

// ─── Avatar Photos ───

const AVATAR_URLS = [
  "https://images.unsplash.com/photo-1590367659785-030ce7d94069?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
  "https://images.unsplash.com/photo-1758598305858-0a8f62958c93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
  "https://images.unsplash.com/photo-1689258077068-75eb291e503b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
  "https://images.unsplash.com/photo-1676253135268-2bf3095dfcc9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
  "https://images.unsplash.com/photo-1588376483402-acc965d4ac21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
  "https://images.unsplash.com/photo-1662695089339-a2c24231a3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
];

// Design system font stack for canvas text (matches --font-sf-pro)
const sfProStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
const sfFont = sfProStack;

function useLoadedImages(urls: string[]) {
  const [images, setImages] = useState<(HTMLImageElement | null)[]>(
    () => urls.map(() => null)
  );

  useEffect(() => {
    let cancelled = false;
    const loaded: (HTMLImageElement | null)[] = urls.map(() => null);

    urls.forEach((url, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        loaded[i] = img;
        setImages([...loaded]);
      };
      img.src = url;
    });

    return () => { cancelled = true; };
  }, [urls.join(",")]);

  return images;
}

function drawCircleImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  radius: number,
  borderColor?: string,
  borderWidth?: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img) {
    // "object-fit: cover" — crop from center to fill the circle perfectly
    const size = radius * 2;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const imgMin = Math.min(imgW, imgH);
    const sx = (imgW - imgMin) / 2;
    const sy = (imgH - imgMin) / 2;
    ctx.drawImage(img, sx, sy, imgMin, imgMin, x - radius, y - radius, size, size);
  } else {
    ctx.fillStyle = "rgba(155, 155, 155, 0.2)";
    ctx.fill();
  }
  ctx.restore();

  if (borderColor && borderWidth) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }
}

// ─── Canvas Illustrations ───

// Inline rotate-back icon for use in text (title/caption)
function InlineClipIcon({ size = "1em", className = "" }: { size?: string; className?: string }) {
  return (
    <svg
      className={`inline-block align-middle ${className}`}
      style={{ width: size, height: size, verticalAlign: "middle", marginTop: "-0.1em" }}
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
  );
}

function useResponsiveCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>, bleed = 60) {
  const [dims, setDims] = useState({ w: 360, h: 340, bleed });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const update = () => {
      const w = Math.min(parent.clientWidth, 520);
      const h = Math.min(w * 0.85, 440);
      setDims({ w, h, bleed });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [canvasRef, bleed]);

  return dims;
}

// Helper: set up a canvas with bleed area so animations can extend beyond the logical bounds.
// Returns the 2d context (already translated) and full dimensions for clearRect.
function initCanvasWithBleed(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  bleed: number,
) {
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  const fullW = w + bleed * 2;
  const fullH = h + bleed * 2;
  canvas.width = fullW * dpr;
  canvas.height = fullH * dpr;
  canvas.style.width = `${fullW}px`;
  canvas.style.height = `${fullH}px`;
  canvas.style.margin = `-${bleed}px`;
  ctx.scale(dpr, dpr);
  ctx.translate(bleed, bleed);
  return { ctx, fullW, fullH, bleed };
}

// ─── Soundbite caption pool — shared across all 4 cycling users ───
const SOUNDBITE_POOL = [
  "Clip that 🔥", "You just got reclipped 💀", "Yoo!! clip that 😂",
  "Reclip that rn 🤣", "Bro clip it 🫠", "That needs a reclip 👀",
  "no way he said that…", "wait go back…", "bro listen to this…",
  "she was like what…", "yo replay that…", "say that again…",
  "hold on what 😳", "that was crazy…", "I'm screaming 😂",
  "not him saying that…", "send that to me…", "play it back 🔁",
];

// Each position cycles with a staggered interval so they don't all swap at once
const CYCLE_INTERVALS = [5200, 4800, 5500, 5000]; // ms per position (+2s)
const AVATAR_COUNT = AVATAR_URLS.length; // 6

function WaveformPeopleIllustration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dims = useResponsiveCanvas(canvasRef);
  const avatars = useLoadedImages(AVATAR_URLS); // load all 6

  // Per-position cycling indices: { avatar, caption }
  // Each position starts with a unique offset so they don't collide
  const [cycleState, setCycleState] = useState(() => [
    { avatar: 0, caption: 0 },
    { avatar: 1, caption: 4 },
    { avatar: 2, caption: 8 },
    { avatar: 3, caption: 12 },
  ]);

  // Staggered cycling timers — one per position, with deduplication
  useEffect(() => {
    const timers = CYCLE_INTERVALS.map((ms, posIdx) =>
      setInterval(() => {
        setCycleState((prev) => {
          const next = [...prev];
          // Collect indices currently used by OTHER positions
          const usedAvatars = new Set(prev.filter((_, j) => j !== posIdx).map((s) => s.avatar));
          const usedCaptions = new Set(prev.filter((_, j) => j !== posIdx).map((s) => s.caption));
          // Find next avatar that isn't used by another position
          let newAvatar = (prev[posIdx].avatar + 1) % AVATAR_COUNT;
          let attempts = 0;
          while (usedAvatars.has(newAvatar) && attempts < AVATAR_COUNT) {
            newAvatar = (newAvatar + 1) % AVATAR_COUNT;
            attempts++;
          }
          // Find next caption that isn't used by another position
          let newCaption = (prev[posIdx].caption + 1) % SOUNDBITE_POOL.length;
          attempts = 0;
          while (usedCaptions.has(newCaption) && attempts < SOUNDBITE_POOL.length) {
            newCaption = (newCaption + 1) % SOUNDBITE_POOL.length;
            attempts++;
          }
          next[posIdx] = { avatar: newAvatar, caption: newCaption };
          return next;
        });
      }, ms),
    );
    return () => timers.forEach(clearInterval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, fullW, fullH, bleed } = initCanvasWithBleed(canvas, dims.w, dims.h, dims.bleed);

    const draw = () => {
      const t = Date.now() / 1000;
      ctx.clearRect(-bleed, -bleed, fullW, fullH);
      const w = dims.w;
      const h = dims.h;
      const scale = w / 320;

      // Ambient glow
      const glow = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.5);
      glow.addColorStop(0, "rgba(0, 200, 255, 0.12)");
      glow.addColorStop(0.5, "rgba(218, 252, 121, 0.06)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(-bleed, -bleed, fullW, fullH);

      // Horizontal waveform bars
      const barCount = 64;
      const barW = w / barCount;
      const waveY = h * 0.5;
      for (let i = 0; i < barCount; i++) {
        const x = i * barW;
        const wave1 = Math.sin(t * 3.2 + i * 0.25) * 0.4;
        const wave2 = Math.sin(t * 5.5 + i * 0.15) * 0.25;
        const wave3 = Math.cos(t * 1.8 + i * 0.4) * 0.15;
        const amplitude = Math.abs(wave1 + wave2 + wave3);
        const barH = Math.max(2, amplitude * h * 0.35);
        const y = waveY - barH / 2;
        const hue = 70 + (i / barCount) * 40;
        const alpha = 0.15 + amplitude * 0.3;
        ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barW * 0.6, barH, barW * 0.3);
        ctx.fill();
      }

      // Expanding ring pulses
      for (let r = 0; r < 3; r++) {
        const phase = ((t * 0.4 + r * 0.33) % 1);
        const radius = 30 * scale + phase * 120 * scale;
        const alpha = (1 - phase) * 0.1;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.5, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(218, 252, 121, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // All four avatar positions — center user shifted up 32px
      const positions = [
        { x: w * 0.18, y: h * 0.35 - 32 },
        { x: w * 0.5,  y: h * 0.48 - 32 },
        { x: w * 0.82, y: h * 0.35 - 32 },
        { x: w * 0.5,  y: h * 0.76 },
      ];
      // Unified --primary green glow & ring for all users
      const glowColor = "rgba(218, 252, 121, 0.12)";
      const ringAccent = "rgba(218, 252, 121, 0.7)";

      // Pre-compute bobbed Y for all (same formula everywhere)
      const bobYs = positions.map((pos, i) => pos.y + Math.sin(t * 1.5 + i * 2.1) * 4);

      // Connecting lines: top-row pairs (0↔1, 1↔2)
      for (let i = 0; i < 2; i++) {
        const from = positions[i];
        const to = positions[i + 1];
        const la = 0.06 + Math.sin(t * 1.5 + i) * 0.03;
        ctx.strokeStyle = `rgba(155, 155, 155, ${la})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(from.x, bobYs[i]);
        const cpx = (from.x + to.x) / 2;
        const cpy = Math.min(bobYs[i], bobYs[i + 1]) - 30 * scale;
        ctx.quadraticCurveTo(cpx, cpy, to.x, bobYs[i + 1]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Connecting line: 4th user ↔ center user
      {
        const la = 0.06 + Math.sin(t * 1.5 + 3) * 0.03;
        ctx.strokeStyle = `rgba(155, 155, 155, ${la})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(positions[3].x, bobYs[3]);
        ctx.quadraticCurveTo(
          positions[3].x, (bobYs[3] + bobYs[1]) / 2 - 15 * scale,
          positions[1].x, bobYs[1],
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw all 4 users — unified avatar / glow / ring / caption styling
      positions.forEach((pos, i) => {
        const avatarR = (i === 1 ? 30 : 24) * scale;
        const bobY = bobYs[i];

        // Resolve cycling avatar image & caption for this position
        const avatarImg = avatars[cycleState[i].avatar];
        const caption = SOUNDBITE_POOL[cycleState[i].caption];

        // Glow — unified --primary green
        const aGlow = ctx.createRadialGradient(pos.x, bobY, avatarR * 0.5, pos.x, bobY, avatarR * 2.5);
        aGlow.addColorStop(0, glowColor);
        aGlow.addColorStop(1, "transparent");
        ctx.fillStyle = aGlow;
        ctx.fillRect(pos.x - avatarR * 2.5, bobY - avatarR * 2.5, avatarR * 5, avatarR * 5);

        // Ring pulse — identical speed & range for every user
        const ringPhase = ((t * 2 + i * 1.1) % 1);
        const ringR = avatarR + ringPhase * 12 * scale;
        const ringAlpha = (1 - ringPhase) * 0.3;
        ctx.beginPath();
        ctx.arc(pos.x, bobY, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(218, 252, 121, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Avatar circle — --primary green accent border for all
        drawCircleImage(ctx, avatarImg, pos.x, bobY, avatarR, ringAccent, 2 * scale);

        // ── Caption bubble — primary green accent style for ALL users ──
        const floatOffset = Math.sin(t * 1.2 + i * 1.5) * 3;
        const bubbleY = bobY - avatarR - 22 * scale;
        const bubbleH = 22 * scale;
        ctx.font = `600 ${11.5 * scale}px ${sfFont}`;
        const tw = ctx.measureText(caption).width;
        const bw = tw + 20 * scale;
        const bx = pos.x - bw / 2;

        // Crossfade synced to each position's staggered cycle interval
        const cycleMs = CYCLE_INTERVALS[i];
        const cycleFrac = ((t * 1000 / cycleMs) % 1);
        const fadeAlpha = cycleFrac < 0.08
          ? cycleFrac / 0.08
          : cycleFrac > 0.92
            ? (1 - cycleFrac) / 0.08
            : 1;

        ctx.save();
        ctx.globalAlpha = fadeAlpha * 0.92;
        // Dark bubble bg
        ctx.fillStyle = "rgba(30, 30, 30, 0.92)";
        ctx.beginPath();
        ctx.roundRect(bx, bubbleY + floatOffset - bubbleH / 2, bw, bubbleH, 10 * scale);
        ctx.fill();
        // --primary accent border
        ctx.strokeStyle = "rgba(218, 252, 121, 0.35)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // --primary colored text
        ctx.fillStyle = "rgba(218, 252, 121, 0.95)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(caption, pos.x, bubbleY + floatOffset);
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, avatars, cycleState]);

  return (
    <div className="w-full flex items-center justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
}

function ClipButtonBurstIllustration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dims = useResponsiveCanvas(canvasRef);
  const tapTimeRef = useRef<number | null>(null);
  const btnCenterRef = useRef({ x: 0, y: 0, r: 0 });
  const autoStartedRef = useRef(false);

  const PRESS_DUR = 0.6;
  const CELEBRATE_DUR = 2.5;
  const WINDDOWN_DUR = 1.5;
  const TOTAL_ANIM = PRESS_DUR + CELEBRATE_DUR + WINDDOWN_DUR;

  const [confetti] = useState(() =>
    Array.from({ length: 30 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      size: 4 + Math.random() * 6,
      hue: Math.random() * 360,
      sat: 60 + Math.random() * 30,
      delay: Math.random() * 0.4,
      rotSpeed: (Math.random() - 0.5) * 8,
    }))
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!autoStartedRef.current) {
        autoStartedRef.current = true;
        tapTimeRef.current = Date.now() / 1000;
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleCanvasTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const b = dims.bleed;
    const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
    const x = (clientX - rect.left) * scaleX - b;
    const y = (clientY - rect.top) * scaleY - b;
    const btn = btnCenterRef.current;
    const dist = Math.sqrt((x - btn.x) ** 2 + (y - btn.y) ** 2);
    if (dist < btn.r * 1.5) {
      Haptics.medium();
      tapTimeRef.current = Date.now() / 1000;
    }
  }, [dims.bleed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, fullW, fullH, bleed } = initCanvasWithBleed(canvas, dims.w, dims.h, dims.bleed);

    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const s = dims.w / 320;

    function drawRotateBackIcon(cxI: number, cyI: number, size: number, color: string) {
      const iconScale = size / 80;
      ctx.save();
      ctx.translate(cxI - 37 * iconScale, cyI - 41 * iconScale);
      ctx.scale(iconScale, iconScale);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const paths = [
        svgPaths.p1c212380, svgPaths.p22976d80, svgPaths.p4656700,
        svgPaths.p1da536dc, svgPaths.p26a7ae00, svgPaths.p3282fb40, svgPaths.p1faef8e0,
      ];
      for (const d of paths) {
        const p = new Path2D(d);
        ctx.stroke(p);
      }
      ctx.restore();
    }

    const draw = () => {
      const now = Date.now() / 1000;
      ctx.clearRect(-bleed, -bleed, fullW, fullH);

      let isIdle = true;
      let isPress = false;
      let isCelebrate = false;
      let isWindDown = false;
      let timeSinceTap = 0;

      if (tapTimeRef.current !== null) {
        timeSinceTap = now - tapTimeRef.current;
        if (timeSinceTap >= TOTAL_ANIM) {
          tapTimeRef.current = now;
          timeSinceTap = 0;
          isIdle = false;
          isPress = true;
        } else if (timeSinceTap < PRESS_DUR) {
          isIdle = false;
          isPress = true;
        } else if (timeSinceTap < PRESS_DUR + CELEBRATE_DUR) {
          isIdle = false;
          isCelebrate = true;
        } else {
          isIdle = false;
          isWindDown = true;
        }
      }

      const pressProgress = isPress ? timeSinceTap / PRESS_DUR : 0;
      const celebElapsed = isCelebrate ? timeSinceTap - PRESS_DUR : 0;
      const windDownProgress = isWindDown ? (timeSinceTap - PRESS_DUR - CELEBRATE_DUR) / WINDDOWN_DUR : 0;
      const windDownEase = windDownProgress * windDownProgress * (3 - 2 * windDownProgress);
      const celebActive = isCelebrate || isWindDown;
      const celebIntensity = isCelebrate
        ? Math.min(celebElapsed / 0.4, 1)
        : isWindDown ? 1 - windDownEase : 0;

      // Ambient radial glow
      const glowAlpha = celebActive
        ? 0.1 + celebIntensity * (0.05 + Math.sin(celebElapsed * 4) * 0.1)
        : 0.1;
      const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, fullW * 0.5);
      glow.addColorStop(0, `rgba(218, 252, 121, ${glowAlpha})`);
      glow.addColorStop(0.5, `rgba(218, 252, 121, ${glowAlpha * 0.3})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(-bleed, -bleed, fullW, fullH);

      // Audio-reactive waveform rings
      const numWaveRings = 6;
      for (let i = 0; i < numWaveRings; i++) {
        const ringSpeed = celebActive ? 0.6 + 0.6 * celebIntensity : 0.6;
        const phase = ((now * ringSpeed + i * (1 / numWaveRings)) % 1);
        const minR = 48 * s;
        const maxR = 160 * s;
        const radius = minR + phase * (maxR - minR);
        const amp1 = Math.sin(now * 3.5 + i * 1.7) * 0.4;
        const amp2 = Math.sin(now * 5.8 + i * 2.3) * 0.25;
        const amp3 = Math.cos(now * 2.1 + i * 0.9) * 0.15;
        const waveAmp = 1 + amp1 + amp2 + amp3;
        const fadeAlpha = (1 - phase) * 0.35 * waveAmp;

        if (celebActive && celebIntensity > 0.01) {
          if (i % 2 === 0) {
            ctx.strokeStyle = `rgba(218, 252, 121, ${fadeAlpha})`;
          } else {
            const r = Math.round(218 * (1 - celebIntensity) + 0 * celebIntensity);
            const g = Math.round(252 * (1 - celebIntensity) + 200 * celebIntensity);
            const b = Math.round(121 * (1 - celebIntensity) + 255 * celebIntensity);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${fadeAlpha})`;
          }
        } else {
          ctx.strokeStyle = `rgba(218, 252, 121, ${fadeAlpha})`;
        }

        ctx.lineWidth = (2 + waveAmp) * s;
        ctx.beginPath();
        const segments = 64;
        for (let seg = 0; seg <= segments; seg++) {
          const a = (seg / segments) * Math.PI * 2;
          const distort =
            Math.sin(a * 4 + now * 4 + i) * 3 * s * waveAmp +
            Math.sin(a * 7 + now * 6) * 1.5 * s * waveAmp;
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
      for (let i = 0; i < numBars; i++) {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const wave1 = Math.sin(now * 3.2 + i * 0.5) * 12 * s;
        const wave2 = Math.sin(now * 5.5 + i * 0.9) * 8 * s;
        const wave3 = Math.cos(now * 2.0 + i * 0.3) * 5 * s;
        let barLen = Math.abs(wave1 + wave2 + wave3) + 4 * s;
        if (celebActive) barLen *= 1 + celebIntensity * 1.5;
        const innerR = 50 * s;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + barLen);
        const y2 = cy + Math.sin(angle) * (innerR + barLen);
        const barAlpha = 0.3 + (barLen / (40 * s)) * 0.5;
        const hueRange = celebActive ? 30 + celebIntensity * 90 : 30;
        const hue = 70 + (i / numBars) * hueRange;
        ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${Math.min(barAlpha, 0.85)})`;
        ctx.lineWidth = 2.5 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Center button
      let btnRadius = 44 * s;
      const btnColor1 = "rgba(218, 252, 121, 1)";
      const btnColor2 = "rgba(180, 220, 80, 1)";
      if (isPress) {
        const squish = 1 - Math.sin(pressProgress * Math.PI) * 0.18;
        btnRadius *= squish;
      }
      if (celebActive) {
        btnRadius *= 1 + celebIntensity * 0.08;
        if (isCelebrate) {
          const pulse = Math.sin(celebElapsed * 6) * 0.05;
          btnRadius *= 1 + pulse;
        }
      }
      btnCenterRef.current = { x: cx, y: cy, r: 44 * s };

      if (celebActive && celebIntensity > 0.01) {
        const outerGlow = ctx.createRadialGradient(cx, cy, btnRadius, cx, cy, btnRadius * 2.2);
        outerGlow.addColorStop(0, `rgba(218, 252, 121, ${0.25 * celebIntensity})`);
        outerGlow.addColorStop(1, "transparent");
        ctx.fillStyle = outerGlow;
        ctx.fillRect(-bleed, -bleed, fullW, fullH);
      }

      const btnGrad = ctx.createRadialGradient(cx, cy - btnRadius * 0.3, 0, cx, cy, btnRadius);
      btnGrad.addColorStop(0, btnColor1);
      btnGrad.addColorStop(1, btnColor2);
      ctx.beginPath();
      ctx.arc(cx, cy, btnRadius, 0, Math.PI * 2);
      ctx.fillStyle = btnGrad;
      ctx.fill();

      // Icon / text in button
      if (celebActive && celebIntensity > 0.01) {
        const checkAlpha = isCelebrate ? Math.min(celebElapsed / 0.3, 1) : celebIntensity;
        ctx.save();
        ctx.globalAlpha = checkAlpha;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
        ctx.lineWidth = 3.5 * s;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 12 * s, cy - 1 * s);
        ctx.lineTo(cx - 3 * s, cy + 9 * s);
        ctx.lineTo(cx + 14 * s, cy - 8 * s);
        ctx.stroke();
        ctx.restore();

        if (isWindDown) {
          ctx.save();
          ctx.globalAlpha = windDownEase;
          drawRotateBackIcon(cx, cy, btnRadius * 1.1, "rgba(0, 0, 0, 0.9)");
          ctx.restore();
        }

        const labelFadeIn = isCelebrate ? Math.min((celebElapsed - 0.3) / 0.3, 1) : 1;
        const labelAlpha = isCelebrate ? labelFadeIn : Math.max(0, labelFadeIn) * (1 - windDownEase);
        if (labelAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, labelAlpha);
          ctx.fillStyle = "rgba(218, 252, 121, 1)";
          ctx.font = `700 ${14 * s}px ${sfFont}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText("Last 2 min saved!", cx, cy + btnRadius + 16 * s);
          ctx.restore();
        }
      } else {
        drawRotateBackIcon(cx, cy, btnRadius * 1.1, "rgba(0, 0, 0, 0.9)");
      }

      // Confetti
      if (celebActive) {
        const confettiElapsed = isCelebrate ? celebElapsed : CELEBRATE_DUR;
        confetti.forEach((p) => {
          const pt = Math.max(0, confettiElapsed - p.delay);
          if (pt <= 0) return;
          const dist = pt * p.speed * 90 * s;
          const gravity = pt * pt * 20 * s;
          const px = cx + Math.cos(p.angle) * dist;
          const py = cy + Math.sin(p.angle) * dist + gravity * 0.3;
          const baseFade = 1 - pt / 4.2;
          const alpha = Math.max(0, baseFade * (isWindDown ? (1 - windDownEase) : 1));
          if (alpha <= 0) return;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(pt * p.rotSpeed);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 65%, 1)`;
          ctx.fillRect(-p.size * s * 0.5, -p.size * s * 0.3, p.size * s, p.size * s * 0.6);
          ctx.restore();
        });
      }

      // Burst flash on press
      if (isPress && pressProgress > 0.5) {
        const flashAlpha = (1 - (pressProgress - 0.5) * 2) * 0.3;
        if (flashAlpha > 0) {
          const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 * s);
          flash.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
          flash.addColorStop(1, "transparent");
          ctx.fillStyle = flash;
          ctx.fillRect(-bleed, -bleed, fullW, fullH);
        }
      }

      // Idle: subtle hint pulse
      if (isIdle) {
        const hintPhase = (now * 1.5) % 1;
        const hintAlpha = Math.sin(hintPhase * Math.PI) * 0.15;
        ctx.beginPath();
        ctx.arc(cx, cy, 44 * s + 8 * s * hintPhase, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(218, 252, 121, ${hintAlpha})`;
        ctx.lineWidth = 2 * s;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, confetti]);

  return (
    <div className="w-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasTap}
        onTouchStart={handleCanvasTap}
        style={{ cursor: "pointer" }}
      />
    </div>
  );
}

function ShareMomentIllustration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dims = useResponsiveCanvas(canvasRef);
  const avatars = useLoadedImages(AVATAR_URLS);

  // Refs for HTML emoji overlay (iOS Safari can't render emoji via canvas fillText)
  const emojiElRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const emojiDataRef = useRef<string[]>(["😂", "🔥", "❤️", "😮", "💀", "🤣"]);
  const emojiScaleRef = useRef<number[]>([1, 1, 1, 1, 1, 1]);
  const emojiLastReceiveRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);

  // Pre-generate transfer schedule (sender → receiver pairs)
  const [transfers] = useState(() =>
    Array.from({ length: 10 }, () => ({
      from: Math.floor(Math.random() * 6),
      to: Math.floor(Math.random() * 6),
      delay: Math.random() * 13,
    })).map((t) => {
      if (t.from === t.to) {
        t.to = (t.to + 1) % 6;
      }
      return t;
    })
  );

  const emojiPool = ["😂", "🔥", "❤️", "😮", "💀", "🤣", "😭", "🫠", "💯", "👀", "🤯", "😤", "🥹", "✨", "💜"];

  // Pre-generate waveform seeds for realistic audio feel
  const [waveSeeds] = useState(() =>
    Array.from({ length: 64 }, () => ({
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
    const { ctx, fullW, fullH, bleed } = initCanvasWithBleed(canvas, dims.w, dims.h, dims.bleed);

    const cx = dims.w / 2;
    const scale = dims.w / 320;
    const centerY = dims.h * 0.45;
    const orbitRadius = 105 * scale;
    const avatarR = 22 * scale;
    const ORBIT_SPEED = 10; // degrees per second clockwise

    const friendBaseAngles = [-90, -30, 30, 90, 150, 210];
    const friendRings = [
      "rgba(218, 252, 121, 0.7)",
      "rgba(0, 200, 255, 0.7)",
      "rgba(252, 49, 88, 0.6)",
      "rgba(218, 252, 121, 0.7)",
      "rgba(0, 200, 255, 0.7)",
      "rgba(218, 252, 121, 0.6)",
    ];

    function getFriendPos(index: number, t: number) {
      const angle = friendBaseAngles[index] + t * ORBIT_SPEED;
      const rad = (angle * Math.PI) / 180;
      return {
        x: cx + Math.cos(rad) * orbitRadius,
        y: centerY + Math.sin(rad) * orbitRadius * 0.6,
      };
    }

    const clipPaths = [
      "M3.68557 35.1377C4.23205 33.487 4.91121 31.8806 5.71678 30.3332",
      "M2.26799 49.8001C2.08832 48.399 1.99882 46.9883 2.00001 45.5764C2.00001 44.4777 2.05309 43.3929 2.15925 42.3218",
      "M7.39457 63.7008C6.07093 61.6686 4.97343 59.5056 4.12055 57.2482",
      "M18.1682 74.2187C16.0579 72.917 14.0971 71.3999 12.3192 69.6932",
      "M32.9925 79.3022C30.4675 79.0245 27.9813 78.4795 25.5784 77.6768",
      "M29.1864 11.4282H36.954C55.529 11.481 70.8392 25.5896 71.8645 43.5988C72.8897 61.6081 59.2742 77.2693 40.8183 79.3098",
      "M42.7796 2.00018L29.1864 11.4282L42.7796 20.8562",
    ];

    function drawTravelingClipIcon(x: number, y: number, size: number, color: string, alpha: number) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(218, 252, 121, 0.2)";
      ctx.fill();
      ctx.strokeStyle = "rgba(218, 252, 121, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const svgW = 73.9189;
      const svgH = 81.448;
      const iconScale = size / Math.max(svgW, svgH);
      ctx.translate(x - (svgW * iconScale) / 2, y - (svgH * iconScale) / 2);
      ctx.scale(iconScale, iconScale);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const d of clipPaths) {
        const p = new Path2D(d);
        ctx.stroke(p);
      }
      ctx.restore();
    }

    function quadBezier(
      p0x: number, p0y: number,
      cpx: number, cpy: number,
      p1x: number, p1y: number,
      t: number
    ) {
      const mt = 1 - t;
      return {
        x: mt * mt * p0x + 2 * mt * t * cpx + t * t * p1x,
        y: mt * mt * p0y + 2 * mt * t * cpy + t * t * p1y,
      };
    }

    const CYCLE = 13;
    const TRANSFER_DUR = 1.0;

    const draw = () => {
      const now = Date.now() / 1000;
      const cycleT = now % CYCLE;
      ctx.clearRect(-bleed, -bleed, fullW, fullH);

      // ── Ambient glow ──
      const glow = ctx.createRadialGradient(cx, centerY, 10, cx, centerY, fullW * 0.5);
      glow.addColorStop(0, "rgba(0, 200, 255, 0.1)");
      glow.addColorStop(0.4, "rgba(218, 252, 121, 0.05)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(-bleed, -bleed, fullW, fullH);

      // ── Center audio-reactive circular waveform ──
      const numBars = 48;
      const innerR = 30 * scale;
      const maxBarLen = 35 * scale;

      for (let i = 0; i < numBars; i++) {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const seed = waveSeeds[i % waveSeeds.length];

        // Multi-frequency synthesis for realistic audio
        const v1 = Math.sin(now * seed.freq1 + seed.phase1 + i * 0.3) * seed.amp1;
        const v2 = Math.sin(now * seed.freq2 + seed.phase2 + i * 0.7) * seed.amp2;
        const v3 = Math.cos(now * seed.freq3 + seed.phase3 + i * 0.15) * seed.amp3;
        // Envelope modulation — natural volume swells
        const envelope = 0.5 + 0.5 * Math.sin(now * 0.8 + i * 0.12);
        const raw = Math.abs(v1 + v2 + v3) * envelope;
        const barLen = Math.max(3 * scale, raw * maxBarLen);

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = centerY + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + barLen);
        const y2 = centerY + Math.sin(angle) * (innerR + barLen);

        // Color shifts between primary green and accent blue based on intensity
        const intensity = raw;
        const r = Math.round(218 * (1 - intensity * 0.5) + 0 * intensity * 0.5);
        const g = Math.round(252 * (1 - intensity * 0.3) + 200 * intensity * 0.3);
        const b = Math.round(121 * (1 - intensity * 0.6) + 255 * intensity * 0.6);
        const barAlpha = 0.35 + intensity * 0.55;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${barAlpha})`;
        ctx.lineWidth = 2.5 * scale;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Outer wavy ring around waveform (audio-reactive contour)
      ctx.beginPath();
      const ringSegments = 72;
      for (let i = 0; i <= ringSegments; i++) {
        const angle = (i / ringSegments) * Math.PI * 2;
        const seed = waveSeeds[i % waveSeeds.length];
        const distort =
          Math.sin(now * seed.freq1 + angle * 3) * 4 * scale +
          Math.sin(now * seed.freq2 + angle * 5) * 2 * scale;
        const r = innerR + maxBarLen * 0.6 + distort;
        const px = cx + Math.cos(angle) * r;
        const py = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(218, 252, 121, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner glow core
      const innerGlow = ctx.createRadialGradient(cx, centerY, innerR * 0.3, cx, centerY, innerR);
      innerGlow.addColorStop(0, "rgba(218, 252, 121, 0.08)");
      innerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(cx, centerY, innerR, 0, Math.PI * 2);
      ctx.fill();

      // ── Orbiting friend positions (clockwise) ──
      const friendPositions = friendBaseAngles.map((_, i) => getFriendPos(i, now));

      // ── Dashed connection lines from friends to center ──
      friendPositions.forEach((pos, i) => {
        const lineAlpha = 0.08 + Math.sin(now * 1.5 + i) * 0.04;
        ctx.strokeStyle = `rgba(155, 155, 155, ${lineAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(cx, centerY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Process transfers — update emojis on receive ──
      transfers.forEach((tr) => {
        const elapsed = cycleT - tr.delay;
        if (elapsed >= TRANSFER_DUR && elapsed < TRANSFER_DUR + 0.05) {
          const currentEmoji = emojiDataRef.current[tr.to];
          let newEmoji = currentEmoji;
          while (newEmoji === currentEmoji) {
            newEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
          }
          emojiDataRef.current[tr.to] = newEmoji;
          emojiScaleRef.current[tr.to] = 1.6;
          emojiLastReceiveRef.current[tr.to] = now;
        }
      });

      // Decay emoji pop scales
      for (let i = 0; i < 6; i++) {
        if (emojiScaleRef.current[i] > 1) {
          emojiScaleRef.current[i] = Math.max(1, emojiScaleRef.current[i] - 0.03);
        }
      }

      // ── Draw orbiting friend avatars ──
      friendPositions.forEach((pos, i) => {
        // Glow behind avatar
        const glowR = ctx.createRadialGradient(pos.x, pos.y, avatarR * 0.5, pos.x, pos.y, avatarR * 2);
        glowR.addColorStop(0, friendRings[i].replace(/[\d.]+\)$/, "0.12)"));
        glowR.addColorStop(1, "transparent");
        ctx.fillStyle = glowR;
        ctx.fillRect(pos.x - avatarR * 2, pos.y - avatarR * 2, avatarR * 4, avatarR * 4);

        // Receive pulse
        const timeSinceReceive = now - emojiLastReceiveRef.current[i];
        const receivePulse = timeSinceReceive < 0.5 ? 1 - timeSinceReceive / 0.5 : 0;
        if (receivePulse > 0) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, avatarR + 6 * scale * receivePulse, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(218, 252, 121, ${receivePulse * 0.6})`;
          ctx.lineWidth = 2.5 * scale;
          ctx.stroke();
        }

        drawCircleImage(ctx, avatars[i], pos.x, pos.y, avatarR, friendRings[i], 2 * scale);

        // ── Update HTML emoji overlay position (iOS-safe: no canvas fillText for emoji) ──
        const emojiSize = 22 * scale * emojiScaleRef.current[i];
        const emojiY = pos.y - avatarR - 14 * scale + Math.sin(now * 2 + i * 1.3) * 3;
        const emojiAlpha = 0.85 + Math.sin(now * 1.8 + i) * 0.15;
        const el = emojiElRefs.current[i];
        if (el) {
          el.textContent = emojiDataRef.current[i];
          el.style.fontSize = `${emojiSize}px`;
          el.style.opacity = String(emojiAlpha);
          el.style.transform = `translate(-50%, -50%) translate(${pos.x}px, ${emojiY}px)`;
        }
      });

      // ── Draw traveling clip icons ──
      transfers.forEach((tr) => {
        const elapsed = cycleT - tr.delay;
        if (elapsed < 0 || elapsed > TRANSFER_DUR) return;

        const progress = elapsed / TRANSFER_DUR;
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const fromPos = friendPositions[tr.from];
        const toPos = friendPositions[tr.to];

        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const perpX = -dy * 0.3;
        const perpY = dx * 0.3;
        const cpx = midX + perpX * 0.5 + (cx - midX) * 0.3;
        const cpy = midY + perpY * 0.5 + (centerY - midY) * 0.3;

        const pos = quadBezier(fromPos.x, fromPos.y, cpx, cpy, toPos.x, toPos.y, eased);

        // Trail
        for (let ts = 1; ts <= 6; ts++) {
          const trailT = Math.max(0, eased - ts * 0.04);
          const tp = quadBezier(fromPos.x, fromPos.y, cpx, cpy, toPos.x, toPos.y, trailT);
          const trailAlpha = (1 - ts / 6) * 0.2;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, 3 * scale * (1 - ts / 6), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(218, 252, 121, ${trailAlpha})`;
          ctx.fill();
        }

        const iconAlpha = progress < 0.15 ? progress / 0.15 : progress > 0.85 ? (1 - progress) / 0.15 : 1;
        drawTravelingClipIcon(pos.x, pos.y, 18 * scale, "rgba(218, 252, 121, 1)", iconAlpha);
      });

      // ── Pulse rings from center ──
      for (let p = 0; p < 2; p++) {
        const pulsePhase = ((now * 0.35 + p * 0.5) % 1);
        const pulseR = innerR + pulsePhase * (orbitRadius - innerR);
        const pulseAlpha = (1 - pulsePhase) * 0.06;
        ctx.beginPath();
        ctx.arc(cx, centerY, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 200, 255, ${pulseAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, avatars, transfers, waveSeeds]);

  return (
    <div className="w-full flex items-center justify-center">
      <div style={{ position: "relative", width: dims.w, height: dims.h }}>
        <canvas ref={canvasRef} />
        {/* HTML emoji overlay — renders natively so iOS Safari displays emoji correctly */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: dims.w,
            height: dims.h,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              ref={(el) => { emojiElRefs.current[i] = el; }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                lineHeight: 1,
                willChange: "transform, opacity",
                pointerEvents: "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tutorial Page Data ───

interface TutorialPage {
  illustration: React.ReactNode;
  caption: React.ReactNode;
  title: React.ReactNode;
}

// Randomized title options for page 1 — picks one on each refresh
const PAGE1_TITLES = [
  "Save what just happened.",
  "Rewind life 2 minutes.",
  "Catch the last 2 minutes.",
];

const randomPage1Title =
  PAGE1_TITLES[Math.floor(Math.random() * PAGE1_TITLES.length)];

const pages: TutorialPage[] = [
  {
    illustration: <WaveformPeopleIllustration />,
    caption: "Always listening",
    title: "Always have the receipts 🧾",
  },
  {
    illustration: <ClipButtonBurstIllustration />,
    caption: <>Just tap <InlineClipIcon size="1.1em" /></>,
    title: <>Tap <InlineClipIcon size="1.05em" /> To Save The Past</>,
  },
  {
    illustration: <ShareMomentIllustration />,
    caption: "Moments with friends",
    title: "🎉 Share your clips with friends",
  },
];

// ─── Main Component ───

interface TutorialFlowProps {
  onComplete: () => void;
}

export function TutorialFlow({ onComplete }: TutorialFlowProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [buttonFilled, setButtonFilled] = useState(false);
  const touchStartRef = useRef(0);
  const touchDeltaRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const fillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset fill state on each page change, animate in after 3s
  useEffect(() => {
    setButtonFilled(false);
    fillTimerRef.current = setTimeout(() => setButtonFilled(true), 3000);
    return () => {
      if (fillTimerRef.current) clearTimeout(fillTimerRef.current);
    };
  }, [currentPage]);

  const goToPage = useCallback(
    (next: number) => {
      if (next < 0 || next > pages.length) return;
      if (next === pages.length) {
        Haptics.medium();
        onComplete();
        return;
      }
      Haptics.selection();
      setDirection(next > currentPage ? 1 : -1);
      setCurrentPage(next);
    },
    [currentPage, onComplete]
  );

  const handleContinue = () => {
    Haptics.medium();
    goToPage(currentPage + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    touchDeltaRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaRef.current = e.touches[0].clientX - touchStartRef.current;
  };

  const handleTouchEnd = () => {
    const delta = touchDeltaRef.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    }
  };

  const page = pages[currentPage];

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full relative select-none"
      style={{ backgroundColor: "var(--background)" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => { Haptics.light(); onComplete(); }}
          className="px-4 py-1.5 text-[var(--muted)] transition-opacity hover:opacity-80"
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: "var(--font-weight-semi-bold)",
            fontSize: "var(--text-label)",
          }}
        >
          Skip
        </motion.button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 md:px-12 overflow-visible pt-12 sm:pt-16">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center w-full max-w-lg flex-1 justify-center"
          >
            {/* Caption — moved to top */}
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="text-[var(--accent)] mb-6"
              style={{
                fontFamily: "var(--font-sf-pro)",
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-normal)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {page.caption}
            </motion.span>

            {/* Illustration */}
            <div className="w-full max-w-md mb-6">{page.illustration}</div>

            {/* Title */}
            <motion.h4
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="text-[var(--foreground)] text-center mb-4"
              style={{
                fontFamily: "var(--font-druk-cy)",
                fontWeight: "var(--font-weight-heavy)",
                fontSize: "var(--text-h4)",
                lineHeight: 1.2,
                textTransform: "uppercase",
                maxWidth: "75%",
              }}
            >
              {page.title}
            </motion.h4>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="px-4 sm:px-8 md:px-12 pb-6 sm:pb-10 pt-4 flex flex-col items-center gap-5 w-full max-w-lg mx-auto">
        {/* Page dots */}
        <div className="flex items-center gap-2.5">
          {pages.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === currentPage ? 28 : 8,
                backgroundColor:
                  i === currentPage ? "var(--primary)" : "rgba(155, 155, 155, 0.3)",
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-2 rounded-full cursor-pointer"
              onClick={() => goToPage(i)}
            />
          ))}
        </div>

        {/* Continue button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleContinue}
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
          {currentPage === pages.length - 1 ? "Get Started" : "Continue"}
          <ChevronRight size={20} />
        </motion.button>
      </div>
    </div>
  );
}