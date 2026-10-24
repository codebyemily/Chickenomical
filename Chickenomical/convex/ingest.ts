import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { offerValidator } from './schema';

// Backends whose scrape runs may be persisted. The run-level provider records
// which execution backend produced the batch; each offer also carries its own
// `source_provider` for per-record provenance.
const INGEST_PROVIDERS = ['bright_data', 'apify'];

export const upsertScrapeRun = internalMutation({
  args: {
    provider: v.string(),
    requested_at: v.string(), completed_at: v.string(), address: v.union(v.string(), v.null()),
    latitude: v.union(v.number(), v.null()), longitude: v.union(v.number(), v.null()), radius_miles: v.union(v.number(), v.null()),
    offers: v.array(offerValidator),
  },
  handler: async (ctx, args) => {
    if (!INGEST_PROVIDERS.includes(args.provider)) throw new Error(`Unsupported ingest provider "${args.provider}".`);
    const mismatched = args.offers.find((offer) => offer.source_provider !== args.provider);
    if (mismatched) throw new Error(`Offer ${mismatched.offer_key} has source_provider "${mismatched.source_provider}", expected "${args.provider}".`);
    const jobId = await ctx.db.insert('scrapeJobs', {
      provider: args.provider, status: 'succeeded', requested_at: args.requested_at, completed_at: args.completed_at,
      address: args.address, latitude: args.latitude, longitude: args.longitude, radius_miles: args.radius_miles,
      offer_count: args.offers.length, error: null,
    });
    let inserted = 0;
    let updated = 0;
    for (const offer of args.offers) {
      const existing = await ctx.db.query('menuOffers').withIndex('by_offer_key', (q) => q.eq('offer_key', offer.offer_key)).unique();
      if (existing) { await ctx.db.patch(existing._id, offer); updated += 1; }
      else { await ctx.db.insert('menuOffers', offer); inserted += 1; }
    }
    return { jobId, inserted, updated };
  },
});
