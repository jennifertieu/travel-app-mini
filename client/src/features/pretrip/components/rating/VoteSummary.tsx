import type { Database } from "@/types";
import type { TripMember } from "../../hooks/useTripMembers";
import { SIGNAL_CONFIG } from "../../lib/signals";
import { AvatarStack } from "../ui/AvatarStack";

type Reaction = Database["public"]["Tables"]["trip_reel_idea_reactions"]["Row"];

interface VoteSummaryProps {
  reactions: Reaction[];
  members: TripMember[];
  compact?: boolean;
}

export function VoteSummary({ reactions, members, compact }: VoteSummaryProps) {
  if (reactions.length === 0) return null;

  // Count signals
  const counts: Record<string, number> = {};
  for (const r of reactions) {
    counts[r.signal] = (counts[r.signal] || 0) + 1;
  }

  // Get unique member profiles for avatar display
  const voterIds = new Set(reactions.map((r) => r.member_id));
  const voters = members
    .filter(
      (m) => voterIds.has(m.user_id) || voterIds.has(m.member_profile?.id),
    )
    .map((m) => ({
      avatar_url: m.member_profile?.avatar_url ?? null,
      display_name: m.member_profile?.display_name ?? null,
    }));

  return (
    <div className="flex items-center gap-2">
      {voters.length > 0 && (
        <AvatarStack members={voters} max={compact ? 3 : 4} size="sm" />
      )}
      <div className="flex items-center gap-1.5">
        {SIGNAL_CONFIG.map(({ signal, icon: Icon, color }) => {
          const count = counts[signal];
          if (!count) return null;
          return (
            <span
              key={signal}
              className={`inline-flex items-center gap-0.5 text-xs ${color}`}
            >
              <Icon className="h-3 w-3" />
              <span className="font-medium">{count}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
