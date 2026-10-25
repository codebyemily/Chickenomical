import { findChain } from "../chains.mjs";
import { apiJson } from "../bright-data.mjs";
import { milesBetween } from "../geo.mjs";
import { toOffer } from "../offer.mjs";

const chain = findChain("jollibee");
const ORIGIN = "https://www.jollibeefoods.com";

/** Chicken categories with store-level Olo prices once a pickup basket is opened. */
const MENU_SLUGS = [
  "chicken-nuggets",
  "chickenjoy-fried-chicken",
  "chicken-tenders",
  "chicken-sandwiches",
  "family-meals",
  "meal-deals",
  "limited-time-offers",
];

export async function locateJollibee(origin, { radiusMiles, limit }) {
  const query = origin.label
    ?? `${origin.latitude},${origin.longitude}`;
  const url = new URL(`${ORIGIN}/api/location/search`);
  url.searchParams.set("query", query);
  const payload = await apiJson(url, { preferDirect: true });
  return (payload.results ?? [])
    .filter((store) => store.inOlo && store.id && store.yextDisplayCoordinate)
    .map((store) => {
      const latitude = Number(store.yextDisplayCoordinate.latitude);
      const longitude = Number(store.yextDisplayCoordinate.longitude);
      const address = store.address ?? {};
      return {
        id: String(store.id),
        name: store.name || `Jollibee ${store.id}`,
        address: [address.line1, address.city, address.region, address.postalCode].filter(Boolean).join(", "),
        latitude,
        longitude,
        distance_miles: roundMiles(
          store.distanceMiles
            ?? milesBetween(origin, { latitude, longitude }),
        ),
        pickup: true,
      };
    })
    .filter((store) => Number.isFinite(store.latitude) && store.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

export async function jollibeeOffers(store, observedAt) {
  const cookie = await openPickupBasket(store.id);
  const offers = [];
  for (const slug of MENU_SLUGS) {
    const sourceUrl = `${ORIGIN}/menu/${slug}`;
    const products = await fetchCategoryProducts(slug, cookie);
    offers.push(...offersFromJollibeeProducts(products, store, sourceUrl, observedAt));
  }
  return dedupeByOfferKey(offers);
}

export function offersFromJollibeeProducts(products, store, sourceUrl, observedAt) {
  const offers = [];
  for (const product of products ?? []) {
    if (product.Available === false) continue;
    const listPriceCents = dollarsToCents(product.Cost);
    if (listPriceCents == null) continue;
    const card = {
      location_id: `jollibee:${store.id}`,
      store_name: store.name,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      distance_miles: store.distance_miles,
      original_name: product.Name,
      body: product.ShortDescription ?? "",
      section: product.categoryName ?? "",
      list_price_cents: listPriceCents,
      href: String(product.Id ?? product.Slug ?? ""),
    };
    const refinement = chain.refine(card) ?? {};
    if (refinement.skip) continue;
    const offer = toOffer(chain, { ...card, ...refinement }, sourceUrl, observedAt);
    if (offer) offers.push(offer);
  }
  return offers;
}

async function openPickupBasket(locationId) {
  const response = await fetch(`${ORIGIN}/api/basket`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Chickenomical/1.0",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/locations`,
    },
    body: JSON.stringify({ Id: String(locationId) }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Jollibee basket HTTP ${response.status}: ${text.slice(0, 180)}`);
  }
  const cookies = response.headers.getSetCookie?.() ?? [];
  const header = cookies.map((cookie) => cookie.split(";")[0]).filter(Boolean).join("; ");
  if (!/JOL_BASKET_ID=/.test(header)) {
    throw new Error("Jollibee basket response missing JOL_BASKET_ID cookie.");
  }
  return header;
}

async function fetchCategoryProducts(slug, cookie) {
  const response = await fetch(`${ORIGIN}/menu/${slug}`, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Chickenomical/1.0",
      Cookie: cookie,
      Referer: `${ORIGIN}/menu`,
    },
  });
  // A store can omit a category (404) or return an empty Products list.
  if (response.status === 404) return [];
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`Jollibee menu/${slug} HTTP ${response.status}`);
  }
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!match) return [];
  const next = JSON.parse(match[1]);
  const category = next.props?.pageProps?.category;
  const products = category?.Products ?? [];
  return products.map((product) => ({
    ...product,
    categoryName: category?.Name ?? slug,
  }));
}

function dollarsToCents(dollars) {
  const value = Number(dollars);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function dedupeByOfferKey(offers) {
  const seen = new Set();
  return offers.filter((offer) => {
    if (seen.has(offer.offer_key)) return false;
    seen.add(offer.offer_key);
    return true;
  });
}

function roundMiles(value) {
  return Math.round(Number(value) * 100) / 100;
}
