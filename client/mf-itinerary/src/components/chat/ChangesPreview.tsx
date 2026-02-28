import { Check, X, ArrowRight, Plus, Minus, RefreshCw } from "lucide-react";
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
      <ul className="px-3 py-2 space-y-1.5 max-h-32 overflow-y-auto">
        {changes.map((change, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 flex-shrink-0">{changeIcon(change.type)}</span>
            <span>{change.description}</span>
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
