"use client";

import * as React from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { useModals } from "../../contexts/ModalContext";
import {
  Clock,
  Heart,
  Star,
  Utensils,
  Camera,
  Mountain,
  ShoppingBag,
  Music,
  Zap,
  Bed,
  MoreHorizontal,
} from "lucide-react";
import { AvatarStack } from "../ui/AvatarStack";
import type { Database } from "@travel-app/shared-types";
import type { TripMember } from "../../hooks/useTripMembers";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];
type Reaction = Database["public"]["Tables"]["trip_reel_idea_reactions"]["Row"];

interface IdeaCardProps {
  idea: Idea;
  reactions?: Reaction[];
  members?: TripMember[];
  isSaved?: boolean;
  onToggleSave?: (ideaId: string) => void;
}

function IdeaCardInner({ idea, reactions = [], members = [], isSaved, onToggleSave }: IdeaCardProps) {
  const { openModal } = useModals();

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { label: string; color: string; icon: string }
    > = {
      ENRICHING: {
        label: "Loading details...",
        color: "bg-blue-100 text-blue-700",
        icon: "✨",
      },
      CREATED: {
        label: "Creating",
        color: "bg-slate-100 text-slate-700",
        icon: "⏳",
      },
      UNFURLED: {
        label: "Unfurled",
        color: "bg-blue-100 text-blue-700",
        icon: "📱",
      },
      SUMMARIZED: {
        label: "Summarized",
        color: "bg-amber-100 text-amber-700",
        icon: "✨",
      },
      ENRICHED: {
        label: "Enriched",
        color: "bg-green-100 text-green-700",
        icon: "🎯",
      },
      DONE: {
        label: "Ready",
        color: "bg-emerald-100 text-emerald-700",
        icon: "✅",
      },
    };
    return configs[status] || configs.CREATED;
  };

  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { icon: React.ReactNode }> = {
      food: { icon: <Utensils className="h-3 w-3" /> },
      sightseeing: { icon: <Camera className="h-3 w-3" /> },
      nature: { icon: <Mountain className="h-3 w-3" /> },
      shopping: { icon: <ShoppingBag className="h-3 w-3" /> },
      nightlife: { icon: <Music className="h-3 w-3" /> },
      activity: { icon: <Zap className="h-3 w-3" /> },
      stay: { icon: <Bed className="h-3 w-3" /> },
      other: { icon: <MoreHorizontal className="h-3 w-3" /> },
    };
    return configs[category.toLowerCase()] || configs.other;
  };

  const statusConfig = getStatusConfig(idea.enrichment_status);
  const location = idea.location as any;
  const place = idea.place as any;
  const categoryConfig = idea.category
    ? getCategoryConfig(idea.category)
    : null;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-[box-shadow,border-color] duration-200 hover:border-foreground/10 group overflow-hidden"
      onClick={() => openModal("ideaDetail", { ideaId: idea.id })}
    >
      {/* Image & Overlays */}
      <div className="relative h-32 w-full bg-muted/20">
        {idea.enrichment_status === "ENRICHING" ? (
          <div
            className="w-full h-full animate-pulse bg-muted rounded-none"
            style={{ animationDuration: "1.5s" }}
          />
        ) : place?.photoUrl ? (
          <img
            src={place.photoUrl}
            alt={location?.name || idea.title || "Place photo"}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/30">
            <span className="text-4xl opacity-20">📷</span>
          </div>
        )}

        {/* Top Overlay: Status & Category */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[calc(100%-48px)]">
          {idea.enrichment_status !== "DONE" && (
            <Badge
              className={`${statusConfig.color} border-0 shadow-sm bg-opacity-95 text-xs px-1.5 py-0.5 h-5`}
            >
              <span className="mr-1">{statusConfig.icon}</span>
              {statusConfig.label}
            </Badge>
          )}
          {idea.category && categoryConfig && (
            <Badge
              variant="secondary"
              className="bg-background/95 shadow-sm text-xs px-1.5 py-0.5 h-5 border-0 flex items-center gap-1"
            >
              {categoryConfig.icon}
              <span className="capitalize">{idea.category}</span>
            </Badge>
          )}
        </div>

        {/* Save / Heart button */}
        {onToggleSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(idea.id);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 shadow-sm hover:bg-background transition-colors"
            aria-label={isSaved ? "Unsave idea" : "Save idea"}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isSaved
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        )}
      </div>

      <CardContent className="p-3 space-y-1.5">
        {/* Title & Rating */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1 text-foreground/90">
            {idea.title || "Untitled idea"}
          </h3>
          {place?.rating && (
            <div className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 shrink-0">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              <span>{place.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Metadata & Tags */}
        {(idea.cost_bucket ||
          idea.duration_bucket ||
          (idea.tags && idea.tags.length > 0)) && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 flex-wrap">
            {idea.cost_bucket && <span>{idea.cost_bucket}</span>}
            {idea.cost_bucket && idea.duration_bucket && (
              <span className="text-muted-foreground/30">·</span>
            )}
            {idea.duration_bucket && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 opacity-70" />
                <span>{idea.duration_bucket}</span>
              </div>
            )}
            {(idea.cost_bucket || idea.duration_bucket) &&
              idea.tags &&
              idea.tags.length > 0 && (
                <span className="text-muted-foreground/30">·</span>
              )}
            {idea.tags &&
              idea.tags.length > 0 &&
              idea.tags.slice(0, 2).map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-[10px] px-1.5 h-4 bg-muted/30 text-muted-foreground border-transparent group-hover:border-border transition-colors"
                >
                  {tag}
                </Badge>
              ))}
          </div>
        )}

        {/* Voter avatars */}
        {reactions.length > 0 && (
          <AvatarStack
            members={reactions.map((r) => {
              const m = members.find(
                (tm) => tm.member_profile?.id === r.member_id || tm.user_id === r.member_id
              );
              return {
                avatar_url: m?.member_profile?.avatar_url ?? null,
                display_name:
                  m?.member_profile?.display_name ?? r.member_name ?? null,
              };
            })}
            max={4}
            size="sm"
          />
        )}
      </CardContent>
    </Card>
  );
}

export const IdeaCard = React.memo(IdeaCardInner);
