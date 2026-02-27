import { Bot, User } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ChatMessage } from "../../types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.role === "agent";

  return (
    <div className={cn("flex gap-2 mb-3", isAgent ? "flex-row" : "flex-row-reverse")}>
      {/* Avatar icon */}
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isAgent ? "bg-teal-600/10 text-teal-600" : "bg-muted text-muted-foreground",
        )}
      >
        {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isAgent
            ? "bg-teal-600/10 text-foreground rounded-tl-sm"
            : "bg-muted text-foreground rounded-tr-sm",
        )}
      >
        {message.content}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
