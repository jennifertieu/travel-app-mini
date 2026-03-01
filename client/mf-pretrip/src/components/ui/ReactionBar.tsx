import type { Database } from "@travel-app/shared-types";
import type { TripMember } from "../../hooks/useTripMembers";
import { SIGNAL_CONFIG } from "../../lib/signals";

type Reaction = Database["public"]["Tables"]["trip_reel_idea_reactions"]["Row"];

interface ReactionBarProps {
  reactions: Reaction[];
  members: TripMember[];
  currentMemberId: string | null;
}

function getMemberProfile(members: TripMember[], memberId: string) {
  const member = members.find(
    (m) => m.member_profile?.id === memberId || m.user_id === memberId,
  );
  return member?.member_profile ?? null;
}

export function ReactionBar({
  reactions,
  members,
  currentMemberId,
}: ReactionBarProps) {
  if (reactions.length === 0) return null;

  const grouped: Record<string, Reaction[]> = {};
  for (const r of reactions) {
    if (!grouped[r.signal]) grouped[r.signal] = [];
    grouped[r.signal].push(r);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {SIGNAL_CONFIG.map(({ signal, label, icon: Icon, color, bg, border }) => {
        const signalReactions = grouped[signal];
        if (!signalReactions?.length) return null;

        return (
          <div key={signal} className="relative group">
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${bg} ${border} ${color}`}
            >
              <Icon className="h-3 w-3" />
              <span>{signalReactions.length}</span>
            </div>

            {/* Hover tooltip */}
            <div className="absolute top-full right-0 mt-1.5 z-50 hidden group-hover:block">
              <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {label}
                </p>
                <div className="space-y-1.5">
                  {signalReactions.map((reaction) => {
                    const profile = getMemberProfile(
                      members,
                      reaction.member_id,
                    );
                    const displayName =
                      profile?.display_name ||
                      reaction.member_name ||
                      "Anonymous";
                    const avatarUrl = profile?.avatar_url;
                    const isYou = reaction.member_id === currentMemberId;

                    return (
                      <div
                        key={reaction.id}
                        className="flex items-center gap-1.5"
                      >
                        <div className="h-5 w-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[9px] font-medium overflow-hidden shrink-0 border border-border">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-full h-full object-cover rounded-full"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-xs text-foreground whitespace-nowrap">
                          {displayName}
                          {isYou && (
                            <span className="text-muted-foreground ml-0.5">
                              (you)
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
