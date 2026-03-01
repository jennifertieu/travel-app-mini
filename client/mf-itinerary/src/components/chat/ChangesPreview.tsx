import { Check, X, ArrowRight, Plus, Minus, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import type { IItineraryChange } from "../../types";

interface ChangesPreviewProps {
  changes: IItineraryChange[];
  onConfirm: () => void;
  onReject: () => void;
}

const changeIcon = (type: IItineraryChange["type"]) => {
  switch (type) {
    case "add":
    case "add_travel":
      return <Plus className="w-3 h-3 text-emerald-400" />;
    case "remove":
    case "remove_travel":
      return <Minus className="w-3 h-3 text-red-400" />;
    case "swap":
      return <RefreshCw className="w-3 h-3 text-purple-400" />;
    case "move":
    default:
      return <ArrowRight className="w-3 h-3 text-blue-400" />;
  }
};

const changeBorderClass = (type: IItineraryChange["type"]): string => {
  switch (type) {
    case "add":
    case "add_travel":
      return "border-l-2 border-l-emerald-500/50";
    case "remove":
    case "remove_travel":
      return "border-l-2 border-l-red-500/50";
    case "swap":
      return "border-l-2 border-l-purple-500/50";
    case "move":
    default:
      return "border-l-2 border-l-blue-500/50";
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ChangeDiff({ change }: { change: IItineraryChange }) {
  const { type, before, after, description } = change;

  // Structured layout when position data is available
  if (before || after) {
    const activityName = before?.activity_name ?? after?.activity_name ?? "";

    let diffLine: React.ReactNode;
    if (type === "add" || type === "add_travel") {
      diffLine = after ? (
        <span>
          Day {after.day_number},{" "}
          <span className="text-emerald-400">{capitalize(after.time_of_day)}</span>
        </span>
      ) : null;
    } else if (type === "remove" || type === "remove_travel") {
      diffLine = before ? (
        <span>
          Day {before.day_number}, {capitalize(before.time_of_day)}{" "}
          <ArrowRight className="inline w-2.5 h-2.5 mx-0.5 opacity-50" />
          <span className="text-red-400">removed</span>
        </span>
      ) : null;
    } else if (before && after) {
      // move or swap — show from → to
      const unchanged =
        before.day_number === after.day_number &&
        before.time_of_day === after.time_of_day;
      diffLine = unchanged ? null : (
        <span>
          Day {before.day_number}, {capitalize(before.time_of_day)}{" "}
          <ArrowRight className="inline w-2.5 h-2.5 mx-0.5 opacity-50" />
          Day {after.day_number},{" "}
          <span className="text-foreground/80">{capitalize(after.time_of_day)}</span>
        </span>
      );
    }

    return (
      <div>
        <p className="font-semibold text-foreground leading-snug">{activityName}</p>
        {diffLine && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-0.5">
            {diffLine}
          </p>
        )}
      </div>
    );
  }

  // Fallback: flat description string
  return <span>{description}</span>;
}

export function ChangesPreview({
  changes,
  onConfirm,
  onReject,
}: ChangesPreviewProps) {
  if (changes.length === 0) return null;

  return (
    <div className="mx-3 mb-2 rounded-lg border border-teal-600/30 bg-teal-600/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-teal-600/20">
        <span className="text-xs font-semibold text-teal-400">
          {changes.length} pending change{changes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Change list */}
      <ul className="px-3 py-2 space-y-2 max-h-32 overflow-y-auto">
        {changes.map((change, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-2 text-sm text-muted-foreground pl-2 py-0.5 rounded-sm",
              changeBorderClass(change.type),
            )}
          >
            <span className="mt-0.5 flex-shrink-0">{changeIcon(change.type)}</span>
            <ChangeDiff change={change} />
          </li>
        ))}
      </ul>

      {/* Action buttons */}
      <div className="flex border-t border-teal-600/20">
        <button
          type="button"
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-r border-teal-600/20"
        >
          <X className="w-3.5 h-3.5" />
          Discard
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-teal-400 hover:text-teal-300 hover:bg-teal-600/10 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Apply changes
        </button>
      </div>
    </div>
  );
}
