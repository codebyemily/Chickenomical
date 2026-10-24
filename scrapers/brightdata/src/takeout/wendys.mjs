import { findChain } from "../chains.mjs";
import { parsePriceCents } from "../extract.mjs";
import { brightDataJson } from "../bright-data.mjs";
import { milesBetween } from "../geo.mjs";
import { toOffer } from "../offer.mjs";

const chain = findChain("wendys");

export async function locateWendys(origin, { radiusMiles, limit }) {
  const url = new URL("https://api.app.prd.wendys.digital/web-client-gateway/LocationServices/rest/nearbyLocations");
  url.searchParams.set("lat", String(origin.latitude));
  url.searchParams.set("lng", String(origin.longitude));
  url.searchParams.set("cntry", "US");
  url.searchParams.set("lang", "en");
  const payload = await brightDataJson(url);
  if (payload.serviceStatus && payload.serviceStatus !== "SUCCESS") {
    throw new Error(`Wendy's locator: ${JSON.stringify(payload.serviceMessages ?? payload.serviceStatus)}`);
  }
  return (payload.data ?? [])
    .filter((store) => store.hasCarryOut !== false && store.lat != null && store.lng != null)
    .map((store) => ({
      id: String(store.id),
      name: store.name || `Wendy's ${store.id}`,
      address: [store.address1, store.city, store.state, store.postal].filter(Boolean).join(", "),
      latitude: Number(store.lat),
      longitude: Number(store.lng),
      distance_miles: roundMiles(store.distance ?? milesBetween(origin, {
        latitude: Number(store.lat),
        longitude: Number(store.lng),
      })),
      pickup: true,
    }))
    .filter((store) => store.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

export async function wendysOffers(store, observedAt) {
  const url = new URL("https://api.app.prd.wendys.digital/web-client-gateway/menu/getSiteMenu");
  url.searchParams.set("siteNum", store.id);
  url.searchParams.set("cntry", "US");
  url.searchParams.set("lang", "en");
  url.searchParams.set("sourceCode", "ORDER.WENDYS.COM");
  url.searchParams.set("version", "1.0.0");
  const payload = await brightDataJson(url);
  return offersFromWendysMenu(payload, store, url.toString(), observedAt);
}

export function offersFromWendysMenu(payload, store, sourceUrl, observedAt) {
  const lists = payload.menuLists ?? payload;
  const sales = new Map((lists.salesItems ?? []).map((item) => [item.salesItemId, item]));
  const offers = [];
  for (const item of lists.menuItems ?? []) {
    if (item.isAvailable === false) continue;
    const salesItem = sales.get(item.defaultItemId);
    const listPriceCents = priceCents(item, salesItem);
    const offer = toOffer(chain, {
      ...storeFields(store),
      original_name: item.displayName || item.name,
      body: item.description ?? "",
      section: salesItem?.categoryName ?? "",
      list_price_cents: listPriceCents,
      href: String(item.menuItemId ?? ""),
    }, sourceUrl, observedAt);
    if (offer) offers.push(offer);
  }
  return offers;
}

function priceCents(item, salesItem) {
  if (salesItem && Number(salesItem.price) > 0) return Math.round(Number(salesItem.price) * 100);
  return parsePriceCents(item.priceRange ?? "");
}

function storeFields(store) {
  return {
    location_id: `wendys:${store.id}`,
    store_name: store.name,
    address: store.address,
    latitude: store.latitude,
    longitude: store.longitude,
    distance_miles: store.distance_miles,
  };
}

function roundMiles(value) {
  return Math.round(Number(value) * 100) / 100;
}
