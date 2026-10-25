import type { OfferRecord } from '@/data/live-offers';

/** Keep this in step with Chickenomical/convex/lib/geo.ts. */
const EARTH_RADIUS_MILES = 3958.8;

export type LatLng = { latitude: number; longitude: number };

const MOODS: { id: string; terms: string[] }[] = [
  { id: 'chicken-boneless-wing', terms: ['boneless'] },
  { id: 'chicken-wing', terms: ['wing', 'wings'] },
  { id: 'chicken-nugget', terms: ['nugget', 'nuggets'] },
  { id: 'chicken-tender', terms: ['tender', 'tenders'] },
  { id: 'chicken-bucket', terms: ['bucket', 'buckets', 'bone-in', 'bone in'] },
  { id: 'chicken-sandwich', terms: ['sandwich', 'sandwiches'] },
  { id: 'chicken-slider', terms: ['slider', 'sliders'] },
  { id: 'chicken-wrap', terms: ['wrap', 'wraps'] },
  { id: 'chicken-fry', terms: ['fries', 'fry'] },
];

export function milesBetween(from: LatLng, to: LatLng) {
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function straightLineMiles(from: LatLng, to: LatLng) {
  return Math.round(milesBetween(from, to) * 100) / 100;
}

export function withStraightLineDistance(records: OfferRecord[], origin: LatLng | null) {
  if (!origin) return records;
  return records.map((record) => {
    const latitude = record.location.latitude;
    const longitude = record.location.longitude;
    if (latitude == null || longitude == null) return { ...record, distance_miles: null };
    return {
      ...record,
      distance_miles: straightLineMiles(origin, { latitude, longitude }),
    };
  });
}

export function moodCategory(mood: string) {
  const text = mood.toLocaleLowerCase();
  return MOODS.find((moodOption) => moodOption.terms.some((term) => hasTerm(text, term)))?.id ?? null;
}

export function matchesMood(record: OfferRecord, mood: string) {
  const text = mood.trim().toLocaleLowerCase();
  if (!text) return true;
  const category = moodCategory(text);
  if (category === 'chicken-wing') {
    return record.offer.category === 'chicken-wing' || record.offer.category === 'chicken-boneless-wing';
  }
  if (category) return record.offer.category === category;
  const tokens = text.split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  const haystack = `${record.offer.original_name} ${record.offer.category ?? ''} ${record.chain.name}`.toLocaleLowerCase();
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

const placeCache = new Map<string, LatLng & { label: string }>();
let deviceCityRequest: Promise<string | null> | null = null;

export function placeKey(origin: LatLng, radiusMiles: number) {
  return `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}|${radiusMiles.toFixed(1)}`;
}

export function parseCoordinates(value: string): LatLng | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export async function resolvePlace(address: string): Promise<LatLng & { label: string }> {
  const typed = address.trim();
  const coordinates = parseCoordinates(typed);
  if (coordinates) return { ...coordinates, label: typed };
  const cacheKey = typed.toLocaleLowerCase();
  const cached = placeCache.get(cacheKey);
  if (cached) return cached;
  let response: Response;
  try {
    response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(typed)}&format=jsonv2&limit=1&addressdetails=1`);
  } catch {
    throw new Error('That place could not be looked up. Use your location or try a city name.');
  }
  if (!response.ok) throw new Error('That place could not be looked up. Use your location or try a city name.');
  const body: { lat?: string; lon?: string; name?: string; address?: { city?: string; state?: string } }[] = await response.json();
  const feature = body[0];
  const latitude = feature?.lat == null ? null : Number(feature.lat);
  const longitude = feature?.lon == null ? null : Number(feature.lon);
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`No coordinates found for "${typed}".`);
  }
  const label = [feature?.name, feature?.address?.city, feature?.address?.state].filter((part, index, parts) => Boolean(part) && parts.indexOf(part) === index).join(', ') || typed;
  const resolved = { latitude, longitude, label };
  placeCache.set(cacheKey, resolved);
  return resolved;
}

export function resolveDeviceCity(): Promise<string | null> {
  if (deviceCityRequest) return deviceCityRequest;

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch('https://cf.quacksire.dev/city', { signal: controller.signal });
      if (!response.ok) return null;
      const city = (await response.text()).trim();
      return city.length > 0 && city.length <= 120 ? city : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();
  deviceCityRequest = request;
  void request.then((city) => {
    if (city === null && deviceCityRequest === request) deviceCityRequest = null;
  });

  return request;
}

export function shortPlace(place: string) {
  const parts = place.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
  return place.trim() || 'this area';
}

function hasTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(' ', '[^a-z0-9]+');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(text);
}

function radians(degrees: number) {
  return degrees * Math.PI / 180;
}
