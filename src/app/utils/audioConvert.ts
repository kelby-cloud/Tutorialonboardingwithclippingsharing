/**
 * Converts any browser-decodable audio Blob (webm, opus, ogg, mp4, etc.)
 * into a proper PCM WAV Blob that plays everywhere — iOS, Android, desktop.
 *
 * Uses AudioContext.decodeAudioData for the heavy lifting, then manually
 * writes the WAV header + interleaved PCM samples.
 */

export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    ctx.close();
  }

  return encodeWav(audioBuffer);
}

function encodeWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = audioBuffer.length;

  // Interleave channels
  const interleaved = new Int16Array(numSamples * numChannels);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < numSamples; i++) {
      // Clamp to [-1, 1] then scale to 16-bit range
      const s = Math.max(-1, Math.min(1, channelData[i]));
      interleaved[i * numChannels + ch] =
        s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }

  const dataLength = interleaved.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // ── RIFF header ──
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true); // file size - 8
  writeString(view, 8, "WAVE");

  // ── fmt  sub-chunk ──
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true); // block align
  view.setUint16(34, bitsPerSample, true);

  // ── data sub-chunk ──
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  const offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    view.setInt16(offset + i * 2, interleaved[i], true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
