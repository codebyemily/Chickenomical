import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery_experimental } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import type { GenericId } from 'convex/values';

import {
  offersBoard,
  recentOffers,
  type ConvexMenuOfferDocument,
  type ConvexOffersBoard,
  type ConvexOffersBoardChain,
  type ConvexOffersBoardStore,
} from '@/data/convex-api';
import type { Chain, CutMix, MenuCategory, MenuOffer, StoreLocation } from '@/data/menu-schema';

export type OfferRecord = {
  offer: MenuOffer;
  location: StoreLocation;
  chain: Chain;
  distance_miles: number | null;
};

const BRAND_ALIASES: Record<string, string[]> = {
  'raising-canes': ['raisingcanes', 'raisingcane'],
  jollibee: ['jollibee'],
  wingstop: ['wingstop'],
  popeyes: ['popeyes'],
  wendys: ['wendys'],
  mcdonalds: ['mcdonalds'],
  'chick-fil-a': ['chickfila'],
  'jack-in-the-box': ['jackinthebox'],
  ihop: ['ihop'],
  'buffalo-wild-wings': ['buffalowildwings'],
  subway: ['subway'],
  kfc: ['kfc'],
  'burger-king': ['burgerking'],
};

export type LiveOffersMetadata = Pick<ConvexOffersBoard, 'query' | 'observed_at' | 'job' | 'offer_count'>;

export type LiveOffersQuery =
  | { status: 'loading' }
  | {
    status: 'success';
    data: OfferRecord[];
    metadata: LiveOffersMetadata;
    isCached: boolean;
    isRefreshing: boolean;
    refreshError?: Error;
    cachedAt?: string;
  }
  | { status: 'error'; error: Error };

export type RecentOffersQuery =
  | { status: 'loading' }
  | {
    status: 'success';
    data: OfferRecord[];
    isCached: boolean;
    isRefreshing: boolean;
    refreshError?: Error;
    cachedAt?: string;
  }
  | { status: 'error'; error: Error };

type RemoteResult<T> =
  | { status: 'pending' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

type CachedValue<T> = { key: string; data: T; savedAt: string };

type PersistentResult<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | {
    status: 'success';
    data: T;
    isCached: boolean;
    isRefreshing: boolean;
    refreshError?: Error;
    cachedAt?: string;
  };

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'chickenomical:offers:v1:';
const MAX_CACHED_JOB_BOARDS = 3;

export function useLiveOffersQuery(jobId?: string): LiveOffersQuery {
  const normalizedJobId = jobId?.trim();
  const result = useQuery_experimental({
    query: offersBoard,
    args: normalizedJobId ? { jobId: normalizedJobId as GenericId<'scrapeJobs'> } : {},
  });
  const cacheKey = `${CACHE_PREFIX}board:${normalizedJobId ?? 'latest'}`;
  const persisted = usePersistentQuery(cacheKey, result, isCachedBoard);

  if (persisted.status !== 'success') return persisted;
  return toLiveOffers(persisted);
}

function toLiveOffers(result: Extract<PersistentResult<ConvexOffersBoard>, { status: 'success' }>): LiveOffersQuery {
  return {
    status: 'success',
    data: flattenBoard(result.data).filter(recordMatchesChain),
    metadata: {
      query: result.data.query,
      observed_at: result.data.observed_at,
      job: result.data.job,
      offer_count: result.data.offer_count,
    },
    isCached: result.isCached,
    isRefreshing: result.isRefreshing,
    refreshError: result.refreshError,
    cachedAt: result.cachedAt,
  };
}

export function useRecentOffersQuery(): RecentOffersQuery {
  const result = useQuery_experimental({
    query: recentOffers,
    args: { limit: 200 },
  });
  const persisted = usePersistentQuery(`${CACHE_PREFIX}recent:200`, result, isCachedRecentOffers);
  if (persisted.status !== 'success') return persisted;
  return {
    status: 'success',
    data: persisted.data.map(toRecentOfferRecord).filter(recordMatchesChain),
    isCached: persisted.isCached,
    isRefreshing: persisted.isRefreshing,
    refreshError: persisted.refreshError,
    cachedAt: persisted.cachedAt,
  };
}

const EMPTY_STORED_METADATA: LiveOffersMetadata = {
  query: {
    address: null,
    latitude: null,
    longitude: null,
    radius_miles: null,
    ordering_channel: 'multi_channel',
  },
  observed_at: null,
  job: null,
  offer_count: 0,
};

/** Latest menu check plus other stored offers, so a search can reach every restaurant coordinate Convex already returned. */
export function useStoredOffersQuery(jobId?: string): LiveOffersQuery {
  const board = useLiveOffersQuery(jobId);
  const recent = useRecentOffersQuery();
  if (board.status !== 'success' && recent.status !== 'success') {
    if (board.status === 'loading' || recent.status === 'loading') return { status: 'loading' };
    return board.status === 'error' ? board : recent;
  }

  const data = mergeOfferRecords(
    board.status === 'success' ? board.data : [],
    recent.status === 'success' ? recent.data : [],
  );
  const metadata = board.status === 'success'
    ? { ...board.metadata, offer_count: data.length }
    : { ...EMPTY_STORED_METADATA, offer_count: data.length };
  return {
    status: 'success',
    data,
    metadata,
    isCached: (board.status === 'success' && board.isCached) || (recent.status === 'success' && recent.isCached),
    isRefreshing: (board.status === 'success' && board.isRefreshing) || (recent.status === 'success' && recent.isRefreshing),
    refreshError: (board.status === 'success' ? board.refreshError : undefined)
      ?? (recent.status === 'success' ? recent.refreshError : undefined),
    cachedAt: (board.status === 'success' ? board.cachedAt : undefined)
      ?? (recent.status === 'success' ? recent.cachedAt : undefined),
  };
}

/** Keep the last valid offers on device so screens can render immediately while Convex reconnects. */
function usePersistentQuery<T>(key: string, remote: RemoteResult<T>, isValid: (value: unknown) => value is T): PersistentResult<T> {
  const [cached, setCached] = useState<CachedValue<T> | null>(null);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const latestRemote = useRef<{ key: string; data: T } | null>(null);

  useEffect(() => {
    let active = true;
    latestRemote.current = null;

    AsyncStorage.getItem(key).then((raw) => {
      if (!active) return;
      // A network response can arrive before local storage. Never let an older disk snapshot win that race.
      if (latestRemote.current?.key === key) {
        setHydratedKey(key);
        return;
      }
      const snapshot = parseCache(raw, isValid);
      setCached(snapshot ? { key, data: snapshot.data, savedAt: snapshot.savedAt } : null);
      setHydratedKey(key);
    }).catch(() => {
      if (active) setHydratedKey(key);
    });

    return () => { active = false; };
  }, [isValid, key]);

  useEffect(() => {
    if (remote.status !== 'success') return;
    if (latestRemote.current?.key === key && latestRemote.current.data === remote.data) return;

    latestRemote.current = { key, data: remote.data };
    const savedAt = new Date().toISOString();
    const snapshot: CacheSnapshot<T> = { version: CACHE_VERSION, savedAt, data: remote.data };
    setCached({ key, data: remote.data, savedAt });
    setHydratedKey(key);
    persistSnapshot(key, snapshot);
  }, [key, remote]);

  if (remote.status === 'success') {
    return { status: 'success', data: remote.data, isCached: false, isRefreshing: false, cachedAt: new Date().toISOString() };
  }

  if (hydratedKey !== key) return { status: 'loading' };
  const saved = cached?.key === key ? cached : null;
  if (saved) {
    return {
      status: 'success',
      data: saved.data,
      isCached: true,
      isRefreshing: remote.status === 'pending',
      refreshError: remote.status === 'error' ? remote.error : undefined,
      cachedAt: saved.savedAt,
    };
  }
  return remote.status === 'error' ? { status: 'error', error: remote.error } : { status: 'loading' };
}

type CacheSnapshot<T> = { version: number; savedAt: string; data: T };

function persistSnapshot<T>(key: string, snapshot: CacheSnapshot<T>) {
  AsyncStorage.setItem(key, JSON.stringify(snapshot)).then(async () => {
    const latestBoardKey = `${CACHE_PREFIX}board:latest`;
    if (!key.startsWith(`${CACHE_PREFIX}board:`) || key === latestBoardKey) return;

    const jobBoardKeys = (await AsyncStorage.getAllKeys()).filter((candidate) =>
      candidate.startsWith(`${CACHE_PREFIX}board:`) && candidate !== latestBoardKey,
    );
    if (jobBoardKeys.length <= MAX_CACHED_JOB_BOARDS) return;

    const savedAtByKey = await Promise.all(jobBoardKeys.map(async (candidate) => {
      const raw = await AsyncStorage.getItem(candidate);
      try {
        const value: unknown = raw ? JSON.parse(raw) : null;
        return { key: candidate, savedAt: isObject(value) && typeof value.savedAt === 'string' ? value.savedAt : '' };
      } catch {
        return { key: candidate, savedAt: '' };
      }
    }));
    savedAtByKey.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    await AsyncStorage.multiRemove(savedAtByKey.slice(MAX_CACHED_JOB_BOARDS).map(({ key: oldKey }) => oldKey));
  }).catch(() => {
    // Storage can be unavailable (for example, private browsing); keep the live response usable.
  });
}

function parseCache<T>(raw: string | null, isValid: (value: unknown) => value is T): CacheSnapshot<T> | null {
  if (!raw) return null;
  try {
    const snapshot: unknown = JSON.parse(raw);
    if (!isObject(snapshot) || snapshot.version !== CACHE_VERSION || typeof snapshot.savedAt !== 'string' || !isValid(snapshot.data)) return null;
    return snapshot as CacheSnapshot<T>;
  } catch {
    return null;
  }
}

function isCachedBoard(value: unknown): value is ConvexOffersBoard {
  return isObject(value)
    && Array.isArray(value.chains)
    && value.chains.every((chain) => isObject(chain)
      && typeof chain.chain_id === 'string'
      && typeof chain.name === 'string'
      && Array.isArray(chain.stores)
      && chain.stores.every((store) => isObject(store)
        && typeof store.id === 'string'
        && Array.isArray(store.offers)
        && store.offers.every(isCachedOffer)));
}

function isCachedRecentOffers(value: unknown): value is ConvexMenuOfferDocument[] {
  return Array.isArray(value) && value.every(isCachedOffer);
}

function isCachedOffer(value: unknown): value is ConvexMenuOfferDocument {
  return isObject(value)
    && typeof value._id === 'string'
    && typeof value.chain_id === 'string'
    && typeof value.location_id === 'string'
    && typeof value.ordering_channel === 'string'
    && typeof value.original_name === 'string'
    && typeof value.observed_at === 'string'
    && Array.isArray(value.includes);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeOfferRecords(primary: OfferRecord[], extra: OfferRecord[]) {
  const byId = new Map<string, OfferRecord>();
  for (const record of extra) byId.set(record.offer.id, record);
  for (const record of primary) byId.set(record.offer.id, record);
  return [...byId.values()];
}

function toRecentOfferRecord(row: ConvexMenuOfferDocument): OfferRecord {
  const chain: ConvexOffersBoardChain = {
    chain_id: row.chain_id,
    name: labelFromId(row.chain_id),
    stores: [],
  };
  const store: ConvexOffersBoardStore = {
    id: row.location_id,
    name: row.store_name,
    address: row.address,
    distance_miles: row.distance_miles,
    pickup: row.ordering_channel.endsWith('_pickup'),
    offers: [row],
    offer_count: 1,
  };
  return toOfferRecord(row, chain, store);
}

function flattenBoard(board: ConvexOffersBoard): OfferRecord[] {
  return board.chains.flatMap((chain) =>
    chain.stores.flatMap((store) =>
      store.offers.map((row) => toOfferRecord(row, chain, store)),
    ),
  );
}

function toOfferRecord(
  row: ConvexMenuOfferDocument,
  chain: ConvexOffersBoardChain,
  store: ConvexOffersBoardStore,
): OfferRecord {
  const offer: MenuOffer = {
    id: row._id,
    chain_id: row.chain_id,
    location_id: row.location_id,
    offer_kind: row.offer_kind,
    category: normalizeCategory(row.category),
    original_name: row.original_name,
    quantity: row.quantity,
    quantity_label: row.quantity_label,
    list_price_cents: row.list_price_cents,
    currency: row.currency,
    prep: row.prep,
    heat: row.heat,
    build: row.build,
    breading: null,
    flavor: null,
    cut_mix: normalizeCutMix(row.cut_mix),
    meat: null,
    protein_pieces: row.protein_pieces,
    protein_category: normalizeCategory(row.protein_category),
    includes: row.includes,
    ordering_channel: row.ordering_channel,
    comparable: row.comparable,
    validation_status: row.validation_status,
    source_provider: row.source_provider,
    source_url: row.source_url,
    source_item_id: row.source_item_id,
    observed_at: row.observed_at,
    product_key: row.product_key,
    offer_key: row.offer_key,
  };

  return {
    offer,
    location: {
      id: row.location_id,
      chain_id: row.chain_id,
      store_name: row.store_name ?? store.name,
      address: row.address ?? store.address,
      latitude: row.latitude,
      longitude: row.longitude,
      pickup: offer.ordering_channel.endsWith('_pickup'),
    },
    chain: { id: row.chain_id, name: chain.name },
    distance_miles: row.distance_miles ?? store.distance_miles,
  };
}

function normalizeCategory(value: string | null): MenuCategory | null {
  return value;
}

function labelFromId(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeCutMix(value: Record<string, number> | null): CutMix | null {
  if (!value) return null;
  const cutMix: CutMix = {};
  for (const key of ['breast', 'thigh', 'drum', 'wing'] as const) {
    const count = value[key];
    if (count != null) cutMix[key] = count;
  }
  return Object.keys(cutMix).length > 0 ? cutMix : null;
}

function recordMatchesChain(record: OfferRecord) {
  const expected = BRAND_ALIASES[record.chain.id] ?? [normalizeBrand(record.chain.id)];
  const haystack = normalizeBrand([
    record.location.store_name,
    record.offer.source_url,
  ].filter(Boolean).join(' '));
  const mentioned = Object.entries(BRAND_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => haystack.includes(alias)))
    .map(([chainId]) => chainId);
  return mentioned.every((chainId) => expected.includes(chainId) || chainId === record.chain.id);
}

function normalizeBrand(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}
