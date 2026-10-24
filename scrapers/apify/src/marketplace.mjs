import { findChain } from "../../brightdata/src/chains.mjs";
import { toOffer } from "../../brightdata/src/offer.mjs";

const PLATFORM_HOSTS = {
  doordash: ["doordash.com"],
  ubereats: ["ubereats.com"],
};

/**
 * Converts the differently-shaped datasets returned by Apify Store Actors into
 * the shared Chickenomical offer evidence. A context is mandatory: marketplace
 * search results never become a canonical restaurant location by themselves.
 */
export function normalizeMarketplaceItems(items, context, observedAt = new Date().toISOString()) {
  validateContext(context);
  const chain = findChain(context.chain_id);
  if (!chain) throw new Error(`Unknown chain_id "${context.chain_id}".`);

  const accepted = [];
  const rejected = [];
  const seen = new Set();
  for (const item of flattenMarketplaceItems(items)) {
    const card = cardFromMarketplaceItem(item, context);
    if (!card) {
      rejected.push({ reason: "No item name or parseable listed price.", item });
      continue;
    }
    const offer = toOffer(chain, card, card.source_url, observedAt, { sourceProvider: "apify" });
    if (!offer) {
      rejected.push({ reason: "Not a supported chicken offer.", item });
      continue;
    }
    const identity = card.source_item_id ?? offer.offer_key;
    if (seen.has(identity)) continue;
    seen.add(identity);
    accepted.push(offer);
  }
  return { offers: accepted, rejected };
}

function flattenMarketplaceItems(records) {
  return records.flatMap((record) => {
    // Some Actors already emit one row per item. The selected DoorDash Actor
    // emits one row per store and nests all menu categories beneath it.
    if (hasItemFields(record)) return [record];
    const categories = record?.menu_categories ?? record?.menuCategories ?? record?.menu?.categories ?? [];
    return menuItemsFrom(categories, record?.link ?? record?.url ?? null);
  });
}

function menuItemsFrom(node, storeUrl, section = null) {
  if (Array.isArray(node)) return node.flatMap((item) => menuItemsFrom(item, storeUrl, section));
  if (!node || typeof node !== "object") return [];
  const nextSection = stringAt(node, ["name", "title", "category_name", "categoryName"]) ?? section;
  if (hasItemFields(node)) return [{ ...node, section: node.section ?? nextSection, storeUrl: node.storeUrl ?? storeUrl }];
  const children = node.items ?? node.menu_items ?? node.menuItems ?? node.children ?? node.categories ?? [];
  return menuItemsFrom(children, storeUrl, nextSection);
}

function hasItemFields(value) {
  return Boolean(stringAt(value, ["itemName", "item_name", "menu_item_name", "name", "title"]))
    && centsAt(value, ["price_cents", "menu_item_price", "price", "itemPrice", "item_price", "priceText", "price_text", "price_display"]) != null;
}

export async function runMarketplaceActor({ token, actorId, input, pollIntervalMs = 2_000, timeoutMs = 120_000 }) {
  if (!token) throw new Error("APIFY_TOKEN is not configured.");
  if (!actorId) throw new Error("An Apify Actor ID is required for the selected marketplace.");
  const started = await apifyJson(`/acts/${encodeURIComponent(apiActorId(actorId))}/runs`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const runId = started?.data?.id;
  if (!runId) throw new Error("Apify did not return a run ID.");

  const deadline = Date.now() + timeoutMs;
  let run = started.data;
  while (!terminal(run.status) && Date.now() < deadline) {
    await wait(pollIntervalMs);
    run = (await apifyJson(`/actor-runs/${encodeURIComponent(runId)}`, token)).data;
  }
  if (run.status !== "SUCCEEDED") throw new Error(`Apify run ${runId} ${run.status ?? "did not finish"}.`);
  const datasetId = run.defaultDatasetId;
  if (!datasetId) throw new Error(`Apify run ${runId} has no default dataset.`);
  const dataset = await apifyJson(`/datasets/${encodeURIComponent(datasetId)}/items`, token);
  if (!Array.isArray(dataset)) throw new Error(`Apify dataset ${datasetId} was not an array.`);
  return { runId, datasetId, items: dataset };
}

function apiActorId(actorId) {
  // Store names conventionally use "owner/actor" while the REST endpoint uses
  // the equivalent "owner~actor" identifier. IDs already using ~ pass through.
  return actorId.replace("/", "~");
}

export function actorEnvName(platform) {
  if (platform === "doordash") return "APIFY_DOORDASH_ACTOR_ID";
  if (platform === "ubereats") return "APIFY_UBEREATS_ACTOR_ID";
  throw new Error(`Unsupported marketplace "${platform}".`);
}

function cardFromMarketplaceItem(item, context) {
  const originalName = stringAt(item, ["itemName", "item_name", "menu_item_name", "name", "title"]);
  const price = centsAt(item, ["price_cents", "menu_item_price", "price", "itemPrice", "item_price", "priceText", "price_text", "price_display"]);
  if (!originalName || price == null) return null;
  const url = stringAt(item, ["itemUrl", "item_url", "storeUrl", "store_url", "restaurantUrl", "restaurant_url", "url"]) ?? context.store_url;
  return {
    location_id: context.location_id,
    store_name: context.store_name ?? null,
    address: context.address ?? null,
    latitude: context.latitude ?? null,
    longitude: context.longitude ?? null,
    original_name: originalName,
    section: stringAt(item, ["section", "category", "menuSection", "menu_section", "section_name", "subsection_name"]) ?? null,
    list_price_cents: price,
    href: stringAt(item, ["itemId", "item_id", "menu_item_id", "id", "uuid"]) ?? null,
    source_item_id: stringAt(item, ["itemId", "item_id", "menu_item_id", "id", "uuid"]) ?? null,
    ordering_channel: context.ordering_channel,
    source_provider: "apify",
    source_url: url,
  };
}

function validateContext(context) {
  if (!context || typeof context !== "object") throw new Error("Marketplace context is required.");
  const required = ["platform", "chain_id", "location_id", "store_url", "ordering_channel"];
  for (const field of required) if (!context[field]) throw new Error(`Marketplace context requires ${field}.`);
  const hosts = PLATFORM_HOSTS[context.platform];
  if (!hosts) throw new Error(`Unsupported marketplace "${context.platform}".`);
  const expectedChannel = `${context.platform}_`;
  if (!String(context.ordering_channel).startsWith(expectedChannel)) {
    throw new Error(`ordering_channel must start with "${expectedChannel}".`);
  }
  let host;
  try { host = new URL(context.store_url).hostname.toLowerCase(); } catch { throw new Error("store_url must be a valid URL."); }
  if (!hosts.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    throw new Error(`store_url must be on ${hosts.join(" or ")}.`);
  }
}

function stringAt(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function centsAt(item, keys) {
  for (const key of keys) {
    const raw = item?.[key];
    if (["price_cents", "menu_item_price"].includes(key) && typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.round(raw);
    const value = typeof raw === "object" && raw ? raw.amount ?? raw.value ?? raw.price : raw;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value * 100);
    if (typeof value === "string") {
      if (value.includes("+")) continue;
      const match = value.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
      if (match) return Math.round(Number(match[1]) * 100);
    }
  }
  return null;
}

async function apifyJson(path, token, options = {}) {
  const response = await fetch(`https://api.apify.com/v2${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Apify HTTP ${response.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}

function terminal(status) {
  return ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
