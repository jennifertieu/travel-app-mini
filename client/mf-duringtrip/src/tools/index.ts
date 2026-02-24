import type { RealtimeTool, FunctionHandler } from '../types/voice';
import { geoTools, createGeoFunctionHandler } from './geoTools';
import { placesTools, createPlacesFunctionHandler } from './placesTools';

/**
 * All available tools for the voice assistant
 */
export const allTools: RealtimeTool[] = [...geoTools, ...placesTools];

/**
 * Tool names for geo functions
 */
const GEO_TOOLS = new Set(['get_current_location', 'get_distance', 'get_heading']);

/**
 * Tool names for places functions
 */
const PLACES_TOOLS = new Set(['search_nearby_places', 'get_place_details']);

/**
 * Create a combined function handler that routes to the appropriate handler
 */
export function createCombinedFunctionHandler(): FunctionHandler {
  const geoHandler = createGeoFunctionHandler();
  const placesHandler = createPlacesFunctionHandler();

  return async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    if (GEO_TOOLS.has(name)) {
      return geoHandler(name, args);
    }

    if (PLACES_TOOLS.has(name)) {
      return placesHandler(name, args);
    }

    console.warn(`[tools] Unknown function called: ${name}`);
    return { error: `Unknown function: ${name}` };
  };
}

// Re-export individual tools for flexibility
export { geoTools, createGeoFunctionHandler } from './geoTools';
export { placesTools, createPlacesFunctionHandler } from './placesTools';
