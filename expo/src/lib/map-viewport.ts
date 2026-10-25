import { isValidLatLng, type LatLng } from '@/lib/distance';

const DEFAULT_MAP_RADIUS_MILES = 5;
const MIN_MAP_SPAN = 0.05;
const MAX_LATITUDE_SPAN = 179;
const MAX_LONGITUDE_SPAN = 359;

export type MapViewport = LatLng & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export function safeMapRadiusMiles(radiusMiles: number) {
  return Number.isFinite(radiusMiles) && radiusMiles > 0 ? radiusMiles : DEFAULT_MAP_RADIUS_MILES;
}

export function mapViewportFor(origin: LatLng, radiusMiles: number): MapViewport | null {
  if (!isValidLatLng(origin)) return null;

  const radius = safeMapRadiusMiles(radiusMiles);
  const latitudeDelta = clamp((radius * 2.6) / 69, MIN_MAP_SPAN, MAX_LATITUDE_SPAN);
  const longitudeScale = Math.max(Math.abs(Math.cos((origin.latitude * Math.PI) / 180)), 0.2);
  const longitudeDelta = clamp(latitudeDelta / longitudeScale, MIN_MAP_SPAN, MAX_LONGITUDE_SPAN);

  return {
    latitude: origin.latitude,
    longitude: origin.longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
