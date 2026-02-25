import { Undo2, Save } from "lucide-react";

interface BottomBarProps {
  onUndo: () => void;
  onSave: () => void;
}

export function BottomBar({ onUndo, onSave }: BottomBarProps) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm">
      <button
        type="button"
        onClick={onUndo}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors"
      >
        <Undo2 className="w-3.5 h-3.5" />
        Undo
      </button>
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
      >
        <Save className="w-3.5 h-3.5" />
        Save
      </button>
    </div>
  );
}
