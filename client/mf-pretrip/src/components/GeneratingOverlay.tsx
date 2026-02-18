import { useEffect, useMemo, useRef, useState } from "react";

interface GeneratingOverlayProps {
  destination: string | null;
  interests: string[] | null;
  budgetLevel: string | null;
  durationDays: number | null;
  progress: {
    step?: string;
    message?: string;
    current?: number;
    total?: number;
  } | null;
}

function buildMessagePool(
  destination: string | null,
  interests: string[] | null,
  budgetLevel: string | null,
  durationDays: number | null,
): string[] {
  const messages: string[] = [];
  const dest = destination || "your destination";

  // Always-included messages
  messages.push(`Thinking about ${dest}...`);
  messages.push("Curating activities for you...");

  // Interest-based messages
  const lowerInterests = (interests || []).map((i) => i.toLowerCase());

  if (
    lowerInterests.some((i) =>
      ["food", "dining", "restaurants", "culinary", "foodie"].includes(i),
    )
  ) {
    messages.push(`Scouting the best food spots in ${dest}...`);
  }

  if (
    lowerInterests.some((i) =>
      ["nature", "outdoors", "hiking", "parks", "beach", "beaches"].includes(i),
    )
  ) {
    messages.push("Finding beautiful nature spots nearby...");
  }

  if (
    lowerInterests.some((i) =>
      ["nightlife", "bars", "clubs", "drinks"].includes(i),
    )
  ) {
    messages.push("Checking out the nightlife scene...");
  }

  if (
    lowerInterests.some((i) =>
      [
        "history",
        "culture",
        "museums",
        "art",
        "architecture",
        "historical",
      ].includes(i),
    )
  ) {
    messages.push("Exploring cultural landmarks...");
  }

  if (
    lowerInterests.some((i) => ["shopping", "markets", "souvenirs"].includes(i))
  ) {
    messages.push("Finding the best shopping spots...");
  }

  if (
    lowerInterests.some((i) =>
      ["adventure", "sports", "extreme", "surfing", "diving"].includes(i),
    )
  ) {
    messages.push("Looking for thrilling adventures...");
  }

  // Budget-based messages
  if (budgetLevel === "low" || budgetLevel === "$") {
    messages.push("Finding budget-friendly hidden gems...");
  } else if (budgetLevel === "high" || budgetLevel === "$$$") {
    messages.push("Curating premium experiences...");
  }

  // Duration-based message
  if (durationDays && durationDays > 0) {
    messages.push(`Planning ${durationDays} days of adventure...`);
  }

  // Generic fallbacks to pad the pool
  messages.push(`Exploring top-rated spots in ${dest}...`);
  messages.push("Looking for the best activities...");

  return messages;
}

export function GeneratingOverlay({
  destination,
  interests,
  budgetLevel,
  durationDays,
  progress,
}: GeneratingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProgressMessageRef = useRef<string | null>(null);

  const messagePool = useMemo(
    () => buildMessagePool(destination, interests, budgetLevel, durationDays),
    [destination, interests, budgetLevel, durationDays],
  );

  // Cycle through ambient messages
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messagePool.length);
      setAnimKey((prev) => prev + 1);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [messagePool.length]);

  // When a real SSE progress event arrives, show it immediately
  const displayedMessage = useMemo(() => {
    if (
      progress?.message &&
      progress.message !== lastProgressMessageRef.current
    ) {
      lastProgressMessageRef.current = progress.message;
      return progress.message;
    }
    return messagePool[messageIndex] || "Preparing your trip...";
  }, [progress?.message, messagePool, messageIndex]);

  // Bump animKey when SSE progress message changes
  useEffect(() => {
    if (progress?.message) {
      setAnimKey((prev) => prev + 1);
    }
  }, [progress?.message]);

  return (
    <div className="h-full w-full bg-muted flex items-center justify-center">
      <div
        key={animKey}
        className="animate-in fade-in slide-in-from-bottom-3 duration-700 text-center"
      >
        <p className="text-lg font-medium text-shimmer">{displayedMessage}</p>
      </div>
    </div>
  );
}
