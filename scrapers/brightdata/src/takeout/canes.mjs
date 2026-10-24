import { findChain } from "../chains.mjs";
import { brightDataJson } from "../bright-data.mjs";
import { toOffer } from "../offer.mjs";

const chain = findChain("raising-canes");
const headers = { clientid: "raisingcanes", "nomnom-platform": "web" };

export async function locateCanes(origin, { radiusMiles, limit }) {
  const url = new URL("https://nomnom-prod-api.raisingcanes.com/restaurants/near");
  url.searchParams.set("lat", String(origin.latitude));
  url.searchParams.set("long", String(origin.longitude));
  url.searchParams.set("radius", String(radiusMiles));
  url.searchParams.set("limit", String(limit));
  const payload = await brightDataJson(url, { headers });
  return (payload.restaurants ?? [])
    .filter((store) => store.canpickup !== false)
    .map((store) => ({
      id: String(store.id),
      name: store.name,
      address: [store.streetaddress, store.city, store.state, store.zip].filter(Boolean).join(", "),
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
      distance_miles: roundMiles(store.distance),
      pickup: true,
    }))
    .filter((store) => store.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

export async function canesOffers(store, observedAt) {
  const sourceUrl = `https://nomnom-prod-api.raisingcanes.com/restaurants/${store.id}/menu`;
  const menu = await brightDataJson(sourceUrl, { headers });
  return offersFromCanesMenu(menu, store, sourceUrl, observedAt);
}

export function offersFromCanesMenu(menu, store, sourceUrl, observedAt) {
  const offers = [];
  for (const category of menu.categories ?? []) {
    for (const product of category.products ?? []) {
      const card = {
        location_id: `raising-canes:${store.id}`,
        store_name: store.name,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        distance_miles: store.distance_miles,
        original_name: product.name,
        body: product.description ?? "",
        section: category.name,
        list_price_cents: dollarsToCents(product.cost),
        href: String(product.id),
      };
      const refinement = chain.refine(card) ?? {};
      if (refinement.skip) continue;
      const offer = toOffer(chain, { ...card, ...refinement }, sourceUrl, observedAt);
      if (offer) offers.push(offer);
    }
  }
  return offers;
}

function dollarsToCents(dollars) {
  const value = Number(dollars);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function roundMiles(value) {
  return Math.round(Number(value) * 100) / 100;
}
