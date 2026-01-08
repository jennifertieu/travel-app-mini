// Place search utilities for location confirmation

export interface PlaceSearchResult {
  name: string;
  lat: number;
  lng: number;
  displayName: string;
  type: string;
}

// Search for places using OpenStreetMap Nominatim API
export const searchPlaces = async (
  query: string,
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): Promise<PlaceSearchResult[]> => {
  if (!query.trim()) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "10",
    });

    // Add bounding box if provided
    if (bounds) {
      params.append(
        "viewbox",
        `${bounds.minLng},${bounds.maxLat},${bounds.maxLng},${bounds.minLat}`
      );
      params.append("bounded", "1");
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`
    );
    const data = await response.json();

    return data.map((result: any) => ({
      name: result.name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      type: result.type,
    }));
  } catch (error) {
    console.error("Failed to search places:", error);
    return [];
  }
};

// Get neighborhood name from coordinates
export const getNeighborhoodName = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();

    return (
      data.address?.neighbourhood ||
      data.address?.suburb ||
      data.address?.city ||
      data.address?.town ||
      data.address?.county ||
      null
    );
  } catch (error) {
    console.error("Failed to get neighborhood:", error);
    return null;
  }
};

// Format coordinates for display
export const formatCoordinates = (lat: number, lng: number): string => {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

