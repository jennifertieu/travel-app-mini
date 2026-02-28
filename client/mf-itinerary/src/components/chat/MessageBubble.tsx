import { Bot, User, Wrench } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ChatMessage } from "../../types";

interface MessageBubbleProps {
  message: ChatMessage;
}

/** Converts snake_case tool names like "move_activity" → "Moving activity..." */
const formatToolName = (tool: string): string => {
  const map: Record<string, string> = {
    move_activity: "Moving activity...",
    swap_activities: "Swapping activities...",
    assign_activity_to_day: "Assigning activity...",
    remove_activity_from_day: "Removing activity...",
    add_travel_segment: "Adding travel segment...",
    check_day_conflicts: "Checking conflicts...",
    get_activity_details: "Getting details...",
    find_best_travel_mode: "Finding travel mode...",
  };
  return map[tool] ?? tool.replace(/_/g, " ") + "...";
};

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
        {/* Tool call badges — shown above the text while streaming */}
        {isAgent && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {message.toolCalls.map((tool, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[10px] text-muted-foreground"
              >
                <Wrench className="w-2.5 h-2.5" />
                {formatToolName(tool)}
              </span>
            ))}
          </div>
        )}

        {/* Message content */}
        <span>
          {message.content}
          {/* Pulsing streaming cursor — only shown while agent is still writing */}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 -mb-0.5 rounded-sm bg-teal-500 animate-pulse" />
          )}
        </span>

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
