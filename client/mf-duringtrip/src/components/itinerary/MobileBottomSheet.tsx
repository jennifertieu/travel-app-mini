import { useRef, useState, useCallback, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";

const PEEK_HEIGHT = 190;
const EXPANDED_HEIGHT_VH = 93;

interface MobileBottomSheetProps {
  peekContent: ReactNode;
  expandedContent: ReactNode;
}

export function MobileBottomSheet({ peekContent, expandedContent }: MobileBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startYRef = useRef(0);
  const currentTranslateRef = useRef(0);

  const TAB_BAR_HEIGHT = 80; // 60px tabs + 20px (1.25rem) pb-safe base
  const expandedHeight =
    typeof window !== "undefined"
      ? (window.innerHeight * EXPANDED_HEIGHT_VH) / 100 - TAB_BAR_HEIGHT
      : 600;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      startYRef.current = e.clientY;
      currentTranslateRef.current = 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const delta = e.clientY - startYRef.current;
      currentTranslateRef.current = delta;
      setTranslateY(delta);
    },
    [dragging],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const delta = currentTranslateRef.current;

    // Tap (minimal movement) toggles expanded state
    if (Math.abs(delta) < 10) {
      setExpanded((prev) => !prev);
    } else if (expanded) {
      if (delta > 60) {
        setExpanded(false);
      }
    } else {
      if (delta < -60) {
        setExpanded(true);
      }
    }
    setTranslateY(0);
  }, [dragging, expanded]);

  const sheetHeight = expanded ? expandedHeight : PEEK_HEIGHT;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[1001] bg-background rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]",
        !dragging && "transition-[height] duration-300 ease-out",
      )}
      style={{
        height: sheetHeight,
        bottom: 'calc(60px + 1.25rem + env(safe-area-inset-bottom, 0px))',
        transform: dragging ? `translateY(${translateY}px)` : undefined,
        willChange: dragging ? "transform" : undefined,
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <ChevronUp
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            expanded && "rotate-180",
          )}
        />
      </div>

      {/* Content */}
      <div
        className={cn(
          "h-[calc(100%-44px)]",
          expanded ? "overflow-y-auto overscroll-contain" : "overflow-hidden",
        )}
        style={{ WebkitOverflowScrolling: "touch", touchAction: expanded ? "pan-y" : "none" }}
      >
        {peekContent}
        {expanded && (
          <div className="border-t border-border">
            {expandedContent}
          </div>
        )}
      </div>
    </div>
  );
}
