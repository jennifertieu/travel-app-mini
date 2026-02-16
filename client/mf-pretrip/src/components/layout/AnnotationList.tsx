"use client";

import { Trash2 } from "lucide-react";
import type { Annotation } from "../../hooks/useRealtimeTrip";

interface AnnotationListProps {
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
  onAnnotationDelete: (annotationId: string) => void;
}

export function AnnotationList({
  annotations,
  onAnnotationClick,
  onAnnotationDelete,
}: AnnotationListProps) {
  const getAnnotationIcon = (intent: string, color: string | null) => {
    if (intent === "search_area") return "🔍";
    if (!color) return "📝"; // Generic note for uncategorized
    const colorIconMap: { [key: string]: string } = {
      "#3B82F6": "🏨", // Blue - Hotels
      "#EF4444": "⭐", // Red - Priority
      "#10B981": "🌳", // Green - Nature
      "#F59E0B": "🍽️", // Yellow - Food
      "#8B5CF6": "🎉", // Purple - Fun
    };
    return colorIconMap[color] || "📝";
  };

  const NEUTRAL_COLOR = "#6B7280"; // Gray for uncategorized

  if (annotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="text-4xl mb-3">📍</div>
        <p className="text-sm text-muted-foreground mb-2">No notes yet</p>
        <p className="text-xs text-muted-foreground">
          Draw on the map to add notes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          onClick={() => onAnnotationClick(annotation)}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        >
          {/* Color Icon */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{
              backgroundColor: (annotation.color ?? NEUTRAL_COLOR) + "20",
            }}
          >
            <span>
              {getAnnotationIcon(
                annotation.intent || "annotation",
                annotation.color ?? null,
              )}
            </span>
          </div>

          {/* Name or Label */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {(annotation as any).name || annotation.label}
            </div>
            {(annotation as any).name && annotation.label && (
              <div className="text-xs text-muted-foreground truncate">
                {annotation.label}
              </div>
            )}
          </div>

          {/* Delete Button (hidden until hover) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAnnotationDelete(annotation.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
            title="Delete annotation"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
}
