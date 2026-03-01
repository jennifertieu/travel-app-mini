import { useState } from "react";
import { Plane, Clock, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { getApiUrl } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { FlightOption, FlightSearchResult } from "../types";

interface FlightCardProps {
  direction: "outbound" | "return";
  flights: FlightSearchResult;
  tripId: string | null;
  onFlightSwap?: (direction: string, index: number) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isNextDay(departure: string, arrival: string): boolean {
  const dep = new Date(departure);
  const arr = new Date(arrival);
  return arr.getDate() !== dep.getDate() || arr.getMonth() !== dep.getMonth();
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function FlightDetails({
  flight,
  compact,
}: {
  flight: FlightOption;
  compact?: boolean;
}) {
  const first = flight.segments[0];
  const last = flight.segments[flight.segments.length - 1];
  if (!first || !last) return null;

  const depTime = formatTime(first.departureTime);
  const arrTime = formatTime(last.arrivalTime);
  const nextDay = isNextDay(first.departureTime, last.arrivalTime);

  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5 text-xs" : "gap-3")}>
      {/* Airline + flight number */}
      <div className="flex items-center gap-2">
        <img
          src={flight.airlineLogo}
          alt={first.airline}
          className={cn("object-contain", compact ? "h-4" : "h-5")}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span
          className={cn(
            "font-medium text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {first.airline}
        </span>
        <span className="text-muted-foreground text-xs">
          {first.flightNumber}
        </span>
      </div>

      {/* Route: departure | arrow + duration | arrival */}
      <div
        className={cn(
          "flex items-center gap-2",
          compact ? "flex-wrap" : "flex-wrap sm:flex-nowrap",
        )}
      >
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "font-semibold text-foreground tabular-nums",
              compact ? "text-xs" : "text-base",
            )}
          >
            {depTime}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {first.departureAirport}
          </span>
        </div>
        <div className="shrink-0 flex items-center self-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col min-w-0 text-right">
          <span
            className={cn(
              "font-semibold text-foreground tabular-nums",
              compact ? "text-xs" : "text-base",
            )}
          >
            {arrTime}
            {nextDay && (
              <sup className="text-[10px] text-amber-600 dark:text-amber-400 ml-0.5 font-normal">
                +1
              </sup>
            )}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {last.arrivalAirport}
          </span>
        </div>
      </div>

      {/* Meta: duration, stops, cabin, price */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {formatDuration(flight.totalDurationMinutes)}
        </span>
        <span>
          {flight.stops === 0
            ? "Nonstop"
            : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
        </span>
        <span className="capitalize">{flight.cabinClass}</span>
        <span className="font-semibold text-foreground ml-auto tabular-nums">
          $
          {flight.priceTotal.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}

export function FlightCard({
  direction,
  flights,
  tripId,
  onFlightSwap,
}: FlightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const options = direction === "outbound" ? flights.outbound : flights.return;
  const selectedIdx =
    direction === "outbound"
      ? flights.selectedOutbound
      : flights.selectedReturn;
  const selected = options[selectedIdx];

  if (!selected) return null;

  const alternatives = options.filter((_, i) => i !== selectedIdx);

  const handleSelect = async (index: number) => {
    if (!tripId || selecting) return;
    setSelecting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(getApiUrl(`/itinerary/${tripId}/flights/select`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ direction, selectedIndex: index }),
      });
      toast.success("Flight updated");
      onFlightSwap?.(direction, index);
    } catch (err) {
      console.warn("Flight select failed:", err);
      toast.error("Failed to update flight");
    } finally {
      setSelecting(false);
    }
  };

  const label = direction === "outbound" ? "Outbound Flight" : "Return Flight";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80 dark:bg-zinc-800/80 border-b border-gray-100 dark:border-zinc-700/50">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg",
            direction === "outbound"
              ? "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
              : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
          )}
        >
          <Plane className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {label}
        </span>
        {selected.recommended && (
          <span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-medium">
            Recommended
          </span>
        )}
      </div>

      {/* Selected flight details */}
      <div className="p-4">
        <FlightDetails flight={selected} />

        {/* LLM summary */}
        {selected.summary && (
          <p className="mt-3 text-xs italic text-muted-foreground leading-relaxed">
            {selected.summary}
          </p>
        )}
      </div>

      {/* Alternatives toggle */}
      {alternatives.length > 0 && (
        <div className="px-4 pb-4 pt-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 shrink-0" />
            )}
            {alternatives.length} other option
            {alternatives.length > 1 ? "s" : ""}
          </button>

          {expanded && (
            <div className="mt-2 flex flex-col gap-2">
              {alternatives.map((alt) => {
                const realIndex = options.indexOf(alt);
                return (
                  <div
                    key={alt.id}
                    className="rounded-lg border border-gray-200 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-900/50 p-3"
                  >
                    <FlightDetails flight={alt} compact />
                    {alt.summary && (
                      <p className="mt-2 text-[11px] italic text-muted-foreground leading-snug">
                        {alt.summary}
                      </p>
                    )}
                    {alt.recommended && (
                      <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] font-medium">
                        Recommended
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={selecting}
                      onClick={() => handleSelect(realIndex)}
                      className="mt-3 w-full text-center text-xs font-medium py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition-colors"
                    >
                      {selecting ? "Selecting…" : "Select this flight"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
