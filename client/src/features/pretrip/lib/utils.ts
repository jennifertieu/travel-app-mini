import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a UUID v4 string (browser-compatible)
 */
export function generateUUID(): string {
  // Try crypto.randomUUID first (modern browsers)
  try {
    if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch (e) {
    // Fall through to fallback
  }

  // Fallback: generate UUID v4 manually
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Maps frontend budget level values to database values
 */
export function mapBudgetLevelToDatabase(
  frontendLevel: "low" | "medium" | "high",
): "$" | "$$" | "$$$" {
  const budgetLevelMap = {
    low: "$" as const,
    medium: "$$" as const,
    high: "$$$" as const,
  };
  return budgetLevelMap[frontendLevel];
}

/**
 * Maps database budget level values to frontend values
 */
export function mapBudgetLevelFromDatabase(
  dbLevel: "$" | "$$" | "$$$",
): "low" | "medium" | "high" {
  const budgetLevelMap = {
    $: "low" as const,
    $$: "medium" as const,
    $$$: "high" as const,
  };
  return budgetLevelMap[dbLevel];
}
