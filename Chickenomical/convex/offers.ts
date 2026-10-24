import { v } from 'convex/values';
import { query } from './_generated/server';

/** Bounded list of recently stored offers, newest first. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    return await ctx.db.query('menuOffers').order('desc').take(limit);
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
