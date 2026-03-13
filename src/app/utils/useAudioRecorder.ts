import { useRef, useCallback, useState } from 'react';

const BUFFER_DURATION_MS = 2 * 60 * 1000; // 2 minutes rolling buffer
const CHUNK_INTERVAL_MS = 1000; // record in 1-second chunks

interface AudioRecorderReturn {
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => void;
  clip: () => string | null;
  getBlob: () => Blob | null;
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
  const mimeTypeRef = useRef<string>('audio/webm');

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
    if (mimeType) {
      options.mimeType = mimeType;
      mimeTypeRef.current = mimeType;
    }

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

      // Update buffer seconds counter at 2Hz
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

  const getBlob = useCallback((): Blob | null => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) return null;

    const mimeType = mediaRecorderRef.current?.mimeType || mimeTypeRef.current;
    const blobs = chunks.map((c) => c.blob);
    return new Blob(blobs, { type: mimeType });
  }, []);

  const clip = useCallback((): string | null => {
    const combinedBlob = getBlob();
    if (!combinedBlob) return null;

    // Create an object URL for playback
    return URL.createObjectURL(combinedBlob);
  }, [getBlob]);

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
    getBlob,
    isRecording,
    bufferSeconds,
    getBufferRange,
  };
}
