import { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles, Send, MessageSquare, AlertCircle, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { MessageBubble } from "./MessageBubble";
import { ChangesPreview } from "./ChangesPreview";
import type { ChatMessage, ChatStatus, IItineraryChange } from "../../types";

interface ChatPanelProps {
  messages: ChatMessage[];
  status?: ChatStatus;
  pendingChanges?: IItineraryChange[];
  error?: string | null;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onDismissError?: () => void;
}

const MIN_HISTORY_HEIGHT = 80;
// Minimum px to reserve for the input area (drag handle + padding + textarea + hint)
const MIN_INPUT_AREA_HEIGHT = 110;
const DEFAULT_TEXTAREA_HEIGHT = 90;
const MIN_TEXTAREA_HEIGHT = 48;
const MAX_TEXTAREA_HEIGHT = 240;

export function ChatPanel({
  messages,
  status = "idle",
  pendingChanges = [],
  error = null,
  inputValue,
  onInputChange,
  onSend,
  onConfirm,
  onReject,
  onDismissError,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  // Start uninitialized — set to 2/3 of panel height on mount
  const [historyHeight, setHistoryHeight] = useState<number | null>(null);

  // Textarea resize gripper state
  const [textareaHeight, setTextareaHeight] = useState(DEFAULT_TEXTAREA_HEIGHT);
  // Whether the user has manually dragged the gripper — disables auto-grow when true
  const [hasManuallyResized, setHasManuallyResized] = useState(false);
  const isTextareaDragging = useRef(false);
  const textareaDragStartY = useRef(0);
  const textareaDragStartHeight = useRef(0);

  // Clamp so the input area always has at least MIN_INPUT_AREA_HEIGHT px.
  const clampedHistoryHeight = useCallback((raw: number): number => {
    const panelH = panelRef.current?.offsetHeight ?? window.innerHeight;
    return Math.min(raw, panelH - MIN_INPUT_AREA_HEIGHT);
  }, []);

  // Set initial history height to 2/3 of panel (leaving 1/3 for the textarea)
  useEffect(() => {
    if (panelRef.current && historyHeight === null) {
      setHistoryHeight(
        clampedHistoryHeight(
          Math.round(panelRef.current.offsetHeight * (2 / 3)),
        ),
      );
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

  // Auto-grow textarea to content height, unless user has manually dragged the gripper
  useEffect(() => {
    if (hasManuallyResized) return;
    const el = textareaRef.current;
    if (!el) return;
    // Reset to 'auto' first so scrollHeight reflects actual content, not the previous height
    el.style.height = "auto";
    const clamped = Math.min(MAX_TEXTAREA_HEIGHT, Math.max(MIN_TEXTAREA_HEIGHT, el.scrollHeight));
    // Set the inline style directly — don't clear it, or the textarea collapses before
    // React's async re-render can apply the updated textareaHeight state value
    el.style.height = `${clamped}px`;
    setTextareaHeight(clamped);
  }, [inputValue, hasManuallyResized]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startDrag = useCallback(
    (clientY: number) => {
      isDragging.current = true;
      dragStartY.current = clientY;
      dragStartHeight.current = historyHeight ?? 0;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [historyHeight],
  );

  const moveDrag = useCallback(
    (clientY: number) => {
      if (!isDragging.current) return;
      const delta = clientY - dragStartY.current;
      const raw = Math.max(MIN_HISTORY_HEIGHT, dragStartHeight.current + delta);
      setHistoryHeight(clampedHistoryHeight(raw));
    },
    [clampedHistoryHeight],
  );

  const endDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startDrag(e.clientY);
    },
    [startDrag],
  );

  const resetHistoryHeight = useCallback(() => {
    if (panelRef.current) {
      setHistoryHeight(
        clampedHistoryHeight(
          Math.round(panelRef.current.offsetHeight * (2 / 3)),
        ),
      );
    }
  }, [clampedHistoryHeight]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startDrag(e.touches[0].clientY);
    },
    [startDrag],
  );

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

  // Textarea gripper drag handlers
  const handleTextareaGripMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isTextareaDragging.current = true;
    textareaDragStartY.current = e.clientY;
    textareaDragStartHeight.current = textareaHeight;
    document.body.style.cursor = "se-resize";
    document.body.style.userSelect = "none";
  }, [textareaHeight]);

  const resetTextareaHeight = useCallback(() => {
    setTextareaHeight(DEFAULT_TEXTAREA_HEIGHT);
    setHasManuallyResized(false); // Re-enable auto-grow
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isTextareaDragging.current) return;
      setHasManuallyResized(true); // Lock to manual mode on first actual drag move
      const delta = e.clientY - textareaDragStartY.current;
      const raw = textareaDragStartHeight.current + delta;
      setTextareaHeight(Math.min(MAX_TEXTAREA_HEIGHT, Math.max(MIN_TEXTAREA_HEIGHT, raw)));
    };
    const onMouseUp = () => {
      if (!isTextareaDragging.current) return;
      isTextareaDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const isInputDisabled = status === "streaming";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isInputDisabled) onSend();
    }
  };

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full border-r border-border bg-background"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="w-4 h-4 text-teal-600" />
        <span className="text-sm font-semibold text-foreground">
          Itinerary Assistant
        </span>
        {status === "streaming" && (
          <span className="ml-auto text-[10px] text-teal-500 animate-pulse">
            thinking...
          </span>
        )}
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
              Ask me to modify your itinerary. I can move, swap, or remove
              activities.
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
        <svg
          width="16"
          height="6"
          viewBox="0 0 16 6"
          className="text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors"
          fill="currentColor"
        >
          <circle cx="2" cy="3" r="1.5" />
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="14" cy="3" r="1.5" />
        </svg>
      </div>

      {/* Changes preview — shown between drag handle and input when agent made changes */}
      {pendingChanges.length > 0 && onConfirm && onReject && (
        <div className="flex-shrink-0 pt-2">
          <ChangesPreview
            changes={pendingChanges}
            onConfirm={onConfirm}
            onReject={onReject}
          />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 mx-3 mt-2 mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs dark:bg-red-950/40 dark:border-red-800/50 dark:text-red-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="flex-1 leading-relaxed">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input area — takes remaining space, textarea fills it */}
      <div className="flex-1 border-border p-3 flex flex-col min-h-0">
        <div className="flex items-stretch gap-2 flex-1 min-h-0">
          <div className="relative flex-1" style={{ height: textareaHeight }}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isInputDisabled}
              placeholder={
                isInputDisabled
                  ? "Agent is thinking..."
                  : "Ask to change your itinerary..."
              }
              style={{ height: textareaHeight }}
              className={cn(
                "w-full resize-none rounded-lg border border-border bg-muted",
                "px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500",
                "transition-colors overflow-y-auto",
                isInputDisabled && "opacity-50 cursor-not-allowed",
              )}
            />
            {/* Resize gripper — bottom-right corner */}
            <div
              onMouseDown={handleTextareaGripMouseDown}
              onDoubleClick={resetTextareaHeight}
              className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex items-end justify-end text-muted-foreground/60 hover:text-muted-foreground/90 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="2" y1="9" x2="9" y2="2" />
                <line x1="5.5" y1="9" x2="9" y2="5.5" />
              </svg>
            </div>
          </div>
          <button
            type="button"
            onClick={onSend}
            disabled={!inputValue.trim() || isInputDisabled}
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
