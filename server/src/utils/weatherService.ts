interface IWeatherData {
  condition: string;
  temperature: number;
  precipitation: boolean;
}

interface IOpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
    precipitation: number;
  };
}

// Cache for weather data (30-minute TTL)
const weatherCache = new Map<
  string,
  { data: IWeatherData; timestamp: number }
>();
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Map WMO weather codes to simple condition strings
 * https://open-meteo.com/en/docs#weathervariables
 */
const mapWeatherCodeToCondition = (code: number): string => {
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "clouds";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "unknown";
};

/**
 * Get weather conditions for a specific location
 * Uses Open-Meteo API (free, no API key required) with 30-minute caching
 */
export const getWeather = async (
  lat: number,
  lng: number
): Promise<IWeatherData | null> => {
  // Check cache first
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,precipitation`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `[Weather Service] API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data: IOpenMeteoResponse = await response.json();

    const weather: IWeatherData = {
      condition: mapWeatherCodeToCondition(data.current.weather_code),
      temperature: Math.round(data.current.temperature_2m),
      precipitation: data.current.precipitation > 0,
    };

    // Cache the result
    weatherCache.set(cacheKey, { data: weather, timestamp: Date.now() });

    return weather;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Weather Service] Failed to fetch weather: ${message}`);
    return null;
  }
};

/**
 * Clear weather cache (useful for testing)
 */
export const clearWeatherCache = (): void => {
  weatherCache.clear();
};
