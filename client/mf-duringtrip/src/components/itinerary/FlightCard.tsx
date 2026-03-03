import { useState } from "react";
import { Plane, Clock, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { getApiUrl } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import type { FlightOption, FlightSearchResult } from "../../types/itinerary";

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

function formatTime24(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatFlightDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatRouteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
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
  const metaStr = [
    formatDuration(flight.totalDurationMinutes),
    flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`,
    flight.cabinClass,
  ].join(" · ");
  const priceStr = `$${flight.priceTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <img
            src={flight.airlineLogo}
            alt={first.airline}
            className="h-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="font-medium text-foreground">{first.airline}</span>
          <span className="text-muted-foreground">{first.flightNumber}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold tabular-nums">{depTime}</span>
          <span className="text-muted-foreground">{first.departureAirport}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="font-semibold tabular-nums">
            {arrTime}
            {nextDay && <sup className="text-amber-600 dark:text-amber-400 ml-0.5">+1</sup>}
          </span>
          <span className="text-muted-foreground">{last.arrivalAirport}</span>
          <span className="text-muted-foreground ml-auto">{metaStr}</span>
          <span className="font-semibold text-foreground tabular-nums">{priceStr}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: airline (small) + route inline + price */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src={flight.airlineLogo}
            alt={first.airline}
            className="h-4 w-5 object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-xs font-medium text-foreground truncate">{first.airline}</span>
          <span className="text-xs text-muted-foreground shrink-0">{first.flightNumber}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-sm font-semibold text-foreground tabular-nums">{depTime}</span>
          <span className="text-xs text-muted-foreground">{first.departureAirport}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {arrTime}
            {nextDay && <sup className="text-[10px] text-amber-600 dark:text-amber-400 ml-0.5 font-normal">+1</sup>}
          </span>
          <span className="text-xs text-muted-foreground">{last.arrivalAirport}</span>
        </div>
        <span className="text-sm font-semibold text-foreground tabular-nums ml-auto shrink-0">
          {priceStr}
        </span>
      </div>
      {/* Row 2: duration, stops, cabin */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3 shrink-0" />
        <span>{metaStr}</span>
      </div>
    </div>
  );
}

function MainFlightLayout({ flight }: { flight: FlightOption }) {
  const first = flight.segments[0];
  const last = flight.segments[flight.segments.length - 1];
  if (!first || !last) return null;

  const depTime = formatTime24(first.departureTime);
  const arrTime = formatTime24(last.arrivalTime);
  const nextDay = isNextDay(first.departureTime, last.arrivalTime);
  const priceStr = `$${flight.priceTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <>
      {/* Top: airline + flight#/cabin + price */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-700/50 border border-gray-200 dark:border-zinc-600 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={flight.airlineLogo}
                alt={first.airline}
                className="h-5 w-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <span className="font-semibold text-sm text-foreground truncate">{first.airline}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 pl-10">
            {first.flightNumber} · <span className="capitalize">{flight.cabinClass}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-bold text-base text-foreground tabular-nums">{priceStr}</span>
          <span className="text-xs text-muted-foreground ml-0.5">/pax</span>
        </div>
      </div>

      <hr className="border-0 border-t border-gray-200 dark:border-zinc-600 my-2" />

      {/* Route: dep | duration + line + direct | arr (stack on narrow, 3-col on sm+) */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-center">
        <div className="flex flex-col min-w-0">
          <span className="text-lg font-bold text-foreground tabular-nums">{depTime}</span>
          <span className="text-xs text-muted-foreground mt-0.5">{formatRouteDate(first.departureTime)}</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Plane className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="w-4 h-0.5 bg-gray-400 dark:bg-gray-500 rounded shrink-0" aria-hidden />
            <span className="text-sm font-medium text-foreground">{first.departureAirport}</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-2 py-1 sm:py-0 order-1 sm:order-none">
          <span className="text-xs text-muted-foreground">Duration: {formatDuration(flight.totalDurationMinutes)}</span>
          <span className="w-full max-w-[80px] sm:max-w-[60px] h-px bg-gray-200 dark:bg-zinc-600 my-1" aria-hidden />
          <span className="text-xs font-medium text-foreground">
            {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="flex flex-col items-end min-w-0 text-right order-2 sm:order-none">
          <span className="text-lg font-bold text-foreground tabular-nums">
            {arrTime}
            {nextDay && <sup className="text-[10px] text-amber-600 dark:text-amber-400 ml-0.5 font-normal">+1</sup>}
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">{formatRouteDate(last.arrivalTime)}</span>
          <div className="flex items-center gap-1.5 mt-1 justify-end">
            <span className="text-sm font-medium text-foreground">{last.arrivalAirport}</span>
            <span className="w-4 h-0.5 bg-gray-400 dark:bg-gray-500 rounded shrink-0" aria-hidden />
            <Plane className="w-3.5 h-3.5 text-muted-foreground shrink-0 rotate-90" />
          </div>
        </div>
      </div>

      <hr className="border-0 border-t border-gray-200 dark:border-zinc-600 my-2" />
    </>
  );
}

export function FlightCard({
  direction,
  flights,
  tripId,
  onFlightSwap,
}: FlightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
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
      console.log("Flight updated");
      onFlightSwap?.(direction, index);
    } catch (err) {
      console.warn("Flight select failed:", err);
      console.log("Failed to update flight");
    } finally {
      setSelecting(false);
    }
  };

  const label = direction === "outbound" ? "Outbound Flight" : "Return Flight";
  const firstSegment = selected.segments[0];
  const flightDate = firstSegment ? formatFlightDate(firstSegment.departureTime) : null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 shadow-sm overflow-hidden">
      {/* Slim direction label */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/70 dark:bg-zinc-800/70 border-b border-gray-100 dark:border-zinc-700/50">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
          {flightDate && ` · ${flightDate}`}
        </span>
        {selected.recommended && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-600 text-muted-foreground">
            Recommended
          </span>
        )}
      </div>

      {/* Card body: airline + route + link row */}
      <div className="p-3">
        <MainFlightLayout flight={selected} />

        {/* Bottom link row: app-style pill links */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          {selected.summary && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSummaryExpanded(!summaryExpanded); }}
              className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
            >
              {summaryExpanded ? "Hide tip" : "Why this flight?"}
            </button>
          )}
          {alternatives.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3 shrink-0" />
                  Less
                </>
              ) : (
                <>
                  {alternatives.length} other option{alternatives.length > 1 ? "s" : ""}
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Expanded summary: trip tip */}
        {selected.summary && summaryExpanded && (
          <div className="mt-2 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/80 border border-gray-100 dark:border-zinc-700/50">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Trip tip</p>
            <p className="text-xs text-foreground leading-relaxed">
              {selected.summary}
            </p>
          </div>
        )}

        {/* Expanded alternatives */}
        {expanded && alternatives.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-700/50 space-y-2">
            {alternatives.map((alt) => {
              const realIndex = options.indexOf(alt);
              return (
                <div
                  key={alt.id}
                  className="rounded-lg border border-gray-200 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-900/50 p-2.5"
                >
                  <FlightDetails flight={alt} compact />
                  {alt.summary && (
                    <p className="mt-1.5 text-[11px] italic text-muted-foreground leading-snug">
                      {alt.summary}
                    </p>
                  )}
                  {alt.recommended && (
                    <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-[10px] font-medium">
                      Recommended
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={selecting}
                    onClick={() => handleSelect(realIndex)}
                    className="mt-2 w-full text-center text-xs font-medium py-1.5 rounded-md bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
                  >
                    {selecting ? "Selecting…" : "Select this flight"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
