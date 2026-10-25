import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const nullableString = v.union(v.string(), v.null());
const nullableNumber = v.union(v.number(), v.null());
const offerValidator = v.object({
  chain_id: v.string(), location_id: v.string(), store_name: nullableString, address: nullableString,
  latitude: nullableNumber, longitude: nullableNumber, distance_miles: nullableNumber,
  offer_kind: v.string(), category: nullableString, original_name: v.string(), quantity: nullableNumber,
  quantity_label: nullableString, list_price_cents: nullableNumber, currency: v.string(), prep: nullableString,
  heat: nullableString, build: nullableString, cut_mix: v.union(v.record(v.string(), v.number()), v.null()),
  protein_pieces: nullableNumber, protein_category: nullableString, includes: v.array(v.string()),
  ordering_channel: v.string(), comparable: v.boolean(), validation_status: v.string(), source_provider: v.string(),
  source_url: v.string(), source_item_id: nullableString, observed_at: v.string(), product_key: v.string(), offer_key: v.string(),
});

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  scrapeJobs: defineTable({
    provider: v.string(), status: v.string(), requested_at: v.string(), completed_at: nullableString,
    address: nullableString, latitude: nullableNumber, longitude: nullableNumber, radius_miles: nullableNumber,
    offer_count: v.number(), error: nullableString,
  }).index('by_provider_and_requested_at', ['provider', 'requested_at']),
  menuOffers: defineTable(offerValidator)
    .index('by_offer_key', ['offer_key'])
    .index('by_location_and_channel', ['location_id', 'ordering_channel'])
    .index('by_chain_and_location', ['chain_id', 'location_id'])
    .index('by_observed_at', ['observed_at'])
    .index('by_category', ['category']),
});

export { offerValidator };
