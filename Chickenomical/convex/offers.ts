import { v } from 'convex/values';
import { query } from './_generated/server';
import { marketplaceStoreMatchesChain } from './lib/apifyMarketplace';

const OFFER_VALIDATION_SCAN_LIMIT = 500;

/** Bounded list of recently stored offers, newest first. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const rows = await ctx.db.query('menuOffers').order('desc').take(OFFER_VALIDATION_SCAN_LIMIT);
    return rows.filter(isValidStoredOffer).slice(0, limit);
  },
});

/** All offers for one location, optionally one ordering channel. */
export const byLocation = query({
  args: { location_id: v.string(), ordering_channel: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.ordering_channel) {
      const channel = args.ordering_channel;
      return await ctx.db
        .query('menuOffers')
        .withIndex('by_location_and_channel', (q) => q.eq('location_id', args.location_id).eq('ordering_channel', channel))
        .take(200);
    }
    return await ctx.db
      .query('menuOffers')
      .withIndex('by_location_and_channel', (q) => q.eq('location_id', args.location_id))
      .take(200);
  },
});

/** Count of stored offers grouped by ordering channel — used to confirm ingestion. */
export const channelSummary = query({
  args: {},
  handler: async (ctx) => {
    const offers = await ctx.db.query('menuOffers').take(1000);
    const byChannel: Record<string, number> = {};
    for (const offer of offers) byChannel[offer.ordering_channel] = (byChannel[offer.ordering_channel] ?? 0) + 1;
    return { total: offers.length, byChannel };
  },
});

const CHAIN_NAMES: Record<string, string> = {
  'raising-canes': "Raising Cane's",
  jollibee: 'Jollibee',
  wingstop: 'Wingstop',
  popeyes: 'Popeyes',
  wendys: "Wendy's",
  mcdonalds: "McDonald's",
  'chick-fil-a': 'Chick-fil-A',
  kfc: 'KFC',
};

/**
 * Visualizer board payload: offers from the latest scrape job (or all recent
 * offers if no job exists yet), grouped for the offer-board UI.
 */
export const board = query({
  args: { jobId: v.optional(v.id('scrapeJobs')) },
  handler: async (ctx, args) => {
    const job = args.jobId
      ? await ctx.db.get(args.jobId)
      : (await ctx.db.query('scrapeJobs').order('desc').take(1))[0] ?? null;

    const rows = (await ctx.db.query('menuOffers').order('desc').take(500)).filter(isValidStoredOffer);
    const offers = job?.requested_at
      ? rows.filter((offer) => offer.observed_at >= job.requested_at)
      : rows;

    const chainMap = new Map<string, {
      chain_id: string;
      name: string;
      stores: Map<string, {
        id: string;
        name: string | null;
        address: string | null;
        distance_miles: number | null;
        pickup: boolean;
        offers: typeof offers;
      }>;
    }>();

    for (const offer of offers) {
      if (!chainMap.has(offer.chain_id)) {
        chainMap.set(offer.chain_id, {
          chain_id: offer.chain_id,
          name: CHAIN_NAMES[offer.chain_id] ?? offer.chain_id,
          stores: new Map(),
        });
      }
      const chain = chainMap.get(offer.chain_id)!;
      if (!chain.stores.has(offer.location_id)) {
        chain.stores.set(offer.location_id, {
          id: offer.location_id,
          name: offer.store_name,
          address: offer.address,
          distance_miles: offer.distance_miles,
          pickup: true,
          offers: [],
        });
      }
      chain.stores.get(offer.location_id)!.offers.push(offer);
    }

    const chains = [...chainMap.values()].map((chain) => ({
      chain_id: chain.chain_id,
      name: chain.name,
      stores: [...chain.stores.values()]
        .map((store) => ({
          ...store,
          offer_count: store.offers.length,
        }))
        .sort((a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999)),
    }));

    return {
      query: {
        address: job?.address ?? null,
        latitude: job?.latitude ?? null,
        longitude: job?.longitude ?? null,
        radius_miles: job?.radius_miles ?? null,
        ordering_channel: 'multi_channel',
      },
      observed_at: job?.completed_at ?? job?.requested_at ?? offers[0]?.observed_at ?? null,
      job: job
        ? {
          _id: job._id,
          status: job.status,
          offer_count: job.offer_count,
          error: job.error,
          requested_at: job.requested_at,
          completed_at: job.completed_at,
        }
        : null,
      chains,
      offer_count: offers.length,
    };
  },
});

const MAX_SCAN = 2000;

type EligibleOffer = {
  quantity: number;
  list_price_cents: number;
  original_name: string;
};

/**
 * Rank EVERY comparable offer for a category across all stores and ordering
 * channels by price per piece. This is the cross-store comparison: a store does
 * not need a counterpart on another channel — Wendy's direct, Wendy's DoorDash,
 * Popeyes direct, etc. all compete in one ranked list. Unit price is the
 * unrounded cents/piece ratio; round only for display. Ties break on order
 * total, then distance (per idea.md comparison logic A).
 */
export const rankByUnitPrice = query({
  args: {
    category: v.string(),
    chain_id: v.optional(v.string()),
    ordering_channel: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('menuOffers')
      .withIndex('by_category', (q) => q.eq('category', args.category))
      .take(MAX_SCAN);
    const ranked = rows
      .filter((o) => isEligible(o, args.chain_id, args.ordering_channel))
      .map((o) => ({
        chain_id: o.chain_id,
        location_id: o.location_id,
        store_name: o.store_name,
        address: o.address,
        distance_miles: o.distance_miles,
        ordering_channel: o.ordering_channel,
        original_name: o.original_name,
        quantity: o.quantity as number,
        list_price_cents: o.list_price_cents as number,
        unit_price_cents: (o.list_price_cents as number) / (o.quantity as number),
        source_provider: o.source_provider,
        source_url: o.source_url,
        observed_at: o.observed_at,
        offer_key: o.offer_key,
      }))
      .sort((a, b) =>
        a.unit_price_cents - b.unit_price_cents ||
        a.list_price_cents - b.list_price_cents ||
        (a.distance_miles ?? Number.POSITIVE_INFINITY) - (b.distance_miles ?? Number.POSITIVE_INFINITY));
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    return { category: args.category, count: ranked.length, truncated: rows.length >= MAX_SCAN, offers: ranked.slice(0, limit) };
  },
});

/**
 * Cheapest way to get at least N pieces of a category, computed PER store+channel
 * and then ranked across all of them (comparison logic C in idea.md). For each
 * store+channel it runs an unbounded minimum-cost solver over the available
 * sizes, then sorts stores by the minimum order total, then distance.
 */
export const cheapestForQuantity = query({
  args: {
    category: v.string(),
    pieces: v.number(),
    chain_id: v.optional(v.string()),
    ordering_channel: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const n = Math.trunc(args.pieces);
    if (!(n > 0) || n > 1000) throw new Error('pieces must be a positive integer up to 1000.');
    const rows = await ctx.db
      .query('menuOffers')
      .withIndex('by_category', (q) => q.eq('category', args.category))
      .take(MAX_SCAN);

    // Group eligible offers by physical store AND ordering channel — a store's
    // direct menu and its DoorDash menu are solved independently.
    const groups = new Map<string, { meta: (typeof rows)[number]; offers: EligibleOffer[] }>();
    for (const o of rows) {
      if (!isEligible(o, args.chain_id, args.ordering_channel)) continue;
      const key = `${o.location_id}|${o.ordering_channel}`;
      if (!groups.has(key)) groups.set(key, { meta: o, offers: [] });
      groups.get(key)!.offers.push({ quantity: o.quantity as number, list_price_cents: o.list_price_cents as number, original_name: o.original_name });
    }

    const results = [];
    for (const { meta, offers } of groups.values()) {
      const solved = cheapestCombination(offers, n);
      if (!solved) continue;
      results.push({
        chain_id: meta.chain_id,
        location_id: meta.location_id,
        store_name: meta.store_name,
        address: meta.address,
        distance_miles: meta.distance_miles,
        ordering_channel: meta.ordering_channel,
        source_provider: meta.source_provider,
        total_cents: solved.total_cents,
        pieces: solved.pieces,
        excess_pieces: solved.pieces - n,
        combination: solved.items,
      });
    }
    results.sort((a, b) =>
      a.total_cents - b.total_cents ||
      (a.distance_miles ?? Number.POSITIVE_INFINITY) - (b.distance_miles ?? Number.POSITIVE_INFINITY));
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    return { category: args.category, pieces: n, count: results.length, truncated: rows.length >= MAX_SCAN, stores: results.slice(0, limit) };
  },
});

function isEligible(o: { comparable: boolean; quantity: number | null; list_price_cents: number | null; chain_id: string; ordering_channel: string }, chainId?: string, channel?: string) {
  return o.comparable
    && o.quantity != null && o.quantity > 0
    && o.list_price_cents != null && o.list_price_cents >= 0
    && (!chainId || o.chain_id === chainId)
    && (!channel || o.ordering_channel === channel);
}

function isValidStoredOffer(offer: { chain_id: string; store_name: string | null; source_url: string }) {
  return marketplaceStoreMatchesChain(offer.chain_id, offer.store_name, offer.source_url);
}

/**
 * Unbounded minimum-cost solver: the cheapest combination of the given sizes
 * whose combined piece count is AT LEAST n. dp[p] is the min cost to get >= p
 * pieces; overshoot is folded via max(0, p - q). Reconstructs the chosen sizes
 * and reports the actual piece total (so callers can show excess pieces).
 */
function cheapestCombination(offers: EligibleOffer[], n: number) {
  if (offers.length === 0) return null;
  const cost = new Array<number>(n + 1).fill(Number.POSITIVE_INFINITY);
  const pick = new Array<number>(n + 1).fill(-1);
  cost[0] = 0;
  for (let p = 1; p <= n; p += 1) {
    for (let i = 0; i < offers.length; i += 1) {
      const prev = Math.max(0, p - offers[i].quantity);
      const candidate = cost[prev] + offers[i].list_price_cents;
      if (candidate < cost[p]) { cost[p] = candidate; pick[p] = i; }
    }
  }
  if (!Number.isFinite(cost[n])) return null;

  const counts = new Map<number, number>();
  let pieces = 0;
  let p = n;
  while (p > 0) {
    const i = pick[p];
    if (i < 0) break;
    counts.set(i, (counts.get(i) ?? 0) + 1);
    pieces += offers[i].quantity;
    p = Math.max(0, p - offers[i].quantity);
  }
  const items = [...counts.entries()].map(([i, count]) => ({
    original_name: offers[i].original_name,
    quantity: offers[i].quantity,
    unit_count: count,
    line_total_cents: offers[i].list_price_cents * count,
  }));
  return { total_cents: cost[n], pieces, items };
}
