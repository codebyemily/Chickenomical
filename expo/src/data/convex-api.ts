import { makeFunctionReference } from 'convex/server';
import type { GenericId } from 'convex/values';

export type ConvexMenuOfferDocument = {
  _id: GenericId<'menuOffers'>;
  _creationTime: number;
  address: string | null;
  build: string | null;
  category: string | null;
  chain_id: string;
  comparable: boolean;
  currency: string;
  cut_mix: Record<string, number> | null;
  distance_miles: number | null;
  heat: string | null;
  includes: string[];
  latitude: number | null;
  list_price_cents: number | null;
  location_id: string;
  longitude: number | null;
  observed_at: string;
  offer_key: string;
  offer_kind: string;
  ordering_channel: string;
  original_name: string;
  prep: string | null;
  product_key: string;
  protein_category: string | null;
  protein_pieces: number | null;
  quantity: number | null;
  quantity_label: string | null;
  source_item_id: string | null;
  source_provider: string;
  source_url: string;
  store_name: string | null;
  validation_status: string;
};

export type ConvexOffersBoardQuery = {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_miles: number | null;
  ordering_channel: string;
};

export type ConvexScrapeJobMetadata = {
  _id: GenericId<'scrapeJobs'>;
  status: string;
  offer_count: number;
  error: string | null;
  requested_at: string;
  completed_at: string | null;
};

export type ConvexOffersBoardStore = {
  id: string;
  name: string | null;
  address: string | null;
  distance_miles: number | null;
  pickup: boolean;
  offers: ConvexMenuOfferDocument[];
  offer_count: number;
};

export type ConvexOffersBoardChain = {
  chain_id: string;
  name: string;
  stores: ConvexOffersBoardStore[];
};

export type ConvexOffersBoard = {
  query: ConvexOffersBoardQuery;
  observed_at: string | null;
  job: ConvexScrapeJobMetadata | null;
  chains: ConvexOffersBoardChain[];
  offer_count: number;
};

export const offersBoard = makeFunctionReference<
  'query',
  { jobId?: GenericId<'scrapeJobs'> },
  ConvexOffersBoard
>('offers:board');

export const recentOffers = makeFunctionReference<
  'query',
  { limit?: number },
  ConvexMenuOfferDocument[]
>('offers:listRecent');
