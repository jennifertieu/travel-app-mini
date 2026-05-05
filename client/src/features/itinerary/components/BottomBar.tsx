import { Undo2, Save, Loader2 } from "lucide-react";

interface BottomBarProps {
  onUndo: () => void;
  onSave: () => void;
  canUndo?: boolean;
  isSaving?: boolean;
  saveError?: string | null;
}

export function BottomBar({
  onUndo,
  onSave,
  canUndo = true,
  isSaving = false,
  saveError = null,
}: BottomBarProps) {
  return (
    <div className="sticky bottom-0 flex flex-col border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Undo
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:pointer-events-none"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
      {saveError && (
        <p className="px-4 pb-2 text-[11px] text-red-500 text-right">
          {saveError}
        </p>
      )}
    </div>
  );
}
