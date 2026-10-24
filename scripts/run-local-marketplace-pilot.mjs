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

const root = dirname(dirname(fileURLToPath(import.meta.url)));
loadDotEnv(join(root, ".env"));

const args = process.argv.slice(2);
const address = flag(args, "--address");
const radiusMiles = positiveNumber(flag(args, "--radius"), 5);
const chainId = flag(args, "--chain") ?? "wendys";
const uberEatsStoreUrl = flag(args, "--ubereats-store-url");
const pushConvex = args.includes("--push-convex");
if (!address) {
  console.error('Usage: node scripts/run-local-marketplace-pilot.mjs --address "3123 Silver Creek Rd, San Jose, CA 95121" [--chain wendys] [--ubereats-store-url https://www.ubereats.com/store/...] [--radius 5]');
  process.exit(1);
}

requireEnv("BRIGHTDATA_API_TOKEN");
requireEnv("BRIGHTDATA_UNLOCKER_ZONE");
requireEnv("APIFY_TOKEN");
requireEnv("APIFY_DOORDASH_ACTOR_ID");
if (uberEatsStoreUrl) requireEnv("APIFY_UBEREATS_ACTOR_ID");

const observedAt = new Date().toISOString();
const origin = await geocode(address, fetchJson);
const chain = takeoutChains().find((item) => item.id === chainId);
if (!chain) throw new Error(`Unknown chain "${chainId}". Known chains: ${takeoutChains().map((item) => item.id).join(", ")}.`);
const adapter = takeoutAdapter(chainId);
if (!adapter) throw new Error(`${chain.name} has no first-party adapter yet.`);

console.log(`Finding one ${chain.name} within ${radiusMiles} miles of ${address}…`);
const [directStore] = await adapter.locate(origin, { radiusMiles, limit: 1 });
if (!directStore) throw new Error(`No pickup-capable ${chain.name} was found in the requested radius.`);
const directOffers = await adapter.offers(directStore, observedAt);
const directOfferNote = directOffers.length === 0
  ? `${chain.name} was located at ${directStore.address}, but the first-party ordering flow returned no location-priced offers. ${adapter.menu_note ?? ""}`.trim()
  : null;
if (directOfferNote) console.warn(directOfferNote);

console.log(`Requesting DoorDash menu for ${directStore.address}…`);
const apifyRun = await runMarketplaceActor({
  token: process.env.APIFY_TOKEN,
  actorId: process.env.APIFY_DOORDASH_ACTOR_ID,
  input: {
    address,
    startUrls: [{ url: `https://www.doordash.com/search/store/${encodeURIComponent(chain.name.toLowerCase())}?event_type=search` }],
    maxResults: 1,
    includeMenu: true,
    fetchReviews: false,
  },
});

const doorDashStore = apifyRun.items[0];
if (!doorDashStore?.url || !sameStoreAddress(directStore.address, doorDashStore.address)) {
  throw new Error(`DoorDash did not return the same ${chain.name} store. Direct: ${directStore.address}; DoorDash: ${doorDashStore?.address ?? "none"}.`);
}

const marketplace = normalizeMarketplaceItems(apifyRun.items, {
  platform: "doordash",
  chain_id: chainId,
  location_id: `${chainId}:${directStore.id}`,
  store_name: directStore.name,
  address: directStore.address,
  latitude: directStore.latitude,
  longitude: directStore.longitude,
  store_url: doorDashStore.url,
  ordering_channel: "doordash_pickup",
}, doorDashStore._scrapedAt ?? observedAt);

const doorDashRows = comparisonRows(directOffers, marketplace.offers)
  .filter((row) => /nugget|tender/i.test(row.item));
const uberEats = uberEatsStoreUrl
  ? await collectUberEats({ chainId, directStore, directOffers, storeUrl: uberEatsStoreUrl, observedAt })
  : null;
const report = {
  tested_at: observedAt,
  search: { address, radius_miles: radiusMiles },
  direct_store: { id: directStore.id, name: chain.name, address: directStore.address, source: "bright_data" },
  direct_offer_note: directOfferNote,
  doordash_store: { id: doorDashStore.store_id ?? null, address: doorDashStore.address, url: doorDashStore.url, run_id: apifyRun.runId },
  direct_offer_count: directOffers.length,
  doordash_offer_count: marketplace.offers.length,
  rejected_doordash_rows: marketplace.rejected.length,
  doordash_comparable_chicken_rows: doorDashRows,
  ubereats: uberEats,
};

const outDir = join(root, "scrapers", "apify", "out", "offers");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `local-pilot-${chainId}-${directStore.id}.json`);
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`DoorDash matched ${doorDashRows.length} nugget/tender offers; wrote ${outPath}`);
for (const row of doorDashRows) {
  console.log(`${row.item}: direct $${formatCents(row.direct_price_cents)} | DoorDash $${formatCents(row.marketplace_price_cents)} | +$${formatCents(row.markup_cents)}`);
}
if (uberEats) console.log(`Uber Eats returned ${uberEats.offer_count} normalized offers and matched ${uberEats.comparable_chicken_rows.length} nugget/tender offers.`);

if (pushConvex) {
  const query = { address, latitude: origin.latitude, longitude: origin.longitude, radius_miles: radiusMiles };
  if (directOffers.length > 0) {
    const direct = await pushOffers({ provider: "brightdata", query, observedAt, offers: directOffers });
    console.log(`Convex (bright_data): ${direct.inserted} inserted, ${direct.updated} updated (job ${direct.jobId})`);
  }
  if (marketplace.offers.length > 0) {
    const dd = await pushOffers({ provider: "apify", query, observedAt, offers: marketplace.offers });
    console.log(`Convex (apify/doordash): ${dd.inserted} inserted, ${dd.updated} updated (job ${dd.jobId})`);
  }
}

async function collectUberEats({ chainId, directStore, directOffers, storeUrl, observedAt }) {
  assertUberEatsUrl(storeUrl);
  console.log("Requesting Uber Eats menu from the supplied store URL…");
  const run = await runMarketplaceActor({
    token: process.env.APIFY_TOKEN,
    actorId: process.env.APIFY_UBEREATS_ACTOR_ID,
    input: { store_urls: [storeUrl], country_code: "us" },
    timeoutMs: 180_000,
  });
  const normalized = normalizeMarketplaceItems(run.items, {
    platform: "ubereats",
    chain_id: chainId,
    location_id: `${chainId}:${directStore.id}`,
    store_name: directStore.name,
    address: directStore.address,
    latitude: directStore.latitude,
    longitude: directStore.longitude,
    store_url: storeUrl,
    ordering_channel: "ubereats_pickup",
  }, observedAt);
  return {
    run_id: run.runId,
    dataset_id: run.datasetId,
    store_url: storeUrl,
    offer_count: normalized.offers.length,
    rejected_rows: normalized.rejected.length,
    comparable_chicken_rows: comparisonRows(directOffers, normalized.offers).filter((row) => /nugget|tender/i.test(row.item)),
  };
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

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`${name} is missing from the root .env file.`);
}

function flag(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

function positiveNumber(raw, fallback) {
  if (raw == null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error("--radius must be a positive number.");
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
