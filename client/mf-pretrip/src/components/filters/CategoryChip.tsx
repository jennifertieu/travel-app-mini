import type { LucideIcon } from "lucide-react";

interface CategoryChipProps {
  icon: LucideIcon;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export function CategoryChip({
  icon: Icon,
  label,
  count,
  isActive,
  onClick,
}: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ease-out shrink-0 ${
        isActive
          ? "bg-[#13BFB0] text-white border-[#13BFB0] scale-[1.02]"
          : "bg-muted text-foreground border-transparent hover:border-border hover:bg-muted/80"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          isActive ? "bg-white/20" : "bg-background/80"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
