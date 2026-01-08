import { Response } from "express";
import {
  IAuthenticatedRequest,
  IUpdateMemberProfile,
} from "../types/interface.js";
import { supabase } from "../config.js";

export const getMemberProfile = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;

    const { data: memberProfile, error } = await supabase
      .from("member_profiles")
      .select()
      .eq("id", userId)
      .single();

    if (error) {
      return response.status(400).json({ error: error.message });
    }

    return response.status(200).json(memberProfile);
  } catch (error: any) {
    return response.status(500).json({
      error: "Failed to fetch member profile",
      details: error.message,
    });
  }
};

export const updateMemberProfile = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;
    const updateData: IUpdateMemberProfile = request.body;

    const { data: updatedProfile, error } = await supabase
      .from("member_profiles")
      .update(updateData)
      .eq("id", userId)
      .select(
        "display_name, dietary, travel_style, interests, walking_tolerance"
      )
      .single();

    if (error) {
      return response.status(400).json({ error: error.message });
    }

    return response.status(200).json(updatedProfile);
  } catch (error: any) {
    return response.status(500).json({
      error: "Failed to update member profile",
      details: error.message,
    });
  }
};

export const deleteMemberProfile = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;

    const { error } = await supabase
      .from("member_profiles")
      .delete()
      .eq("id", userId);

    if (error) {
      return response.status(400).json({ error: error.message });
    }

    return response.status(200).json({ message: "Profile was deleted" });
  } catch (error: any) {
    return response.status(500).json({
      error: "Failed to delete member profile",
      details: error.message,
    });
  }
};
