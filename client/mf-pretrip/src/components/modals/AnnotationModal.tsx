"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "../ui/button";
import { AnnotationCoordinates } from "../../hooks/useRealtimeTrip";

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string | null;
    label: string;
    intent: "annotation" | "search_area";
    color: string | null;
  }) => void;
  coordinates: AnnotationCoordinates | null;
  position: { x: number; y: number } | null;
  areaSize?: number | null;
  locationName?: string | null;
}

export function AnnotationModal({
  isOpen,
  onClose,
  onSave,
  coordinates,
  position,
  areaSize,
  locationName,
}: AnnotationModalProps) {
  const [activeTab, setActiveTab] = useState<"note" | "search">("note");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setNote("");
      setSelectedColor(null);
      setActiveTab("note");
    }
  }, [isOpen]);

  // Close when clicking outside the panel (e.g. on the map) or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    onSave({
      name: name.trim() || null,
      label: note.trim(),
      intent: activeTab === "search" ? "search_area" : "annotation",
      color: activeTab === "note" ? selectedColor : null,
    });

    // Reset state
    setName("");
    setNote("");
    setSelectedColor(null);
    setActiveTab("note");
  };

  const colors = [
    { hex: "#3B82F6", name: "Blue", label: "Hotels", icon: "🏨" },
    { hex: "#EF4444", name: "Red", label: "Priority", icon: "⭐" },
    { hex: "#10B981", name: "Green", label: "Nature", icon: "🌳" },
    { hex: "#F59E0B", name: "Yellow", label: "Food", icon: "🍽️" },
    { hex: "#8B5CF6", name: "Purple", label: "Fun", icon: "🎉" },
  ];

  // Format area info for header
  const formatAreaInfo = () => {
    const parts = [];
    if (locationName) parts.push(locationName);
    if (areaSize !== null && areaSize !== undefined) {
      if (areaSize < 0.01) {
        parts.push(`~${Math.round(areaSize * 1_000_000)} m²`);
      } else if (areaSize < 1) {
        parts.push(`~${areaSize.toFixed(2)} km²`);
      } else {
        parts.push(`~${areaSize.toFixed(1)} km²`);
      }
    }
    return parts.length > 0 ? parts.join(" • ") : "Area Selected";
  };

  // Calculate adjusted position to keep panel in viewport
  const adjustedPosition = position
    ? {
        x: Math.min(position.x, window.innerWidth - 360), // 360 = panel width + padding
        y: position.y,
      }
    : { x: 0, y: 0 };

  return (
    <div
      ref={panelRef}
      className="absolute z-[1000] animate-in fade-in slide-in-from-left-2 duration-200"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        transform: "translateY(-50%)",
      }}
    >
      {/* Arrow pointing to annotation */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-background drop-shadow-lg" />

      {/* Panel */}
      <div className="relative bg-background border border-border rounded-xl w-80 overflow-hidden flex flex-col shadow-2xl">
        {/* Header with dynamic context */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-muted/30">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {formatAreaInfo()}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors ml-2 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Tabs */}
          <div className="flex p-0.5 bg-muted rounded-lg mb-3">
            <button
              onClick={() => setActiveTab("note")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "note"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Add Note
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "search"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Search
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Name field - shown in both tabs */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  locationName
                    ? `${locationName} Area`
                    : "E.g., Downtown Hotels"
                }
                className="w-full px-2.5 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
              />
            </div>

            {activeTab === "note" ? (
              <>
                {/* Note field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="E.g., Let's focus here for hotels..."
                    className="w-full px-2.5 py-1.5 border border-border rounded-md min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                    autoFocus
                  />
                </div>

                {/* Category - Semantic Colors */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {colors.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          setSelectedColor((prev) =>
                            prev === c.hex ? null : c.hex
                          )
                        }
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border-2 transition-all text-xs ${
                          selectedColor === c.hex
                            ? "border-foreground bg-muted scale-105"
                            : "border-border hover:border-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[10px]">{c.icon}</span>
                        <span className="font-medium text-[11px]">
                          {c.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* AI Search info */}
                <div className="p-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-md text-xs text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">Contextual AI Search</p>
                  <p className="text-blue-600/80 dark:text-blue-400/80 text-[11px] leading-tight">
                    AI will search for ideas within the area you drew on the
                    map.
                  </p>
                </div>

                {/* Search query field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    What are you looking for?
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="E.g., Sushi restaurants, Jazz clubs..."
                    className="w-full px-2.5 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                    autoFocus
                  />
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                size="sm"
                className="h-7 text-xs px-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!note.trim()}
                size="sm"
                className="h-7 text-xs px-3"
              >
                {activeTab === "note" ? "Save Note" : "Search Area"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
