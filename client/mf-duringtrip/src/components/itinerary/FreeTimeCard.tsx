import { Clock } from "lucide-react";
import { formatDuration } from "../../lib/utils";

interface FreeTimeCardProps {
  freedMinutes: number;
}

export function FreeTimeCard({ freedMinutes }: FreeTimeCardProps) {
  return (
    <div className="w-full flex items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40 p-4 text-left">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Clock className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        You have{" "}
        <span className="font-semibold text-foreground">
          {formatDuration(freedMinutes)}
        </span>{" "}
        of free time — add an activity here!
      </p>
    </div>
  );
}
