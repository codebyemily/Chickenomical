import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import { offerValidator } from "./schema";
import { SCRAPE_CHAINS, resolveOrigin, scrapeChains, type ScrapeChainId } from "./lib/takeout";

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

export const completeJob = internalMutation({
  args: {
    jobId: v.id("scrapeJobs"),
    offers: v.array(offerValidator),
    error: v.union(v.string(), v.null()),
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
      error: null,
    });

    return { jobId: args.jobId, inserted, updated };
  },
});

export const run = internalAction({
  args: {
    jobId: v.id("scrapeJobs"),
    address: v.string(),
    radiusMiles: v.number(),
    limit: v.number(),
    chains: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{ jobId: string; inserted: number; updated: number; error?: string | null }> => {
    const observedAt = new Date().toISOString();
    try {
      const origin = await resolveOrigin(args.address);
      await ctx.runMutation(internal.scrapeNear.patchJobOrigin, {
        jobId: args.jobId,
        address: origin.label,
        latitude: origin.latitude,
        longitude: origin.longitude,
      });
      const selected = (args.chains.length ? args.chains : [...SCRAPE_CHAINS])
        .filter((id): id is ScrapeChainId => (SCRAPE_CHAINS as readonly string[]).includes(id));
      const { offers } = await scrapeChains(
        origin,
        { radiusMiles: args.radiusMiles, limit: args.limit, chains: selected },
        observedAt,
      );
      return await ctx.runMutation(internal.scrapeNear.completeJob, {
        jobId: args.jobId,
        offers,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return await ctx.runMutation(internal.scrapeNear.completeJob, {
        jobId: args.jobId,
        offers: [],
        error: message,
      });
    }
  },
});
