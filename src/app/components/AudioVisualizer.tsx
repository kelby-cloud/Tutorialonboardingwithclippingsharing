import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  isBursting: boolean;
  analyserNode?: AnalyserNode | null;
}

export function AudioVisualizer({ isActive, isBursting, analyserNode }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const barsRef = useRef<number[]>(Array(64).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const size = container ? Math.min(container.clientWidth, container.clientHeight) : 360;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const numBars = 64;
    const innerRadius = size * 0.25;

    // Frequency data buffer for real audio
    const freqData = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;

    let burstPhase = 0;
    if (isBursting) burstPhase = 1;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Pull real frequency data if available
      if (analyserNode && freqData) {
        analyserNode.getByteFrequencyData(freqData);
      }

      // Glow behind
      const gradient = ctx.createRadialGradient(cx, cy, 20, cx, cy, size * 0.5);
      const glowAlpha = isActive ? 0.25 : 0.08;
      gradient.addColorStop(0, `rgba(0, 200, 255, ${glowAlpha})`);
      gradient.addColorStop(0.5, `rgba(218, 252, 121, ${glowAlpha * 0.5})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < numBars; i++) {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
        const time = Date.now() / 1000;

        let targetHeight: number;
        if (isBursting) {
          targetHeight = size * 0.12 + Math.random() * size * 0.1;
          burstPhase *= 0.97;
        } else if (isActive && analyserNode && freqData) {
          // Map frequency bin to bar — sample across the spectrum
          const binIndex = Math.floor((i / numBars) * freqData.length * 0.6);
          const amplitude = freqData[binIndex] / 255;
          targetHeight = 4 + amplitude * size * 0.18 + Math.random() * 3;
        } else if (isActive) {
          // Simulated active (fallback when no analyser)
          targetHeight =
            8 +
            Math.sin(time * 3 + i * 0.5) * size * 0.05 +
            Math.sin(time * 7 + i * 1.2) * size * 0.035 +
            Math.random() * size * 0.04;
        } else {
          // Idle pulse
          targetHeight =
            3 + Math.sin(time * 1.5 + i * 0.3) * 3 + Math.sin(time * 0.8 + i * 0.7) * 2;
        }

        barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.18;
        const barHeight = barsRef.current[i];

        const x1 = cx + Math.cos(angle) * innerRadius;
        const y1 = cy + Math.sin(angle) * innerRadius;
        const x2 = cx + Math.cos(angle) * (innerRadius + barHeight);
        const y2 = cy + Math.sin(angle) * (innerRadius + barHeight);

        const hue = isActive ? 170 + (i / numBars) * 100 : 170;
        const lightness = isActive ? 60 + (barHeight / 50) * 20 : 40;
        ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${isActive ? 0.9 : 0.4})`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Inner circle
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
      ctx.strokeStyle = isActive
        ? "rgba(0, 200, 255, 0.3)"
        : "rgba(155, 155, 155, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isActive, isBursting, analyserNode]);

  return (
    <div className="w-full flex items-center justify-center" style={{ aspectRatio: "1 / 1", maxWidth: 360 }}>
      <canvas
        ref={canvasRef}
        className="mx-auto"
      />
    </div>
  );
}