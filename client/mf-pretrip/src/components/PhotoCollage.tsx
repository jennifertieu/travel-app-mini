import { motion } from "motion/react";
import { MapPin } from "lucide-react";

interface CollageSlot {
  top: string;
  left: string;
  width: string;
  height: string;
  rotate: number;
  zIndex: number;
  borderRadius: string;
}

const SLOTS: CollageSlot[] = [
  {
    top: "4%",
    left: "2%",
    width: "44%",
    height: "48%",
    rotate: -3,
    zIndex: 2,
    borderRadius: "1.25rem",
  },
  {
    top: "0%",
    left: "50%",
    width: "48%",
    height: "56%",
    rotate: 2,
    zIndex: 3,
    borderRadius: "1.25rem",
  },
  {
    top: "54%",
    left: "8%",
    width: "38%",
    height: "42%",
    rotate: 2.5,
    zIndex: 4,
    borderRadius: "1.25rem",
  },
  {
    top: "58%",
    left: "48%",
    width: "42%",
    height: "38%",
    rotate: -2,
    zIndex: 2,
    borderRadius: "1.25rem",
  },
  {
    top: "28%",
    left: "30%",
    width: "32%",
    height: "32%",
    rotate: -1.5,
    zIndex: 5,
    borderRadius: "1rem",
  },
  {
    top: "72%",
    left: "28%",
    width: "28%",
    height: "26%",
    rotate: 3,
    zIndex: 6,
    borderRadius: "1rem",
  },
];

interface PhotoCollageProps {
  photos: string[];
  destination?: string;
}

export function PhotoCollage({ photos, destination }: PhotoCollageProps) {
  if (photos.length === 0) {
    return <CollageFallback destination={destination} />;
  }

  const visibleSlots = SLOTS.slice(0, photos.length);

  return (
    <div className="relative w-full" style={{ paddingBottom: "100%" }}>
      {visibleSlots.map((slot, i) => (
        <motion.div
          key={i}
          className="absolute overflow-hidden shadow-xl"
          style={{
            top: slot.top,
            left: slot.left,
            width: slot.width,
            height: slot.height,
            zIndex: slot.zIndex,
            borderRadius: slot.borderRadius,
          }}
          initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: slot.rotate }}
          transition={{
            duration: 0.5,
            delay: i * 0.1,
            ease: "easeOut",
          }}
          whileHover={{ scale: 1.04, zIndex: 10 }}
        >
          <img
            src={photos[i]}
            alt={`Trip photo ${i + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 ring-1 ring-white/20 rounded-[inherit]" />
        </motion.div>
      ))}
    </div>
  );
}

function CollageFallback({ destination }: { destination?: string }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-border/50"
      style={{ paddingBottom: "80%" }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <MapPin className="w-8 h-8 text-primary" />
        </motion.div>
        {destination && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-semibold text-foreground/70 text-center"
          >
            {destination}
          </motion.p>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground text-center"
        >
          Photos will appear here as ideas are added
        </motion.p>
      </div>
    </div>
  );
}
