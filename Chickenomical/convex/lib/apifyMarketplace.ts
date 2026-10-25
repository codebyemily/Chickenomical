/**
 * Apify DoorDash / Uber Eats → Chickenomical offers.
 *
 * Actors often return a single menu list price with no separate pickup vs
 * delivery amounts. In that case we emit the same price on both
 * `{platform}_pickup` and `{platform}_delivery` so the visualizer matrix stays
 * complete. When an actor later exposes distinct fulfillment prices, prefer
 * those and stop duplicating.
 */
import { env } from "../_generated/server";
import { toOffer, type MenuOffer } from "./offerShape";

export type MarketplacePlatform = "doordash" | "ubereats";

export type MarketplaceContext = {
  platform: MarketplacePlatform;
  chain_id: string;
  location_id: string;
  store_url: string;
  ordering_channel: string;
  store_name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type DirectStoreRef = {
  id: string;
  address: string;
};

const PLATFORM_HOSTS: Record<MarketplacePlatform, string[]> = {
  doordash: ["doordash.com"],
  ubereats: ["ubereats.com"],
};

const PLATFORM_CHANNELS: Record<MarketplacePlatform, [string, string]> = {
  doordash: ["doordash_pickup", "doordash_delivery"],
  ubereats: ["ubereats_pickup", "ubereats_delivery"],
};

type ApifyEnv =
  | "APIFY_TOKEN"
  | "APIFY_DOORDASH_ACTOR_ID"
  | "APIFY_UBEREATS_ACTOR_ID";

export function marketplaceChannels(platform: MarketplacePlatform): [string, string] {
  return PLATFORM_CHANNELS[platform];
}

export async function runApifyActor({
  actorId,
  input,
  pollIntervalMs = 2_000,
  timeoutMs = 180_000,
}: {
  actorId: string;
  input: Record<string, unknown>;
  pollIntervalMs?: number;
  timeoutMs?: number;
}) {
  const token = requireEnv("APIFY_TOKEN");
  const started = await apifyJson(`/acts/${encodeURIComponent(apiActorId(actorId))}/runs`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const runId = started?.data?.id as string | undefined;
  if (!runId) throw new Error("Apify did not return a run ID.");

  const deadline = Date.now() + timeoutMs;
  let run = started.data as { status?: string; defaultDatasetId?: string };
  while (!terminal(run.status) && Date.now() < deadline) {
    await wait(pollIntervalMs);
    run = (await apifyJson(`/actor-runs/${encodeURIComponent(runId)}`, token)).data;
  }
  if (run.status !== "SUCCEEDED") {
    throw new Error(`Apify run ${runId} ${run.status ?? "did not finish"}.`);
  }
  const datasetId = run.defaultDatasetId;
  if (!datasetId) throw new Error(`Apify run ${runId} has no default dataset.`);
  const dataset = await apifyJson(`/datasets/${encodeURIComponent(datasetId)}/items`, token);
  if (!Array.isArray(dataset)) throw new Error(`Apify dataset ${datasetId} was not an array.`);
  return { runId, datasetId, items: dataset as Record<string, unknown>[] };
}

export function doorDashActorId() {
  return requireEnv("APIFY_DOORDASH_ACTOR_ID");
}

export function uberEatsActorId() {
  return requireEnv("APIFY_UBEREATS_ACTOR_ID");
}

/**
 * Normalize marketplace dataset items once per channel (pickup + delivery).
 * Undifferentiated actor prices are duplicated onto both channels.
 */
export function normalizeMarketplaceDualChannel(
  items: unknown[],
  base: Omit<MarketplaceContext, "ordering_channel">,
  observedAt: string,
): { offers: MenuOffer[]; rejected: Array<{ reason: string }> } {
  const offers: MenuOffer[] = [];
  const rejected: Array<{ reason: string }> = [];
  for (const ordering_channel of marketplaceChannels(base.platform)) {
    const result = normalizeMarketplaceItems(items, { ...base, ordering_channel }, observedAt);
    offers.push(...result.offers);
    rejected.push(...result.rejected);
  }
  return { offers, rejected };
}

export function normalizeMarketplaceItems(
  items: unknown[],
  context: MarketplaceContext,
  observedAt: string,
): { offers: MenuOffer[]; rejected: Array<{ reason: string; item?: unknown }> } {
  validateContext(context);
  const accepted: MenuOffer[] = [];
  const rejected: Array<{ reason: string; item?: unknown }> = [];
  const seen = new Set<string>();

  for (const item of flattenMarketplaceItems(items)) {
    const card = cardFromMarketplaceItem(item, context);
    if (!card) {
      rejected.push({ reason: "No item name or parseable listed price.", item });
      continue;
    }
    const offer = toOffer(
      {
        ...card,
        chain_id: context.chain_id,
        source_provider: "apify",
      },
      card.source_url,
      observedAt,
    );
    if (!offer) {
      rejected.push({ reason: "Not a supported chicken offer.", item });
      continue;
    }
    const identity = `${offer.offer_key}|${card.href ?? ""}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    accepted.push(offer);
  }
  return { offers: accepted, rejected };
}

export function tieLocationId(
  chainId: string,
  platform: MarketplacePlatform,
  marketplaceAddress: string | null | undefined,
  storeId: string | null | undefined,
  directStores: DirectStoreRef[],
): { locationId: string; matchedDirectId: string | null } {
  const match = directStores.find((direct) => sameStoreAddress(direct.address, marketplaceAddress));
  if (match) return { locationId: `${chainId}:${match.id}`, matchedDirectId: match.id };
  const prefix = platform === "doordash" ? "dd" : "ue";
  const slug = storeId ?? addressSlug(marketplaceAddress);
  return { locationId: `${chainId}:${prefix}-${slug}`, matchedDirectId: null };
}

export function sameStoreAddress(left: string | null | undefined, right: string | null | undefined) {
  const leftParts = addressParts(left);
  const rightParts = addressParts(right);
  return Boolean(leftParts.number && leftParts.zip && rightParts.number && rightParts.zip)
    && leftParts.number === rightParts.number
    && leftParts.zip === rightParts.zip;
}

export function addressParts(address: string | null | undefined) {
  const text = String(address ?? "").toUpperCase();
  return {
    number: text.match(/^\s*(\d+)/)?.[1] ?? null,
    zip: text.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null,
  };
}

export function addressSlug(value: string | null | undefined) {
  return String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "unknown";
}

export function assertUberEatsUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("ubereats_store_urls must be valid Uber Eats HTTPS URLs.");
  }
  if (parsed.protocol !== "https:" || (parsed.hostname !== "ubereats.com" && !parsed.hostname.endsWith(".ubereats.com"))) {
    throw new Error("ubereats_store_urls must be valid Uber Eats HTTPS URLs.");
  }
}

function flattenMarketplaceItems(records: unknown[]): Record<string, unknown>[] {
  return records.flatMap((record) => {
    if (!record || typeof record !== "object") return [];
    const row = record as Record<string, unknown>;
    if (hasItemFields(row)) return [row];
    const storeUrl = stringAt(row, ["link", "url", "storeUrl", "store_url", "businessLink"]);
    // DoorDash (dz_omar) — nested menu_categories
    const categories = row.menu_categories ?? row.menuCategories;
    if (categories) return menuItemsFrom(categories, storeUrl);
    // DoorDash (abotapi) — menu: { categories, items: [{ name, priceCents }] }
    if (isObject(row.menu)) {
      const menu = row.menu as Record<string, unknown>;
      if (Array.isArray(menu.items) && menu.items.length) {
        return menuItemsFrom(menu.items, storeUrl);
      }
      if (menu.categories) return menuItemsFrom(menu.categories, storeUrl);
    }
    // Uber Eats (borderline) — menu is an array of sections with catalogItems
    if (Array.isArray(row.menu)) {
      return row.menu.flatMap((section) => {
        if (!isObject(section)) return [];
        const sectionName = stringAt(section, ["catalogName", "name", "title", "subsectionTitle"]);
        return menuItemsFrom(section.catalogItems ?? section.items ?? [], storeUrl, sectionName);
      });
    }
    // Flat item rows (some actors emit one dataset row per dish)
    if (stringAt(row, ["recordType"]) === "menu_item" || stringAt(row, ["itemId", "item_id"])) {
      return hasItemFields(row) ? [row] : [];
    }
    return [];
  });
}

function menuItemsFrom(node: unknown, storeUrl: string | null, section: string | null = null): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap((item) => menuItemsFrom(item, storeUrl, section));
  if (!node || typeof node !== "object") return [];
  const row = node as Record<string, unknown>;
  const nextSection = stringAt(row, ["name", "title", "category_name", "categoryName", "catalogName", "subsectionTitle"]) ?? section;
  if (hasItemFields(row)) {
    return [{
      ...row,
      section: row.section ?? nextSection,
      storeUrl: row.storeUrl ?? storeUrl,
    }];
  }
  const children = row.items ?? row.menu_items ?? row.menuItems ?? row.catalogItems
    ?? row.children ?? row.categories ?? [];
  return menuItemsFrom(children, storeUrl, nextSection);
}

function hasItemFields(value: Record<string, unknown>) {
  return Boolean(stringAt(value, ["itemName", "item_name", "menu_item_name", "name", "title"]))
    && centsAt(value, ["priceCents", "price_cents", "menu_item_price", "priceTagline", "price_text", "priceText", "price_display", "price", "itemPrice", "item_price"]) != null;
}

function cardFromMarketplaceItem(item: Record<string, unknown>, context: MarketplaceContext) {
  const originalName = stringAt(item, ["itemName", "item_name", "menu_item_name", "name", "title"]);
  const price = centsAt(item, ["priceCents", "price_cents", "menu_item_price", "priceTagline", "price_text", "priceText", "price_display", "price", "itemPrice", "item_price"]);
  if (!originalName || price == null) return null;
  const url = stringAt(item, ["itemUrl", "item_url", "storeUrl", "store_url", "restaurantUrl", "restaurant_url", "url"])
    ?? context.store_url;
  return {
    location_id: context.location_id,
    store_name: context.store_name ?? null,
    address: context.address ?? null,
    latitude: context.latitude ?? null,
    longitude: context.longitude ?? null,
    original_name: originalName,
    section: stringAt(item, ["section", "category", "menuSection", "menu_section", "section_name", "subsection_name", "subsectionTitle", "catalogName"]) ?? undefined,
    list_price_cents: price,
    href: stringAt(item, ["itemId", "item_id", "menu_item_id", "id", "uuid"]) ?? undefined,
    ordering_channel: context.ordering_channel,
    source_provider: "apify",
    source_url: url,
  };
}

function validateContext(context: MarketplaceContext) {
  const required: Array<keyof MarketplaceContext> = ["platform", "chain_id", "location_id", "store_url", "ordering_channel"];
  for (const field of required) {
    if (!context[field]) throw new Error(`Marketplace context requires ${field}.`);
  }
  const hosts = PLATFORM_HOSTS[context.platform];
  if (!hosts) throw new Error(`Unsupported marketplace "${context.platform}".`);
  const expectedChannel = `${context.platform}_`;
  if (!String(context.ordering_channel).startsWith(expectedChannel)) {
    throw new Error(`ordering_channel must start with "${expectedChannel}".`);
  }
  let host: string;
  try {
    host = new URL(context.store_url).hostname.toLowerCase();
  } catch {
    throw new Error("store_url must be a valid URL.");
  }
  if (!hosts.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    throw new Error(`store_url must be on ${hosts.join(" or ")}.`);
  }
}

function stringAt(item: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function centsAt(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const raw = item[key];
    if (raw == null) continue;
    // Explicit cent fields, or Uber Eats-style integer minor units (e.g. 2279 = $22.79).
    // priceCents: 0 from DoorDash means "see price string"; ignore non-positive.
    if (["priceCents", "price_cents", "menu_item_price"].includes(key) && typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return Math.round(raw);
    }
    const value = typeof raw === "object" && raw
      ? (raw as Record<string, unknown>).amount
        ?? (raw as Record<string, unknown>).value
        ?? (raw as Record<string, unknown>).price
      : raw;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      // Integers ≥ 50 are almost always already cents from marketplace APIs.
      if (Number.isInteger(value) && value >= 50) return value;
      return Math.round(value * 100);
    }
    if (typeof value === "string") {
      if (/priced by/i.test(value)) continue;
      // DoorDash often shows "$22.79+" (starting price). Treat as the listed amount.
      const match = value.replace(/,/g, "").replace(/\+$/, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
      if (match) return Math.round(Number(match[1]) * 100);
    }
  }
  return null;
}

/** Prefer a street address from nested Uber Eats `location` objects. */
export function storeAddressFromRecord(store: Record<string, unknown>): string | null {
  const nested = isObject(store.location) ? store.location : null;
  return stringAt(store, ["displayAddress", "address", "street_address", "full_address", "addressText", "street"])
    ?? (nested ? stringAt(nested, ["address", "streetAddress", "street", "displayAddress"]) : null);
}

export function storeCoordsFromRecord(store: Record<string, unknown>): { lat: number | null; lng: number | null } {
  const nested = isObject(store.location) ? store.location : null;
  const lat = numberAt(store, ["lat", "latitude"]) ?? (nested ? numberAt(nested, ["latitude", "lat"]) : null);
  const lng = numberAt(store, ["lng", "longitude"]) ?? (nested ? numberAt(nested, ["longitude", "lng"]) : null);
  return { lat, lng };
}

function numberAt(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function requireEnv(name: ApifyEnv) {
  const value = env[name];
  if (!value || value.includes("YOUR-") || value.includes("placeholder")) {
    throw new Error(`${name} is not configured in Convex.`);
  }
  return value;
}

function apiActorId(actorId: string) {
  return actorId.replace("/", "~");
}

async function apifyJson(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.apify.com/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Apify HTTP ${response.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}

function terminal(status: string | undefined) {
  return ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status ?? "");
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
