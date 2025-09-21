import { promises as fs } from 'node:fs';
import path from 'node:path';

import fetch from 'node-fetch';

import { Store, StoreDataset } from '../lib/types.js';

const GOOGLE_TEXT_SEARCH_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const GOOGLE_DETAILS_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json';
const OUTPUT_PATH = process.env.STORE_DATA_FILE || path.resolve(process.cwd(), '../data/stores.json');

const SEARCH_QUERIES = [
  'grocery store in Red Deer, Alberta',
  'supermarket in Red Deer County, Alberta',
  'ethnic grocery in Red Deer, Alberta',
  'asian market in Red Deer, Alberta',
  'butcher in Red Deer, Alberta',
  'bakery in Red Deer, Alberta',
  'discount grocery in Red Deer, Alberta',
  'health food store in Red Deer, Alberta',
  'grocery store in Blackfalds, Alberta',
  'grocery store in Lacombe, Alberta',
  'grocery store in Sylvan Lake, Alberta',
  'grocery store in Penhold, Alberta',
  'grocery store in Innisfail, Alberta',
  'grocery store in Bowden, Alberta',
  'grocery store in Springbrook, Alberta',
];

const RED_DEER_LOCATION = { lat: 52.268157, lng: -113.811573 };
const SEARCH_RADIUS_METERS = Number(process.env.GOOGLE_MAPS_SEARCH_RADIUS_METERS || 35000);

interface GooglePlaceSummary {
  place_id: string;
  name: string;
  business_status?: string;
}

interface GooglePlaceDetailsResponse {
  result?: {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
    };
    types?: string[];
    formatted_phone_number?: string;
    international_phone_number?: string;
    opening_hours?: { weekday_text?: string[] };
    current_opening_hours?: { weekday_text?: string[] };
    website?: string;
    delivery?: boolean;
    takeout?: boolean;
    wheelchair_accessible_entrance?: boolean;
    rating?: number;
    user_ratings_total?: number;
    url?: string;
    business_status?: string;
  };
  status: string;
  error_message?: string;
}

interface GoogleTextSearchResponse {
  results: GooglePlaceSummary[];
  status: string;
  next_page_token?: string;
  error_message?: string;
}

const categoryMappings: Record<string, string> = {
  grocery_or_supermarket: 'SUPERMARKET',
  supermarket: 'SUPERMARKET',
  department_store: 'WAREHOUSE',
  shopping_mall: 'WAREHOUSE',
  wholesale_store: 'WAREHOUSE',
  convenience_store: 'CONVENIENCE',
  bakery: 'BAKERY',
  butcher_shop: 'BUTCHER',
  meal_takeaway: 'PREPARED_FOOD',
  meal_delivery: 'PREPARED_FOOD',
  pharmacy: 'PHARMACY_GROCERY',
  drugstore: 'PHARMACY_GROCERY',
  health_food_store: 'HEALTH_FOOD',
  liquor_store: 'LIQUOR',
  store: 'GENERAL_RETAIL',
  food: 'FOOD_SPECIALTY',
};

const dedupeCategories = (types: string[]): string[] => {
  const categories = new Set<string>();
  types.forEach((type) => {
    const mapped = categoryMappings[type];
    if (mapped) {
      categories.add(mapped);
    }
  });

  if (categories.size === 0) {
    categories.add('UNCLASSIFIED');
  }

  return Array.from(categories).sort();
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchAllPlacesForQuery = async (query: string, apiKey: string): Promise<GooglePlaceSummary[]> => {
  const accumulated: GooglePlaceSummary[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(GOOGLE_TEXT_SEARCH_ENDPOINT);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('region', 'ca');
    url.searchParams.set('location', `${RED_DEER_LOCATION.lat},${RED_DEER_LOCATION.lng}`);
    url.searchParams.set('radius', String(SEARCH_RADIUS_METERS));
    if (pageToken) {
      url.searchParams.set('pagetoken', pageToken);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places text search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GoogleTextSearchResponse;

    if (payload.status === 'ZERO_RESULTS') {
      return accumulated;
    }

    if (payload.status !== 'OK' && payload.status !== 'INVALID_REQUEST') {
      throw new Error(`Google Places text search error: ${payload.status} ${payload.error_message ?? ''}`);
    }

    if (payload.results) {
      accumulated.push(
        ...payload.results.map((result) => ({
          place_id: result.place_id,
          name: result.name,
          business_status: result.business_status,
        })),
      );
    }

    pageToken = payload.next_page_token;
    if (pageToken) {
      // API requires short delay before using next page token
      await sleep(2000);
    }
  } while (pageToken);

  return accumulated;
};

const fetchPlaceDetails = async (placeId: string, apiKey: string): Promise<Store | null> => {
  const url = new URL(GOOGLE_DETAILS_ENDPOINT);
  url.searchParams.set('key', apiKey);
  url.searchParams.set(
    'fields',
    [
      'place_id',
      'name',
      'formatted_address',
      'geometry/location',
      'types',
      'formatted_phone_number',
      'international_phone_number',
      'opening_hours/weekday_text',
      'current_opening_hours/weekday_text',
      'website',
      'delivery',
      'takeout',
      'wheelchair_accessible_entrance',
      'rating',
      'user_ratings_total',
      'url',
      'business_status',
    ].join(','),
  );
  url.searchParams.set('place_id', placeId);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Place details failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GooglePlaceDetailsResponse;
  if (payload.status !== 'OK' || !payload.result) {
    console.warn(`Skipping place ${placeId}: ${payload.status} ${payload.error_message ?? ''}`);
    return null;
  }

  const result = payload.result;
  const types = result.types ?? [];
  const categories = dedupeCategories(types);

  const store: Store = {
    placeId: result.place_id,
    name: result.name,
    formattedAddress: result.formatted_address,
    location: {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    },
    googleMapsUri: result.url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.name)}&query_place_id=${result.place_id}`,
    businessStatus: result.business_status,
    phoneNumber: result.formatted_phone_number,
    internationalPhoneNumber: result.international_phone_number,
    website: result.website,
    types,
    categories,
    rating: result.rating,
    userRatingsTotal: result.user_ratings_total,
    openingHours: {
      weekdayText: result.opening_hours?.weekday_text,
      currentOpeningHours: result.current_opening_hours?.weekday_text,
    },
    delivery: result.delivery,
    takeout: result.takeout,
    wheelchairAccessibleEntrance: result.wheelchair_accessible_entrance,
    lastSyncedAt: new Date().toISOString(),
  };

  return store;
};

const main = async () => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY environment variable is required.');
    process.exitCode = 1;
    return;
  }

  console.log('Fetching store candidates from Google Places...');
  const summaries = await Promise.all(
    SEARCH_QUERIES.map(async (query) => ({ query, results: await fetchAllPlacesForQuery(query, apiKey) })),
  );

  const uniquePlaceIds = new Map<string, { name: string; business_status?: string }>();
  for (const { results } of summaries) {
    for (const result of results) {
      if (!uniquePlaceIds.has(result.place_id)) {
        uniquePlaceIds.set(result.place_id, { name: result.name, business_status: result.business_status });
      }
    }
  }

  console.log(`Discovered ${uniquePlaceIds.size} unique places. Fetching details...`);
  const stores: Store[] = [];
  for (const [placeId] of uniquePlaceIds) {
    const store = await fetchPlaceDetails(placeId, apiKey);
    if (store) {
      stores.push(store);
    }
  }

  stores.sort((a, b) => a.name.localeCompare(b.name));

  const dataset: StoreDataset = {
    stores,
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceQueries: SEARCH_QUERIES,
    },
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(dataset, null, 2));

  console.log(`Stored ${stores.length} stores to ${OUTPUT_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
