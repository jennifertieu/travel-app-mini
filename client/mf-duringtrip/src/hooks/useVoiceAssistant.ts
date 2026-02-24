import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useVoiceAssistantContext } from '../contexts/VoiceAssistantContext';
import { useAudioCapture, createAudioProcessor } from './useAudioCapture';
import { useOpenAIRealtime, createAudioPlayer } from './useOpenAIRealtime';
import { allTools, createCombinedFunctionHandler } from '../tools';
import type { UseVoiceAssistantReturn } from '../types/voice';

export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const {
    state,
    isExpanded,
    error,
    transcript,
    conversationHistory,
    isTranscriptVisible,
    tripContext,
    setState,
    setError,
    appendTranscript,
    finalizeAssistantMessage,
    clearConversation,
    expand,
    collapse,
    toggleTranscript,
    clearError,
  } = useVoiceAssistantContext();

  const audioProcessorRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { startCapture, stopCapture } = useAudioCapture();

  // Create combined function handler (memoized to prevent recreating on each render)
  const handleFunctionCall = useMemo(() => createCombinedFunctionHandler(), []);

  // Handle audio chunks from AI response
  const handleAudioChunk = useCallback((chunk: string) => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = createAudioPlayer();
    }
    audioPlayerRef.current.playChunk(chunk);
  }, []);

  // Handle transcript chunks
  const handleTranscriptChunk = useCallback(
    (chunk: string) => {
      appendTranscript(chunk);
    },
    [appendTranscript]
  );

  // Handle response start
  const handleResponseStart = useCallback(() => {
    setState('streaming');
  }, [setState]);

  // Handle response end
  const handleResponseEnd = useCallback(() => {
    // Save the assistant's response to conversation history before clearing
    finalizeAssistantMessage();
    setState('idle');
  }, [finalizeAssistantMessage, setState]);

  // Handle errors
  const handleError = useCallback(
    (errorMessage: string) => {
      setError(errorMessage);
      setState('idle');
    },
    [setError, setState]
  );

  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendAudio,
    commitAudio,
    cancelResponse,
  } = useOpenAIRealtime({
    tripContext: tripContext || undefined,
    tools: allTools,
    onFunctionCall: handleFunctionCall,
    onAudioChunk: handleAudioChunk,
    onTranscriptChunk: handleTranscriptChunk,
    onResponseStart: handleResponseStart,
    onResponseEnd: handleResponseEnd,
    onError: handleError,
  });

  // Start listening (called when push-to-talk pressed)
  const startListening = useCallback(async () => {
    if (state !== 'idle' && state !== 'speaking' && state !== 'streaming') {
      return;
    }

    // If AI is speaking, interrupt it
    if (state === 'speaking' || state === 'streaming') {
      cancelResponse();
      audioPlayerRef.current?.stop();
      setState('interrupted');
    }

    // Ensure we're connected
    if (!isConnected && !isConnecting) {
      await connect();
    }

    // Start capturing audio
    const stream = await startCapture();
    if (!stream) {
      return;
    }

    streamRef.current = stream;
    setState('listening');

    // Set up audio processor to send chunks to API
    audioProcessorRef.current = createAudioProcessor(stream, (chunk) => {
      sendAudio(chunk);
    });
    audioProcessorRef.current.start();
  }, [state, isConnected, isConnecting, connect, startCapture, sendAudio, cancelResponse, setState]);

  // Stop listening (called when push-to-talk released)
  const stopListening = useCallback(() => {
    if (state !== 'listening') {
      return;
    }

    // Stop audio processor
    audioProcessorRef.current?.stop();
    audioProcessorRef.current = null;

    // Stop capture
    stopCapture();
    streamRef.current = null;

    // Commit audio and request response
    setState('processing');
    commitAudio();
  }, [state, stopCapture, commitAudio, setState]);

  // Interrupt AI response
  const interrupt = useCallback(() => {
    if (state === 'speaking' || state === 'streaming') {
      cancelResponse();
      audioPlayerRef.current?.stop();
      setState('idle');
    }
  }, [state, cancelResponse, setState]);

  // Connect when panel expands
  useEffect(() => {
    if (isExpanded && !isConnected && !isConnecting) {
      connect();
    }
  }, [isExpanded, isConnected, isConnecting, connect]);

  // Disconnect when panel closes
  useEffect(() => {
    if (!isExpanded) {
      disconnect();
      audioProcessorRef.current?.stop();
      audioPlayerRef.current?.stop();
      stopCapture();
    }
  }, [isExpanded, disconnect, stopCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      audioProcessorRef.current?.stop();
      audioPlayerRef.current?.stop();
    };
  }, [disconnect]);

  return {
    state,
    isExpanded,
    error,
    transcript,
    conversationHistory,
    isTranscriptVisible,
    tripContext,
    expand,
    collapse,
    clearConversation,
    startListening,
    stopListening,
    interrupt,
    toggleTranscript,
    clearError,
  };
}
