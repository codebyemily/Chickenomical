import { Linking, Platform } from 'react-native';

import type { MenuOffer, StoreLocation } from '@/data/menu-schema';

type OrderOffer = Pick<MenuOffer, 'chain_id' | 'ordering_channel' | 'source_url'>;
type OrderLocation = Pick<StoreLocation, 'address' | 'latitude' | 'longitude' | 'store_name'>;
type WingstopRestaurant = Record<string, unknown>;

const WINGSTOP_API = 'https://api.wingstop.com';
const WINGSTOP_LOCATIONS = 'https://locations.wingstop.com/us';
const wingstopOrderUrlCache = new Map<string, Promise<string>>();

export function canOpenOrderLink(offer: Pick<OrderOffer, 'chain_id' | 'source_url'>) {
  return Boolean(httpUrl(offer.source_url));
}

export function isWingstopApiMenuUrl(chainId: string, sourceUrl: string) {
  if (chainId !== 'wingstop') return false;
  const url = httpUrl(sourceUrl);
  return url?.hostname === 'api.wingstop.com'
    && /^\/restaurants\/[^/]+\/menu\/?$/.test(url.pathname);
}

export function openOrderLink(offer: OrderOffer, location: OrderLocation) {
  const sourceUrl = httpUrl(offer.source_url);
  if (!sourceUrl) return;

  if (!isWingstopApiMenuUrl(offer.chain_id, offer.source_url)) {
    openExternalUrl(sourceUrl.toString());
    return;
  }

  if (Platform.OS === 'web') {
    // Open synchronously from the user gesture so browsers don't block the later redirect.
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    void resolveWingstopOrderUrl(offer, location).then((orderUrl) => {
      if (popup && !popup.closed) popup.location.replace(orderUrl);
      else if (!popup) window.location.assign(orderUrl);
    });
    return;
  }

  void resolveWingstopOrderUrl(offer, location).then((orderUrl) => {
    void Linking.openURL(orderUrl);
  });
}

function openExternalUrl(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

function resolveWingstopOrderUrl(offer: OrderOffer, location: OrderLocation) {
  const cacheKey = [offer.source_url, location.address, location.latitude, location.longitude].join('|');
  const cached = wingstopOrderUrlCache.get(cacheKey);
  if (cached) return cached;

  const resolving = lookupWingstopOrderUrl(offer, location);
  wingstopOrderUrlCache.set(cacheKey, resolving);
  return resolving;
}

async function lookupWingstopOrderUrl(offer: OrderOffer, location: OrderLocation) {
  const sourceUrl = httpUrl(offer.source_url);
  const restaurantId = sourceUrl?.pathname.match(/^\/restaurants\/([^/]+)\/menu\/?$/)?.[1];

  if (restaurantId && /^\d+$/.test(restaurantId)) {
    const restaurant = await fetchWingstopRestaurant(`${WINGSTOP_API}/restaurants/${restaurantId}`);
    const slug = restaurantSlug(restaurant);
    if (slug) return wingstopMenuUrl(slug, offer.ordering_channel);
  }

  const restaurant = await findWingstopRestaurant(location);
  const slug = restaurantSlug(restaurant);
  return slug
    ? wingstopMenuUrl(slug, offer.ordering_channel)
    : WINGSTOP_LOCATIONS;
}

async function findWingstopRestaurant(location: OrderLocation) {
  if (location.latitude == null || location.longitude == null
      || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return null;
  }

  const url = new URL(`${WINGSTOP_API}/restaurants/near`);
  url.searchParams.set('lat', String(location.latitude));
  url.searchParams.set('long', String(location.longitude));
  url.searchParams.set('radius', '5');
  url.searchParams.set('limit', '50');

  const result = await fetchJson(url.toString());
  if (!isRecord(result) || !Array.isArray(result.restaurants)) return null;
  return result.restaurants.find((candidate): candidate is WingstopRestaurant =>
    isRecord(candidate) && matchesLocation(candidate, location)) ?? null;
}

async function fetchWingstopRestaurant(url: string) {
  const result = await fetchJson(url);
  return isRecord(result) ? result : null;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function matchesLocation(restaurant: WingstopRestaurant, location: OrderLocation) {
  const expectedStreet = streetKey(location.address);
  const candidateStreet = streetKey(stringField(restaurant, 'streetaddress'));
  const expectedZip = zipCode(location.address);
  const candidateZip = stringField(restaurant, 'zip');

  if (expectedStreet && candidateStreet) {
    return expectedStreet === candidateStreet && (!expectedZip || !candidateZip || expectedZip === candidateZip);
  }

  const latitude = numberField(restaurant, 'latitude');
  const longitude = numberField(restaurant, 'longitude');
  return location.latitude != null && location.longitude != null
    && latitude != null && longitude != null
    && distanceMiles(location.latitude, location.longitude, latitude, longitude) <= 0.1;
}

function restaurantSlug(restaurant: WingstopRestaurant | null) {
  const slug = stringField(restaurant, 'slug');
  return slug && /^wingstop-[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) ? slug : null;
}

function wingstopMenuUrl(slug: string, orderingChannel: string) {
  const handoffMode = orderingChannel.endsWith('_delivery') ? 'delivery' : 'carryout';
  return `https://www.wingstop.com/location/${encodeURIComponent(slug)}/menu?handoffmode=${handoffMode}`;
}

function httpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function stringField(value: WingstopRestaurant | null, key: string) {
  const field = value?.[key];
  return typeof field === 'string' && field.trim() ? field.trim() : null;
}

function numberField(value: WingstopRestaurant, key: string) {
  const raw = value[key];
  if (raw == null || raw === '') return null;
  const field = Number(raw);
  return Number.isFinite(field) ? field : null;
}

function streetKey(value: string | null) {
  const street = value?.split(',')[0]?.toLowerCase() ?? '';
  return street
    .replace(/\b(?:suite|ste|unit|#)\s*[a-z0-9-]+\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function zipCode(value: string | null) {
  return value?.match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0, 5) ?? null;
}

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
