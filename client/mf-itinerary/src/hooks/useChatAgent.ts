import { useState, useCallback, useRef, useEffect } from "react";
import { getApiUrl, buildAuthHeaders } from "../lib/api";
import type { ChatMessage, IItineraryChange, ChatStatus, ChatRole } from "../types";

interface UseChatAgentOptions {
  tripId: string | null;
  onItineraryUpdated: () => void;
}

interface UseChatAgentReturn {
  messages: ChatMessage[];
  status: ChatStatus;
  pendingChanges: IItineraryChange[];
  error: string | null;
  isChatOpen: boolean;
  toggleChat: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  sendMessage: () => void;
  confirmChanges: () => void;
  rejectChanges: () => void;
  clearError: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "agent",
  content:
    "Hi! I'm your Itinerary Assistant. Ask me to move, swap, or remove activities from your trip.",
  timestamp: new Date(),
};

export function useChatAgent({
  tripId,
  onItineraryUpdated,
}: UseChatAgentOptions): UseChatAgentReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [pendingChanges, setPendingChanges] = useState<IItineraryChange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
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
    buildAuthHeaders().then((headers) =>
      fetch(getApiUrl(`/itinerary/${tripId}/chat/session`), { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.active) return;
          // Each system event carries archivedMessages from its conversation turn.
          // Expand them just before their pill, using the event timestamp as an anchor.
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
                // Place archived messages just before the event timestamp
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

          // Append live messages (since the last event) after all archived history
          const lastEventTs = allMessages.length > 0
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
            }
          );

          if (allMessages.length > 0) {
            setMessages([WELCOME_MESSAGE, ...allMessages]);
          }
          if (data.pendingChanges?.length) {
            setPendingChanges(data.pendingChanges);
            setStatus("awaiting_confirmation");
          }
        })
        .catch(() => {}) // silently ignore — fresh session is fine
    );
  }, [tripId]);

  const toggleChat = useCallback(() => setIsChatOpen((prev) => !prev), []);

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !tripId) return;

    // Cancel any existing stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Append user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setStatus("streaming");
    setError(null);

    // Create a placeholder agent message that we'll stream into
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
      const headers = await buildAuthHeaders();
      const response = await fetch(
        getApiUrl(`/itinerary/${tripId}/chat`),
        {
          method: "POST",
          headers,
          body: JSON.stringify({ message: text }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Request failed with status ${response.status}`
        );
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Track tool calls received so far for this response turn
      const toolCalls: string[] = [];
      // Track whether the agent emitted changes (avoids stale closure read of `status`)
      let hasChanges = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE blocks are separated by blank lines (\n\n)
        const blocks = buffer.split("\n\n");
        // Keep the last (potentially incomplete) block in the buffer
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
                    : m
                )
              );
              break;

            case "tool_call":
              toolCalls.push(payload.tool as string);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId
                    ? { ...m, toolCalls: [...toolCalls] }
                    : m
                )
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
              // Mark the message as done streaming
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId ? { ...m, isStreaming: false } : m
                )
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
          m.id === agentMsgId ? { ...m, isStreaming: false } : m
        )
      );
    }
  }, [inputValue, tripId, status]);

  const confirmChanges = useCallback(async () => {
    if (!tripId) return;
    setStatus("idle");
    setPendingChanges([]);
    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(
        getApiUrl(`/itinerary/${tripId}/chat/confirm`),
        { method: "POST", headers }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to confirm changes");
      }
      onItineraryUpdated();
    } catch (err: any) {
      setError(err.message ?? "Failed to confirm changes");
    }
  }, [tripId, pendingChanges.length, onItineraryUpdated]);

  const rejectChanges = useCallback(async () => {
    if (!tripId) return;
    setPendingChanges([]);
    setStatus("idle");
    try {
      const headers = await buildAuthHeaders();
      await fetch(getApiUrl(`/itinerary/${tripId}/chat/reject`), {
        method: "POST",
        headers,
      });
    } catch {
      // Silently ignore — UI is already reset
    }
  }, [tripId, pendingChanges.length]);

  return {
    messages,
    status,
    pendingChanges,
    error,
    isChatOpen,
    toggleChat,
    inputValue,
    setInputValue,
    sendMessage,
    confirmChanges,
    rejectChanges,
    clearError: () => setError(null),
  };
}
