import { CheckSquare, Trash2 } from "lucide-react";

interface TopToolbarProps {
  selectedCount: number;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
}

export function TopToolbar({
  selectedCount,
  isSelectionMode,
  onToggleSelectionMode,
  onSelectAll,
  onDelete,
}: TopToolbarProps) {
  if (!isSelectionMode) {
    return (
      <div className="flex items-center justify-end px-4 py-2 border-b border-border">
        <button
          type="button"
          onClick={onToggleSelectionMode}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Select
        </button>
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
