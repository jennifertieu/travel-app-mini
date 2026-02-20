import { Plus, Crown, AlertCircle } from "lucide-react";
import { useTripMembers } from "../hooks/useTripMembers";
import { useModals } from "../contexts/ModalContext";
import { Button } from "./ui/button";

interface TripMembersAvatarsProps {
  tripId: string;
  className?: string;
}

/**
 * Compact avatar display for trip members in the header (Google Docs/Trello style)
 */
export function TripMembersAvatars({
  tripId,
  className,
}: TripMembersAvatarsProps) {
  const { data: members, isLoading, error } = useTripMembers(tripId);
  const { openModal } = useModals();

  const handleClick = () => {
    // Open a combined modal that shows members and allows inviting
    openModal("tripMembers", { tripId });
  };

  // Error state - show error indicator with fallback invite button
  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className="h-9 w-9 rounded-full bg-destructive/10 border-2 border-destructive/20 flex items-center justify-center"
          title={`Failed to load members: ${error instanceof Error ? error.message : "Unknown error"}`}
        >
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openModal("inviteLink", { tripId })}
          className="h-9 px-3 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Invite</span>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Loading skeleton */}
        <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse -ml-2" />
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-full border-2 border-dashed border-muted-foreground/30"
          disabled
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!members || members.length === 0) {
    // Solo trip - just show invite button
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openModal("inviteLink", { tripId })}
        className="h-9 px-3 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Invite</span>
      </Button>
    );
  }

  // Show up to 3 avatars, then +N for additional members
  const visibleMembers = members.slice(0, 3);
  const additionalCount = Math.max(0, members.length - 3);

  return (
    <div className={`flex items-center ${className}`}>
      {/* Member avatars */}
      <div className="flex items-center -space-x-2">
        {visibleMembers.map((member) => {
          const isCreator = member.is_creator;
          const displayName =
            member.member_profile?.display_name || "Anonymous";
          const initials = displayName.charAt(0)?.toUpperCase() || "?";
          const avatarUrl = member.member_profile?.avatar_url;

          return (
            <button
              key={member.user_id}
              onClick={handleClick}
              className={`relative h-9 w-9 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium transition-transform hover:scale-110 hover:z-10 overflow-hidden ${
                isCreator
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-secondary-foreground"
              }`}
              title={`${displayName} ${isCreator ? "(Owner)" : "(Collaborator)"}`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : isCreator ? (
                <Crown className="h-3 w-3" />
              ) : (
                initials
              )}
            </button>
          );
        })}

        {/* Additional members count */}
        {additionalCount > 0 && (
          <button
            onClick={handleClick}
            className="h-9 w-9 rounded-full border-2 border-background bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium transition-transform hover:scale-110 hover:z-10"
            title={`+${additionalCount} more member${additionalCount === 1 ? "" : "s"}`}
          >
            +{additionalCount}
          </button>
        )}
      </div>

      {/* Add member button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openModal("inviteLink", { tripId })}
        className="h-9 w-9 p-0 ml-2 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60"
        title="Invite collaborators"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
