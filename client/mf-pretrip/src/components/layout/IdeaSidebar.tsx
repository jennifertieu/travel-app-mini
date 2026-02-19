"use client";

import { useState } from "react";

import { IdeaCard } from "../cards/IdeaCard";
import { IdeaCardSkeleton } from "../cards/IdeaCardSkeleton";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Plus, Sparkles } from "lucide-react";
import { useModals } from "../../contexts/ModalContext";
import { AnnotationList } from "./AnnotationList";
import type { Database } from "@travel-app/shared-types";
import type { Annotation } from "../../hooks/useRealtimeTrip";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];

export interface IdeaSidebarProps {
  ideas: Idea[];
  annotations: Annotation[];
  isLoading?: boolean;
  isGenerating?: boolean;
  totalExpected?: number;
  tripId?: string | null;
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onDrawModeToggle?: (enabled: boolean) => void;
  onOpenAddIdea?: () => void;
}

export function IdeaSidebar({
  ideas,
  annotations,
  isLoading,
  isGenerating,
  totalExpected = 10,
  onAnnotationClick,
  onAnnotationDelete,
  onDrawModeToggle,
  onOpenAddIdea,
}: IdeaSidebarProps) {
  const { openModal } = useModals();
  const [activeTab, setActiveTab] = useState<"ideas" | "annotations">("ideas");

  const showSkeletons = isLoading || (isGenerating && ideas.length === 0);
  const showStreaming = isGenerating && ideas.length > 0;
  const skeletonCount = showStreaming
    ? Math.max(totalExpected - ideas.length, 0)
    : 0;
  const ideaCount = ideas.length;

  const handleAddClick = () => {
    if (activeTab === "ideas") {
      onOpenAddIdea ? onOpenAddIdea() : openModal("addIdea");
    } else {
      onDrawModeToggle?.(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Tabbed Header */}
      <div className="flex-shrink-0 h-[71px] border-b bg-background flex items-center">
        <div className="flex w-full p-1 mx-4 bg-muted rounded-lg">
          <button
            onClick={() => setActiveTab("ideas")}
            className={`flex-1 py-2 px-3 rounded-md transition-all ${
              activeTab === "ideas"
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm">Ideas</span>
              <Badge variant="secondary" className="text-xs h-5">
                {ideaCount}
              </Badge>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("annotations")}
            className={`flex-1 py-2 px-3 rounded-md transition-all ${
              activeTab === "annotations"
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm">Notes</span>
              <Badge variant="secondary" className="text-xs h-5">
                {annotations.length}
              </Badge>
            </div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "ideas" ? (
          <div className="p-4 space-y-3">
            {showSkeletons ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <IdeaCardSkeleton key={i} />
                ))}
              </>
            ) : showStreaming ? (
              <>
                {ideas.map((idea) => (
                  <div
                    key={idea.id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <IdeaCard idea={idea} />
                  </div>
                ))}
                {skeletonCount > 0 &&
                  [...Array(skeletonCount)].map((_, index) => (
                    <IdeaCardSkeleton key={`streaming-skeleton-${index}`} />
                  ))}
              </>
            ) : ideas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-3">💡</div>
                <p className="text-sm text-muted-foreground mb-4">
                  No ideas yet
                </p>
                <Button
                  onClick={() => openModal("addIdea")}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first idea
                </Button>
              </div>
            ) : (
              ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
            )}
          </div>
        ) : (
          <div className="py-4">
            <AnnotationList
              annotations={annotations}
              onAnnotationClick={onAnnotationClick || (() => {})}
              onAnnotationDelete={onAnnotationDelete || (() => {})}
            />
          </div>
        )}
      </div>

      {/* Footer - idea count + Add at bottom */}
      <div className="flex-shrink-0 border-t bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {activeTab === "ideas"
              ? `${ideaCount} ${ideaCount === 1 ? "idea" : "ideas"}`
              : `${annotations.length} ${annotations.length === 1 ? "note" : "notes"}`}
          </p>
          {isGenerating && activeTab === "ideas" && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Generating...</span>
            </div>
          )}
        </div>
        <Button onClick={handleAddClick} size="sm" className="h-7 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
