import { useState } from "react";
import {
  RefreshCw,
  MapPin,
  Clock,
  Wallet,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { useTravelGuide } from "../hooks/useTravelGuide";
import type { DestinationGuide, ActivitySpotlightsGuide } from "../types";

interface TravelGuidePanelProps {
  tripId: string | null;
  destination?: string;
}

type SubTab = "overview" | "spotlights";

export function TravelGuidePanel({
  tripId,
  destination,
}: TravelGuidePanelProps) {
  const [subTab, setSubTab] = useState<SubTab>("overview");

  const destGuide = useTravelGuide(tripId, "destination");
  const spotlightsGuide = useTravelGuide(tripId, "spotlights");

  const activeGuide = subTab === "overview" ? destGuide : spotlightsGuide;
  const isLoading = activeGuide.isLoading;
  const isRegenerating = activeGuide.regenerate.isPending;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Travel Guide
            </p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {destination ?? "Your Destination"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => activeGuide.regenerate.mutate()}
            disabled={isLoading || isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 border border-border hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            title="Regenerate guide"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSubTab("overview")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              subTab === "overview"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
            }`}
          >
            🌍 Overview
          </button>
          <button
            type="button"
            onClick={() => setSubTab("spotlights")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              subTab === "spotlights"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
            }`}
          >
            📸 Activity Guide
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <LoadingState />
        ) : activeGuide.error ? (
          <ErrorState onRetry={() => activeGuide.refetch()} />
        ) : subTab === "overview" && destGuide.data ? (
          <DestinationOverview guide={destGuide.data as DestinationGuide} />
        ) : subTab === "spotlights" && spotlightsGuide.data ? (
          <ActivitySpotlights
            guide={spotlightsGuide.data as ActivitySpotlightsGuide}
          />
        ) : null}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border p-4 space-y-3 animate-pulse"
        >
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-4/5" />
        </div>
      ))}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-2">
        Generating your travel guide with gpt-4.1…
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Couldn't load the travel guide.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function DestinationOverview({ guide }: { guide: DestinationGuide }) {
  return (
    <div className="space-y-4">
      {guide.sections.map((section) => (
        <div
          key={section.id}
          className="rounded-xl border border-border bg-white dark:bg-zinc-900 p-4 space-y-3"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <span className="text-base">{section.icon}</span>
            {section.title}
          </h3>
          <ul className="space-y-2">
            {section.tips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
              >
                <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ActivitySpotlights({ guide }: { guide: ActivitySpotlightsGuide }) {
  if (!guide.spotlights || guide.spotlights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No activity spotlights yet. Hit Refresh to generate them.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {guide.spotlights.map((spotlight, i) => (
        <SpotlightCard key={i} spotlight={spotlight} />
      ))}
    </div>
  );
}

function SpotlightCard({
  spotlight,
}: {
  spotlight: ActivitySpotlightsGuide["spotlights"][0];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Hero photo */}
      {spotlight.hero_photo && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={spotlight.hero_photo}
            alt={spotlight.activity_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <h3 className="absolute bottom-3 left-4 text-white font-bold text-base leading-tight">
            {spotlight.activity_name}
          </h3>
        </div>
      )}

      <div className="p-4 space-y-3">
        {!spotlight.hero_photo && (
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            {spotlight.activity_name}
          </h3>
        )}

        {/* Editorial blurb */}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {spotlight.editorial_blurb}
        </p>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          {spotlight.best_time && (
            <span className="flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              <Clock className="w-3 h-3" />
              {spotlight.best_time}
            </span>
          )}
          {spotlight.budget_tip && (
            <span className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800">
              <Wallet className="w-3 h-3" />
              {spotlight.budget_tip}
            </span>
          )}
        </div>

        {/* Etiquette tip */}
        {spotlight.etiquette_tip && (
          <div className="flex gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{spotlight.etiquette_tip}</span>
          </div>
        )}

        {/* Insider tips — expandable */}
        {spotlight.insider_tips?.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Insider Tips {expanded ? "▲" : "▼"}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1.5">
                {spotlight.insider_tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs text-gray-600 dark:text-gray-300"
                  >
                    <span className="text-teal-500 flex-shrink-0">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
