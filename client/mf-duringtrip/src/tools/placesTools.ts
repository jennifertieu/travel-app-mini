import type { RealtimeTool, FunctionHandler } from '../types/voice';
import { PlacesService } from '../services/placesService';

/**
 * Tools for searching and getting details about nearby places
 */
export const placesTools: RealtimeTool[] = [
  {
    type: 'function',
    name: 'search_nearby_places',
    description:
      'Search for nearby places like restaurants, cafes, bars, museums, attractions, parks, shopping, nightlife, hotels, or spas. ' +
      'Use this when the user asks to find places nearby, such as "find me a restaurant", "what coffee shops are around here", ' +
      '"are there any museums close by", or "where can I get drinks nearby". ' +
      'You should first use get_current_location to get the user\'s coordinates if you don\'t have them.',
    parameters: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          description: 'The latitude coordinate of the search center (user\'s current location)',
        },
        longitude: {
          type: 'number',
          description: 'The longitude coordinate of the search center (user\'s current location)',
        },
        category: {
          type: 'string',
          description: 'The type of place to search for',
          enum: [
            'restaurant',
            'cafe',
            'bar',
            'bakery',
            'fast_food',
            'museum',
            'attraction',
            'park',
            'landmark',
            'shopping',
            'nightlife',
            'hotel',
            'spa',
          ],
        },
        keyword: {
          type: 'string',
          description:
            'Optional specific search term like "pizza", "sushi", "rooftop bar", "art gallery", or "vintage clothing"',
        },
        radius: {
          type: 'number',
          description: 'Search radius in meters. Default is 2000 (2km). Maximum is 5000 (5km).',
        },
      },
      required: ['latitude', 'longitude'],
    },
  },
  {
    type: 'function',
    name: 'get_place_details',
    description:
      'Get detailed information about a specific place including hours, reviews, phone number, and website. ' +
      'Use this when the user wants more information about a place from the search results, such as ' +
      '"tell me more about that one", "is it open now", "what are the reviews like", or "what\'s the phone number".',
    parameters: {
      type: 'object',
      properties: {
        place_id: {
          type: 'string',
          description: 'The Google Place ID of the place to get details for (from search results)',
        },
      },
      required: ['place_id'],
    },
  },
];

/**
 * Format distance into a voice-friendly description
 */
function formatDistance(meters: number): string {
  if (meters < 100) {
    return 'very close, about a minute walk';
  }
  if (meters < 300) {
    return 'about a 3 minute walk';
  }
  if (meters < 500) {
    return 'about a 5 minute walk';
  }
  if (meters < 800) {
    return 'about an 8 minute walk';
  }
  if (meters < 1000) {
    return 'about a 10 minute walk';
  }
  if (meters < 1500) {
    return 'about a 15 minute walk';
  }
  if (meters < 2000) {
    return 'about a 20 minute walk';
  }
  const km = (meters / 1000).toFixed(1);
  return `about ${km} kilometers away`;
}

/**
 * Format price level into dollar signs
 */
function formatPriceLevel(level?: number): string | null {
  if (level === undefined || level === null) return null;
  return '$'.repeat(Math.max(1, level));
}

/**
 * Create a function handler for places tools
 */
export function createPlacesFunctionHandler(): FunctionHandler {
  return async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    switch (name) {
      case 'search_nearby_places': {
        const { latitude, longitude, category, keyword, radius } = args as {
          latitude: number;
          longitude: number;
          category?: string;
          keyword?: string;
          radius?: number;
        };

        try {
          const places = await PlacesService.searchNearby({
            latitude,
            longitude,
            category,
            keyword,
            radius: radius || 2000,
            maxResults: 5,
          });

          if (places.length === 0) {
            return {
              found: false,
              message: 'No places found matching your criteria nearby.',
              suggestion: category
                ? 'Try a different category or expand the search area.'
                : 'Try being more specific about what you\'re looking for.',
            };
          }

          return {
            found: true,
            count: places.length,
            places: places.map((place, index) => ({
              rank: index + 1,
              name: place.name,
              place_id: place.placeId,
              category: place.category,
              rating: place.rating,
              review_count: place.reviewCount,
              price_level: formatPriceLevel(place.priceLevel),
              distance_meters: place.distanceMeters,
              distance_description: formatDistance(place.distanceMeters),
              is_open: place.isOpen,
              address: place.address,
            })),
          };
        } catch (error) {
          console.error('[placesTools] search_nearby_places error:', error);
          return {
            error: error instanceof Error ? error.message : 'Failed to search for places',
            suggestion: 'Please try again in a moment.',
          };
        }
      }

      case 'get_place_details': {
        const { place_id } = args as {
          place_id: string;
        };

        try {
          const details = await PlacesService.getDetails(place_id);

          if (!details) {
            return {
              error: 'Place not found',
              suggestion: 'The place may have been removed or the ID is invalid.',
            };
          }

          // Format top reviews for voice output (truncate long text)
          const topReviews = details.reviews?.slice(0, 3).map((review) => ({
            author: review.authorName,
            rating: review.rating,
            text: review.text.length > 200 ? review.text.substring(0, 200) + '...' : review.text,
            time_ago: review.relativeTimeDescription,
          }));

          return {
            name: details.name,
            address: details.address,
            rating: details.rating,
            review_count: details.reviewCount,
            price_level: formatPriceLevel(details.priceLevel),
            phone: details.phoneNumber,
            website: details.website,
            hours: details.openingHours
              ? {
                  is_open_now: details.openingHours.isOpen,
                  schedule: details.openingHours.weekdayText,
                }
              : null,
            top_reviews: topReviews,
          };
        } catch (error) {
          console.error('[placesTools] get_place_details error:', error);
          return {
            error: error instanceof Error ? error.message : 'Failed to get place details',
            suggestion: 'Please try again in a moment.',
          };
        }
      }

      default:
        return { error: `Unknown function: ${name}` };
    }
  };
}
