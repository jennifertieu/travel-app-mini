import type { RealtimeTool, FunctionHandler } from '../types/voice';
import { LocationService } from '../services/locationService';

// Tool definitions for the OpenAI agent
export const geoTools: RealtimeTool[] = [
  {
    type: 'function',
    name: 'get_current_location',
    description:
      'Get the user\'s current GPS location including latitude, longitude, and accuracy. Use this when the user asks where they are, wants directions, or needs location-based recommendations.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    type: 'function',
    name: 'get_distance',
    description:
      'Calculate the distance in kilometers between two geographic coordinates. Use this to help users understand how far places are from their current location or from each other.',
    parameters: {
      type: 'object',
      properties: {
        from_lat: {
          type: 'number',
          description: 'Starting latitude coordinate',
        },
        from_lng: {
          type: 'number',
          description: 'Starting longitude coordinate',
        },
        to_lat: {
          type: 'number',
          description: 'Destination latitude coordinate',
        },
        to_lng: {
          type: 'number',
          description: 'Destination longitude coordinate',
        },
      },
      required: ['from_lat', 'from_lng', 'to_lat', 'to_lng'],
    },
  },
  {
    type: 'function',
    name: 'get_heading',
    description:
      'Get the compass heading/direction from one location to another. Returns the direction (N, NE, E, SE, S, SW, W, NW) to help users navigate.',
    parameters: {
      type: 'object',
      properties: {
        from_lat: {
          type: 'number',
          description: 'Starting latitude coordinate',
        },
        from_lng: {
          type: 'number',
          description: 'Starting longitude coordinate',
        },
        to_lat: {
          type: 'number',
          description: 'Destination latitude coordinate',
        },
        to_lng: {
          type: 'number',
          description: 'Destination longitude coordinate',
        },
      },
      required: ['from_lat', 'from_lng', 'to_lat', 'to_lng'],
    },
  },
];

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate compass heading between two points
function calculateHeading(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): { degrees: number; direction: string } {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  bearing = (bearing + 360) % 360;

  // Convert to compass direction
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;

  return {
    degrees: Math.round(bearing),
    direction: directions[index],
  };
}

// Create the function handler for geo tools
export function createGeoFunctionHandler(): FunctionHandler {
  return async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    switch (name) {
      case 'get_current_location': {
        try {
          // First try cached location
          const cached = LocationService.getCachedLocation();
          if (cached) {
            return {
              latitude: cached.latitude,
              longitude: cached.longitude,
              accuracy_meters: cached.accuracy,
              timestamp: new Date(cached.timestamp).toISOString(),
              source: 'cached',
            };
          }

          // Get fresh location
          const position = await LocationService.getCurrentPosition();
          return {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy_meters: position.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
            source: 'fresh',
          };
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : 'Failed to get location',
            suggestion: 'Ask the user to enable location permissions or try again.',
          };
        }
      }

      case 'get_distance': {
        const { from_lat, from_lng, to_lat, to_lng } = args as {
          from_lat: number;
          from_lng: number;
          to_lat: number;
          to_lng: number;
        };
        const distance = calculateDistance(from_lat, from_lng, to_lat, to_lng);
        return {
          distance_km: Math.round(distance * 100) / 100,
          distance_miles: Math.round(distance * 0.621371 * 100) / 100,
        };
      }

      case 'get_heading': {
        const { from_lat, from_lng, to_lat, to_lng } = args as {
          from_lat: number;
          from_lng: number;
          to_lat: number;
          to_lng: number;
        };
        const heading = calculateHeading(from_lat, from_lng, to_lat, to_lng);
        return {
          bearing_degrees: heading.degrees,
          direction: heading.direction,
        };
      }

      default:
        return { error: `Unknown function: ${name}` };
    }
  };
}
