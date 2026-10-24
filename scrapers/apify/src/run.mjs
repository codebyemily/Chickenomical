import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pushOffers } from "../../brightdata/src/convex-push.mjs";
import { actorEnvName, normalizeMarketplaceItems, runMarketplaceActor } from "./marketplace.mjs";

const args = process.argv.slice(2);
const inputPath = flag(args, "--input");
if (!inputPath) {
  console.error("Usage: npm run scrape -- --input marketplace-request.json [--push-convex]");
  process.exit(1);
}
const pushConvex = args.includes("--push-convex");

const root = dirname(dirname(fileURLToPath(import.meta.url)));
loadDotEnv(join(dirname(dirname(root)), ".env"));

const request = JSON.parse(readFileSync(inputPath, "utf8"));
const actorId = process.env[actorEnvName(request.platform)];
const observedAt = new Date().toISOString();
const run = await runMarketplaceActor({ token: process.env.APIFY_TOKEN, actorId, input: request.actor_input ?? {} });
const normalized = normalizeMarketplaceItems(run.items, request, observedAt);
const outDir = join(root, "out", "offers");
mkdirSync(outDir, { recursive: true });
const outputPath = join(outDir, `${request.platform}-${request.location_id.replace(/[^a-z0-9_-]+/gi, "-")}.json`);
writeFileSync(outputPath, JSON.stringify({ request, run: { run_id: run.runId, dataset_id: run.datasetId }, ...normalized }, null, 2) + "\n");
console.log(`wrote ${outputPath}: ${normalized.offers.length} offers, ${normalized.rejected.length} rejected`);
if (pushConvex) {
  const result = await pushOffers({
    provider: "apify",
    query: { address: request.address ?? null, latitude: request.latitude ?? null, longitude: request.longitude ?? null, radius_miles: request.radius_miles ?? null },
    observedAt,
    offers: normalized.offers,
  });
  console.log(`Convex ingestion: ${result.inserted} inserted, ${result.updated} updated (job ${result.jobId})`);
}

function flag(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
