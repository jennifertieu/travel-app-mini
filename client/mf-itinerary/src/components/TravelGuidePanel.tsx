import { useState } from "react";
import {
  RefreshCw,
  Clock,
  Wallet,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  HandHeart,
  Car,
  UtensilsCrossed,
  ShieldAlert,
  Banknote,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { useTravelGuide } from "../hooks/useTravelGuide";
import type { DestinationGuide, ActivitySpotlightsGuide } from "../types";

interface TravelGuidePanelProps {
  tripId: string | null;
  destination?: string;
}

type SubTab = "quickRef" | "spotlights";

export function TravelGuidePanel({
  tripId,
  destination,
}: TravelGuidePanelProps) {
  const [subTab, setSubTab] = useState<SubTab>("quickRef");

  const destGuide = useTravelGuide(tripId, "destination");
  const spotlightsGuide = useTravelGuide(tripId, "spotlights");

  const isLoadingSpotlights =
    spotlightsGuide.isLoading || spotlightsGuide.regenerate.isPending;
  const isLoadingQuickRef =
    destGuide.isLoading || destGuide.regenerate.isPending;
  const isLoading =
    subTab === "quickRef" ? isLoadingQuickRef : isLoadingSpotlights;
  const isRegenerating =
    subTab === "quickRef"
      ? destGuide.regenerate.isPending
      : spotlightsGuide.regenerate.isPending;
  const error =
    subTab === "quickRef" ? destGuide.error : spotlightsGuide.error;
  const onRetry =
    subTab === "quickRef" ? destGuide.refetch : spotlightsGuide.refetch;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs + Refresh (no repeated title) */}
      <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(
            [
              { id: "quickRef" as const, label: "Quick Ref" },
              { id: "spotlights" as const, label: "Spotlights" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                subTab === id
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            subTab === "quickRef"
              ? destGuide.regenerate.mutate()
              : spotlightsGuide.regenerate.mutate()
          }
          disabled={isLoading || isRegenerating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 border border-border hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors shrink-0"
          title="Regenerate guide"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState onRetry={onRetry} />
        ) : subTab === "quickRef" ? (
          destGuide.data ? (
            <QuickRefView guide={destGuide.data as DestinationGuide} />
          ) : (
            <LoadingState />
          )
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

const QUICK_REF_SAFETY_IDS = ["safety", "safety-practical", "safety & practical"];
const EMERGENCY_FALLBACK = "Emergency: 113 (police), 115 (ambulance). Save your hotel address.";

const QUICK_REF_ICON_MAP: { pattern: RegExp | string; icon: LucideIcon }[] = [
  { pattern: /etiquette|culture/i, icon: HandHeart },
  { pattern: /getting\s*around|transport/i, icon: Car },
  { pattern: /food|dining/i, icon: UtensilsCrossed },
  { pattern: /safety|practical/i, icon: ShieldAlert },
  { pattern: /money|currency/i, icon: Banknote },
  { pattern: /best\s*time|visit/i, icon: CalendarDays },
];

function getQuickRefIcon(section: { id: string; title: string }): LucideIcon {
  const key = `${section.id} ${section.title}`.toLowerCase();
  const match = QUICK_REF_ICON_MAP.find(({ pattern }) =>
    typeof pattern === "string" ? key.includes(pattern) : pattern.test(key)
  );
  return match?.icon ?? Lightbulb;
}

interface QuickRefViewProps {
  guide: DestinationGuide;
}

function QuickRefView({ guide }: QuickRefViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sections = guide.sections ?? [];
  const safetySection = sections.find((s) =>
    QUICK_REF_SAFETY_IDS.some((id) =>
      s.id.toLowerCase().replace(/\s+/g, "-").includes(id)
    )
  );
  const emergencyLine =
    safetySection?.tips?.[0] ?? EMERGENCY_FALLBACK;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-teal-200 dark:border-teal-900/50 bg-teal-50 dark:bg-teal-900/20 px-4 py-3">
        <p className="text-[10px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-1">
          Emergency
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
          {emergencyLine}
        </p>
      </div>
      <div className="space-y-2">
        {sections.map((section) => {
          const isOpen = openId === section.id;
          const isSafety =
            QUICK_REF_SAFETY_IDS.some((id) =>
              section.id.toLowerCase().replace(/\s+/g, "-").includes(id)
            );
          const Icon = getQuickRefIcon(section);
          const preview = section.tips?.[0]
            ? `${section.tips[0].slice(0, 50)}${section.tips[0].length > 50 ? "…" : ""}`
            : "";
          return (
            <div
              key={section.id}
              className={`rounded-lg border overflow-hidden bg-white dark:bg-zinc-900 ${
                isSafety ? "border-l-4 border-l-gray-400 dark:border-l-gray-500 border-border" : "border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-medium text-sm text-gray-900 dark:text-white block truncate">
                    {section.title}
                  </span>
                  {preview && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 block truncate mt-0.5">
                      {preview}
                    </span>
                  )}
                </div>
                <span className="text-gray-400 flex-shrink-0" aria-hidden>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <ul className="border-t border-border px-4 py-3 space-y-2 bg-gray-50/30 dark:bg-zinc-800/20">
                    {section.tips?.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        <span className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
  const total = guide.spotlights.length;
  return (
    <div className="space-y-4">
      {guide.spotlights.map((spotlight, i) => (
        <SpotlightCard
          key={i}
          spotlight={spotlight}
          index={i + 1}
          total={total}
        />
      ))}
    </div>
  );
}

function SpotlightCard({
  spotlight,
  index,
  total,
}: {
  spotlight: ActivitySpotlightsGuide["spotlights"][0];
  index?: number;
  total?: number;
}) {
  const [expanded, setExpanded] = useState(true);

  const hasTips =
    spotlight.best_time || spotlight.budget_tip || spotlight.etiquette_tip;

  return (
    <article className="relative rounded-xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
      {typeof index === "number" && typeof total === "number" && total > 0 && (
        <span
          className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-zinc-800/90 border border-border"
          aria-hidden
        >
          {index}/{total}
        </span>
      )}
      {spotlight.hero_photo && (
        <div className="relative h-36 overflow-hidden">
          <img
            src={spotlight.hero_photo}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <h3 className="absolute bottom-3 left-3 right-14 text-white font-semibold text-base leading-tight">
            {spotlight.activity_name}
          </h3>
        </div>
      )}

      <div className="p-4">
        {!spotlight.hero_photo && (
          <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-2">
            {spotlight.activity_name}
          </h3>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {spotlight.editorial_blurb}
        </p>

        {hasTips && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {spotlight.best_time && (
              <div className="flex gap-2.5 items-center text-sm text-gray-700 dark:text-gray-300">
                <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{spotlight.best_time}</span>
              </div>
            )}
            {spotlight.budget_tip && (
              <div className="flex gap-2.5 items-center text-sm text-gray-700 dark:text-gray-300">
                <Wallet className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{spotlight.budget_tip}</span>
              </div>
            )}
            {spotlight.etiquette_tip && (
              <div className="flex gap-2.5 items-center text-sm text-gray-700 dark:text-gray-300">
                <AlertTriangle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{spotlight.etiquette_tip}</span>
              </div>
            )}
          </div>
        )}

        {spotlight.insider_tips?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400"
            >
              <Lightbulb className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400 flex-shrink-0" />
              Insider tips
              <span className="ml-auto text-gray-400">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>
            <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <ul className="mt-2 space-y-1.5">
                  {spotlight.insider_tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400 pl-5">
                      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">→</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
