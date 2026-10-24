import assert from "node:assert/strict";
import test from "node:test";
import { actorEnvName, normalizeMarketplaceItems } from "../src/marketplace.mjs";
import { comparisonIdentity } from "../src/identity.mjs";
import { comparisonRows } from "../src/comparison.mjs";

const context = {
  platform: "doordash",
  chain_id: "wendys",
  location_id: "wendys:30",
  store_name: "Wendy's Lemmon Ave",
  address: "4018 Lemmon Ave, Dallas, TX",
  store_url: "https://www.doordash.com/store/wendys-dallas-30/",
  ordering_channel: "doordash_pickup",
};

test("normalizes a DoorDash item into the shared offer and keeps its channel", () => {
  const { offers, rejected } = normalizeMarketplaceItems([{
    itemName: "10 PC. Crispy Chicken Nuggets",
    price: "$5.49",
    section: "Nuggets",
    itemId: "dd-10-nuggets",
  }], context, "2026-10-24T12:00:00.000Z");
  assert.equal(rejected.length, 0);
  assert.equal(offers.length, 1);
  assert.equal(offers[0].location_id, "wendys:30");
  assert.equal(offers[0].ordering_channel, "doordash_pickup");
  assert.equal(offers[0].source_provider, "apify");
  assert.equal(offers[0].quantity, 10);
  assert.equal(offers[0].list_price_cents, 549);
  assert.equal(offers[0].offer_key.endsWith("|doordash_pickup"), true);
});

test("rejects a marketplace URL from a different platform", () => {
  assert.throws(() => normalizeMarketplaceItems([], { ...context, store_url: "https://www.ubereats.com/store/x" }), /doordash.com/);
});

test("flattens an Actor's store-level menu categories", () => {
  const { offers } = normalizeMarketplaceItems([{
    link: context.store_url,
    menu_categories: [{
      name: "Nuggets",
      items: [{ name: "10 PC. Crispy Chicken Nuggets", price: 5.49, id: "nested-10" }],
    }],
  }], context, "2026-10-24T12:00:00.000Z");
  assert.equal(offers.length, 1);
  assert.equal(offers[0].original_name, "10 PC. Crispy Chicken Nuggets");
  assert.equal(offers[0].list_price_cents, 549);
});

test("uses an Actor's exact cents field and excludes configurable minimum prices", () => {
  const { offers } = normalizeMarketplaceItems([{
    menu_categories: [{
      category_name: "Nuggets",
      items: [
        { name: "10 PC. Crispy Chicken Nuggets", price_cents: 749, item_id: "exact" },
        { name: "10 PC. Nuggets Combo", price_cents: 0, price_display: "$11.99+", item_id: "minimum" },
      ],
    }],
  }], context, "2026-10-24T12:00:00.000Z");
  assert.equal(offers.length, 1);
  assert.equal(offers[0].list_price_cents, 749);
});

test("normalizes the configured Uber Eats Actor's documented flat item fields", () => {
  const uberContext = {
    ...context,
    platform: "ubereats",
    store_url: "https://www.ubereats.com/store/wendys/abc",
    ordering_channel: "ubereats_pickup",
  };
  const { offers } = normalizeMarketplaceItems([{
    menu_item_id: "uber-nuggets-10",
    menu_item_name: "10 PC. Crispy Chicken Nuggets",
    menu_item_price: 749,
    section_name: "Nuggets",
    store_url: uberContext.store_url,
  }], uberContext, "2026-10-24T12:00:00.000Z");
  assert.equal(offers.length, 1);
  assert.equal(offers[0].list_price_cents, 749);
  assert.equal(offers[0].ordering_channel, "ubereats_pickup");
});

test("uses a separate configured actor for each marketplace", () => {
  assert.equal(actorEnvName("doordash"), "APIFY_DOORDASH_ACTOR_ID");
  assert.equal(actorEnvName("ubereats"), "APIFY_UBEREATS_ACTOR_ID");
});

test("comparison identity does not merge differently named one-piece sandwiches", () => {
  const shared = { product_key: "wendys:30|chicken-sandwich|1|plain|ala_carte" };
  assert.notEqual(
    comparisonIdentity({ ...shared, original_name: "Classic Chicken Sandwich" }),
    comparisonIdentity({ ...shared, original_name: "Crispy Chicken Sandwich" }),
  );
});

test("comparison output deduplicates an item repeated in marketplace sections", () => {
  const direct = [{
    product_key: "wendys:3833|chicken-nugget|10|plain|ala_carte",
    original_name: "10 PC. Crispy Chicken Nuggets",
    chain_id: "wendys",
    location_id: "wendys:3833",
    ordering_channel: "first_party_pickup",
    list_price_cents: 699,
  }];
  const marketplace = [
    { ...direct[0], ordering_channel: "doordash_pickup", list_price_cents: 874, source_item_id: "popular" },
    { ...direct[0], ordering_channel: "doordash_pickup", list_price_cents: 874, source_item_id: "category" },
  ];
  const rows = comparisonRows(direct, marketplace);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].markup_cents, 175);
});
