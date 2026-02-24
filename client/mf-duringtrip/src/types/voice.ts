// Voice Assistant State Machine
export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'streaming'
  | 'speaking'
  | 'interrupted';

// Trip context for AI awareness
export interface TripContext {
  tripId?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  savedPlaces?: SavedPlace[];
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface SavedPlace {
  id: string;
  name: string;
  category?: string;
  address?: string;
}

// OpenAI Realtime API types (uses snake_case to match API)
export interface RealtimeTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface RealtimeConfig {
  model?: string;
  voice?: 'alloy' | 'echo' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse';
  instructions?: string;
  tools?: RealtimeTool[];
  input_audio_transcription?: {
    model: 'whisper-1';
  };
  turn_detection?: {
    type: 'server_vad';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  } | null;
}

export interface RealtimeSession {
  id: string;
  token: string;
  expiresAt: number;
}

// WebSocket message types for Realtime API
export type RealtimeClientEvent =
  | { type: 'session.update'; session: RealtimeConfig }
  | { type: 'input_audio_buffer.append'; audio: string }
  | { type: 'input_audio_buffer.commit' }
  | { type: 'input_audio_buffer.clear' }
  | { type: 'response.create'; response?: { modalities?: string[] } }
  | { type: 'response.cancel' }
  | { type: 'conversation.item.create'; item: ConversationItem };

export interface FunctionCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

export interface ConversationItem {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

export interface FunctionCall {
  name: string;
  call_id: string;
  arguments: string;
}

export type RealtimeServerEvent =
  | { type: 'session.created'; session: { id: string } }
  | { type: 'session.updated'; session: RealtimeConfig }
  | { type: 'input_audio_buffer.speech_started' }
  | { type: 'input_audio_buffer.speech_stopped' }
  | { type: 'response.created'; response: { id: string } }
  | { type: 'response.audio.delta'; delta: string; response_id: string }
  | { type: 'response.audio.done'; response_id: string }
  | { type: 'response.text.delta'; delta: string; response_id: string }
  | { type: 'response.text.done'; text: string; response_id: string }
  | { type: 'response.audio_transcript.delta'; delta: string; response_id: string }
  | { type: 'response.audio_transcript.done'; transcript: string; response_id: string }
  | { type: 'response.function_call_arguments.done'; call_id: string; name: string; arguments: string }
  | { type: 'response.done'; response: { id: string; status: string } }
  | { type: 'error'; error: { message: string; code?: string } };

// Conversation message for history
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Voice Assistant Hook Return Type
export interface UseVoiceAssistantReturn {
  // State
  state: VoiceState;
  isExpanded: boolean;
  error: string | null;
  transcript: string;
  conversationHistory: ConversationMessage[];
  isTranscriptVisible: boolean;

  // Actions
  expand: () => void;
  collapse: () => void;
  clearConversation: () => void;
  startListening: () => void;
  stopListening: () => void;
  interrupt: () => void;
  toggleTranscript: () => void;
  clearError: () => void;

  // Context
  tripContext: TripContext | null;
}

// Push-to-talk hook types
export interface UsePushToTalkOptions {
  onStart: () => void;
  onEnd: () => void;
  minHoldTime?: number;
  disabled?: boolean;
}

export interface UsePushToTalkReturn {
  isPressed: boolean;
  holdDuration: number;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

// Audio capture types
export interface UseAudioCaptureReturn {
  isCapturing: boolean;
  audioLevel: number;
  error: string | null;
  startCapture: () => Promise<MediaStream | null>;
  stopCapture: () => void;
}

// Function handler for tool calls
export type FunctionHandler = (name: string, args: Record<string, unknown>) => Promise<unknown>;

// Realtime API hook types
export interface UseOpenAIRealtimeOptions {
  tripContext?: TripContext;
  tools?: RealtimeTool[];
  onFunctionCall?: FunctionHandler;
  onAudioChunk: (chunk: string) => void;
  onTranscriptChunk: (chunk: string) => void;
  onResponseStart: () => void;
  onResponseEnd: () => void;
  onError: (error: string) => void;
}

export interface UseOpenAIRealtimeReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (audioData: string) => void;
  commitAudio: () => void;
  cancelResponse: () => void;
}

// Avatar expression types for playful animations
export type AvatarExpression =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'confused';
