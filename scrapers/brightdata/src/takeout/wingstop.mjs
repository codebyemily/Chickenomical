import { findChain } from "../chains.mjs";
import { brightDataJson } from "../bright-data.mjs";
import { milesBetween } from "../geo.mjs";
import { toOffer } from "../offer.mjs";

const chain = findChain("wingstop");
const CHICKEN_CATEGORIES = new Set([
  "Deals",
  "Wing Combos",
  "Wing Group Packs",
  "Wings By The Piece",
  "Crispy Tenders",
  "Chicken Sandwich",
]);

export async function locateWingstop(origin, { radiusMiles, limit }) {
  const url = new URL("https://api.wingstop.com/restaurants/near");
  url.searchParams.set("lat", String(origin.latitude));
  url.searchParams.set("long", String(origin.longitude));
  url.searchParams.set("radius", String(radiusMiles));
  url.searchParams.set("limit", String(Math.max(limit * 3, limit)));
  const payload = await brightDataJson(url);
  return (payload.restaurants ?? [])
    .filter((store) => store.canpickup && store.latitude != null && !/coming soon/i.test(store.name ?? ""))
    .map((store) => ({
      id: String(store.id),
      name: store.name,
      address: [store.streetaddress, store.city, store.state, store.zip].filter(Boolean).join(", "),
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
      distance_miles: roundMiles(milesBetween(origin, {
        latitude: Number(store.latitude),
        longitude: Number(store.longitude),
      })),
      pickup: true,
    }))
    .filter((store) => store.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

export async function wingstopOffers(store, observedAt) {
  const menuUrl = `https://api.wingstop.com/restaurants/${store.id}/menu`;
  const menu = await brightDataJson(menuUrl);
  const offers = [];
  for (const category of menu.categories ?? []) {
    if (!CHICKEN_CATEGORIES.has(category.name)) continue;
    for (const product of category.products ?? []) {
      const options = Number(product.cost) > 0 ? [] : await pricedOptions(product.id);
      offers.push(...offersFromWingstopProduct(product, options, category.name, store, menuUrl, observedAt));
    }
  }
  return offers;
}

export function offersFromWingstopProduct(product, options, categoryName, store, sourceUrl, observedAt) {
  const priced = (options ?? []).filter((option) => option.adjustsparentprice && Number(option.cost) > 0);
  const distinctCosts = new Set(priced.map((option) => Number(option.cost)));
  const typed = priced.some((option) => /boneless|classic|bone/i.test(option.name ?? ""));
  const rows = priced.length === 0
    ? [{ name: product.name, cost: Number(product.cost), category: null }]
    : distinctCosts.size === 1 && !typed
      ? [{ name: product.name, cost: [...distinctCosts][0], category: null }]
      : priced.map((option) => ({
        name: `${product.name} — ${option.name}`,
        cost: Number(option.cost),
        category: wingCategory(option.name),
      }));

  return rows.flatMap((row) => {
    const offer = toOffer(chain, {
      ...storeFields(store),
      original_name: row.name,
      section: categoryName,
      category: row.category ?? undefined,
      list_price_cents: dollarsToCents(row.cost),
      offer_kind: kindFor(categoryName, product.name),
      href: String(product.id),
    }, sourceUrl, observedAt);
    return offer ? [offer] : [];
  });
}

async function pricedOptions(productId) {
  const payload = await brightDataJson(`https://api.wingstop.com/products/${productId}/modifiers`);
  return (payload.optiongroups ?? []).flatMap((group) => group.options ?? []);
}

function wingCategory(name) {
  if (/boneless/i.test(name)) return "chicken-boneless-wing";
  if (/classic|bone/i.test(name)) return "chicken-wing";
  return null;
}

function kindFor(categoryName, productName) {
  const text = `${categoryName} ${productName}`.toLowerCase();
  if (/combo|\bmeal\b/.test(text)) return "combo";
  if (/group pack|party|crew/.test(text)) return "family_meal";
  return "ala_carte";
}

function storeFields(store) {
  return {
    location_id: `wingstop:${store.id}`,
    store_name: store.name,
    address: store.address,
    latitude: store.latitude,
    longitude: store.longitude,
    distance_miles: store.distance_miles,
  };
}

function dollarsToCents(dollars) {
  if (!Number.isFinite(dollars) || dollars <= 0) return null;
  return Math.round(dollars * 100);
}

function roundMiles(value) {
  return Math.round(Number(value) * 100) / 100;
}
