"use client";

import { useState, useRef, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid, startOfDay } from "date-fns";
import * as Popover from "@radix-ui/react-popover";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "mm/dd/yyyy";
const ISO_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "MM/dd/yyyy";

function toDate(s: string): Date | undefined {
  if (!s?.trim()) return undefined;
  const d = parse(s, ISO_FORMAT, new Date());
  return isValid(d) ? d : undefined;
}

function toISO(d: Date): string {
  return format(d, ISO_FORMAT);
}

function toDisplay(s: string): string {
  const d = toDate(s);
  return d ? format(d, DISPLAY_FORMAT) : "";
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
  placeholder = PLACEHOLDER,
  className,
  inputClassName,
  compact = false,
  labelId,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const from = toDate(startDate);
  const to = toDate(endDate);
  const range: { from?: Date; to?: Date } = { from, to };

  const handleSelect = useCallback(
    (rangeSelected: { from?: Date; to?: Date } | undefined) => {
      if (!rangeSelected) return;
      if (rangeSelected.from) {
        onStartChange(toISO(rangeSelected.from));
      } else {
        onStartChange("");
      }
      if (rangeSelected.to) {
        onEndChange(toISO(rangeSelected.to));
      } else {
        onEndChange("");
      }
      // Close when both selected (optional: keep open for quick edits)
      if (rangeSelected.from && rangeSelected.to) {
        setOpen(false);
      }
    },
    [onStartChange, onEndChange],
  );

  const displayStart = startDate ? toDisplay(startDate) : "";
  const displayEnd = endDate ? toDisplay(endDate) : "";

  const baseInputClass = cn(
    "pl-10 h-12 text-base border rounded-xl shadow-sm bg-transparent",
    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    inputClassName,
  );
  const compactInputClass = compact
    ? "h-10 rounded-lg px-4 py-3 border border-border"
    : baseInputClass;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div
          ref={triggerRef}
          className={cn("flex gap-3", compact && "grid grid-cols-2 gap-4", className)}
          role="group"
          aria-label={labelId ? undefined : "Select date range"}
          aria-labelledby={labelId}
        >
          <div className="relative flex-1">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <input
              type="text"
              readOnly
              value={displayStart}
              placeholder={placeholder}
              className={cn(
                "flex w-full rounded-md border border-input text-base shadow-sm transition-colors",
                compactInputClass,
              )}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              aria-label="Start date"
              aria-describedby="date-range-picker-description"
            />
          </div>
          <div className="relative flex-1">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <input
              type="text"
              readOnly
              value={displayEnd}
              placeholder={placeholder}
              className={cn(
                "flex w-full rounded-md border border-input text-base shadow-sm transition-colors",
                compactInputClass,
              )}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              aria-label="End date"
              aria-describedby="date-range-picker-description"
            />
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] w-auto rounded-lg border border-border bg-popover p-3 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div id="date-range-picker-description" className="sr-only">
            Choose start and end date. Dates before today are disabled.
          </div>
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleSelect}
            disabled={(date) => date < minDate}
            defaultMonth={from ?? to ?? minDate}
            numberOfMonths={1}
            classNames={{
              root: "rdp-root",
              months: "rdp-months",
              month: "rdp-month",
              month_caption: "flex justify-center items-center h-9",
              nav: "flex items-center gap-1",
              button_previous: "absolute left-1 top-1 h-7 w-7 rounded-md bg-transparent hover:bg-accent inline-flex items-center justify-center",
              button_next: "absolute right-1 top-1 h-7 w-7 rounded-md bg-transparent hover:bg-accent inline-flex items-center justify-center",
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday: "text-muted-foreground text-xs font-normal w-9 p-1",
              week: "flex w-full mt-1",
              day: "h-9 w-9 p-0",
              day_button: "h-9 w-9 rounded-md hover:bg-accent focus:visible:ring-2 focus-visible:ring-ring inline-flex items-center justify-center text-sm",
              range_start: "bg-primary text-primary-foreground rounded-l-md",
              range_middle: "bg-primary/20 rounded-none",
              range_end: "bg-primary text-primary-foreground rounded-r-md",
              selected: "bg-primary text-primary-foreground",
              disabled: "text-muted-foreground opacity-50",
              today: "font-medium",
              outside: "text-muted-foreground opacity-50",
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
