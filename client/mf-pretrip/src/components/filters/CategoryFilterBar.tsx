import { useMemo } from "react";
import { Sparkles, UtensilsCrossed, Hotel, Compass } from "lucide-react";
import { CategoryChip } from "./CategoryChip";
import type { Database } from "@travel-app/shared-types";
import type { LucideIcon } from "lucide-react";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];

// Consolidated categories: All, Food, Stays, Activities (merges sightseeing/nature/shopping/nightlife/activity)
const ACTIVITY_CATEGORIES = new Set([
  "sightseeing",
  "activity",
  "nature",
  "shopping",
  "nightlife",
]);

const CATEGORY_CHIPS: {
  key: string | null;
  icon: LucideIcon;
  label: string;
  matchKeys?: Set<string>;
}[] = [
  { key: null, icon: Sparkles, label: "All" },
  { key: "food", icon: UtensilsCrossed, label: "Food" },
  { key: "stay", icon: Hotel, label: "Stays" },
  {
    key: "activities",
    icon: Compass,
    label: "Activities",
    matchKeys: ACTIVITY_CATEGORIES,
  },
];

interface CategoryFilterBarProps {
  ideas: Idea[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export function CategoryFilterBar({
  ideas,
  activeCategory,
  onCategoryChange,
}: CategoryFilterBarProps) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const idea of ideas) {
      const cat = idea.category?.trim().toLowerCase() || "other";
      map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  }, [ideas]);

  const totalCount = ideas.length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-snap-x py-1">
      {CATEGORY_CHIPS.map((chip) => {
        let count: number;
        if (chip.key === null) {
          count = totalCount;
        } else if (chip.matchKeys) {
          // Sum counts for all merged categories
          count = Array.from(chip.matchKeys).reduce(
            (sum, k) => sum + (counts[k] || 0),
            0,
          );
        } else {
          count = counts[chip.key] || 0;
        }
        // Only show chips that have ideas (All is always visible)
        if (chip.key !== null && count === 0) return null;
        return (
          <CategoryChip
            key={chip.key ?? "all"}
            icon={chip.icon}
            label={chip.label}
            count={count}
            isActive={activeCategory === chip.key}
            onClick={() => onCategoryChange(chip.key)}
          />
        );
      })}
    </div>
  );
}
