import { useState, useEffect } from "react";
import {
  Users,
  Crown,
  Copy,
  Check,
  Plus,
  AlertCircle,
  RefreshCw,
  User,
} from "lucide-react";
import { useTripMembers } from "../../hooks/useTripMembers";
import { generateInviteLink } from "../../lib/collaboration";
import { useMember } from "../../contexts/MemberContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadialIntro } from "../ui/radial-intro";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface TripMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
}

/**
 * Combined modal for viewing trip members and generating invite links
 */
export function TripMembersModal({
  isOpen,
  onClose,
  tripId,
}: TripMembersModalProps) {
  const { member, updateMember } = useMember();
  const { data: members, isLoading, error, refetch } = useTripMembers(tripId);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Check if current user needs to set their name
  useEffect(() => {
    if (isOpen && member && !member.displayName) {
      setShowNamePrompt(true);
    }
  }, [isOpen, member]);

  const handleGenerateLink = async () => {
    try {
      setIsGenerating(true);
      setInviteError(null);
      const link = await generateInviteLink(tripId);
      setInviteLink(link);
    } catch (error) {
      console.error("Failed to generate invite link:", error);
      setInviteError(
        error instanceof Error
          ? error.message
          : "Failed to generate invite link. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      // Fallback: select the text for manual copying
      const input = document.querySelector(
        "input[readonly]",
      ) as HTMLInputElement;
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
      }
    }
  };

  const handleRetryMembers = () => {
    refetch();
  };

  const handleClose = () => {
    setInviteLink(null);
    setCopied(false);
    setInviteError(null);
    setShowNamePrompt(false);
    setDisplayName("");
    onClose();
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      setInviteError("Please enter your name");
      return;
    }

    try {
      setIsSavingName(true);
      setInviteError(null);
      await updateMember({ displayName: displayName.trim() });
      setShowNamePrompt(false);
      // Refetch members to show updated name
      refetch();
    } catch (error) {
      console.error("Failed to update name:", error);
      setInviteError("Failed to update your name. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trip Members
          </DialogTitle>
          <DialogDescription>
            Manage who can collaborate on this trip
          </DialogDescription>
        </DialogHeader>

        {/* Radial Intro Animation */}
        {!isLoading && members && members.length >= 1 && (() => {
          const MIN_ORBIT = 5;
          const realItems = members.map((m, i) => ({
            id: i,
            name: m.member_profile?.display_name || "Anonymous",
            src:
              m.member_profile?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                m.member_profile?.display_name || "A",
              )}&background=random`,
          }));
          const ghostCount = Math.max(0, MIN_ORBIT - realItems.length);
          const ghostItems = Array.from({ length: ghostCount }, (_, i) => ({
            id: 1000 + i,
            name: "Invite someone",
            src: "",
            isGhost: true as const,
          }));
          const orbitItems = [...realItems, ...ghostItems];
          return (
            <div className="flex justify-center py-2">
              <RadialIntro
                orbitItems={orbitItems}
                stageSize={200}
                imageSize={48}
              />
            </div>
          );
        })()}

        <div className="space-y-6">
          {/* Name Prompt for Anonymous Users */}
          {showNamePrompt && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Set Your Display Name</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                You're currently showing as "Anonymous User". Let others know
                who you are!
              </p>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveName();
                    }
                  }}
                />
                <Button
                  onClick={handleSaveName}
                  disabled={isSavingName || !displayName.trim()}
                  size="sm"
                >
                  {isSavingName ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Current Members */}
          <div>
            <Label className="text-sm font-medium">Current Members</Label>
            <div className="mt-2 space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        Failed to load members
                      </p>
                      <p className="text-xs text-destructive/80">
                        {error instanceof Error
                          ? error.message
                          : "Unknown error occurred"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryMembers}
                    className="ml-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              ) : !members || members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No members found for this trip.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {members.map((member) => {
                    const isCreator = member.is_creator;
                    const displayName =
                      member.member_profile?.display_name || "Anonymous User";
                    const avatarUrl = member.member_profile?.avatar_url;

                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center overflow-hidden ${
                            isCreator ? "bg-primary/10" : "bg-secondary/50"
                          }`}
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-full h-full rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : isCreator ? (
                            <Crown className="h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-sm font-medium text-secondary-foreground">
                              {displayName.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {displayName}
                            </p>
                            <Badge
                              variant={isCreator ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {isCreator ? "Owner" : "Collaborator"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isCreator
                              ? "Created this trip"
                              : `Joined ${new Date(member.joined_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Invite Section */}
          <div>
            <Label className="text-sm font-medium">Invite Collaborators</Label>
            <div className="mt-2 space-y-3">
              {inviteError && (
                <div className="flex items-center gap-2 p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{inviteError}</p>
                </div>
              )}

              {!inviteLink ? (
                <Button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full text-white hover:opacity-90"
                  style={{ backgroundColor: "#0D9488" }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate Invite Link"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-600">
                      Link copied to clipboard!
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Share this link with people you want to collaborate with on
                    this trip.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
