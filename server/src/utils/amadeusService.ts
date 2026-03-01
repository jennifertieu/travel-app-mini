import {
  AMADEUS_API_KEY,
  AMADEUS_API_SECRET,
  AMADEUS_BASE_URL,
  openai,
} from "../config";

// ── Server-side flight types (mirrors client types) ──────────────────────

export interface FlightSegment {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface FlightOption {
  id: string;
  direction: "outbound" | "return";
  segments: FlightSegment[];
  totalDurationMinutes: number;
  stops: number;
  priceTotal: number;
  priceCurrency: string;
  cabinClass: string;
  airlineLogo: string;
  summary: string;
  recommended: boolean;
}

export interface FlightSearchResult {
  outbound: FlightOption[];
  return: FlightOption[];
  selectedOutbound: number;
  selectedReturn: number;
  originCity: string;
  originAirport: string;
  destinationAirport: string;
}

interface FlightSearchParams {
  originCode: string;
  destinationCode: string;
  departureDate: string;
  returnDate: string;
}

interface TripContext {
  firstDayActivities: string[];
  lastDayActivities: string[];
}

interface SearchAndRankParams {
  originCity: string;
  destinationCity: string;
  departureDate: string;
  returnDate: string;
  tripContext: TripContext;
}

// ── Token cache ──────────────────────────────────────────────────────────

let cachedToken: { access_token: string; expiresAt: number } | null = null;

/**
 * OAuth2 client-credentials token for Amadeus API.
 * Caches in memory; refreshes when within 5 minutes of expiry.
 */
export async function getAmadeusToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.access_token;
  }

  const res = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AMADEUS_API_KEY,
      client_secret: AMADEUS_API_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.access_token;
}

// ── Airport code resolver ────────────────────────────────────────────────

/**
 * Uses gpt-4o-mini to convert a city name to a 3-letter IATA airport code.
 * Returns null if the LLM response isn't a valid code.
 */
export async function resolveAirportCode(
  cityName: string,
): Promise<string | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Given the city '${cityName}', return the primary IATA airport code. Return ONLY the 3-letter code, nothing else.`,
        },
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const code = completion.choices[0]?.message?.content?.trim() ?? "";
    if (/^[A-Z]{3}$/.test(code)) {
      return code;
    }
    console.warn(
      `[AmadeusService] Invalid IATA code from LLM for "${cityName}": "${code}"`,
    );
    return null;
  } catch (err: any) {
    console.error(
      `[AmadeusService] resolveAirportCode failed for "${cityName}":`,
      err.message,
    );
    return null;
  }
}

// ── ISO 8601 duration parser ─────────────────────────────────────────────

function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  return hours * 60 + minutes;
}

// ── Flight search ────────────────────────────────────────────────────────

/**
 * Searches Amadeus Flight Offers Search for outbound + return flights.
 * Returns parsed FlightOption arrays split by direction.
 */
export async function searchFlights(
  params: FlightSearchParams,
): Promise<{ outbound: FlightOption[]; return: FlightOption[] }> {
  const token = await getAmadeusToken();

  const body = {
    currencyCode: "USD",
    originDestinations: [
      {
        id: "1",
        originLocationCode: params.originCode,
        destinationLocationCode: params.destinationCode,
        departureDateTimeRange: { date: params.departureDate },
      },
      {
        id: "2",
        originLocationCode: params.destinationCode,
        destinationLocationCode: params.originCode,
        departureDateTimeRange: { date: params.returnDate },
      },
    ],
    travelers: [{ id: "1", travelerType: "ADULT" }],
    sources: ["GDS"],
    searchCriteria: {
      maxFlightOffers: 5,
      flightFilters: {
        carrierRestrictions: {
          excludedCarrierCodes: ["6X"],
        },
      },
    },
  };

  const res = await fetch(`${AMADEUS_BASE_URL}/v2/shopping/flight-offers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus flight search failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const offers = json.data || [];
  const carriers: Record<string, string> = json.dictionaries?.carriers || {};

  const outbound: FlightOption[] = [];
  const returnFlights: FlightOption[] = [];

  for (const offer of offers) {
    const price = parseFloat(offer.price?.total || "0");
    const currency = offer.price?.currency || "USD";

    for (let i = 0; i < (offer.itineraries?.length || 0); i++) {
      const itin = offer.itineraries[i];
      const direction: "outbound" | "return" = i === 0 ? "outbound" : "return";
      const totalDuration = parseIsoDuration(itin.duration || "PT0H0M");

      const segments: FlightSegment[] = (itin.segments || []).map(
        (seg: any) => {
          const carrierCode = seg.carrierCode || "";
          return {
            airline: carriers[carrierCode] || carrierCode,
            airlineCode: carrierCode,
            flightNumber: `${carrierCode}${seg.number || ""}`,
            departureAirport: seg.departure?.iataCode || "",
            arrivalAirport: seg.arrival?.iataCode || "",
            departureTime: seg.departure?.at || "",
            arrivalTime: seg.arrival?.at || "",
            durationMinutes: parseIsoDuration(seg.duration || "PT0H0M"),
          };
        },
      );

      const primaryCarrier = segments[0]?.airlineCode || "";

      const option: FlightOption = {
        id: `${offer.id}-${direction}`,
        direction,
        segments,
        totalDurationMinutes: totalDuration,
        stops: segments.length - 1,
        priceTotal: price,
        priceCurrency: currency,
        cabinClass:
          offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin ||
          "ECONOMY",
        airlineLogo: `https://pics.avs.io/200/80/${primaryCarrier}.png`,
        summary: "",
        recommended: false,
      };

      if (direction === "outbound") {
        outbound.push(option);
      } else {
        returnFlights.push(option);
      }
    }
  }

  return { outbound, return: returnFlights };
}

// ── LLM flight ranking ──────────────────────────────────────────────────

/**
 * Asks gpt-4o-mini to pick the top 3 outbound and top 3 return flights,
 * rank them by fit with the itinerary, mark 1 recommended per direction,
 * and write one-liner summaries.
 *
 * Falls back to price-sorted selection on LLM failure.
 */
export async function rankFlightsWithLLM(
  flights: { outbound: FlightOption[]; return: FlightOption[] },
  tripContext: TripContext,
): Promise<{ outbound: FlightOption[]; return: FlightOption[] }> {
  // If we have 3 or fewer in each direction, just use fallback directly
  if (flights.outbound.length <= 3 && flights.return.length <= 3) {
    return fallbackRanking(flights);
  }

  try {
    const prompt = `You are a travel flight advisor. Given the following flight options and trip context, pick the top 3 outbound flights and top 3 return flights.

TRIP CONTEXT:
- Day 1 activities: ${tripContext.firstDayActivities.join(", ") || "None planned yet"}
- Last day activities: ${tripContext.lastDayActivities.join(", ") || "None planned yet"}

OUTBOUND FLIGHTS:
${flights.outbound.map((f, i) => `${i}: ${f.segments.map((s) => `${s.departureAirport}→${s.arrivalAirport} dep ${s.departureTime} arr ${s.arrivalTime}`).join(" | ")} — $${f.priceTotal} — ${f.stops} stops — ${f.totalDurationMinutes}min`).join("\n")}

RETURN FLIGHTS:
${flights.return.map((f, i) => `${i}: ${f.segments.map((s) => `${s.departureAirport}→${s.arrivalAirport} dep ${s.departureTime} arr ${s.arrivalTime}`).join(" | ")} — $${f.priceTotal} — ${f.stops} stops — ${f.totalDurationMinutes}min`).join("\n")}

Rank by fit with the itinerary: outbound arrivals that give time for Day 1 activities, return departures that don't cut the last day short, price, and convenience.

Return JSON with this exact structure:
{
  "outbound": [{ "index": <number>, "recommended": <boolean>, "summary": "<max 80 char one-liner>" }],
  "return": [{ "index": <number>, "recommended": <boolean>, "summary": "<max 80 char one-liner>" }]
}

Pick exactly 3 per direction (or fewer if fewer available). Mark exactly 1 recommended per direction.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const rankedOutbound: FlightOption[] = [];
    for (const pick of parsed.outbound || []) {
      const flight = flights.outbound[pick.index];
      if (flight) {
        rankedOutbound.push({
          ...flight,
          summary: (pick.summary || "").slice(0, 80),
          recommended: !!pick.recommended,
        });
      }
    }

    const rankedReturn: FlightOption[] = [];
    for (const pick of parsed.return || []) {
      const flight = flights.return[pick.index];
      if (flight) {
        rankedReturn.push({
          ...flight,
          summary: (pick.summary || "").slice(0, 80),
          recommended: !!pick.recommended,
        });
      }
    }

    // Ensure at least one recommended per direction
    if (
      rankedOutbound.length > 0 &&
      !rankedOutbound.some((f) => f.recommended)
    ) {
      rankedOutbound[0].recommended = true;
    }
    if (rankedReturn.length > 0 && !rankedReturn.some((f) => f.recommended)) {
      rankedReturn[0].recommended = true;
    }

    return {
      outbound:
        rankedOutbound.length > 0
          ? rankedOutbound
          : fallbackRanking(flights).outbound,
      return:
        rankedReturn.length > 0
          ? rankedReturn
          : fallbackRanking(flights).return,
    };
  } catch (err: any) {
    console.warn(
      `[AmadeusService] LLM ranking failed, using price fallback:`,
      err.message,
    );
    return fallbackRanking(flights);
  }
}

/**
 * Fallback: sort by price ascending, pick cheapest 3, cheapest is recommended.
 */
function fallbackRanking(flights: {
  outbound: FlightOption[];
  return: FlightOption[];
}): { outbound: FlightOption[]; return: FlightOption[] } {
  const rankByPrice = (arr: FlightOption[]): FlightOption[] => {
    const sorted = [...arr].sort((a, b) => a.priceTotal - b.priceTotal);
    return sorted.slice(0, 3).map((f, i) => ({
      ...f,
      recommended: i === 0,
      summary:
        i === 0
          ? "Best price option"
          : i === 1
            ? "Second most affordable"
            : "Third option by price",
    }));
  };

  return {
    outbound: rankByPrice(flights.outbound),
    return: rankByPrice(flights.return),
  };
}

// ── Orchestrator ─────────────────────────────────────────────────────────

/**
 * Main entry point: resolves city names → IATA codes, searches Amadeus,
 * ranks with LLM, returns a complete FlightSearchResult or null.
 */
export async function searchAndRankFlights(
  params: SearchAndRankParams,
): Promise<FlightSearchResult | null> {
  const { originCity, destinationCity, tripContext } = params;

  // Clamp dates to be at least tomorrow — Amadeus rejects past dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const clampDate = (d: string) => (d < tomorrowStr ? tomorrowStr : d);
  const departureDate = clampDate(params.departureDate);
  // Return must be >= departure
  const returnDate =
    clampDate(params.returnDate) < departureDate
      ? departureDate
      : clampDate(params.returnDate);

  // 1. Resolve airport codes
  const [originCode, destCode] = await Promise.all([
    resolveAirportCode(originCity),
    resolveAirportCode(destinationCity),
  ]);

  if (!originCode) {
    console.warn(
      `[AmadeusService] Could not resolve airport for origin "${originCity}"`,
    );
    return null;
  }
  if (!destCode) {
    console.warn(
      `[AmadeusService] Could not resolve airport for destination "${destinationCity}"`,
    );
    return null;
  }

  // 2. Search flights
  const rawFlights = await searchFlights({
    originCode,
    destinationCode: destCode,
    departureDate,
    returnDate,
  });

  if (rawFlights.outbound.length === 0 && rawFlights.return.length === 0) {
    console.warn(
      `[AmadeusService] No flights found for ${originCode}→${destCode}`,
    );
    return null;
  }

  // 3. Rank with LLM
  const ranked = await rankFlightsWithLLM(rawFlights, tripContext);

  // 4. Build result
  const selectedOutbound = ranked.outbound.findIndex((f) => f.recommended);
  const selectedReturn = ranked.return.findIndex((f) => f.recommended);

  return {
    outbound: ranked.outbound,
    return: ranked.return,
    selectedOutbound: selectedOutbound >= 0 ? selectedOutbound : 0,
    selectedReturn: selectedReturn >= 0 ? selectedReturn : 0,
    originCity,
    originAirport: originCode,
    destinationAirport: destCode,
  };
}
