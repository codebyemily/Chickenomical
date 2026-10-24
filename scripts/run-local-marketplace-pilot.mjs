#!/usr/bin/env node
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geocode } from "../scrapers/brightdata/src/geo.mjs";
import { fetchJson } from "../scrapers/brightdata/src/http.mjs";
import { takeoutAdapter, takeoutChains } from "../scrapers/brightdata/src/takeout/index.mjs";
import { comparisonRows } from "../scrapers/apify/src/comparison.mjs";
import { normalizeMarketplaceItems, runMarketplaceActor } from "../scrapers/apify/src/marketplace.mjs";
import { pushOffers } from "../scrapers/brightdata/src/convex-push.mjs";

// Collects every chicken offer from the stores within a radius on BOTH backends
// — Bright Data (first-party pickup) and Apify (DoorDash, optional Uber Eats) —
// and returns/stores them all. Stores are no longer required to match across
// backends: a DoorDash store that shares a direct store's address reuses that
// store's location_id so the two channels line up for comparison, but every
// offer is kept and pushed regardless of whether a counterpart exists.

const root = dirname(dirname(fileURLToPath(import.meta.url)));
loadDotEnv(join(root, ".env"));

const args = process.argv.slice(2);
const address = flag(args, "--address");
const radiusMiles = positiveNumber(flag(args, "--radius"), 5);
const limit = Math.trunc(positiveNumber(flag(args, "--limit"), 3));
const chainId = flag(args, "--chain") ?? "wendys";
const uberEatsStoreUrls = flags(args, "--ubereats-store-url");
const pushConvex = args.includes("--push-convex");
if (!address) {
  console.error('Usage: node scripts/run-local-marketplace-pilot.mjs --address "3123 Silver Creek Rd, San Jose, CA 95121" [--chain wendys] [--radius 5] [--limit 3] [--ubereats-store-url https://www.ubereats.com/store/...] [--push-convex]');
  process.exit(1);
}

requireEnv("BRIGHTDATA_API_TOKEN");
requireEnv("BRIGHTDATA_UNLOCKER_ZONE");
requireEnv("APIFY_TOKEN");
requireEnv("APIFY_DOORDASH_ACTOR_ID");
if (uberEatsStoreUrls.length) requireEnv("APIFY_UBEREATS_ACTOR_ID");

const observedAt = new Date().toISOString();
const origin = await geocode(address, fetchJson);
const chain = takeoutChains().find((item) => item.id === chainId);
if (!chain) throw new Error(`Unknown chain "${chainId}". Known chains: ${takeoutChains().map((item) => item.id).join(", ")}.`);
const adapter = takeoutAdapter(chainId);
if (!adapter) throw new Error(`${chain.name} has no first-party adapter yet.`);

// 1) Bright Data: every pickup store in the radius, all of its chicken offers.
console.log(`Finding up to ${limit} ${chain.name} store(s) within ${radiusMiles} miles of ${address}…`);
const directStores = await adapter.locate(origin, { radiusMiles, limit });
if (directStores.length === 0) throw new Error(`No pickup-capable ${chain.name} was found in the requested radius.`);
const directByStore = [];
const directOffers = [];
for (const store of directStores) {
  const offers = await adapter.offers(store, observedAt);
  if (offers.length === 0) console.warn(`  ${chain.name} ${store.id} (${store.address}) returned no location-priced offers. ${adapter.menu_note ?? ""}`.trim());
  else console.log(`  direct  ${store.id} ${store.address}: ${offers.length} offers`);
  directByStore.push({ id: store.id, address: store.address, offer_count: offers.length });
  directOffers.push(...offers);
}

// 2) Apify DoorDash: every store the actor returns for the same search, each
//    normalized under its own location (reusing a direct store's location_id
//    when the addresses match) so nothing is discarded on a mismatch.
console.log(`Requesting up to ${limit} DoorDash ${chain.name} menu(s) near ${address}…`);
const doorDashRun = await runMarketplaceActor({
  token: process.env.APIFY_TOKEN,
  actorId: process.env.APIFY_DOORDASH_ACTOR_ID,
  input: {
    address,
    startUrls: [{ url: `https://www.doordash.com/search/store/${encodeURIComponent(chain.name.toLowerCase())}?event_type=search` }],
    maxResults: limit,
    includeMenu: true,
    fetchReviews: false,
  },
});
const marketplaceOffers = [];
const doorDashByStore = [];
for (const store of doorDashRun.items) {
  if (!store?.url) continue;
  const match = directStores.find((direct) => sameStoreAddress(direct.address, store.address));
  const locationId = match ? `${chainId}:${match.id}` : `${chainId}:dd-${store.store_id ?? addressSlug(store.address)}`;
  let normalized;
  try {
    normalized = normalizeMarketplaceItems([store], {
      platform: "doordash",
      chain_id: chainId,
      location_id: locationId,
      store_name: store.name ?? chain.name,
      address: store.address ?? null,
      latitude: store.lat ?? store.latitude ?? null,
      longitude: store.lng ?? store.longitude ?? null,
      store_url: store.url,
      ordering_channel: "doordash_pickup",
    }, store._scrapedAt ?? observedAt);
  } catch (error) {
    console.warn(`  skip DoorDash ${store.address ?? store.url}: ${error.message}`);
    continue;
  }
  console.log(`  doordash ${store.address ?? store.url}: ${normalized.offers.length} offers${match ? ` (matches direct ${match.id})` : " (direct counterpart not in radius)"}`);
  doorDashByStore.push({ address: store.address ?? null, url: store.url, location_id: locationId, matched_direct_id: match?.id ?? null, offer_count: normalized.offers.length, rejected: normalized.rejected.length });
  marketplaceOffers.push(...normalized.offers);
}

// 3) Uber Eats: optional, one explicit store URL at a time (no public search).
const uberEats = [];
for (const storeUrl of uberEatsStoreUrls) {
  assertUberEatsUrl(storeUrl);
  console.log(`Requesting Uber Eats menu from ${storeUrl}…`);
  const run = await runMarketplaceActor({ token: process.env.APIFY_TOKEN, actorId: process.env.APIFY_UBEREATS_ACTOR_ID, input: { store_urls: [storeUrl], country_code: "us" }, timeoutMs: 180_000 });
  const store = run.items[0] ?? {};
  const match = directStores.find((direct) => sameStoreAddress(direct.address, store.address));
  const locationId = match ? `${chainId}:${match.id}` : `${chainId}:ue-${store.store_id ?? addressSlug(storeUrl)}`;
  const normalized = normalizeMarketplaceItems(run.items, {
    platform: "ubereats", chain_id: chainId, location_id: locationId, store_name: store.name ?? chain.name,
    address: store.address ?? null, latitude: store.lat ?? null, longitude: store.lng ?? null,
    store_url: storeUrl, ordering_channel: "ubereats_pickup",
  }, observedAt);
  console.log(`  ubereats ${storeUrl}: ${normalized.offers.length} offers${match ? ` (matches direct ${match.id})` : ""}`);
  uberEats.push({ store_url: storeUrl, location_id: locationId, matched_direct_id: match?.id ?? null, offer_count: normalized.offers.length, rejected: normalized.rejected.length });
  marketplaceOffers.push(...normalized.offers);
}

// 4) Best-effort comparison across whatever lines up; never gates collection.
const comparableChicken = comparisonRows(directOffers, marketplaceOffers).filter((row) => /nugget|tender/i.test(row.item));

const report = {
  tested_at: observedAt,
  search: { address, radius_miles: radiusMiles, limit, chain: chain.name },
  direct_stores: directByStore,
  doordash_stores: doorDashByStore,
  ubereats_stores: uberEats,
  totals: { direct_offers: directOffers.length, marketplace_offers: marketplaceOffers.length, comparable_chicken_rows: comparableChicken.length },
  comparable_chicken_rows: comparableChicken,
};
const outDir = join(root, "scrapers", "apify", "out", "offers");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `radius-${chainId}-${origin.latitude.toFixed(3)}_${origin.longitude.toFixed(3)}.json`);
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`\nCollected ${directOffers.length} direct + ${marketplaceOffers.length} marketplace offers across ${directByStore.length} direct / ${doorDashByStore.length} DoorDash store(s); wrote ${outPath}`);
for (const row of comparableChicken) {
  console.log(`${row.item} @ ${row.location_id}: direct $${formatCents(row.direct_price_cents)} | DoorDash $${formatCents(row.marketplace_price_cents)} | ${row.markup_cents >= 0 ? "+" : "-"}$${formatCents(Math.abs(row.markup_cents))}`);
}

if (pushConvex) {
  const query = { address, latitude: origin.latitude, longitude: origin.longitude, radius_miles: radiusMiles };
  if (directOffers.length > 0) {
    const direct = await pushOffers({ provider: "brightdata", query, observedAt, offers: directOffers });
    console.log(`Convex (bright_data): ${direct.inserted} inserted, ${direct.updated} updated (job ${direct.jobId})`);
  }
  if (marketplaceOffers.length > 0) {
    const market = await pushOffers({ provider: "apify", query, observedAt, offers: marketplaceOffers });
    console.log(`Convex (apify): ${market.inserted} inserted, ${market.updated} updated (job ${market.jobId})`);
  }
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

function sameStoreAddress(left, right) {
  const leftParts = addressParts(left);
  const rightParts = addressParts(right);
  return Boolean(leftParts.number && leftParts.zip && rightParts.number && rightParts.zip)
    && leftParts.number === rightParts.number
    && leftParts.zip === rightParts.zip;
}

function addressParts(address) {
  const text = String(address ?? "").toUpperCase();
  return { number: text.match(/^\s*(\d+)/)?.[1] ?? null, zip: text.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null };
}

function addressSlug(value) {
  return String(value ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "unknown";
}

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`${name} is missing from the root .env file.`);
}

function flag(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

function flags(argv, name) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) if (argv[index] === name && argv[index + 1]) values.push(argv[index + 1]);
  return values;
}

function positiveNumber(raw, fallback) {
  if (raw == null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error("--radius and --limit must be positive numbers.");
  return value;
}

function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

function assertUberEatsUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error("--ubereats-store-url must be a valid Uber Eats HTTPS URL."); }
  if (parsed.protocol !== "https:" || (parsed.hostname !== "ubereats.com" && !parsed.hostname.endsWith(".ubereats.com"))) {
    throw new Error("--ubereats-store-url must be a valid Uber Eats HTTPS URL.");
  }
}
