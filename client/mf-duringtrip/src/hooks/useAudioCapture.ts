import { useState, useRef, useCallback, useEffect } from 'react';
import type { UseAudioCaptureReturn } from '../types/voice';

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate audio level from analyser
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (root mean square) for audio level
    const sum = dataArray.reduce((acc, val) => acc + val * val, 0);
    const rms = Math.sqrt(sum / dataArray.length);
    const normalizedLevel = Math.min(rms / 128, 1); // Normalize to 0-1

    setAudioLevel(normalizedLevel);

    if (isCapturing) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isCapturing]);

  // Start capturing audio
  const startCapture = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000, // OpenAI Realtime API expects 24kHz
        },
      });

      streamRef.current = stream;

      // Set up audio analysis for level visualization
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      setIsCapturing(true);

      // Start level monitoring
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

      return stream;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Microphone access denied. Please enable it in your browser settings.'
            : err.name === 'NotFoundError'
            ? 'No microphone found. Please connect a microphone.'
            : `Microphone error: ${err.message}`
          : 'Failed to access microphone';

      setError(errorMessage);
      return null;
    }
  }, [updateAudioLevel]);

  // Stop capturing audio
  const stopCapture = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsCapturing(false);
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    isCapturing,
    audioLevel,
    error,
    startCapture,
    stopCapture,
  };
}

// Utility to convert audio stream to base64 chunks for Realtime API
export function createAudioProcessor(
  stream: MediaStream,
  onAudioChunk: (base64Chunk: string) => void
): { start: () => void; stop: () => void } {
  let audioContext: AudioContext | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let isRunning = false;

  const start = async () => {
    if (isRunning) return;

    try {
      audioContext = new AudioContext({ sampleRate: 24000 });

      // Load audio worklet for processing
      // For simplicity, we'll use ScriptProcessorNode (deprecated but widely supported)
      // In production, consider using AudioWorklet
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!isRunning) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const uint8 = new Uint8Array(pcm16.buffer);
        const base64 = btoa(String.fromCharCode(...uint8));

        onAudioChunk(base64);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      isRunning = true;
    } catch (err) {
      console.error('Failed to start audio processor:', err);
    }
  };

  const stop = () => {
    isRunning = false;
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  };

  return { start, stop };
}
