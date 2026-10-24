import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geocode, parseAt } from "./geo.mjs";
import { fetchJson } from "./http.mjs";
import { pushOffers } from "./convex-push.mjs";
import { takeoutAdapter, takeoutChains } from "./takeout/index.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "out", "offers");
const args = process.argv.slice(2);
loadDotEnv(join(dirname(dirname(root)), ".env"));

const origin = await resolveOrigin(args);
const radiusMiles = numberFlag(args, "--radius", 5);
const limit = numberFlag(args, "--limit", 2);
const selected = selectedChains(args);
const pushConvex = args.includes("--push-convex");

mkdirSync(outDir, { recursive: true });
const observedAt = new Date().toISOString();
const results = [];

for (const chain of selected) {
  const adapter = takeoutAdapter(chain.id);
  if (!adapter) {
    results.push({
      chain_id: chain.id,
      name: chain.name,
      error: "No public per-store takeout menu is wired for this chain yet.",
      stores: [],
    });
    process.stderr.write(`${chain.id} skipped: no location takeout adapter\n`);
    continue;
  }

  try {
    process.stderr.write(`locate ${chain.id}\n`);
    const stores = await adapter.locate(origin, { radiusMiles, limit });
    const scraped = [];
    for (const store of stores) {
      process.stderr.write(`menu ${chain.id} ${store.id} ${store.address}\n`);
      const offers = await adapter.offers(store, observedAt);
      scraped.push({
        ...store,
        menu_note: offers.length === 0 ? adapter.menu_note ?? null : null,
        offer_count: offers.length,
        offers,
      });
      process.stdout.write(`${chain.id} ${store.id} ${offers.length} offers${store.distance_miles == null ? "" : ` (${store.distance_miles} mi)`}\n`);
    }
    results.push({ chain_id: chain.id, name: chain.name, stores: scraped });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ chain_id: chain.id, name: chain.name, error: message, stores: [] });
    process.stderr.write(`${chain.id} failed: ${message.split("\n")[0]}\n`);
  }
}

const output = {
  query: {
    address: origin.label ?? null,
    latitude: origin.latitude,
    longitude: origin.longitude,
    radius_miles: radiusMiles,
    limit,
    ordering_channel: "first_party_pickup",
  },
  observed_at: observedAt,
  chains: results,
};
const outputPath = join(outDir, "location.json");
writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
process.stdout.write(`wrote ${outputPath}\n`);
if (pushConvex) {
  const result = await pushToConvex(output);
  process.stdout.write(`Convex ingestion: ${result.inserted} inserted, ${result.updated} updated (job ${result.jobId})\n`);
}

async function resolveOrigin(argv) {
  const at = flag(argv, "--at");
  const address = flag(argv, "--address");
  if (!at && !address) {
    console.error("Pass a location. Examples:");
    console.error('  node src/run.mjs --at 32.7767,-96.7970 --radius 5 --limit 2');
    console.error('  node src/run.mjs --address "4018 Lemmon Ave, Dallas, TX" wendys wingstop');
    process.exit(1);
  }
  if (at) {
    const point = parseAt(at);
    return { ...point, label: address };
  }
  return geocode(address, fetchJson);
}

function selectedChains(argv) {
  const flags = new Set(["--at", "--address", "--radius", "--limit"]);
  const ids = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (flags.has(arg)) {
      index += 1;
      continue;
    }
    if (!arg.startsWith("--")) ids.push(arg);
  }
  const catalog = takeoutChains();
  if (ids.length === 0) return catalog.filter((chain) => chain.takeout);
  return ids.map((id) => {
    const chain = catalog.find((item) => item.id === id);
    if (!chain) {
      console.error(`Unknown chain "${id}". Known: ${catalog.map((item) => item.id).join(", ")}`);
      process.exit(1);
    }
    return chain;
  });
}

async function pushToConvex(output) {
  const offers = output.chains.flatMap((chain) => chain.stores.flatMap((store) => store.offers));
  return pushOffers({ provider: "brightdata", query: output.query, observedAt: output.observed_at, offers });
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function flag(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

function numberFlag(argv, name, fallback) {
  const raw = flag(argv, name);
  if (raw == null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`${name} must be a positive number.`);
    process.exit(1);
  }
  return value;
}
