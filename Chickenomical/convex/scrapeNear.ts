import { v } from "convex/values";
import { internal } from "./_generated/api";
import { env, internalAction, internalMutation, query } from "./_generated/server";
import { offerValidator } from "./schema";
import {
  doorDashActorId,
  marketplaceStoreMatchesChain,
  normalizeMarketplaceDualChannel,
  normalizeMarketplaceItems,
  runApifyActor,
  storeAddressFromRecord,
  storeCoordsFromRecord,
  tieLocationId,
  uberEatsActorId,
  type DirectStoreRef,
} from "./lib/apifyMarketplace";
import {
  CHAIN_NAMES,
  SCRAPE_CHAINS,
  resolveOrigin,
  scrapeChains,
  type Origin,
  type ScrapeChainId,
  type Store,
} from "./lib/takeout";
import type { MenuOffer } from "./lib/offerShape";

/** Latest scrape job for the visualizer status strip. */
export const latestJob = query({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("scrapeJobs").order("desc").take(5);
    return jobs[0] ?? null;
  },
});

export const jobById = query({
  args: { jobId: v.id("scrapeJobs") },
  handler: async (ctx, args) => ctx.db.get(args.jobId),
});

export const startJob = internalMutation({
  args: {
    address: v.string(),
    latitude: v.union(v.number(), v.null()),
    longitude: v.union(v.number(), v.null()),
    radius_miles: v.number(),
    requested_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scrapeJobs", {
      provider: "bright_data",
      status: "running",
      requested_at: args.requested_at,
      completed_at: null,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      radius_miles: args.radius_miles,
      offer_count: 0,
      error: null,
    });
  },
});

export const patchJobOrigin = internalMutation({
  args: {
    jobId: v.id("scrapeJobs"),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
    });
  },
});

/** Upsert offers while the job is still running (Bright Data primary results). */
export const upsertOffers = internalMutation({
  args: {
    jobId: v.id("scrapeJobs"),
    offers: v.array(offerValidator),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    for (const offer of args.offers) {
      const existing = await ctx.db
        .query("menuOffers")
        .withIndex("by_offer_key", (q) => q.eq("offer_key", offer.offer_key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, offer);
        updated += 1;
      } else {
        await ctx.db.insert("menuOffers", offer);
        inserted += 1;
      }
    }
    const job = await ctx.db.get(args.jobId);
    if (job && job.status === "running") {
      await ctx.db.patch(args.jobId, { offer_count: args.offers.length });
    }
    return { inserted, updated };
  },
});

export const completeJob = internalMutation({
  args: {
    jobId: v.id("scrapeJobs"),
    offers: v.array(offerValidator),
    error: v.union(v.string(), v.null()),
    warning: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const completedAt = new Date().toISOString();
    if (args.error) {
      await ctx.db.patch(args.jobId, {
        status: "failed",
        completed_at: completedAt,
        error: args.error,
        offer_count: 0,
      });
      return { jobId: args.jobId, inserted: 0, updated: 0, error: args.error };
    }

    let inserted = 0;
    let updated = 0;
    for (const offer of args.offers) {
      const existing = await ctx.db
        .query("menuOffers")
        .withIndex("by_offer_key", (q) => q.eq("offer_key", offer.offer_key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, offer);
        updated += 1;
      } else {
        await ctx.db.insert("menuOffers", offer);
        inserted += 1;
      }
    }

    await ctx.db.patch(args.jobId, {
      status: "succeeded",
      completed_at: completedAt,
      offer_count: args.offers.length,
      // Reuse error field for non-fatal marketplace warnings (no schema change).
      error: args.warning ?? null,
    });

    return { jobId: args.jobId, inserted, updated };
  },
});

export const run = internalAction({
  args: {
    jobId: v.id("scrapeJobs"),
    address: v.string(),
    latitude: v.union(v.number(), v.null()),
    longitude: v.union(v.number(), v.null()),
    radiusMiles: v.number(),
    limit: v.number(),
    chains: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{ jobId: string; inserted: number; updated: number; error?: string | null }> => {
    const observedAt = new Date().toISOString();
    const marketplaceNotes: string[] = [];
    try {
      const origin: Origin = args.latitude !== null && args.longitude !== null
        ? { latitude: args.latitude, longitude: args.longitude, label: args.address }
        : await resolveOrigin(args.address);
      await ctx.runMutation(internal.scrapeNear.patchJobOrigin, {
        jobId: args.jobId,
        address: origin.label,
        latitude: origin.latitude,
        longitude: origin.longitude,
      });

      const selected = (args.chains.length ? args.chains : [...SCRAPE_CHAINS])
        .filter((id): id is ScrapeChainId => (SCRAPE_CHAINS as readonly string[]).includes(id));

      // ——— Phase 1: Bright Data first-party pickup (primary, required) ———
      const { results, offers: directOffers } = await scrapeChains(
        origin,
        { radiusMiles: args.radiusMiles, limit: args.limit, chains: selected },
        observedAt,
      );

      for (const result of results) {
        if (result.error) marketplaceNotes.push(`Direct ${result.chain_id}: ${result.error}`);
        for (const store of result.stores) {
          if (store.error) marketplaceNotes.push(`Direct ${result.chain_id} ${store.id}: ${store.error}`);
        }
      }

      if (directOffers.length === 0) {
        return await ctx.runMutation(internal.scrapeNear.completeJob, {
          jobId: args.jobId,
          offers: [],
          error: `No first-party pickup offers from Bright Data — skipping DoorDash/Uber Eats. ${marketplaceNotes.join("; ")}`.slice(0, 500),
        });
      }

      // Surface direct prices immediately while marketplace scrapes run.
      await ctx.runMutation(internal.scrapeNear.upsertOffers, {
        jobId: args.jobId,
        offers: directOffers,
      });

      // Only compare marketplace for chains that produced direct pickup offers.
      const chainsWithDirect = results
        .filter((result) => result.stores.some((store) => store.offer_count > 0))
        .map((result) => result.chain_id);

      const directByChain = new Map<ScrapeChainId, DirectStoreRef[]>();
      for (const result of results) {
        if (!chainsWithDirect.includes(result.chain_id)) continue;
        directByChain.set(
          result.chain_id,
          result.stores
            .filter((store) => store.offer_count > 0)
            .map((store: Store) => ({ id: store.id, address: store.address })),
        );
      }

      // ——— Phase 2: Apify secondary (parallel per chain with direct data) ———
      const marketplaceOffers: MenuOffer[] = [];
      const apifyStatus = apifyConfigStatus();
      if (!apifyStatus.ok) {
        marketplaceNotes.push(apifyStatus.reason);
      } else if (chainsWithDirect.length === 0) {
        marketplaceNotes.push("No chains with direct offers — skipped Apify.");
      } else {
        // Apify free/starter caps concurrent actor runs (~5). Run chains
        // sequentially; within each chain DD + UE (pickup/delivery) still parallelize
        // → at most 3 concurrent runs (1 DD + 2 UE dining modes).
        for (const chainId of chainsWithDirect) {
          const directStores = directByChain.get(chainId) ?? [];
          const searchAddress = directStores[0]?.address ?? origin.label;
          const notes: string[] = [];
          const [ddOffers, ueOffers] = await Promise.all([
            scrapeDoorDashNear({
              address: searchAddress,
              chainId,
              limit: args.limit,
              directStores,
              observedAt,
            }).catch((error) => {
              notes.push(`DoorDash ${chainId}: ${errorMessage(error)}`);
              return [] as MenuOffer[];
            }),
            scrapeUberEatsNear({
              origin,
              searchAddress,
              chainId,
              limit: args.limit,
              directStores,
              observedAt,
            }).catch((error) => {
              notes.push(`Uber Eats ${chainId}: ${errorMessage(error)}`);
              return [] as MenuOffer[];
            }),
          ]);
          if (ddOffers.length === 0 && !notes.some((n) => n.startsWith(`DoorDash ${chainId}`))) {
            notes.push(`DoorDash ${chainId}: 0 chicken offers`);
          }
          if (ueOffers.length === 0 && !notes.some((n) => n.startsWith(`Uber Eats ${chainId}`))) {
            notes.push(`Uber Eats ${chainId}: 0 chicken offers`);
          }
          marketplaceOffers.push(...ddOffers, ...ueOffers);
          marketplaceNotes.push(...notes);
        }
      }

      const allOffers = [...directOffers, ...marketplaceOffers];
      const warning = marketplaceNotes.length
        ? (marketplaceOffers.length === 0
          ? marketplaceNotes.join("; ")
          : `Partial marketplace: ${marketplaceNotes.join("; ")}`).slice(0, 500)
        : null;

      return await ctx.runMutation(internal.scrapeNear.completeJob, {
        jobId: args.jobId,
        offers: allOffers,
        error: null,
        warning,
      });
    } catch (error) {
      const message = errorMessage(error);
      return await ctx.runMutation(internal.scrapeNear.completeJob, {
        jobId: args.jobId,
        offers: [],
        error: message,
      });
    }
  },
});

async function scrapeDoorDashNear({
  address,
  chainId,
  limit,
  directStores,
  observedAt,
}: {
  address: string;
  chainId: ScrapeChainId;
  limit: number;
  directStores: DirectStoreRef[];
  observedAt: string;
}) {
  const run = await runApifyActor({
    actorId: doorDashActorId(),
    input: {
      mode: "search",
      search: [CHAIN_NAMES[chainId]],
      location: address,
      storeType: "restaurant",
      includeMenu: true,
      includeBusiness: false,
      includeReviews: false,
      maxStores: limit,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
        apifyProxyCountry: "US",
      },
    },
    timeoutMs: 240_000,
  });

  const offers: MenuOffer[] = [];
  for (const store of run.items) {
    const storeUrl = stringField(store, ["url", "link", "store_url", "businessLink"]);
    if (!storeUrl || !/doordash\.com/i.test(storeUrl)) continue;
    const storeAddress = storeAddressFromRecord(store)
      ?? stringField(store, ["displayAddress", "address", "street"]);
    const storeName = stringField(store, ["storeName", "name", "businessName", "title"]);
    if (!marketplaceStoreMatchesChain(chainId, storeName, storeUrl)) {
      console.warn(`Skip DoorDash store for ${chainId} with mismatched identity: ${storeName ?? storeUrl}`);
      continue;
    }
    const storeId = stringField(store, ["storeId", "store_id", "businessId", "id"]);
    const { locationId } = tieLocationId(chainId, "doordash", storeAddress, storeId, directStores);
    const coords = storeCoordsFromRecord(store);
    const lat = coords.lat ?? numberField(store, ["latitude"]);
    const lng = coords.lng ?? numberField(store, ["longitude"]);
    try {
      // Single menu list price → emit both pickup and delivery channels.
      const normalized = normalizeMarketplaceDualChannel(
        [store],
        {
          platform: "doordash",
          chain_id: chainId,
          location_id: locationId,
          store_url: storeUrl,
          store_name: storeName ?? CHAIN_NAMES[chainId],
          address: storeAddress,
          latitude: lat,
          longitude: lng,
        },
        observedAt,
      );
      offers.push(...normalized.offers);
    } catch (error) {
      console.warn(`Skip DoorDash store ${storeAddress ?? storeUrl}: ${errorMessage(error)}`);
    }
  }
  return offers;
}

function numberField(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

/**
 * Uber Eats near-search by chain name + lat/lng (no store URL required).
 * Runs delivery and pickup dining modes separately when the actor supports them.
 */
async function scrapeUberEatsNear({
  origin,
  searchAddress,
  chainId,
  limit,
  directStores,
  observedAt,
}: {
  origin: Origin;
  searchAddress: string;
  chainId: ScrapeChainId;
  limit: number;
  directStores: DirectStoreRef[];
  observedAt: string;
}) {
  const query = CHAIN_NAMES[chainId];
  const modes = [
    { diningMode: "DELIVERY", channel: "ubereats_delivery" },
    { diningMode: "PICKUP", channel: "ubereats_pickup" },
  ] as const;

  const modeResults = await Promise.all(modes.map(async (mode) => {
    const run = await runApifyActor({
      actorId: uberEatsActorId(),
      input: {
        query,
        address: searchAddress,
        latitude: origin.latitude,
        longitude: origin.longitude,
        diningMode: mode.diningMode,
        storeType: "RESTAURANTS",
        maxRows: limit,
        locale: "en-US",
        addressCountry: "US",
        getMenuCustomizations: false,
      },
      timeoutMs: 180_000,
    });

    const offers: MenuOffer[] = [];
    for (const store of run.items) {
      const storeUrl = stringField(store, ["url", "link", "store_url"]);
      if (!storeUrl) continue;
      // Normalize host for context validation (actor may omit www).
      const normalizedUrl = storeUrl.includes("://")
        ? storeUrl.replace("://ubereats.com", "://www.ubereats.com")
        : `https://www.ubereats.com${storeUrl.startsWith("/") ? "" : "/"}${storeUrl}`;
      const storeAddress = storeAddressFromRecord(store);
      const storeName = stringField(store, ["title", "name", "store_name"]) ?? query;
      if (!marketplaceStoreMatchesChain(chainId, storeName, normalizedUrl)) {
        console.warn(`Skip Uber Eats store for ${chainId} with mismatched identity: ${storeName}`);
        continue;
      }
      const storeId = stringField(store, ["uuid", "store_id", "storeId", "id"]);
      const { locationId } = tieLocationId(chainId, "ubereats", storeAddress, storeId, directStores);
      const coords = storeCoordsFromRecord(store);
      try {
        const normalized = normalizeMarketplaceItems(
          [store],
          {
            platform: "ubereats",
            chain_id: chainId,
            location_id: locationId,
            store_url: normalizedUrl,
            ordering_channel: mode.channel,
            store_name: storeName,
            address: storeAddress,
            latitude: coords.lat,
            longitude: coords.lng,
          },
          observedAt,
        );
        offers.push(...normalized.offers);
      } catch (error) {
        console.warn(`Skip Uber Eats store ${storeAddress ?? storeUrl}: ${errorMessage(error)}`);
      }
    }
    return offers;
  }));

  return modeResults.flat();
}

function apifyConfigStatus(): { ok: true } | { ok: false; reason: string } {
  const token = env.APIFY_TOKEN;
  const doorDash = env.APIFY_DOORDASH_ACTOR_ID;
  const uberEats = env.APIFY_UBEREATS_ACTOR_ID;
  if (!token || token.length < 24 || /YOUR-|placeholder|changeme/i.test(token)) {
    return {
      ok: false,
      reason: "APIFY_TOKEN is missing or still a placeholder — set a real apify_api_… token on the Convex deployment",
    };
  }
  if (!doorDash) return { ok: false, reason: "APIFY_DOORDASH_ACTOR_ID is not configured" };
  if (!uberEats) return { ok: false, reason: "APIFY_UBEREATS_ACTOR_ID is not configured" };
  return { ok: true };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function stringField(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
