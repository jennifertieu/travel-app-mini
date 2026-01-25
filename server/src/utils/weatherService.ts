import { OPENWEATHERMAP_API_KEY } from "../config.js";

interface IWeatherData {
  condition: string;
  temperature: number;
  precipitation: boolean;
}

interface IOpenWeatherResponse {
  weather: Array<{
    main: string;
    description: string;
  }>;
  main: {
    temp: number;
  };
  rain?: {
    "1h"?: number;
    "3h"?: number;
  };
  snow?: {
    "1h"?: number;
    "3h"?: number;
  };
}

// Cache for weather data (30-minute TTL)
const weatherCache = new Map<
  string,
  { data: IWeatherData; timestamp: number }
>();
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get weather conditions for a specific location
 * Uses OpenWeatherMap API with 30-minute caching
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

  if (!OPENWEATHERMAP_API_KEY) {
    console.warn(
      "[Weather Service] OPENWEATHERMAP_API_KEY not configured, skipping weather"
    );
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `[Weather Service] API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data: IOpenWeatherResponse = await response.json();

    const weather: IWeatherData = {
      condition: data.weather[0]?.main.toLowerCase() || "unknown",
      temperature: Math.round(data.main.temp),
      precipitation: !!(
        data.rain?.["1h"] ||
        data.rain?.["3h"] ||
        data.snow?.["1h"] ||
        data.snow?.["3h"]
      ),
    };

    // Cache the result
    weatherCache.set(cacheKey, { data: weather, timestamp: Date.now() });

    return weather;
  } catch (error: any) {
    console.error(
      `[Weather Service] Failed to fetch weather: ${error.message}`
    );
    return null;
  }
};

/**
 * Clear weather cache (useful for testing)
 */
export const clearWeatherCache = (): void => {
  weatherCache.clear();
};
