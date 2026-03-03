import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { BACKEND_URL } from "../lib/api";
import type { ChatMessage, IItineraryChange, ChatStatus, ChatRole } from "../types/itinerary";

const API_BASE_URL = BACKEND_URL;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface UseChatAgentOptions {
  tripId: string | null;
  onItineraryUpdated?: () => void;
  location?: { lat: number; lng: number; accuracy_meters?: number } | null;
  currentDay?: number | null;
}

interface UseChatAgentReturn {
  messages: ChatMessage[];
  status: ChatStatus;
  pendingChanges: IItineraryChange[];
  error: string | null;
  inputValue: string;
  setInputValue: (v: string) => void;
  sendMessage: () => void;
  sendMessageText: (text: string) => void;
  confirmChanges: () => void;
  rejectChanges: () => void;
  clearError: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "agent",
  content:
    "Hi! I can help with your trip — ask me anything or say things like \"move my museum visit to Day 3\" to edit your itinerary.",
  timestamp: new Date(),
};

export function useChatAgent({
  tripId,
  onItineraryUpdated,
  location,
  currentDay,
}: UseChatAgentOptions): UseChatAgentReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [pendingChanges, setPendingChanges] = useState<IItineraryChange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Clean up any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Restore session history from the server on mount (if an active session exists)
  useEffect(() => {
    if (!tripId) return;
    getAuthHeaders()
      .then((headers) =>
        fetch(`${API_BASE_URL}/during-trip/itinerary-chat/session?trip_id=${tripId}`, {
          headers,
        })
      )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.active) return;

        const allMessages: ChatMessage[] = [];

        for (const e of (data.systemEvents ?? []) as Array<{
          content: string;
          variant?: "default" | "danger";
          timestamp: number;
          archivedMessages?: Array<{ role: "user" | "agent"; content: string }>;
        }>) {
          (e.archivedMessages ?? []).forEach((m, i) => {
            allMessages.push({
              id: crypto.randomUUID(),
              role: m.role as ChatRole,
              content: m.content,
              timestamp: new Date(e.timestamp - 1000 + i),
            });
          });
          allMessages.push({
            id: crypto.randomUUID(),
            role: "system" as ChatRole,
            content: e.content,
            variant: e.variant,
            timestamp: new Date(e.timestamp),
          });
        }

        const lastEventTs =
          allMessages.length > 0
            ? allMessages[allMessages.length - 1].timestamp.getTime()
            : data.createdAt;
        (data.messages ?? []).forEach(
          (m: { role: ChatRole; content: string }, i: number) => {
            allMessages.push({
              id: crypto.randomUUID(),
              role: m.role,
              content: m.content,
              timestamp: new Date(lastEventTs + 1 + i),
            });
          },
        );

        if (allMessages.length > 0) {
          setMessages([WELCOME_MESSAGE, ...allMessages]);
        }
        if (data.pendingChanges?.length) {
          setPendingChanges(data.pendingChanges);
          setStatus("awaiting_confirmation");
        }
      })
      .catch(() => {}); // silently ignore — fresh session is fine
  }, [tripId]);

  const doSend = useCallback(async (text: string) => {
    if (!text || !tripId) return;

    // Cancel any existing stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus("streaming");
    setError(null);

    const agentMsgId = crypto.randomUUID();
    const agentMsg: ChatMessage = {
      id: agentMsgId,
      role: "agent",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, agentMsg]);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/during-trip/itinerary-chat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            trip_id: tripId,
            message: text,
            location: location ?? undefined,
            current_day: currentDay ?? undefined,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Request failed with status ${response.status}`,
        );
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const toolCalls: string[] = [];
      let hasChanges = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const lines = block.split("\n");
          let eventType = "";
          let dataLine = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            if (line.startsWith("data: ")) dataLine = line.slice(6).trim();
          }
          if (!eventType || !dataLine) continue;

          let payload: any;
          try {
            payload = JSON.parse(dataLine);
          } catch {
            continue;
          }

          switch (eventType) {
            case "text":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId
                    ? { ...m, content: m.content + payload.content }
                    : m,
                ),
              );
              break;

            case "tool_call":
              toolCalls.push(payload.tool as string);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId
                    ? { ...m, toolCalls: [...toolCalls] }
                    : m,
                ),
              );
              break;

            case "changes":
              hasChanges = true;
              setPendingChanges(payload.changes ?? []);
              setStatus("awaiting_confirmation");
              break;

            case "error":
              setError(payload.message ?? "An error occurred");
              setStatus("error");
              break;

            case "done":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId ? { ...m, isStreaming: false } : m,
                ),
              );
              if (!hasChanges) {
                setStatus("idle");
              }
              break;
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message ?? "Network error");
      setStatus("error");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId ? { ...m, isStreaming: false } : m,
        ),
      );
    }
  }, [tripId, location, currentDay]);

  const sendMessage = useCallback(() => {
    const text = inputValue.trim();
    if (text) {
      setInputValue("");
      doSend(text);
    }
  }, [inputValue, doSend]);

  const sendMessageText = useCallback(
    (text: string) => {
      doSend(text.trim());
    },
    [doSend],
  );

  const confirmChanges = useCallback(async () => {
    if (!tripId) return;
    setStatus("idle");
    setPendingChanges([]);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/during-trip/itinerary-chat/confirm`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ trip_id: tripId }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to confirm changes");
      }
      onItineraryUpdated?.();
    } catch (err: any) {
      setError(err.message ?? "Failed to confirm changes");
    }
  }, [tripId, onItineraryUpdated]);

  const rejectChanges = useCallback(async () => {
    if (!tripId) return;
    setPendingChanges([]);
    setStatus("idle");
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE_URL}/during-trip/itinerary-chat/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ trip_id: tripId }),
      });
    } catch {
      // Silently ignore — UI is already reset
    }
  }, [tripId]);

  return {
    messages,
    status,
    pendingChanges,
    error,
    inputValue,
    setInputValue,
    sendMessage,
    sendMessageText,
    confirmChanges,
    rejectChanges,
    clearError: () => setError(null),
  };
}
