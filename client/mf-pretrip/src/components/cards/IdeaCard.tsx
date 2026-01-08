"use client";

import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { useModals } from "../../contexts/ModalContext";
import { MapPin, Clock, DollarSign } from "lucide-react";
import type { Database } from "@travel-app/shared-types";

type Idea = Database['public']['Tables']['trip_reel_ideas']['Row'];

interface IdeaCardProps {
  idea: Idea;
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const { openModal } = useModals();

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: string }> = {
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

  const statusConfig = getStatusConfig(idea.enrichment_status);
  const location = idea.location as any;
  const place = idea.place as any;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-foreground/10 group"
      onClick={() => openModal("ideaDetail", { ideaId: idea.id })}
    >
      <CardHeader className="pb-3 px-4 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {idea.enrichment_status !== "DONE" && (
              <>
                <span className="text-sm">{statusConfig.icon}</span>
                <Badge className={`${statusConfig.color} text-xs`}>
                  {statusConfig.label}
                </Badge>
              </>
            )}
            {idea.category && (
              <Badge variant="outline" className="text-xs">
                {idea.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Place Photo */}
        {place?.photoUrl && (
          <div className="rounded-md overflow-hidden shadow-sm bg-muted/20 -mx-4 -mt-1">
            <img
              src={place.photoUrl}
              alt={location?.name || idea.title || "Place photo"}
              className="w-full h-36 object-cover"
              onError={(e) => {
                // Hide image on error
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-base leading-snug line-clamp-2">
          {idea.title || "Untitled idea"}
        </h3>

        {/* Location */}
        {location?.name && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground line-clamp-1">
              {location.name}
            </span>
          </div>
        )}

        {/* Summary */}
        {idea.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {idea.summary}
          </p>
        )}

        {/* Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {idea.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          {idea.cost_bucket && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>{idea.cost_bucket}</span>
            </div>
          )}
          {idea.duration_bucket && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{idea.duration_bucket}</span>
            </div>
          )}
          {place?.rating && (
            <div className="flex items-center gap-1">
              <span>⭐</span>
              <span>{place.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

