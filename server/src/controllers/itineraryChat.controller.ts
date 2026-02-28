import { Response } from "express";
import { supabase } from "../config.js";
import { IAuthenticatedRequest } from "../types/interface.js";
import { IItinerary } from "../utils/assignActivityToDay.js";
import {
  getOrCreateSession,
  getSession,
  computeChanges,
} from "../utils/chatSessionManager.js";
import { streamItineraryChatAgent } from "../utils/itineraryChatAgent.js";

export const chatWithAgent = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  const { id: tripId } = request.params;
  const { message } = request.body;
  const userId = request.user!.id;

  if (!message || typeof message !== "string") {
    return response.status(400).json({ error: "Message is required" });
  }

  // Set SSE headers
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const session = await getOrCreateSession(tripId, userId, async () => {
      const { data, error } = await supabase
        .from("trip_itineraries")
        .select("itinerary")
        .eq("trip_id", tripId)
        .single();

      if (error || !data) {
        throw new Error("Itinerary not found for this trip");
      }

      return data.itinerary as IItinerary;
    });

    await streamItineraryChatAgent(session, message, sendEvent);
  } catch (error: any) {
    console.error("Chat agent error:", error);
    sendEvent("error", { message: error.message });
    sendEvent("done", {});
  } finally {
    response.end();
  }
};

export const confirmChanges = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  const { id: tripId } = request.params;
  const userId = request.user!.id;

  const session = getSession(tripId, userId);
  if (!session) {
    return response.status(404).json({ error: "No active chat session" });
  }

  const changes = computeChanges(session);
  if (changes.length === 0) {
    return response.status(400).json({ error: "No pending changes to confirm" });
  }

  const { error } = await supabase
    .from("trip_itineraries")
    .update({ itinerary: session.draftItinerary })
    .eq("trip_id", tripId);

  if (error) {
    console.error("Failed to save itinerary changes:", error);
    return response.status(500).json({ error: "Failed to save changes" });
  }

  // Reset: draft becomes the new baseline
  session.originalItinerary = structuredClone(session.draftItinerary);

  return response.json({
    success: true,
    message: "Changes saved",
    changesApplied: changes.length,
  });
};

export const rejectChanges = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  const { id: tripId } = request.params;
  const userId = request.user!.id;

  const session = getSession(tripId, userId);
  if (!session) {
    return response.status(404).json({ error: "No active chat session" });
  }

  // Revert draft to original
  session.draftItinerary = structuredClone(session.originalItinerary);

  return response.json({ success: true, message: "Changes reverted" });
};

export const getSessionStatus = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  const { id: tripId } = request.params;
  const userId = request.user!.id;

  const session = getSession(tripId, userId);
  if (!session) {
    return response.json({ active: false });
  }

  return response.json({
    active: true,
    pendingChanges: computeChanges(session),
    messageCount: session.messages.filter((m) => m.role !== "system").length,
    createdAt: session.createdAt,
  });
};
