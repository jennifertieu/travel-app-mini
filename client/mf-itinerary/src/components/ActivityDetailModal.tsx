import { X, Navigation } from "lucide-react";
import type { Activity, ActivityLocation } from "../types";

function getCoords(
  activity: Activity,
): { lat: number; lng: number } | null {
  if (activity.latitude != null && activity.longitude != null) {
    return { lat: activity.latitude, lng: activity.longitude };
  }
  if (activity.location && typeof activity.location !== "string") {
    const loc = activity.location as ActivityLocation & { lat?: number; lng?: number };
    if (loc.lat != null && loc.lng != null) {
      return { lat: loc.lat, lng: loc.lng };
    }
  }
  return null;
}

function buildMapsUrl(activity: Activity): string {
  const coords = getCoords(activity);
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.name)}`;
}

interface ActivityDetailModalProps {
  activity: Activity;
  enrichment: { photoUrl: string | null; description: string | null } | null;
  onClose: () => void;
}

export function ActivityDetailModal({ activity, enrichment, onClose }: ActivityDetailModalProps) {
  return (
    <div
      className="absolute inset-0 z-[1000] flex items-center justify-center p-6 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative w-full aspect-video">
          {(activity.place?.photoUrl ?? activity.image_url) ? (
          <img
            src={(activity.place?.photoUrl ?? activity.image_url)!}
            alt={activity.name}
            className="w-full h-full object-cover"
          />
        ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-500 to-teal-700" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <h2 className="text-base font-bold text-gray-900 mb-2">
            {activity.name}
          </h2>

          {(enrichment?.description ?? activity.summary ?? activity.description) && (
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {enrichment?.description ?? activity.summary ?? activity.description}
            </p>
          )}

          {/* Label pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {activity.category && (
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-xs font-medium">
                {activity.category}
              </span>
            )}
            {activity.time_of_day && (
              <span className="px-2.5 py-0.5 rounded-full border border-gray-300 text-gray-600 text-xs font-medium capitalize">
                {activity.time_of_day}
              </span>
            )}
            {activity.must_capture && (
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600/10 text-teal-600 text-xs font-medium">
                Must Capture
              </span>
            )}
          </div>

          {/* Navigate button */}
          <a
            href={buildMapsUrl(activity)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Navigate
          </a>
        </div>
      </div>
    </div>
  );
}
