import { ChevronLeft, MessageSquare } from "lucide-react";

interface ChatToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatToggleButton({ isOpen, onClick }: ChatToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close chat" : "Open Itinerary Assistant"}
      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 pl-2 pr-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-r-full shadow-md hover:bg-teal-700 transition-colors"
    >
      {isOpen ? (
        <ChevronLeft className="w-4 h-4" />
      ) : (
        <>
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </>
      )}
    </button>
  );
}
