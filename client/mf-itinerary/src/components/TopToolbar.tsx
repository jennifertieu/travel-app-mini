import {
  CheckSquare,
  Trash2,
  Camera,
  Sparkles,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "../lib/utils";

interface TopToolbarProps {
  selectedCount: number;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
  onOpenPhotoGuide?: () => void;
  isChatOpen?: boolean;
  onToggleChatPanel?: () => void;
}

export function TopToolbar({
  selectedCount,
  isSelectionMode,
  onToggleSelectionMode,
  onSelectAll,
  onDelete,
  onOpenPhotoGuide,
  isChatOpen,
  onToggleChatPanel,
}: TopToolbarProps) {
  if (!isSelectionMode) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border">
        {/* Chat agent toggle */}
        {onToggleChatPanel && (
          <button
            type="button"
            onClick={onToggleChatPanel}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0",
              isChatOpen
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/40",
            )}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>AI Chat</span>
            {isChatOpen ? (
              <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        )}

        {/* Utility actions */}
        <div className="flex items-center gap-3 ml-1">
          <button
            type="button"
            onClick={onToggleSelectionMode}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Select"
          >
            <CheckSquare className="w-5 h-5 flex-shrink-0" />
            <span className="hidden @[360px]:inline">Select</span>
          </button>
          {onOpenPhotoGuide && (
            <button
              type="button"
              onClick={onOpenPhotoGuide}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Photo Guide"
            >
              <Camera className="w-5 h-5 flex-shrink-0" />
              <span className="hidden @[360px]:inline">Photo Guide</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
      <button
        type="button"
        onClick={onSelectAll}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <CheckSquare className="w-3.5 h-3.5" />
        Select all
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete{selectedCount > 0 && ` (${selectedCount})`}
        </button>
        <button
          type="button"
          onClick={onToggleSelectionMode}
          className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
