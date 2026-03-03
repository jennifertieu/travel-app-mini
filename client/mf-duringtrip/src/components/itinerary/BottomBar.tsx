import { Undo2, Save } from "lucide-react";

interface BottomBarProps {
  onUndo: () => void;
  onSave: () => void;
  canUndo?: boolean;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
}

export function BottomBar({
  onUndo,
  onSave,
  canUndo = false,
  hasUnsavedChanges = false,
  isSaving = false,
}: BottomBarProps) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Undo2 className="w-3.5 h-3.5" />
        Undo
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!hasUnsavedChanges || isSaving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Save className="w-3.5 h-3.5" />
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
