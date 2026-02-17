"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Drawing Tools",
    shortcuts: [
      { keys: ["R"], description: "Rectangle tool" },
      { keys: ["P"], description: "Polygon tool" },
      { keys: ["V"], description: "Pan mode (exit drawing)" },
      { keys: ["Esc"], description: "Cancel current drawing" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [{ keys: ["C"], description: "Recenter map to trip" }],
  },
  {
    title: "General",
    shortcuts: [{ keys: ["?"], description: "Show keyboard shortcuts" }],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-semibold text-muted-foreground bg-muted border border-border rounded-md shadow-[0_1px_0_1px_rgba(0,0,0,0.05)]">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⌨️ Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick actions for the map editor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
