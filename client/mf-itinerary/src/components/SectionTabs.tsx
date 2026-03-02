import { useState } from "react";
import {
  CalendarDays,
  Plane,
  Wallet,
  BookOpen,
  Camera,
  Sparkles,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ActionsMenu } from "./ActionsMenu";

export type Section = "itinerary" | "travel" | "budget" | "guide" | "photo";

const SECTIONS: { id: Section; label: string; icon: typeof CalendarDays }[] = [
  { id: "itinerary", label: "Itinerary", icon: CalendarDays },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "guide", label: "Guide", icon: BookOpen },
  { id: "photo", label: "Photo Guide", icon: Camera },
];

interface SectionTabsProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  onToggleSelectionMode?: () => void;
  onOpenPhotoGuide?: () => void;
  onRebuildItinerary?: () => void;
  isRebuilding?: boolean;
  isChatOpen?: boolean;
  onToggleChatPanel?: () => void;
}

export function SectionTabs({
  activeSection,
  onSectionChange,
  onToggleSelectionMode,
  onOpenPhotoGuide,
  onRebuildItinerary,
  isRebuilding,
  isChatOpen,
  onToggleChatPanel,
}: SectionTabsProps) {
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <nav className="flex items-center gap-0.5" role="tablist">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={label}
              onClick={() => onSectionChange(id)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors",
                isActive ? "px-3 py-2" : "p-2 justify-center",
                isActive
                  ? "text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {isActive && (
                <>
                  <span className="whitespace-nowrap">{label}</span>
                  <span
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-600 dark:bg-teal-400"
                    aria-hidden
                  />
                </>
              )}
            </button>
          );
        })}
      </nav>

      <ActionsMenu
        open={actionsMenuOpen}
        onOpenChange={setActionsMenuOpen}
        onSelectItems={onToggleSelectionMode ?? (() => {})}
        onPhotoGuide={onOpenPhotoGuide}
        onRebuild={onRebuildItinerary}
        isRebuilding={isRebuilding}
      />

      {onToggleChatPanel && (
        <button
          type="button"
          onClick={onToggleChatPanel}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors flex-shrink-0",
            isChatOpen
              ? "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-950/50"
              : "bg-teal-600 text-white hover:bg-teal-700"
          )}
          title={isChatOpen ? "Close AI Chat" : "Open AI Chat"}
        >
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          AI Chat
          {isChatOpen
            ? <PanelRightOpen className="w-4 h-4 flex-shrink-0 opacity-70" />
            : <PanelRightClose className="w-4 h-4 flex-shrink-0 opacity-70" />
          }
        </button>
      )}
    </div>
  );
}
