import { ImageIcon } from "lucide-react";
import type { Database } from "@/types";
import type { TripMember } from "@/hooks/useTripMembers";
import { SIGNAL_CONFIG } from "../../lib/signals";
import type { SignalType } from "../../lib/signals";
import { VoteSummary } from "./VoteSummary";
import { Badge } from "../ui/badge";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];
type Reaction = Database["public"]["Tables"]["trip_reel_idea_reactions"]["Row"];

interface RatingCardProps {
  idea: Idea;
  mySignal?: string | null;
  reactions: Reaction[];
  members: TripMember[];
  onReRate?: (signal: string) => void;
  showVoteSummary?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  stay: "Stays",
  sightseeing: "Activities",
  activity: "Activities",
  nature: "Activities",
  shopping: "Activities",
  nightlife: "Activities",
};

export function RatingCard({
  idea,
  mySignal,
  reactions,
  members,
  onReRate,
  showVoteSummary,
}: RatingCardProps) {
  const place = idea.place as any;
  const photo = place?.photoUrl || place?.photos?.[0];
  const categoryLabel =
    CATEGORY_LABELS[idea.category || ""] || idea.category || "";
  const currentConfig = SIGNAL_CONFIG.find((s) => s.signal === mySignal);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="h-32 bg-muted relative">
        {photo ? (
          <img
            src={photo}
            alt={idea.title || ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        {categoryLabel && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-[10px]"
          >
            {categoryLabel}
          </Badge>
        )}
        {currentConfig && (
          <div
            className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-background/90 border ${currentConfig.color}`}
          >
            <currentConfig.icon className="h-3 w-3" />
            <span>{currentConfig.label}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-semibold truncate">
          {idea.title || "Untitled"}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(idea as any).cost_bucket && (
            <span>{(idea as any).cost_bucket}</span>
          )}
          {place?.rating && <span>★ {place.rating}</span>}
        </div>

        {/* Inline re-rating buttons */}
        {onReRate && (
          <div className="flex items-center gap-1 pt-1">
            {SIGNAL_CONFIG.map(({ signal, icon: Icon, color, label }) => (
              <button
                key={signal}
                type="button"
                onClick={() => onReRate(signal)}
                title={label}
                className={`p-1.5 rounded-md transition-colors ${
                  mySignal === signal
                    ? "bg-muted ring-1 ring-border"
                    : "hover:bg-muted/60"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </button>
            ))}
          </div>
        )}

        {/* Vote summary */}
        {showVoteSummary && reactions.length > 0 && (
          <div className="pt-1 border-t border-border">
            <VoteSummary reactions={reactions} members={members} compact />
          </div>
        )}
      </div>
    </div>
  );
}
