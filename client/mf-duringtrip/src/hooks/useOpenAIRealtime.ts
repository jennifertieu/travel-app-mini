import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  TripContext,
  RealtimeClientEvent,
  RealtimeServerEvent,
  RealtimeTool,
  UseOpenAIRealtimeOptions,
  UseOpenAIRealtimeReturn,
} from '../types/voice';

const REALTIME_API_URL = 'wss://api.openai.com/v1/realtime';
const MODEL = 'gpt-4o-realtime-preview-2024-12-17';

// Build system instructions with trip context
function buildSystemInstructions(tripContext?: TripContext): string {
  let instructions = `You are a friendly and helpful travel assistant. You help users with travel-related questions, recommendations, directions, and local tips. Keep responses concise and conversational since this is a voice interface.

When searching for nearby places:
- First use get_current_location to get the user's coordinates if you don't have them
- Use search_nearby_places with an appropriate category (restaurant, cafe, bar, museum, attraction, park, shopping, nightlife, hotel, spa) or keyword
- Present results conversationally: mention the top 2-3 options with name, distance, rating, and whether it's open
- Remember the place_id from search results so you can get details if the user asks

When the user wants more info about a place:
- Use get_place_details with the place_id from your search results
- Share relevant details: hours, rating highlights, and summarize the top review
- If they ask "is it open", check the is_open_now field in the hours`;

  if (tripContext) {
    instructions += `\n\nCurrent trip context:`;
    if (tripContext.destination) {
      instructions += `\n- Destination: ${tripContext.destination}`;
    }
    if (tripContext.startDate && tripContext.endDate) {
      instructions += `\n- Trip dates: ${tripContext.startDate} to ${tripContext.endDate}`;
    }
    if (tripContext.currentLocation) {
      instructions += `\n- User's current location: ${tripContext.currentLocation.latitude}, ${tripContext.currentLocation.longitude}`;
    }
    if (tripContext.savedPlaces && tripContext.savedPlaces.length > 0) {
      instructions += `\n- Saved places: ${tripContext.savedPlaces.map((p) => p.name).join(', ')}`;
    }
  }

  return instructions;
}

export function useOpenAIRealtime({
  tripContext,
  tools,
  onFunctionCall,
  onAudioChunk,
  onTranscriptChunk,
  onResponseStart,
  onResponseEnd,
  onError,
}: UseOpenAIRealtimeOptions): UseOpenAIRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Send event to WebSocket
  const sendEvent = useCallback((event: RealtimeClientEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: RealtimeServerEvent = JSON.parse(event.data);

        switch (data.type) {
          case 'session.created':
            console.log('Realtime session created:', data.session.id);
            // Update session with our config
            sendEvent({
              type: 'session.update',
              session: {
                instructions: buildSystemInstructions(tripContext),
                voice: 'alloy',
                tools: tools,
                input_audio_transcription: {
                  model: 'whisper-1',
                },
                turn_detection: null, // We're using push-to-talk, not VAD
              },
            });
            break;

          case 'session.updated':
            console.log('Session updated');
            setIsConnected(true);
            setIsConnecting(false);
            break;

          case 'response.created':
            onResponseStart();
            break;

          case 'response.audio.delta':
            onAudioChunk(data.delta);
            break;

          case 'response.text.delta':
            onTranscriptChunk(data.delta);
            break;

          case 'response.audio_transcript.delta':
            // Handle audio transcript (spoken response transcription)
            onTranscriptChunk(data.delta);
            break;

          case 'response.done':
            onResponseEnd();
            break;

          case 'response.function_call_arguments.done':
            // Handle function call from the agent
            if (onFunctionCall) {
              const { call_id, name, arguments: argsString } = data;
              console.log('Function call received:', name, argsString);

              (async () => {
                try {
                  const args = JSON.parse(argsString || '{}');
                  const result = await onFunctionCall(name, args);

                  // Send function result back to the agent
                  sendEvent({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: call_id,
                      output: JSON.stringify(result),
                    },
                  });

                  // Trigger the agent to continue responding
                  sendEvent({ type: 'response.create' });
                } catch (err) {
                  console.error('Function call error:', err);
                  // Send error result back
                  sendEvent({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: call_id,
                      output: JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
                    },
                  });
                  sendEvent({ type: 'response.create' });
                }
              })();
            }
            break;

          case 'error':
            console.error('Realtime API error:', data.error);
            onError(data.error.message);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    },
    [tripContext, tools, onFunctionCall, onAudioChunk, onTranscriptChunk, onResponseStart, onResponseEnd, onError, sendEvent]
  );

  // Connect to Realtime API
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);

    try {
      // In production, fetch ephemeral token from your backend
      // For now, we'll use a direct connection (requires API key in client - NOT recommended for production)
      const apiKey = import.meta.env.PUBLIC_OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Set PUBLIC_OPENAI_API_KEY in your environment.');
      }

      const ws = new WebSocket(`${REALTIME_API_URL}?model=${MODEL}`, [
        'realtime',
        `openai-insecure-api-key.${apiKey}`,
        'openai-beta.realtime-v1',
      ]);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError('Connection error. Please try again.');
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      onError(errorMessage);
      setIsConnecting(false);
    }
  }, [handleMessage, onError]);

  // Disconnect from Realtime API
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Send audio chunk to API
  const sendAudio = useCallback(
    (audioData: string) => {
      sendEvent({
        type: 'input_audio_buffer.append',
        audio: audioData,
      });
    },
    [sendEvent]
  );

  // Commit audio buffer (done speaking)
  const commitAudio = useCallback(() => {
    sendEvent({ type: 'input_audio_buffer.commit' });
    sendEvent({ type: 'response.create' });
  }, [sendEvent]);

  // Cancel current response (for interruption)
  const cancelResponse = useCallback(() => {
    sendEvent({ type: 'response.cancel' });
    sendEvent({ type: 'input_audio_buffer.clear' });
  }, [sendEvent]);

  // Send a text message to the API
  const sendTextMessage = useCallback(
    (text: string) => {
      sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      });
      sendEvent({
        type: 'response.create',
        response: { modalities: ['text'] },
      });
    },
    [sendEvent]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendAudio,
    commitAudio,
    cancelResponse,
    sendTextMessage,
  };
}

// Audio playback utility for streaming audio
export function createAudioPlayer(): {
  playChunk: (base64Chunk: string) => void;
  stop: () => void;
  isPlaying: () => boolean;
} {
  let audioContext: AudioContext | null = null;
  let isPlaying = false;
  const audioQueue: AudioBuffer[] = [];
  let currentSource: AudioBufferSourceNode | null = null;
  let nextStartTime = 0;

  const ensureContext = () => {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: 24000 });
    }
    return audioContext;
  };

  const playChunk = async (base64Chunk: string) => {
    try {
      const ctx = ensureContext();

      // Decode base64 to PCM16
      const binaryString = atob(base64Chunk);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      // Create audio buffer
      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Schedule playback
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startTime = Math.max(ctx.currentTime, nextStartTime);
      source.start(startTime);
      nextStartTime = startTime + audioBuffer.duration;

      isPlaying = true;
      source.onended = () => {
        if (ctx.currentTime >= nextStartTime - 0.01) {
          isPlaying = false;
        }
      };
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  const stop = () => {
    if (currentSource) {
      currentSource.stop();
      currentSource = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    isPlaying = false;
    nextStartTime = 0;
  };

  return {
    playChunk,
    stop,
    isPlaying: () => isPlaying,
  };
}
