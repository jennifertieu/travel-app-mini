import { Car } from "lucide-react";

interface TransportLineProps {
  estimate: number;
  note?: string;
}

export function TransportLine({ estimate, note }: TransportLineProps) {
  if (!estimate) return null;

  return (
    <div className="flex items-center gap-2 px-1 py-2 mb-3 text-muted-foreground/60">
      <Car className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-xs">~${estimate}</span>
      {note && (
        <>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-xs truncate">{note}</span>
        </>
      )}
    </div>
  );
}
