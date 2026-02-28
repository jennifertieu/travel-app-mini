import { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles, Send, MessageSquare } from "lucide-react";
import { cn } from "../../lib/utils";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "../../types";

interface ChatPanelProps {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

const MIN_HISTORY_HEIGHT = 80;
// Minimum px to reserve for the input area (drag handle + padding + textarea + hint)
const MIN_INPUT_AREA_HEIGHT = 110;

export function ChatPanel({ messages, inputValue, onInputChange, onSend }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  // Start uninitialized — set to 2/3 of panel height on mount
  const [historyHeight, setHistoryHeight] = useState<number | null>(null);

  // Clamp so the input area always has at least MIN_INPUT_AREA_HEIGHT px.
  const clampedHistoryHeight = useCallback((raw: number): number => {
    const panelH = panelRef.current?.offsetHeight ?? window.innerHeight;
    return Math.min(raw, panelH - MIN_INPUT_AREA_HEIGHT);
  }, []);

  // Set initial history height to 2/3 of panel (leaving 1/3 for the textarea)
  useEffect(() => {
    if (panelRef.current && historyHeight === null) {
      setHistoryHeight(clampedHistoryHeight(Math.round(panelRef.current.offsetHeight * (2 / 3))));
    }
  }, [historyHeight, clampedHistoryHeight]);

  // Re-clamp when panel resizes (browser zoom, window resize, drag handle)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => {
      setHistoryHeight((prev) => {
        if (prev === null) return prev;
        return clampedHistoryHeight(prev);
      });
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [clampedHistoryHeight]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startDrag = useCallback((clientY: number) => {
    isDragging.current = true;
    dragStartY.current = clientY;
    dragStartHeight.current = historyHeight ?? 0;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, [historyHeight]);

  const moveDrag = useCallback((clientY: number) => {
    if (!isDragging.current) return;
    const delta = clientY - dragStartY.current;
    const raw = Math.max(MIN_HISTORY_HEIGHT, dragStartHeight.current + delta);
    setHistoryHeight(clampedHistoryHeight(raw));
  }, [clampedHistoryHeight]);

  const endDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientY);
  }, [startDrag]);

  const resetHistoryHeight = useCallback(() => {
    if (panelRef.current) {
      setHistoryHeight(clampedHistoryHeight(Math.round(panelRef.current.offsetHeight * (2 / 3))));
    }
  }, [clampedHistoryHeight]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startDrag(e.touches[0].clientY);
  }, [startDrag]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // prevent page scroll while dragging
      moveDrag(e.touches[0].clientY);
    };
    const onMouseUp = () => endDrag();
    const onTouchEnd = () => endDrag();

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [moveDrag, endDrag]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div ref={panelRef} className="flex flex-col h-full border-r border-border bg-background">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="w-4 h-4 text-teal-600" />
        <span className="text-sm font-semibold text-foreground">Itinerary Assistant</span>
      </div>

      {/* Message history — height controlled by drag; flex-1 until mounted */}
      <div
        ref={scrollRef}
        style={historyHeight !== null ? { height: historyHeight } : undefined}
        className={cn(
          "overflow-y-auto px-3 py-4",
          historyHeight !== null ? "flex-shrink-0" : "flex-1",
        )}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground px-4">
              Ask me to modify your itinerary. I can move, swap, or remove activities.
            </p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={resetHistoryHeight}
        className="flex-shrink-0 flex items-center justify-center h-3 border-y border-border bg-muted/50 hover:bg-muted cursor-row-resize group"
      >
        {/* Three horizontal dots — universally recognized drag indicator */}
        <svg width="16" height="6" viewBox="0 0 16 6" className="text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" fill="currentColor">
          <circle cx="2" cy="3" r="1.5" />
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="14" cy="3" r="1.5" />
        </svg>
      </div>

      {/* Input area — takes remaining space, textarea fills it */}
      <div className="flex-1 border-border p-3 flex flex-col min-h-0">
        <div className="flex items-stretch gap-2 flex-1 min-h-0">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask to change your itinerary..."
            className={cn(
              "flex-1 resize-none rounded-lg border border-border bg-muted",
              "px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500",
              "transition-colors min-h-[2.25rem] overflow-y-auto",
            )}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!inputValue.trim()}
            className="flex-shrink-0 w-9 self-end rounded-lg aspect-square flex items-center justify-center bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 pl-1">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
