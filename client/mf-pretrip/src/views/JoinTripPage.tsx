"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "../components/ui/button";
import { useMember } from "../contexts/MemberContext";
import { useCurrentTrip } from "../hooks/useCurrentTrip";
import {
  getInviteDetails,
  joinTrip,
  getTripMembers,
  getTripIdeaPhotos,
} from "../lib/collaboration";
import { InviteDetails, TripMember } from "../lib/collaboration";
import { MapPin, Calendar, Loader2, AlertCircle } from "lucide-react";
import { PhotoCollage } from "../components/PhotoCollage";

export function JoinTripPage() {
  const { member } = useMember();
  const { setCurrentTrip } = useCurrentTrip();

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(
    null,
  );
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteToken = window.location.pathname.split("/join/")[1];

  useEffect(() => {
    const load = async () => {
      if (!inviteToken) {
        setError("Invalid invite link");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [details, members, ideaPhotos] = await Promise.all([
          getInviteDetails(inviteToken),
          getTripMembers(inviteToken),
          getTripIdeaPhotos(inviteToken),
        ]);

        setInviteDetails(details);
        setTripMembers(members);
        setPhotos(ideaPhotos);
      } catch (err) {
        console.error("Failed to load invite details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load trip details",
        );
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [inviteToken]);

  const handleJoinTrip = async () => {
    if (!member || !inviteToken || !inviteDetails) return;

    try {
      setIsJoining(true);
      setError(null);
      await joinTrip(inviteToken, member.id);
      setCurrentTrip(inviteToken);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
          <h2 className="text-xl font-semibold text-destructive">
            Invalid Invite Link
          </h2>
          <p className="text-muted-foreground text-sm">
            {error || "This invite link is invalid or has expired."}
          </p>
          <Button onClick={handleGoToTrips} variant="outline" className="w-full">
            Go to Trips
          </Button>
        </div>
      </div>
    );
  }

  const { trip } = inviteDetails;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const dateRange =
    trip.start_date && trip.end_date
      ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`
      : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Photo Collage Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <PhotoCollage photos={photos} destination={trip.destination} />
        </motion.div>

        {/* Member Avatars */}
        {tripMembers.length > 0 && (
          <motion.div
            className="flex items-center justify-center -mt-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex -space-x-2">
              {tripMembers.slice(0, 5).map((m, i) => (
                <div
                  key={m.user_id}
                  className="w-10 h-10 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center"
                  style={{ zIndex: tripMembers.length - i }}
                >
                  <span className="text-xs font-semibold text-primary">
                    {m.member_profile.display_name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
              ))}
              {tripMembers.length > 5 && (
                <div className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{tripMembers.length - 5}
                  </span>
                </div>
              )}
            </div>
            <span className="ml-3 text-sm text-muted-foreground">
              {tripMembers.length} {tripMembers.length === 1 ? "member" : "members"}
            </span>
          </motion.div>
        )}

        {/* Trip Info */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl font-bold tracking-tight">You're Invited!</h1>
          <h2 className="text-lg font-semibold text-foreground/90">
            {trip.title || trip.destination}
          </h2>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            {trip.title && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {trip.destination}
              </span>
            )}
            {dateRange && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateRange}
              </span>
            )}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {!member ? (
            <p className="text-center text-sm text-muted-foreground">
              Loading your profile...
            </p>
          ) : (
            <>
              <Button
                onClick={handleJoinTrip}
                disabled={isJoining}
                className="w-full h-12 text-base font-semibold rounded-xl"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  "Join This Trip"
                )}
              </Button>
              <div className="text-center">
                <Button
                  onClick={handleGoToTrips}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  No thanks
                </Button>
              </div>
            </>
          )}
        </motion.div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
