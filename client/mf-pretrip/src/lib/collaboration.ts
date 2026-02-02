import { supabase } from "./supabase";
import { Database } from "@travel-app/shared-types";

// Types for collaboration functionality
type Trip = Database["public"]["Tables"]["trips"]["Row"];
type MemberProfile = Database["public"]["Tables"]["member_profiles"]["Row"];
type TripCollaboratorRow =
  Database["public"]["Tables"]["trip_collaborators"]["Row"];
type TripCollaboratorInsert =
  Database["public"]["Tables"]["trip_collaborators"]["Insert"];

// Extended types for collaboration
export interface TripCollaborator extends TripCollaboratorRow {}

export interface CollaborativeTrip extends Trip {
  is_owner: boolean;
  is_collaborator: boolean;
  member_count: number;
}

export interface InviteDetails {
  trip: Trip;
  members: MemberProfile[];
  isValid: boolean;
}

export interface TripMember {
  user_id: string;
  joined_at: string;
  member_profile: MemberProfile;
  is_creator?: boolean;
}

/**
 * Generate a unique invite link for a trip
 *
 * @param tripId - The ID of the trip to generate an invite for
 * @returns Promise resolving to the generated invite link URL
 */
export async function generateInviteLink(tripId: string): Promise<string> {
  // For hackathon mode: just use the trip ID directly in the URL
  // No need for database operations or complex token generation

  // Basic validation - check if trip exists
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .single();

  if (tripError) {
    throw new Error(`Trip not found: ${tripError.message}`);
  }

  // Return simple invite link with trip ID
  return `${window.location.origin}/join/${tripId}`;
}

/**
 * Get trip details and members for a trip ID (hackathon mode)
 *
 * @param tripId - The trip ID from the URL
 * @returns Promise resolving to invite details including trip info and members
 */
export async function getInviteDetails(tripId: string): Promise<InviteDetails> {
  // Get trip details directly using trip ID
  const { data: tripData, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError) {
    throw new Error(`Trip not found: ${tripError.message}`);
  }

  // Get existing trip members
  const members = await getTripMembers(tripId);

  return {
    trip: tripData,
    members: members.map((m) => m.member_profile),
    isValid: true,
  };
}

/**
 * Join a trip using a trip ID (hackathon mode)
 *
 * @param tripId - The trip ID from the URL
 * @param userId - The authenticated user's ID
 * @returns Promise resolving to the created collaborator record
 */
export async function joinTrip(
  tripId: string,
  userId: string,
): Promise<TripCollaborator> {
  // Check if user is already a collaborator
  const { data: existingCollaborator } = await supabase
    .from("trip_collaborators")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingCollaborator) {
    throw new Error("You are already a collaborator on this trip");
  }

  // Add user as collaborator
  const { data, error } = await supabase
    .from("trip_collaborators")
    .insert({
      trip_id: tripId,
      user_id: userId,
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to join trip: ${error.message}`);
  }

  return data as TripCollaborator;
}

/**
 * Get all members of a trip (collaborators + creator)
 *
 * @param tripId - The ID of the trip
 * @returns Promise resolving to array of trip members with their profiles
 */
export async function getTripMembers(tripId: string): Promise<TripMember[]> {
  // Get both collaborators and trip creator information
  const [collaboratorsResult, tripResult] = await Promise.all([
    // Get collaborators
    supabase
      .from("trip_collaborators")
      .select(
        `
        user_id,
        joined_at,
        member_profiles!inner(*)
      `,
      )
      .eq("trip_id", tripId)
      .not("user_id", "is", null),

    // Get trip creator info
    supabase
      .from("trips")
      .select(
        `
        created_by,
        created_at,
        member_profiles!inner(*)
      `,
      )
      .eq("id", tripId)
      .single(),
  ]);

  if (collaboratorsResult.error) {
    throw new Error(
      `Failed to get trip collaborators: ${collaboratorsResult.error.message}`,
    );
  }

  if (tripResult.error) {
    throw new Error(`Failed to get trip creator: ${tripResult.error.message}`);
  }

  const members: TripMember[] = [];

  // Add creator as first member if exists
  if (tripResult.data.created_by && tripResult.data.member_profiles) {
    members.push({
      user_id: tripResult.data.created_by,
      joined_at: tripResult.data.created_at,
      member_profile: tripResult.data.member_profiles as MemberProfile,
      is_creator: true,
    });
  }

  // Add collaborators, excluding creator if they're also in collaborators
  const collaborators = collaboratorsResult.data
    .map((item) => ({
      user_id: item.user_id!,
      joined_at: item.joined_at!,
      member_profile: item.member_profiles as MemberProfile,
      is_creator: false,
    }))
    .filter((member) => member.user_id !== tripResult.data.created_by);

  members.push(...collaborators);

  return members;
}
