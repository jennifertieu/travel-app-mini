"use client";

import { startOfDay } from "date-fns";
import { cn } from "@/features/pretrip/lib/utils";

const ISO_FORMAT = "yyyy-MM-dd";

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  minDate?: Date;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** When true, use compact layout (e.g. for modals). */
  compact?: boolean;
  /** Optional id of the visible label element for aria-labelledby. */
  labelId?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  minDate = startOfDay(new Date()),
  className,
  inputClassName,
  compact = false,
  labelId,
}: DateRangePickerProps) {
  const minStr = toISO(minDate);
  const endMin = startDate && startDate >= minStr ? startDate : minStr;

  const inputClass = cn(
    "w-full rounded-xl border border-input bg-transparent px-3 text-base shadow-sm",
    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    compact ? "h-10 rounded-lg" : "h-12",
    inputClassName,
  );

  return (
    <div
      className={cn("flex gap-3", compact && "grid grid-cols-2 gap-4", className)}
      role="group"
      aria-label={labelId ? undefined : "Select date range"}
      aria-labelledby={labelId}
    >
      <input
        type="date"
        value={startDate}
        min={minStr}
        onChange={(e) => onStartChange(e.target.value || "")}
        className={inputClass}
        aria-label="Start date"
      />
      <input
        type="date"
        value={endDate}
        min={endMin}
        onChange={(e) => onEndChange(e.target.value || "")}
        className={inputClass}
        aria-label="End date"
      />
    </div>
  );
}
