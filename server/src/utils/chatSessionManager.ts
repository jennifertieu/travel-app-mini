import { randomUUID } from "crypto";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { IItinerary } from "./assignActivityToDay.js";

export interface IItineraryChange {
  type: "add" | "remove" | "move" | "swap" | "add_travel" | "remove_travel";
  description: string;
  before?: {
    day_number: number;
    time_of_day: string;
    activity_name: string;
  };
  after?: {
    day_number: number;
    time_of_day: string;
    activity_name: string;
  };
}

export interface IDisplayMessage {
  role: "user" | "agent";
  content: string;
}

export interface ISystemEvent {
  content: string;
  variant?: "default" | "danger";
  timestamp: number;
  /** Conversation messages that led to this event, archived for UI display after reset */
  archivedMessages?: IDisplayMessage[];
}

export interface IChatSession {
  tripId: string;
  userId: string;
  itineraryRowId: string;
  originalItinerary: IItinerary;
  draftItinerary: IItinerary;
  messages: ChatCompletionMessageParam[];
  /** UI-only events (confirm/reject acknowledgments) kept separate from LLM messages */
  systemEvents: ISystemEvent[];
  createdAt: number;
  lastActivityAt: number;
}

const sessions = new Map<string, IChatSession>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const sessionKey = (tripId: string, userId: string) =>
  `${tripId}:${userId}`;

/**
 * Gets an existing session or creates a new one by fetching the itinerary.
 */
export const getOrCreateSession = async (
  tripId: string,
  userId: string,
  fetchItinerary: () => Promise<{ id: string; itinerary: IItinerary }>
): Promise<IChatSession> => {
  const key = sessionKey(tripId, userId);
  const existing = sessions.get(key);

  if (existing) {
    existing.lastActivityAt = Date.now();
    return existing;
  }

  const { id: itineraryRowId, itinerary: savedItinerary } = await fetchItinerary();

  // Backfill missing activity IDs so tools and change-tracking work
  for (const day of savedItinerary.days ?? []) {
    for (const activity of day.activities ?? []) {
      if (!activity.id) {
        activity.id = randomUUID();
      }
    }
  }
  for (const activity of savedItinerary.activities_pool ?? []) {
    if (!activity.id) {
      activity.id = randomUUID();
    }
  }

  const session: IChatSession = {
    tripId,
    userId,
    itineraryRowId,
    originalItinerary: structuredClone(savedItinerary),
    draftItinerary: structuredClone(savedItinerary),
    messages: [],
    systemEvents: [],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  sessions.set(key, session);
  return session;
};

/**
 * Gets an existing session without creating one.
 */
export const getSession = (
  tripId: string,
  userId: string
): IChatSession | undefined => {
  const key = sessionKey(tripId, userId);
  return sessions.get(key);
};

/**
 * Deletes a session.
 */
export const deleteSession = (tripId: string, userId: string): void => {
  const key = sessionKey(tripId, userId);
  sessions.delete(key);
};

/**
 * Computes a human-readable diff between original and draft itineraries.
 * Compares activity placements by ID to detect adds, removes, and moves.
 */
export const computeChanges = (session: IChatSession): IItineraryChange[] => {
  const changes: IItineraryChange[] = [];

  // Build lookup: activityId -> { day_number, time_of_day, name }
  const buildPlacementMap = (itinerary: IItinerary) => {
    const map = new Map<
      string,
      { day_number: number; time_of_day: string; name: string }
    >();
    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        map.set(activity.id, {
          day_number: day.day_number,
          time_of_day: activity.time_of_day || "unset",
          name: activity.title || activity.name || activity.id,
        });
      }
    }
    return map;
  };

  const originalMap = buildPlacementMap(session.originalItinerary);
  const draftMap = buildPlacementMap(session.draftItinerary);

  // Find removed activities (in original but not in draft)
  for (const [id, original] of originalMap) {
    if (!draftMap.has(id)) {
      changes.push({
        type: "remove",
        description: `Removed "${original.name}" from day ${original.day_number} (${original.time_of_day})`,
        before: {
          day_number: original.day_number,
          time_of_day: original.time_of_day,
          activity_name: original.name,
        },
      });
    }
  }

  // Find added activities (in draft but not in original)
  for (const [id, draft] of draftMap) {
    if (!originalMap.has(id)) {
      // Check if it's a travel segment
      const changeType = id.startsWith("travel-") ? "add_travel" : "add";
      changes.push({
        type: changeType,
        description: `Added "${draft.name}" to day ${draft.day_number} (${draft.time_of_day})`,
        after: {
          day_number: draft.day_number,
          time_of_day: draft.time_of_day,
          activity_name: draft.name,
        },
      });
    }
  }

  // Find moved activities (in both but different placement)
  for (const [id, original] of originalMap) {
    const draft = draftMap.get(id);
    if (!draft) continue;

    if (
      original.day_number !== draft.day_number ||
      original.time_of_day !== draft.time_of_day
    ) {
      changes.push({
        type: "move",
        description: `Moved "${original.name}" from day ${original.day_number} (${original.time_of_day}) to day ${draft.day_number} (${draft.time_of_day})`,
        before: {
          day_number: original.day_number,
          time_of_day: original.time_of_day,
          activity_name: original.name,
        },
        after: {
          day_number: draft.day_number,
          time_of_day: draft.time_of_day,
          activity_name: draft.name,
        },
      });
    }
  }

  return changes;
};

// Cleanup expired sessions every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActivityAt > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}, 60_000);
