import { findChain } from "../chains.mjs";
import { apiJson } from "../bright-data.mjs";
import { milesBetween } from "../geo.mjs";
import { toOffer } from "../offer.mjs";

const chain = findChain("chick-fil-a");
const YEXT_KEY = "23469f663d79c395602fba3788145555";
const MENU_DNA = "MENU_DNA_VERSION_3_2";

export async function locateChickfila(origin, { radiusMiles, limit }) {
  const url = new URL("https://liveapi.yext.com/v2/accounts/me/entities/geosearch");
  url.searchParams.set("api_key", YEXT_KEY);
  url.searchParams.set("entityTypes", "restaurant");
  url.searchParams.set("fields", "name,address,geocodedCoordinate,c_locationName,meta");
  url.searchParams.set("limit", String(Math.max(limit * 3, 10)));
  url.searchParams.set("location", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set("radius", String(Math.max(radiusMiles * 2, 25)));
  url.searchParams.set("v", "20200401");
  url.searchParams.set("countryBias", "US");

  const payload = await apiJson(url, { preferDirect: true });
  const entities = payload.response?.entities ?? [];
  const distances = new Map((payload.response?.distances ?? []).map((row) => [row.id, row.distanceMiles]));

  return entities
    .filter((entity) => entity.meta?.id && !/CLOSED/i.test(entity.name ?? "") && !/CLOSED/i.test(entity.c_locationName ?? ""))
    .map((entity) => {
      const id = String(entity.meta.id);
      const latitude = Number(entity.geocodedCoordinate?.latitude);
      const longitude = Number(entity.geocodedCoordinate?.longitude);
      const address = entity.address ?? {};
      return {
        id,
        name: entity.c_locationName || entity.name || `Chick-fil-A ${id}`,
        address: [address.line1, address.city, address.region, address.postalCode].filter(Boolean).join(", "),
        latitude,
        longitude,
        distance_miles: roundMiles(
          distances.get(id)
            ?? milesBetween(origin, { latitude, longitude }),
        ),
        pickup: true,
      };
    })
    .filter((store) => Number.isFinite(store.latitude) && store.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

export async function chickfilaOffers(store, observedAt) {
  const message = {
    menudnaVersion: MENU_DNA,
    locationNumber: store.id.padStart(5, "0"),
    salesChannel: "SALES_CHANNEL_PICKUP",
  };
  const url = new URL("https://commerce.api.my.chick-fil-a.com/cfa.d2c.menu.v2.MenuService/GetDecoupledOldDataMenu");
  url.searchParams.set("connect", "v1");
  url.searchParams.set("encoding", "json");
  url.searchParams.set("message", JSON.stringify(message));

  const headers = {
    accept: "application/json",
    origin: "https://order.chick-fil-a.com",
    referer: "https://order.chick-fil-a.com/menu",
  };

  const payload = await apiJson(url.toString(), { headers, preferDirect: false });
  return offersFromChickfilaMenu(payload, store, url.toString(), observedAt);
}

export function offersFromChickfilaMenu(payload, store, sourceUrl, observedAt) {
  const items = payload.menu?.all ?? {};
  const offers = [];
  for (const [tag, item] of Object.entries(items)) {
    if (!item || item.disabled || item.isSellable === false) continue;
    const name = stripHtml(item.name || tag);
    if (!isChickenItem(tag, name)) continue;
    const listPriceCents = Number(item.itemPrice?.minorUnits);
    if (!Number.isFinite(listPriceCents) || listPriceCents <= 0) continue;
    const offer = toOffer(chain, {
      location_id: `chick-fil-a:${store.id}`,
      store_name: store.name,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      distance_miles: store.distance_miles,
      original_name: name,
      body: item.description ?? "",
      section: item.dayPart ?? "",
      list_price_cents: Math.round(listPriceCents),
      href: tag,
      offer_kind: /_MEAL$|_MEALS$/.test(tag) || /\bmeal\b/i.test(name) ? "combo" : undefined,
    }, sourceUrl, observedAt);
    if (offer) offers.push(offer);
  }
  return offers;
}

function isChickenItem(tag, name) {
  const blob = `${tag} ${name}`.toLowerCase();
  if (/sauce|drink|lemonade|frosted|waffle.?fry|hash.?brown|fruit|cookie|brownie|milk|coffee|tea\b|nugget.?tray.?sauce/.test(blob)) {
    if (!/chicken|nugget|strip|filet|sandwich|minis|wrap/.test(blob)) return false;
  }
  return /chicken|nugget|strip|filet|sandwich|minis|wrap|grilled.?nugget|chick.?n/.test(blob);
}

function stripHtml(value) {
  return String(value).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
}

function roundMiles(value) {
  return Math.round(Number(value) * 100) / 100;
}
