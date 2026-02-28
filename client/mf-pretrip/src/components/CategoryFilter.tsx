import { useMemo } from "react";
import { CategoryChip } from "./CategoryChip";
import type { Database } from "@travel-app/shared-types";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];

const CATEGORY_CHIPS = [
  { key: null, emoji: "", label: "All" },
  { key: "food", emoji: "🍽️", label: "Food" },
  { key: "sightseeing", emoji: "📸", label: "Sights" },
  { key: "stay", emoji: "🏨", label: "Stays" },
  { key: "activity", emoji: "🎭", label: "Activities" },
  { key: "nature", emoji: "🌿", label: "Nature" },
  { key: "shopping", emoji: "🛍️", label: "Shopping" },
  { key: "nightlife", emoji: "🌙", label: "Nightlife" },
] as const;

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
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const idea of ideas) {
      const cat = idea.category?.toLowerCase() || "other";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [ideas]);

  return (
    <div className="flex items-center gap-2 py-1 overflow-x-auto scrollbar-hide scroll-snap-x">
      {CATEGORY_CHIPS.map((chip) => {
        const count =
          chip.key === null ? ideas.length : categoryCounts[chip.key] || 0;
        // Only render chips with ≥1 idea (All always visible)
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
