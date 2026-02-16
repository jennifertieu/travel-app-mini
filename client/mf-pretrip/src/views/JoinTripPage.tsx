"use client";

import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useMember } from "../contexts/MemberContext";
import { useCurrentTrip } from "../hooks/useCurrentTrip";
import {
  getInviteDetails,
  joinTrip,
  getTripMembers,
} from "../lib/collaboration";
import { InviteDetails, TripMember } from "../lib/collaboration";
import { MapPin, Calendar, Users, Loader2, AlertCircle } from "lucide-react";

export function JoinTripPage() {
  const { member, updateMember } = useMember();
  const { setCurrentTrip } = useCurrentTrip();

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(
    null,
  );
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract invite token from URL
  const inviteToken = window.location.pathname.split("/join/")[1];

  useEffect(() => {
    const loadInviteDetails = async () => {
      if (!inviteToken) {
        setError("Invalid invite link");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get invite details using the token as trip ID (hackathon mode)
        const details = await getInviteDetails(inviteToken);
        setInviteDetails(details);

        // Get trip members
        const members = await getTripMembers(inviteToken);
        setTripMembers(members);
      } catch (err) {
        console.error("Failed to load invite details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load trip details",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadInviteDetails();
  }, [inviteToken]);

  const handleJoinTrip = async () => {
    if (!member || !inviteToken || !inviteDetails) return;

    try {
      setIsJoining(true);
      setError(null);

      await joinTrip(inviteToken, member.id);

      // Set the joined trip as the current trip
      setCurrentTrip(inviteToken);

      // Redirect to trip management page - the trip will now be loaded
      window.location.href = "/pretrip";
    } catch (err) {
      console.error("Failed to join trip:", err);
      setError(err instanceof Error ? err.message : "Failed to join trip");
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToTrips = () => {
    window.location.href = "/pretrip";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Loading trip details...</h2>
            <p className="text-muted-foreground">
              Please wait while we fetch the trip information.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !inviteDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">
              Invalid Invite Link
            </h2>
            <p className="text-muted-foreground">
              {error || "This invite link is invalid or has expired."}
            </p>
            <Button
              onClick={handleGoToTrips}
              variant="outline"
              className="w-full"
            >
              Go to Trips
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { trip } = inviteDetails;

  // Format dates for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">You're Invited!</h1>
            <p className="text-muted-foreground">
              Join this trip and start planning together
            </p>
          </div>

          {/* Trip Details */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                {trip.title || trip.destination}
              </h2>
              {trip.title && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{trip.destination}</span>
                </div>
              )}
            </div>

            {/* Trip Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Start Date</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(trip.start_date)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">End Date</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(trip.end_date)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Members */}
          {tripMembers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-medium">
                  Trip Members ({tripMembers.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tripMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {member.member_profile.display_name?.[0]?.toUpperCase() ||
                          "?"}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {member.member_profile.display_name || "Anonymous"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Authentication Check */}
          {!member ? (
            <div className="text-center space-y-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Loading your profile...</p>
            </div>
          ) : (
            /* Join Button */
            <div className="space-y-4">
              <Button
                onClick={handleJoinTrip}
                disabled={isJoining}
                className="w-full h-12 text-lg font-semibold"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Joining Trip...
                  </>
                ) : (
                  "Join This Trip"
                )}
              </Button>

              <div className="text-center">
                <Button
                  onClick={handleGoToTrips}
                  variant="ghost"
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
