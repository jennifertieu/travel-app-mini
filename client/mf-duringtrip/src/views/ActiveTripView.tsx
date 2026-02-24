import { useParams } from '@tanstack/react-router';
import { useLocation } from '../hooks/useLocation';
import { MapView } from '../components/MapView';
import { VoiceAssistant } from '../components/voice-assistant';
import type { TripContext } from '../types/voice';

export function ActiveTripView() {
  const { tripId } = useParams({ from: '/trip/$tripId' });
  const { position } = useLocation(); // Location requested via map's geolocate button

  // Minimal trip context for voice assistant
  const tripContext: TripContext = {
    tripId,
    currentLocation: position
      ? { latitude: position.latitude, longitude: position.longitude }
      : undefined,
  };

  return (
    <div className="relative" style={{ height: '100%' }}>
      {/* Map with geolocate control for user-initiated location */}
      <MapView location={position} />

      {/* Voice assistant floating overlay */}
      <VoiceAssistant tripContext={tripContext} />
    </div>
  );
}
