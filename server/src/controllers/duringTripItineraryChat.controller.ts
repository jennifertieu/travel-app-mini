import { Response } from "express";
import { supabase } from "../config.js";
import { IAuthenticatedRequest } from "../types/interface.js";
import { IItinerary } from "../utils/assignActivityToDay.js";
import {
  getOrCreateSession,
  getSession,
  computeChanges,
  ISystemEvent,
  IDisplayMessage,
} from "../utils/chatSessionManager.js";
import { streamDuringTripChatAgent } from "../utils/duringTripChatAgent.js";

export const chatWithItineraryAgent = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { trip_id: tripId, message, location, current_day: currentDay } = request.body;
  const userId = request.user!.id;

  if (!tripId || typeof tripId !== "string") {
    return response.status(400).json({ error: "trip_id is required" });
  }

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
        .select("id, itinerary")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        throw new Error("Itinerary not found for this trip");
      }

      return { id: data.id as string, itinerary: data.itinerary as IItinerary };
    });

    // Build during-trip context for the system prompt
    const context = {
      currentDay: currentDay ?? undefined,
      totalDays: session.draftItinerary.days.length,
      location:
        location?.lat !== undefined && location?.lng !== undefined
          ? { lat: location.lat, lng: location.lng }
          : undefined,
    };

    await streamDuringTripChatAgent(session, message, sendEvent, context);
  } catch (error: any) {
    console.error("During-trip itinerary chat error:", error);
    sendEvent("error", { message: error.message });
    sendEvent("done", {});
  } finally {
    response.end();
  }
};

export const confirmItineraryChanges = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { trip_id: tripId } = request.body;
  const userId = request.user!.id;

  if (!tripId || typeof tripId !== "string") {
    return response.status(400).json({ error: "trip_id is required" });
  }

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
    .eq("id", session.itineraryRowId);

  if (error) {
    console.error("Failed to save itinerary changes:", error);
    return response.status(500).json({ error: "Failed to save changes" });
  }

  // Snapshot conversation for UI display before resetting baseline
  const archivedMessages: IDisplayMessage[] = session.messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        m.content &&
        typeof m.content === "string",
    )
    .map((m) => ({
      role: m.role === "assistant" ? "agent" : "user",
      content: m.content as string,
    }));

  // Reset: draft becomes the new baseline
  session.originalItinerary = structuredClone(session.draftItinerary);

  const event: ISystemEvent = {
    content: `✓ ${changes.length} change${changes.length !== 1 ? "s" : ""} applied`,
    timestamp: Date.now(),
    archivedMessages,
  };
  session.systemEvents.push(event);
  session.messages = [];

  return response.json({
    success: true,
    message: "Changes saved",
    changesApplied: changes.length,
  });
};

export const rejectItineraryChanges = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { trip_id: tripId } = request.body;
  const userId = request.user!.id;

  if (!tripId || typeof tripId !== "string") {
    return response.status(400).json({ error: "trip_id is required" });
  }

  const session = getSession(tripId, userId);
  if (!session) {
    return response.status(404).json({ error: "No active chat session" });
  }

  const changes = computeChanges(session);

  // Snapshot conversation for UI display before clearing LLM history
  const archivedMessages: IDisplayMessage[] = session.messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        m.content &&
        typeof m.content === "string",
    )
    .map((m) => ({
      role: m.role === "assistant" ? "agent" : "user",
      content: m.content as string,
    }));

  // Revert draft to original and clear message history
  session.draftItinerary = structuredClone(session.originalItinerary);
  session.messages = [];

  const event: ISystemEvent = {
    content: `✕ ${changes.length} change${changes.length !== 1 ? "s" : ""} discarded`,
    variant: "danger",
    timestamp: Date.now(),
    archivedMessages,
  };
  session.systemEvents.push(event);

  return response.json({ success: true, message: "Changes reverted" });
};

export const getItineraryChatSession = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const tripId = request.query.trip_id as string;
  const userId = request.user!.id;

  if (!tripId) {
    return response.status(400).json({ error: "trip_id query param is required" });
  }

  const session = getSession(tripId, userId);
  if (!session) {
    return response.json({ active: false });
  }

  // Current live messages (since last confirm/reject)
  const liveMessages = session.messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        m.content &&
        typeof m.content === "string",
    )
    .map((m) => ({
      role: m.role === "assistant" ? "agent" : "user",
      content: m.content as string,
    }));

  return response.json({
    active: true,
    pendingChanges: computeChanges(session),
    messages: liveMessages,
    systemEvents: session.systemEvents,
    createdAt: session.createdAt,
  });
};
