import { Response } from "express";
import { supabase } from "../config.js";
import { IAuthenticatedRequest } from "../types/interface.js";
import { IItinerary } from "../utils/assignActivityToDay.js";
import {
  getOrCreateSession,
  getSession,
  deleteSession,
  computeChanges,
  ISystemEvent,
  IDisplayMessage,
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
        typeof m.content === "string"
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

  const changes = computeChanges(session);

  // Snapshot conversation for UI display before clearing LLM history
  const archivedMessages: IDisplayMessage[] = session.messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        m.content &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role === "assistant" ? "agent" : "user",
      content: m.content as string,
    }));

  // Revert draft to original and clear message history so the LLM
  // doesn't see stale "I already did X" messages from the rejected turn
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

export const clearChatSession = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  const { id: tripId } = request.params;
  deleteSession(tripId, request.user!.id);
  return response.json({ success: true });
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

  // Current live messages (since last confirm/reject)
  const liveMessages = session.messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        m.content &&
        typeof m.content === "string"
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
