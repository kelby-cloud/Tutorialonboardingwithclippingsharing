import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export function WaveformPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number>(0);
  const barsData = useRef<number[]>([]);

  useEffect(() => {
    // Generate random waveform data once
    if (barsData.current.length === 0) {
      barsData.current = Array.from({ length: 80 }, () => 0.15 + Math.random() * 0.85);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const start = Date.now();
    const duration = 8000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement?.clientWidth || 340;
    const h = 100;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const bars = barsData.current;
    const barWidth = 3;
    const gap = 1.5;
    const totalBars = bars.length;

    for (let i = 0; i < totalBars; i++) {
      const x = i * (barWidth + gap);
      if (x > w) break;
      const barH = bars[i] * h * 0.85;
      const y = (h - barH) / 2;

      const fillProgress = i / totalBars;
      if (fillProgress <= progress) {
        ctx.fillStyle = "rgba(218, 252, 121, 0.9)";
      } else {
        ctx.fillStyle = "rgba(155, 155, 155, 0.35)";
      }
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 1);
      ctx.fill();
    }
  }, [progress]);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="w-full">
        <canvas
          ref={canvasRef}
          className="w-full"
        />
      </div>
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
          borderRadius: "var(--radius-button)",
        }}
      >
        {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
      </button>
    </div>
  );
}