import { useRef, useEffect } from "react";
import { CheckSquare, EllipsisVertical } from "lucide-react";
import { cn } from "../../lib/utils";

interface ActionsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectItems: () => void;
  triggerClassName?: string;
}

export function ActionsMenu({
  open,
  onOpenChange,
  onSelectItems,
  triggerClassName,
}: ActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
          open && "text-foreground bg-muted",
          triggerClassName,
        )}
        title="More actions"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <EllipsisVertical className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-lg border border-border bg-popover shadow-lg z-50"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onSelectItems();
              onOpenChange(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
          >
            <CheckSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            Select items
          </button>
        </div>
      )}
    </div>
  );
}
