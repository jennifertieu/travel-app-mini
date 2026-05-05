import React from "react";
import { Users, Crown } from "lucide-react";
import { useTripMembers } from "@/hooks/useTripMembers";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface TripMembersDisplayProps {
  tripId: string;
  className?: string;
}

/**
 * Display all members of a trip with visual distinction between creator and collaborators
 */
export function TripMembersDisplay({
  tripId,
  className,
}: TripMembersDisplayProps) {
  const { data: members, isLoading, error } = useTripMembers(tripId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Trip Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Trip Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load trip members. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!members || members.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Trip Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No members found for this trip.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Trip Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => {
            const isCreator = member.is_creator;

            return (
              <div
                key={member.user_id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isCreator ? "bg-muted/50" : "hover:bg-muted/30"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    isCreator ? "bg-primary/10" : "bg-secondary/50"
                  }`}
                >
                  {isCreator ? (
                    <Crown className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="text-sm font-medium text-secondary-foreground">
                      {member.member_profile.display_name
                        ?.charAt(0)
                        ?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {member.member_profile.display_name || "Anonymous User"}
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
      </CardContent>
    </Card>
  );
}
