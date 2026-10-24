import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { get_api_key } = require("@brightdata/cli/dist/utils/credentials.js");
const { post, get } = require("@brightdata/cli/dist/utils/client.js");

const root = dirname(fileURLToPath(import.meta.url));
const restaurants = JSON.parse(readFileSync(join(root, "restaurants.json"), "utf8"));
const collectorsPath = join(root, "collectors.json");
const outDir = join(root, "out");
const cli = join(root, "node_modules", ".bin", "brightdata");
const promptLimit = 500;
const generationTimeoutMs = 30 * 60 * 1000;

const shared = [
  "Extract chicken menu rows: original_name;",
  "category chicken-nugget, chicken-tender, chicken-bucket, chicken-wing,",
  "chicken-boneless-wing, chicken-sandwich, chicken-slider, chicken-wrap,",
  "chicken-fry, or null; quantity integer or null; list_price_cents;",
  "offer_kind ala_carte, combo, family_meal, or kids_meal; prep; heat;",
  "deal_name; deal_price_cents. One size per row. Skip non-chicken.",
  "Do not invent prices.",
].join(" ");

mkdirSync(outDir, { recursive: true });

const only = process.argv.slice(2).filter((arg) => arg !== "--force");
const selected = only.length
  ? restaurants.filter((restaurant) => only.includes(restaurant.id))
  : restaurants;

if (selected.length === 0) {
  console.error(`No matching restaurants. Known ids: ${restaurants.map((restaurant) => restaurant.id).join(", ")}`);
  process.exit(1);
}

for (const restaurant of restaurants) buildDescription(restaurant);

const collectors = readCollectors();
const force = process.argv.includes("--force");
const automationDenied = Object.values(collectors).some((row) =>
  String(row?.error ?? "").includes("Automation not allowed"),
);
if (automationDenied && !force) {
  console.error("Bright Data returned 403 Automation not allowed for this account.");
  console.error("Scraper templates already created are listed in collectors.json.");
  console.error("Enable Scraper Studio AI in the Bright Data control panel, then re-run with --force.");
  process.exit(1);
}

for (const restaurant of selected) {
  const description = buildDescription(restaurant);
  const previous = collectors[restaurant.id];
  if (previous?.status === "done" && previous.collector_id) {
    console.log(`skip ${restaurant.id} ${previous.collector_id}`);
    continue;
  }

  const started = new Date().toISOString();
  try {
    let collectorId = previous?.collector_id && previous.status !== "done"
      ? previous.collector_id
      : null;
    if (!collectorId) {
      collectorId = await createTemplate(restaurant);
      if (!collectorId) continue;
    }
    console.log(`generate ${restaurant.id} ${collectorId} (${description.length} chars)`);
    const progress = await generate(collectorId, restaurant.url, description);
    const status = progress?.status ?? "unknown";
    saveCollector(restaurant, {
      collector_id: collectorId,
      status,
      started_at: started,
      exit_code: status === "done" ? 0 : 1,
      error: status === "done" ? null : `AI generation finished with status "${status}".`,
    });
    console.log(`finished ${restaurant.id} status=${status} collector=${collectorId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    saveCollector(restaurant, {
      collector_id: previous?.collector_id ?? null,
      status: "failed",
      started_at: started,
      exit_code: 1,
      error: message.split("\n")[0],
    });
    console.error(`finished ${restaurant.id} status=failed`);
    console.error(message.split("\n").slice(0, 8).join("\n"));
    if (message.includes("Automation not allowed")) break;
  }
}

const failed = selected.filter((restaurant) => collectors[restaurant.id]?.status !== "done");
process.exit(failed.length === 0 ? 0 : 1);

function buildDescription(restaurant) {
  const description = `${restaurant.focus} ${shared}`.replace(/\s+/g, " ").trim();
  if (description.length > promptLimit) {
    throw new Error(`${restaurant.id} prompt is ${description.length} characters; Bright Data allows ${promptLimit}.`);
  }
  return description;
}

async function createTemplate(restaurant) {
  const outputPath = join(outDir, `${restaurant.id}-template.json`);
  console.log(`create ${restaurant.id} ${restaurant.url}`);
  const result = await run(cli, [
    "scraper",
    "create",
    restaurant.url,
    buildDescription(restaurant),
    "--name",
    `chickenomical-${restaurant.id}`,
    "--timeout",
    "1800",
    "--pretty",
    "-o",
    outputPath,
  ]);
  const envelope = readJson(outputPath);
  if (envelope?.status === "done" && envelope.collector_id) {
    saveCollector(restaurant, {
      collector_id: envelope.collector_id,
      status: "done",
      started_at: new Date().toISOString(),
      exit_code: 0,
      error: null,
    });
    console.log(`finished ${restaurant.id} status=done collector=${envelope.collector_id}`);
    return null;
  }
  if (!envelope?.collector_id) {
    throw new Error(tail(result.stderr || result.stdout) || "Scraper template was not created.");
  }
  if (String(envelope.error ?? "").includes("Automation not allowed")) {
    saveCollector(restaurant, {
      collector_id: envelope.collector_id,
      status: "ai_trigger_failed",
      started_at: new Date().toISOString(),
      exit_code: result.code,
      error: "Automation not allowed",
    });
    throw new Error(`Automation not allowed for ${envelope.collector_id}`);
  }
  return envelope.collector_id;
}

async function generate(collectorId, url, description) {
  const apiKey = get_api_key();
  if (!apiKey) throw new Error("Bright Data is not logged in. Run brightdata login.");
  await post(apiKey, `/dca/collectors/${collectorId}/automate_template`, {
    description,
    urls: [url],
  });
  const deadline = Date.now() + generationTimeoutMs;
  let lastStep = "";
  while (Date.now() < deadline) {
    const progress = await get(apiKey, `/dca/collectors/${collectorId}/automate_template/progress`);
    const status = typeof progress?.status === "string" ? progress.status : "running";
    const step = progress?.step ?? status;
    if (step !== lastStep) {
      console.log(`step ${collectorId} ${status} ${step}`);
      lastStep = step;
    }
    if (status === "done" || status === "failed" || status === "error" || status === "cancelled") {
      return progress;
    }
    await sleep(15000);
  }
  throw new Error(`AI generation timed out for ${collectorId}.`);
}

function saveCollector(restaurant, fields) {
  collectors[restaurant.id] = {
    name: restaurant.name,
    url: restaurant.url,
    view_url: fields.collector_id
      ? `https://brightdata.com/cp/scrapers/${fields.collector_id}`
      : null,
    finished_at: new Date().toISOString(),
    ...fields,
  };
  writeFileSync(collectorsPath, JSON.stringify(collectors, null, 2) + "\n");
}

function readCollectors() {
  return readJson(collectorsPath) ?? {};
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function tail(text) {
  return text.trim().split("\n").slice(-12).join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}
