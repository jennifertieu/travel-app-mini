"use client";

import { IdeaCard } from "../cards/IdeaCard";
import { IdeaCardSkeleton } from "../cards/IdeaCardSkeleton";
import { Button } from "../ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useModals } from "../../contexts/ModalContext";
import type { Database } from "@travel-app/shared-types";

type Idea = Database['public']['Tables']['trip_reel_ideas']['Row'];

interface IdeaSidebarProps {
  ideas: Idea[];
  isLoading?: boolean;
  isGenerating?: boolean;
}

export function IdeaSidebar({ ideas, isLoading, isGenerating }: IdeaSidebarProps) {
  const { openModal } = useModals();

  const showSkeletons = isLoading || (ideas.length === 0 && isGenerating);

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Ideas</h2>
          <Button
            onClick={() => openModal("addIdea")}
            size="sm"
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
          </p>
          {isGenerating && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Generating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Ideas List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {showSkeletons ? (
          <>
            {[...Array(5)].map((_, i) => (
              <IdeaCardSkeleton key={i} />
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
          ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))
        )}
      </div>
    </div>
  );
}

