import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { MemberProfile } from "../contexts/MemberContext";
import { Database } from "@/types";

// Types for our Realtime features
export interface CursorPosition {
  lat: number;
  lng: number;
  userId: string;
  user: MemberProfile;
  lastUpdated: number;
}

export type Annotation = {
  id: string;
  trip_id: string;
  label: string;
  coordinates: any;
  created_at: string;
  created_by: string;
  updated_at: string;
};

export interface BoxCoordinates {
  type?: "box";
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PolygonCoordinates {
  type: "polygon";
  points: { lat: number; lng: number }[];
}

export interface PathCoordinates {
  type: "path";
  points: { lat: number; lng: number }[];
}

export type AnnotationCoordinates =
  | BoxCoordinates
  | PolygonCoordinates
  | PathCoordinates;

// Drawing preview types
export interface DrawingPreview {
  userId: string;
  user: MemberProfile;
  startLat: number;
  startLng: number;
  currentLat: number;
  currentLng: number;
  color: string;
  timestamp: number;
}

// Polygon drawing preview types
export interface PolygonDrawingPreview {
  userId: string;
  user: MemberProfile;
  points: { lat: number; lng: number }[];
  currentLat: number;
  currentLng: number;
  color: string;
  timestamp: number;
}

// Path drawing preview types
export interface PathDrawingPreview {
  userId: string;
  user: MemberProfile;
  points: { lat: number; lng: number }[];
  color: string;
  timestamp: number;
}

export interface PathDecoration {
  id: string;
  userId: string;
  user: MemberProfile;
  points: { lat: number; lng: number }[];
  color: string;
  timestamp: number;
}

// Drawing broadcast event payload types
export interface DrawingStartPayload {
  userId: string;
  user: MemberProfile;
  startLat: number;
  startLng: number;
  color: string;
  timestamp: number;
}

export interface DrawingUpdatePayload {
  userId: string;
  currentLat: number;
  currentLng: number;
  timestamp: number;
}

export interface DrawingEndPayload {
  userId: string;
  cancelled: boolean;
  timestamp: number;
}

// Polygon drawing broadcast event payload types
export interface PolygonPointAddedPayload {
  userId: string;
  user: MemberProfile;
  points: { lat: number; lng: number }[];
  color: string;
  timestamp: number;
}

export interface PolygonPreviewUpdatePayload {
  userId: string;
  currentLat: number;
  currentLng: number;
  timestamp: number;
}

export interface PolygonDrawingEndPayload {
  userId: string;
  cancelled: boolean;
  timestamp: number;
}

// Path drawing broadcast event payload types
export interface PathDrawingStartPayload {
  userId: string;
  user: MemberProfile;
  startLat: number;
  startLng: number;
  color: string;
  timestamp: number;
}

export interface PathDrawingUpdatePayload {
  userId: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export interface PathDrawingEndPayload {
  userId: string;
  cancelled: boolean;
  timestamp: number;
}

// Throttle cursor updates to avoid spam while staying smooth.
function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number,
): T {
  let inThrottle = false;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;

  const schedule = () => {
    if (lastArgs) {
      func.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
      setTimeout(schedule, limit);
      return;
    }
    inThrottle = false;
  };

  return function (this: any, ...args: any[]) {
    lastArgs = args;
    lastThis = this;
    if (inThrottle) return;
    func.apply(this, args);
    inThrottle = true;
    setTimeout(schedule, limit);
  } as T;
}

export function useRealtimeTrip(
  tripId: string | null,
  currentUser: MemberProfile | null,
) {
  const [onlineUsers, setOnlineUsers] = useState<MemberProfile[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawingPreviews, setDrawingPreviews] = useState<
    Record<string, DrawingPreview>
  >({});
  const [polygonPreviews, setPolygonPreviews] = useState<
    Record<string, PolygonDrawingPreview>
  >({});
  const [pathPreviews, setPathPreviews] = useState<
    Record<string, PathDrawingPreview>
  >({});

  // Ref to access current user in callbacks without re-triggering effects
  const userRef = useRef(currentUser);
  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  // Channel ref to access it in the throttled function
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch initial annotations
  useEffect(() => {
    if (!tripId) return;

    const fetchAnnotations = async () => {
      const { data } = await supabase
        .from("trip_annotations" as any)
        .select("*")
        .eq("trip_id", tripId);

      if (data && !("error" in data)) {
        setAnnotations(data as unknown as Annotation[]);
      }
    };

    fetchAnnotations();
  }, [tripId]);

  useEffect(() => {
    if (!tripId || !currentUser) return;

    // 1. Create the channel for this specific trip
    const channel = supabase.channel(`trip:${tripId}`, {
      config: {
        presence: {
          key: currentUser.id, // Unique ID for this user presence
        },
      },
    });

    channelRef.current = channel;

    // Helper function to update online users from presence state
    const updateOnlineUsers = () => {
      const newState = channel.presenceState();
      const users: MemberProfile[] = [];

      // Flatten the presence state object into an array of users
      for (const key in newState) {
        const state = newState[key];
        if (state && state[0] && (state[0] as any).user) {
          users.push((state[0] as any).user as MemberProfile);
        }
      }

      console.log(
        "🟢 [Presence] Online users:",
        users.length,
        users.map((u) => ({
          id: u.id,
          displayName: u.displayName || "No name",
        })),
      );
      console.log("🟢 [Presence] Current user ID:", currentUser.id);
      setOnlineUsers(users);
    };

    channel
      // 2. Handle Presence (Who is online?)
      .on("presence", { event: "sync" }, () => {
        console.log("🟢 [Presence] Sync event");
        updateOnlineUsers();
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("🟢 [Presence] Join event:", key, newPresences);
        updateOnlineUsers();
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("🔴 [Presence] Leave event:", key, leftPresences);
        // Clean up cursor when user leaves
        setCursors((prev) => {
          const newCursors = { ...prev };
          delete newCursors[key];
          return newCursors;
        });
        // Clean up drawing preview when user leaves
        setDrawingPreviews((prev) => {
          const newPreviews = { ...prev };
          delete newPreviews[key];
          return newPreviews;
        });
        // Clean up polygon preview when user leaves
        setPolygonPreviews((prev) => {
          const newPreviews = { ...prev };
          delete newPreviews[key];
          return newPreviews;
        });
        // Clean up path preview when user leaves
        setPathPreviews((prev) => {
          const newPreviews = { ...prev };
          delete newPreviews[key];
          return newPreviews;
        });
        updateOnlineUsers();
      })

      // 3. Handle Broadcast (Cursors)
      .on("broadcast", { event: "cursor-pos" }, ({ payload }) => {
        // payload: { lat, lng, userId, user }
        if (payload.userId !== currentUser.id) {
          setCursors((prev) => ({
            ...prev,
            [payload.userId]: {
              ...payload,
              lastUpdated: Date.now(),
            },
          }));
        }
      })

      // Handle drawing-start broadcast
      .on("broadcast", { event: "drawing-start" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setDrawingPreviews((prev) => ({
            ...prev,
            [payload.userId]: {
              userId: payload.userId,
              user: payload.user,
              startLat: payload.startLat,
              startLng: payload.startLng,
              currentLat: payload.startLat,
              currentLng: payload.startLng,
              color: payload.color,
              timestamp: payload.timestamp,
            },
          }));
        }
      })

      // Handle drawing-update broadcast
      .on("broadcast", { event: "drawing-update" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setDrawingPreviews((prev) => {
            const existing = prev[payload.userId];
            if (!existing) return prev;

            return {
              ...prev,
              [payload.userId]: {
                ...existing,
                currentLat: payload.currentLat,
                currentLng: payload.currentLng,
                timestamp: payload.timestamp,
              },
            };
          });
        }
      })

      // Handle drawing-end broadcast
      .on("broadcast", { event: "drawing-end" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          if (payload.cancelled) {
            // Remove preview immediately if cancelled
            setDrawingPreviews((prev) => {
              const newPreviews = { ...prev };
              delete newPreviews[payload.userId];
              return newPreviews;
            });
          }
          // If not cancelled, preview will be removed when postgres_changes INSERT arrives
        }
      })

      // Handle polygon-point-added broadcast
      .on("broadcast", { event: "polygon-point-added" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setPolygonPreviews((prev) => ({
            ...prev,
            [payload.userId]: {
              userId: payload.userId,
              user: payload.user,
              points: payload.points,
              currentLat: payload.points[payload.points.length - 1].lat,
              currentLng: payload.points[payload.points.length - 1].lng,
              color: payload.color,
              timestamp: payload.timestamp,
            },
          }));
        }
      })

      // Handle polygon-preview-update broadcast
      .on("broadcast", { event: "polygon-preview-update" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setPolygonPreviews((prev) => {
            const existing = prev[payload.userId];
            if (!existing) return prev;

            return {
              ...prev,
              [payload.userId]: {
                ...existing,
                currentLat: payload.currentLat,
                currentLng: payload.currentLng,
                timestamp: payload.timestamp,
              },
            };
          });
        }
      })

      // Handle polygon-drawing-end broadcast
      .on("broadcast", { event: "polygon-drawing-end" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          if (payload.cancelled) {
            // Remove preview immediately if cancelled
            setPolygonPreviews((prev) => {
              const newPreviews = { ...prev };
              delete newPreviews[payload.userId];
              return newPreviews;
            });
          }
          // If not cancelled, preview will be removed when postgres_changes INSERT arrives
        }
      })

      // Handle path-drawing-start broadcast
      .on("broadcast", { event: "path-drawing-start" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setPathPreviews((prev) => ({
            ...prev,
            [payload.userId]: {
              userId: payload.userId,
              user: payload.user,
              points: [{ lat: payload.startLat, lng: payload.startLng }],
              color: payload.color,
              timestamp: payload.timestamp,
            },
          }));
        }
      })

      // Handle path-drawing-update broadcast
      .on("broadcast", { event: "path-drawing-update" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setPathPreviews((prev) => {
            const existing = prev[payload.userId];
            if (!existing) return prev;

            return {
              ...prev,
              [payload.userId]: {
                ...existing,
                points: [
                  ...existing.points,
                  { lat: payload.lat, lng: payload.lng },
                ],
                timestamp: payload.timestamp,
              },
            };
          });
        }
      })

      // Handle path-drawing-end broadcast
      .on("broadcast", { event: "path-drawing-end" }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setPathPreviews((prev) => {
            const newPreviews = { ...prev };
            delete newPreviews[payload.userId];
            return newPreviews;
          });
        }
      })

      // 4. Handle Database Changes (Annotations)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_annotations",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAnnotation = payload.new as Annotation;
            setAnnotations((prev) =>
              prev.some((a) => a.id === newAnnotation.id)
                ? prev
                : [...prev, newAnnotation],
            );

            // Remove matching preview after short delay to allow smooth transition
            setTimeout(() => {
              setDrawingPreviews((prev) => {
                const newPreviews = { ...prev };
                delete newPreviews[newAnnotation.created_by];
                return newPreviews;
              });
              setPolygonPreviews((prev) => {
                const newPreviews = { ...prev };
                delete newPreviews[newAnnotation.created_by];
                return newPreviews;
              });
              setPathPreviews((prev) => {
                const newPreviews = { ...prev };
                delete newPreviews[newAnnotation.created_by];
                return newPreviews;
              });
            }, 100);
          } else if (payload.eventType === "DELETE") {
            setAnnotations((prev) =>
              prev.filter((a) => a.id !== payload.old.id),
            );
          } else if (payload.eventType === "UPDATE") {
            setAnnotations((prev) =>
              prev.map((a) =>
                a.id === payload.new.id ? (payload.new as Annotation) : a,
              ),
            );
          }
        },
      )

      // 5. Subscribe and Track local user
      .subscribe(async (status) => {
        console.log("🟢 [Presence] Channel status:", status);
        if (status === "SUBSCRIBED") {
          console.log(
            "🟢 [Presence] Tracking local user:",
            currentUser.id,
            currentUser.displayName,
          );
          await channel.track({
            online_at: new Date().toISOString(),
            user: currentUser, // Send full profile so others can display it
          });
          // Trigger a sync to get initial state
          setTimeout(() => {
            updateOnlineUsers();
          }, 500);
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [tripId, currentUser?.id]); // Re-run only if trip or user ID changes

  // 6. Function to broadcast local cursor position (Lat/Lng)
  // We use useRef to keep the throttled function stable across renders
  const broadcastCursor = useRef(
    throttle((lat: number, lng: number) => {
      if (channelRef.current && userRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "cursor-pos",
          payload: {
            lat,
            lng,
            userId: userRef.current.id,
            user: userRef.current,
          },
        });
      }
    }, 24), // Send at ~40fps for smoother remote cursors
  ).current;

  // 7. Function to broadcast drawing start (not throttled)
  const broadcastDrawingStart = useRef(
    (startLat: number, startLng: number, color: string) => {
      if (channelRef.current && userRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "drawing-start",
          payload: {
            userId: userRef.current.id,
            user: userRef.current,
            startLat,
            startLng,
            color,
            timestamp: Date.now(),
          },
        });
      }
    },
  ).current;

  // 8. Function to broadcast drawing update (throttled to 16ms for 60fps)
  const broadcastDrawingUpdate = useRef(
    throttle((currentLat: number, currentLng: number) => {
      if (channelRef.current && userRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "drawing-update",
          payload: {
            userId: userRef.current.id,
            currentLat,
            currentLng,
            timestamp: Date.now(),
          },
        });
      }
    }, 16), // 60fps for smooth drawing updates
  ).current;

  // 9. Function to broadcast drawing end (not throttled)
  const broadcastDrawingEnd = useRef((cancelled: boolean) => {
    if (channelRef.current && userRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "drawing-end",
        payload: {
          userId: userRef.current.id,
          cancelled,
          timestamp: Date.now(),
        },
      });
    }
  }).current;

  // 10. Function to broadcast polygon point added (not throttled)
  const broadcastPolygonPointAdded = useRef(
    (points: { lat: number; lng: number }[], color: string) => {
      if (channelRef.current && userRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "polygon-point-added",
          payload: {
            userId: userRef.current.id,
            user: userRef.current,
            points,
            color,
            timestamp: Date.now(),
          },
        });
      }
    },
  ).current;

  // 11. Function to broadcast polygon preview update (throttled to 16ms for 60fps)
  const broadcastPolygonPreviewUpdate = useRef(
    throttle((currentLat: number, currentLng: number) => {
      if (channelRef.current && userRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "polygon-preview-update",
          payload: {
            userId: userRef.current.id,
            currentLat,
            currentLng,
            timestamp: Date.now(),
          },
        });
      }
    }, 16), // 60fps for smooth preview updates
  ).current;

  // 12. Function to broadcast polygon drawing end (not throttled)
  const broadcastPolygonDrawingEnd = useRef((cancelled: boolean) => {
    if (channelRef.current && userRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "polygon-drawing-end",
        payload: {
          userId: userRef.current.id,
          cancelled,
          timestamp: Date.now(),
        },
      });
    }
  }).current;

  // 13. Function to broadcast path drawing start (not throttled)
  const broadcastPathDrawingStart = useRef(
    (startLat: number, startLng: number, color: string) => {
      if (channelRef.current && userRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "path-drawing-start",
          payload: {
            userId: userRef.current.id,
            user: userRef.current,
            startLat,
            startLng,
            color,
            timestamp: Date.now(),
          },
        });
      }
    },
  ).current;

  // 14. Function to broadcast path drawing update (throttled to 16ms for 60fps)
  const broadcastPathDrawingUpdate = useRef(
    throttle((lat: number, lng: number) => {
      if (channelRef.current && userRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "path-drawing-update",
          payload: {
            userId: userRef.current.id,
            lat,
            lng,
            timestamp: Date.now(),
          },
        });
      }
    }, 16),
  ).current;

  // 15. Function to broadcast path drawing end (not throttled)
  const broadcastPathDrawingEnd = useRef((cancelled: boolean) => {
    if (channelRef.current && userRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "path-drawing-end",
        payload: {
          userId: userRef.current.id,
          cancelled,
          timestamp: Date.now(),
        },
      });
    }
  }).current;

  // Cleanup old cursors (if no update for 10s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const newCursors = { ...prev };
        let changed = false;
        Object.keys(newCursors).forEach((key) => {
          if (now - newCursors[key].lastUpdated > 10000) {
            delete newCursors[key];
            changed = true;
          }
        });
        return changed ? newCursors : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup stale drawing previews (if no update for 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDrawingPreviews((prev) => {
        const newPreviews = { ...prev };
        let changed = false;

        Object.keys(newPreviews).forEach((userId) => {
          if (now - newPreviews[userId].timestamp > 30000) {
            delete newPreviews[userId];
            changed = true;
          }
        });

        return changed ? newPreviews : prev;
      });
      setPolygonPreviews((prev) => {
        const newPreviews = { ...prev };
        let changed = false;

        Object.keys(newPreviews).forEach((userId) => {
          if (now - newPreviews[userId].timestamp > 30000) {
            delete newPreviews[userId];
            changed = true;
          }
        });

        return changed ? newPreviews : prev;
      });
      setPathPreviews((prev) => {
        const newPreviews = { ...prev };
        let changed = false;

        Object.keys(newPreviews).forEach((userId) => {
          if (now - newPreviews[userId].timestamp > 30000) {
            delete newPreviews[userId];
            changed = true;
          }
        });

        return changed ? newPreviews : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addAnnotationOptimistic = useCallback((annotation: Annotation) => {
    setAnnotations((prev) =>
      prev.some((a) => a.id === annotation.id) ? prev : [...prev, annotation],
    );
  }, []);

  return {
    onlineUsers,
    cursors,
    annotations,
    addAnnotationOptimistic,
    drawingPreviews,
    polygonPreviews,
    pathPreviews,
    broadcastCursor,
    broadcastDrawingStart,
    broadcastDrawingUpdate,
    broadcastDrawingEnd,
    broadcastPolygonPointAdded,
    broadcastPolygonPreviewUpdate,
    broadcastPolygonDrawingEnd,
    broadcastPathDrawingStart,
    broadcastPathDrawingUpdate,
    broadcastPathDrawingEnd,
  };
}
