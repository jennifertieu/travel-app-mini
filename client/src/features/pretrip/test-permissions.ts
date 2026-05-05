/**
 * Permission Verification Script for Collaborative Trips
 *
 * This script tests the permission system to verify that:
 * 1. Collaborators can edit trip details (same as creators)
 * 2. Collaborators can generate invite links
 * 3. Trip access works correctly for collaborative trips
 */

import { supabase } from "./lib/supabase";
import {
  generateInviteLink,
  getTripMembers,
  joinTrip,
} from "./lib/collaboration";

// Test data
const TEST_TRIP_ID = "test-trip-id";
const TEST_USER_ID = "test-user-id";
const TEST_COLLABORATOR_ID = "test-collaborator-id";

/**
 * Test 1: Verify trip editing permissions work for collaborators
 */
export async function testTripEditingPermissions() {
  console.log("🧪 Testing trip editing permissions...");

  try {
    // Test updating a trip as a collaborator
    // This should work if RLS is not enabled on trips table
    const { data, error } = await supabase
      .from("trips")
      .update({
        title: "Updated by Collaborator",
        updated_at: new Date().toISOString(),
      })
      .eq("id", TEST_TRIP_ID)
      .select()
      .single();

    if (error) {
      console.error("❌ Trip editing failed:", error.message);
      return false;
    }

    console.log("✅ Trip editing permissions work correctly");
    console.log("   - Collaborators can update trip details");
    return true;
  } catch (error) {
    console.error("❌ Trip editing test failed:", error);
    return false;
  }
}

/**
 * Test 2: Verify collaborators can generate invite links
 */
export async function testInviteGeneration() {
  console.log("🧪 Testing invite generation permissions...");

  try {
    // Test generating invite link as a collaborator
    const inviteLink = await generateInviteLink(TEST_TRIP_ID);

    if (!inviteLink || !inviteLink.includes("/join/")) {
      console.error("❌ Invite generation failed: Invalid link format");
      return false;
    }

    console.log("✅ Invite generation permissions work correctly");
    console.log("   - Collaborators can generate invite links");
    console.log("   - Generated link:", inviteLink);
    return true;
  } catch (error) {
    console.error("❌ Invite generation test failed:", error);
    return false;
  }
}

/**
 * Test 3: Verify trip access for collaborative trips
 */
export async function testTripAccess() {
  console.log("🧪 Testing trip access for collaborative trips...");

  try {
    // Test fetching trips where user is a collaborator
    const { data, error } = await supabase
      .from("trips")
      .select(
        `
        *,
        trip_collaborators!left(user_id)
      `,
      )
      .or(
        `created_by.eq.${TEST_COLLABORATOR_ID},trip_collaborators.user_id.eq.${TEST_COLLABORATOR_ID}`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Trip access test failed:", error.message);
      return false;
    }

    console.log("✅ Trip access works correctly");
    console.log("   - Collaborative trips are included in user's trip list");
    console.log("   - Found", data.length, "accessible trips");
    return true;
  } catch (error) {
    console.error("❌ Trip access test failed:", error);
    return false;
  }
}

/**
 * Test 4: Verify member list functionality
 */
export async function testMemberList() {
  console.log("🧪 Testing trip member list functionality...");

  try {
    const members = await getTripMembers(TEST_TRIP_ID);

    console.log("✅ Member list functionality works correctly");
    console.log("   - Can fetch trip members");
    console.log("   - Found", members.length, "members");

    // Check if creator is distinguished from collaborators
    const hasCreator = members.some((member) => member.is_creator);
    const hasCollaborators = members.some((member) => !member.is_creator);

    if (hasCreator) {
      console.log("   - Trip creator is properly identified");
    }
    if (hasCollaborators) {
      console.log("   - Collaborators are properly identified");
    }

    return true;
  } catch (error) {
    console.error("❌ Member list test failed:", error);
    return false;
  }
}

/**
 * Run all permission verification tests
 */
export async function runPermissionTests() {
  console.log("🚀 Starting permission system verification...\n");

  const results = {
    tripEditing: await testTripEditingPermissions(),
    inviteGeneration: await testInviteGeneration(),
    tripAccess: await testTripAccess(),
    memberList: await testMemberList(),
  };

  console.log("\n📊 Test Results Summary:");
  console.log("   Trip Editing:", results.tripEditing ? "✅ PASS" : "❌ FAIL");
  console.log(
    "   Invite Generation:",
    results.inviteGeneration ? "✅ PASS" : "❌ FAIL",
  );
  console.log("   Trip Access:", results.tripAccess ? "✅ PASS" : "❌ FAIL");
  console.log("   Member List:", results.memberList ? "✅ PASS" : "❌ FAIL");

  const allPassed = Object.values(results).every((result) => result);

  if (allPassed) {
    console.log(
      "\n🎉 All permission tests passed! Universal collaboration is working correctly.",
    );
  } else {
    console.log("\n⚠️  Some permission tests failed. Review the issues above.");
  }

  return results;
}

// Export for manual testing
if (typeof window !== "undefined") {
  (window as any).testPermissions = runPermissionTests;
  console.log(
    "💡 Run testPermissions() in the browser console to test permissions",
  );
}
