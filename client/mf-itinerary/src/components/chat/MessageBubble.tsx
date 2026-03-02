import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, User, Wrench } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ChatMessage } from "../../types";

function ThinkingDots({ className, dotSize = "sm" }: { className?: string; dotSize?: "sm" | "lg" }) {
  const dot = dotSize === "lg" ? "w-2 h-2" : "w-1.5 h-1.5";
  const gap = dotSize === "lg" ? "gap-1" : "gap-[3px]";
  return (
    <span className={cn("inline-flex items-end", gap, className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("rounded-full bg-teal-500 animate-bounce", dot)}
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  );
}

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
}

interface MessageBubbleProps {
  message: ChatMessage;
  userProfile?: UserProfile | null;
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

/** Returns Tailwind classes for tool badge color based on action category */
const toolBadgeClass = (tool: string): string => {
  if (tool === "move_activity" || tool === "swap_activities") {
    return "bg-amber-500/15 text-amber-400 border border-amber-500/20";
  }
  if (tool === "assign_activity_to_day" || tool === "add_travel_segment") {
    return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
  }
  if (tool === "remove_activity_from_day") {
    return "bg-red-500/15 text-red-400 border border-red-500/20";
  }
  // Diagnostic/read-only tools
  return "bg-muted/60 text-muted-foreground";
};

function UserAvatar({ profile }: { profile?: UserProfile | null }) {
  const [imgError, setImgError] = useState(false);

  if (profile?.avatar_url && !imgError) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.display_name ?? "You"}
        onError={() => setImgError(true)}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
      <User className="w-4 h-4" />
    </div>
  );
}

export function MessageBubble({ message, userProfile }: MessageBubbleProps) {
  const isAgent = message.role === "agent";

  if (message.role === "system") {
    const isDanger = message.variant === "danger";
    return (
      <div className="flex justify-center my-2">
        <span className={cn(
          "text-xs rounded-full px-4 py-1.5",
          isDanger
            ? "text-red-400/80 bg-red-500/10"
            : "text-muted-foreground/70 bg-muted/40"
        )}>
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 mb-3", isAgent ? "flex-row" : "flex-row-reverse")}>
      {/* Avatar icon */}
      {isAgent ? (
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-teal-600/10 text-teal-600">
          <Bot className="w-4 h-4" />
        </div>
      ) : (
        <UserAvatar profile={userProfile} />
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words",
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
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]",
                  toolBadgeClass(tool),
                )}
              >
                <Wrench className="w-2.5 h-2.5" />
                {formatToolName(tool)}
              </span>
            ))}
          </div>
        )}

        {/* Message content */}
        {isAgent ? (
          <div className="text-sm leading-relaxed">
            {/* Empty + streaming = waiting for first token — show prominent block dots */}
            {message.isStreaming && !message.content ? (
              <ThinkingDots className="py-1" dotSize="lg" />
            ) : (
              <>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="my-1 pl-4 space-y-0.5 list-disc">{children}</ul>,
                    li: ({ children }) => <li className="leading-snug">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.isStreaming && (
                  <ThinkingDots className="ml-1 mb-0.5" />
                )}
              </>
            )}
          </div>
        ) : (
          <span>
            {message.content}
            {message.isStreaming && (
              <ThinkingDots className="ml-1 mb-0.5" />
            )}
          </span>
        )}

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
