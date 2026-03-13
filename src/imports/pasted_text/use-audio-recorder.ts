📦 Audio Recording Implementation
useAudioRecorder.ts
import { useRef, useCallback, useState } from 'react';

const BUFFER_DURATION_MS = 2 * 60 * 1000; // 2 minutes rolling buffer
const CHUNK_INTERVAL_MS = 1000; // record in 1s chunks

interface AudioRecorderReturn {
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => void;
  clip: () => string | null;
  isRecording: boolean;
  bufferSeconds: number;
  getBufferRange: () => { start: number; end: number } | null;
}

export function useAudioRecorder(): AudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [bufferSeconds, setBufferSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<{ blob: Blob; timestamp: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback((stream: MediaStream) => {
    // Determine best supported mime type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

    const options: MediaRecorderOptions = {};
    if (mimeType) options.mimeType = mimeType;

    try {
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          const now = Date.now();
          chunksRef.current.push({ blob: e.data, timestamp: now });

          // Prune chunks older than buffer duration
          const cutoff = now - BUFFER_DURATION_MS;
          chunksRef.current = chunksRef.current.filter(
            (c) => c.timestamp >= cutoff
          );
        }
      };

      recorder.start(CHUNK_INTERVAL_MS);
      setIsRecording(true);

      // Update buffer seconds counter
      intervalRef.current = setInterval(() => {
        const chunks = chunksRef.current;
        if (chunks.length > 0) {
          const oldest = chunks[0].timestamp;
          const newest = chunks[chunks.length - 1].timestamp;
          setBufferSeconds(Math.round((newest - oldest) / 1000));
        }
      }, 500);
    } catch {
      // MediaRecorder not supported
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clip = useCallback((): string | null => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) return null;

    // Determine the mime type from recorder
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';

    // Combine all buffered chunks into one blob
    const blobs = chunks.map((c) => c.blob);
    const combinedBlob = new Blob(blobs, { type: mimeType });

    // Create an object URL for playback
    const url = URL.createObjectURL(combinedBlob);
    return url;
  }, []);

  const getBufferRange = useCallback((): { start: number; end: number } | null => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) return null;
    return {
      start: chunks[0].timestamp,
      end: chunks[chunks.length - 1].timestamp + CHUNK_INTERVAL_MS,
    };
  }, []);

  return {
    startRecording,
    stopRecording,
    clip,
    isRecording,
    bufferSeconds,
    getBufferRange,
  };
}
useAudioReactive.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioReactiveReturn {
  audioLevel: number;
  frequencyBands: number[];
  start: () => Promise<void>;
  stop: () => void;
  isActive: boolean;
  getStream: () => MediaStream | null;
}

// Singleton refs so multiple hook instances can share one mic stream
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

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength / 255;
        setAudioLevel(avg);

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
      // Mic not available
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

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return { audioLevel, frequencyBands, start, stop, isActive, getStream: () => sharedStream };
}