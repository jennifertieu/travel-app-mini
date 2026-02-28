import { useMemo } from "react";
import { CategoryChip } from "./CategoryChip";
import type { Database } from "@travel-app/shared-types";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];

const CATEGORY_CHIPS: { key: string | null; emoji: string; label: string }[] = [
  { key: null, emoji: "✨", label: "All" },
  { key: "food", emoji: "🍽️", label: "Food" },
  { key: "sightseeing", emoji: "🏛️", label: "Sights" },
  { key: "stay", emoji: "🏨", label: "Stays" },
  { key: "activity", emoji: "🎯", label: "Activities" },
  { key: "nature", emoji: "🌿", label: "Nature" },
  { key: "shopping", emoji: "🛍️", label: "Shopping" },
  { key: "nightlife", emoji: "🌙", label: "Nightlife" },
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
        const count = chip.key === null ? totalCount : counts[chip.key] || 0;
        // Only show chips that have ideas (All is always visible)
        if (chip.key !== null && count === 0) return null;
        return (
          <CategoryChip
            key={chip.key ?? "all"}
            emoji={chip.emoji}
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
