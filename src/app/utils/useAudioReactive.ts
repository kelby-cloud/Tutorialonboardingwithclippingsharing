import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioReactiveReturn {
  audioLevel: number;
  frequencyBands: number[];
  start: () => Promise<void>;
  stop: () => void;
  isActive: boolean;
  getStream: () => MediaStream | null;
  getAnalyser: () => AnalyserNode | null;
}

// Singleton refs so multiple hook instances share one mic stream
let sharedStream: MediaStream | null = null;
let sharedContext: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let listenerCount = 0;

export function useAudioReactive(): AudioReactiveReturn {
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyBands, setFrequencyBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [isActive, setIsActive] = useState(false);
  const animFrameRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    try {
      if (!sharedStream || !sharedStream.active) {
        sharedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        sharedContext = new AudioContext();
        const source = sharedContext.createMediaStreamSource(sharedStream);
        sharedAnalyser = sharedContext.createAnalyser();
        sharedAnalyser.fftSize = 256;
        sharedAnalyser.smoothingTimeConstant = 0.7;
        source.connect(sharedAnalyser);
      }

      listenerCount++;
      setIsActive(true);

      const analyser = sharedAnalyser!;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        if (!mountedRef.current) return;

        analyser.getByteFrequencyData(dataArray);

        // Compute normalized average amplitude (0-1)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength / 255;
        setAudioLevel(avg);

        // Split into 8 frequency bands
        const bandSize = Math.floor(bufferLength / 8);
        const bands: number[] = [];
        for (let b = 0; b < 8; b++) {
          let bandSum = 0;
          for (let i = b * bandSize; i < (b + 1) * bandSize; i++) {
            bandSum += dataArray[i];
          }
          bands.push(bandSum / bandSize / 255);
        }
        setFrequencyBands(bands);

        animFrameRef.current = requestAnimationFrame(update);
      };

      update();
    } catch {
      // Mic not available or permission denied
    }
  }, []);

  const stop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsActive(false);

    listenerCount = Math.max(0, listenerCount - 1);
    if (listenerCount === 0) {
      if (sharedContext) {
        sharedContext.close();
        sharedContext = null;
      }
      if (sharedStream) {
        sharedStream.getTracks().forEach((t) => t.stop());
        sharedStream = null;
      }
      sharedAnalyser = null;
    }

    setAudioLevel(0);
    setFrequencyBands([0, 0, 0, 0, 0, 0, 0, 0]);
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return { audioLevel, frequencyBands, start, stop, isActive, getStream: () => sharedStream, getAnalyser: () => sharedAnalyser };
}