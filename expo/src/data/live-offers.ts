import { useQuery_experimental } from 'convex/react';
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
  subway: ['subway'],
  kfc: ['kfc'],
  'burger-king': ['burgerking'],
};

export type LiveOffersMetadata = Pick<ConvexOffersBoard, 'query' | 'observed_at' | 'job' | 'offer_count'>;

export type LiveOffersQuery =
  | { status: 'loading' }
  | { status: 'success'; data: OfferRecord[]; metadata: LiveOffersMetadata }
  | { status: 'error'; error: Error };

export type RecentOffersQuery =
  | { status: 'loading' }
  | { status: 'success'; data: OfferRecord[] }
  | { status: 'error'; error: Error };

export function useLiveOffersQuery(jobId?: string): LiveOffersQuery {
  const normalizedJobId = jobId?.trim();
  const result = useQuery_experimental({
    query: offersBoard,
    args: normalizedJobId ? { jobId: normalizedJobId as GenericId<'scrapeJobs'> } : {},
  });

  return toLiveOffers(result);
}

function toLiveOffers(result: { status: 'pending' } | { status: 'success'; data: ConvexOffersBoard } | { status: 'error'; error: Error }): LiveOffersQuery {
  if (result.status === 'pending') return { status: 'loading' };
  if (result.status === 'error') return { status: 'error', error: result.error };

  return {
    status: 'success',
    data: flattenBoard(result.data).filter(recordMatchesChain),
    metadata: {
      query: result.data.query,
      observed_at: result.data.observed_at,
      job: result.data.job,
      offer_count: result.data.offer_count,
    },
  };
}

export function useRecentOffersQuery(): RecentOffersQuery {
  const result = useQuery_experimental({
    query: recentOffers,
    args: { limit: 200 },
  });
  if (result.status === 'pending') return { status: 'loading' };
  if (result.status === 'error') return { status: 'error', error: result.error };
  return { status: 'success', data: result.data.map(toRecentOfferRecord).filter(recordMatchesChain) };
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
export function useStoredOffersQuery(): LiveOffersQuery {
  const board = useLiveOffersQuery();
  const recent = useRecentOffersQuery();
  if (board.status === 'loading' && recent.status !== 'success') return { status: 'loading' };
  if (board.status === 'error' && recent.status !== 'success') return { status: 'error', error: board.error };

  const data = mergeOfferRecords(
    board.status === 'success' ? board.data : [],
    recent.status === 'success' ? recent.data : [],
  );
  const metadata = board.status === 'success'
    ? { ...board.metadata, offer_count: data.length }
    : { ...EMPTY_STORED_METADATA, offer_count: data.length };
  return { status: 'success', data, metadata };
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
