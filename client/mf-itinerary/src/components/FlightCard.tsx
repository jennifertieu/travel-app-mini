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
    <div className={cn("flex flex-col gap-1.5", compact && "text-xs")}>
      {/* Airline row */}
      <div className="flex items-center gap-2">
        <img
          src={flight.airlineLogo}
          alt={first.airline}
          className="h-5 w-auto object-contain"
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

      {/* Route + times */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "font-semibold text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {depTime}
        </span>
        <span className="text-xs text-muted-foreground">
          {first.departureAirport}
        </span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span
          className={cn(
            "font-semibold text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {arrTime}
          {nextDay && (
            <sup className="text-[10px] text-orange-500 ml-0.5">+1</sup>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {last.arrivalAirport}
        </span>
      </div>

      {/* Duration + stops + cabin + price */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(flight.totalDurationMinutes)}
        </span>
        <span>
          {flight.stops === 0
            ? "Nonstop"
            : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
        </span>
        <span className="capitalize">{flight.cabinClass}</span>
        <span className="font-semibold text-foreground">
          $
          {flight.priceTotal.toLocaleString("en-US", {
            minimumFractionDigits: 0,
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
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-gray-50 dark:bg-zinc-800/60 p-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Plane
          className={cn(
            "w-4 h-4",
            direction === "outbound" ? "text-teal-600" : "text-indigo-500",
          )}
        />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {label}
        </span>
        {selected.recommended && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-600/10 text-teal-700 dark:text-teal-400 text-[10px] font-medium">
            Recommended
          </span>
        )}
      </div>

      {/* Selected flight details */}
      <FlightDetails flight={selected} />

      {/* LLM summary */}
      {selected.summary && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          {selected.summary}
        </p>
      )}

      {/* Alternatives toggle */}
      {alternatives.length > 0 && (
        <div className="mt-3 border-t border-gray-200 dark:border-zinc-700/40 pt-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
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
                    className="rounded-lg border border-gray-200 dark:border-zinc-700/40 bg-white dark:bg-zinc-900/40 p-2.5"
                  >
                    <FlightDetails flight={alt} compact />
                    {alt.summary && (
                      <p className="mt-1 text-[11px] italic text-muted-foreground">
                        {alt.summary}
                      </p>
                    )}
                    {alt.recommended && (
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-600/10 text-teal-700 dark:text-teal-400 text-[10px] font-medium">
                        Recommended
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={selecting}
                      onClick={() => handleSelect(realIndex)}
                      className="mt-2 w-full text-center text-xs font-medium py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition-colors"
                    >
                      {selecting ? "Selecting…" : "Select"}
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
