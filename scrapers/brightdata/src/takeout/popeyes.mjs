import { findChain } from "../chains.mjs";
import { apiJson } from "../bright-data.mjs";
import { milesBetween } from "../geo.mjs";
import { toOffer } from "../offer.mjs";

const chain = findChain("popeyes");
const GRAPHQL = "https://www.popeyes.com/graphql";
const HEADERS = {
  accept: "application/json",
  "x-ui-language": "en",
  "x-ui-platform": "web",
  "x-ui-region": "US",
  referer: "https://www.popeyes.com/menu",
};

const HASH = {
  nearby: "1be7666ba6d3a14702470fc07d403e780b0ae562eafdb3d318d7b1ed9723634b",
  menuFlat: "af20c07848d7804865a4c579cf5283e4d92af699d8b1d6478f99b01772a059ff",
  picker: "400829a4316a376f1bf999311373b7d756652524158de73425e96d52a9d930a2",
  combo: "93a521dc885dd520fcf1c6cd0efad9d712bf202a05e904d3a4aec38f97ad91d7",
  item: "764dadb9468eb7ad8f327308018d0374e0c17d5b323b63b61313cb67f80f4a2c",
};

const CHICKEN_SECTIONS = new Set([
  "Limited Time Items",
  "Sandwiches",
  "Signature Chicken",
  "Tenders",
  "Chicken Wraps",
  "Wraps",
  "Classic Bone-In Wings",
  "Wings",
  "Family Meals",
  "$6 Faves",
  "Popeyes Faves Menu",
  "Kids Meals",
]);

export async function locatePopeyes(origin, { radiusMiles, limit }) {
  const url = persistedQuery("GetNearbyRestaurants", HASH.nearby, {
    input: {
      status: "OPEN",
      pagination: { first: Math.max(limit * 5, 10) },
      coordinates: { userLat: origin.latitude, userLng: origin.longitude },
      radiusStrictMode: true,
    },
  });
  const payload = await apiJson(url, { headers: HEADERS, preferDirect: true });
  const nodes = payload.data?.restaurantsV2?.nearby?.nodes ?? [];
  return nodes
    .filter((store) => store.isAvailable !== false && store.latitude != null)
    .map((store) => {
      const address = store.physicalAddress ?? {};
      const latitude = Number(store.latitude);
      const longitude = Number(store.longitude);
      return {
        id: String(store.storeId ?? store.number),
        name: store.name || `Popeyes ${store.storeId}`,
        address: [address.address1, address.city, address.stateProvinceShort || address.stateProvince, address.postalCode]
          .filter(Boolean)
          .join(", "),
        latitude,
        longitude,
        distance_miles: roundMiles(
          store.distanceInMiles
            ?? store.distance
            ?? milesBetween(origin, { latitude, longitude }),
        ),
        pickup: true,
      };
    })
    .filter((store) => store.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

export async function popeyesOffers(store, observedAt) {
  const dayparts = ["All", "allDay", "Late Night", "Main Menu"];
  const menuUrl = persistedQuery("AppMenuMenuFlat", HASH.menuFlat, {
    id: "menu_1",
    storeId: store.id,
    serviceMode: "pickup",
    activeDayparts: dayparts,
  });
  const menuPayload = await apiJson(menuUrl, { headers: HEADERS, preferDirect: true });
  const products = chickenProducts(menuPayload.data?.AppMenuMenu).slice(0, 40);
  const offers = [];
  for (const product of products) {
    const priced = await fetchPricedProduct(product, store.id, dayparts);
    if (!priced) continue;
    const listPriceCents = priceCents(priced.price);
    if (listPriceCents == null) continue;
    const offer = toOffer(chain, {
      location_id: `popeyes:${store.id}`,
      store_name: store.name,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      distance_miles: store.distance_miles,
      original_name: priced.name || product.name,
      body: "",
      section: product.section,
      list_price_cents: listPriceCents,
      href: priced.id || product.id,
    }, menuUrl, observedAt);
    if (offer) offers.push(offer);
  }
  return offers;
}

export function offersFromPopeyesPriced(products, store, sourceUrl, observedAt) {
  const offers = [];
  for (const product of products) {
    const listPriceCents = priceCents(product.price);
    if (listPriceCents == null) continue;
    const offer = toOffer(chain, {
      location_id: `popeyes:${store.id}`,
      store_name: store.name,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      distance_miles: store.distance_miles,
      original_name: product.name,
      body: "",
      section: product.section ?? "",
      list_price_cents: listPriceCents,
      href: product.id,
    }, sourceUrl, observedAt);
    if (offer) offers.push(offer);
  }
  return offers;
}

async function fetchPricedProduct(product, storeId, dayparts) {
  const op = product.type === "combo"
    ? { name: "AppMenuCombo", hash: HASH.combo, key: "AppMenuCombo" }
    : product.type === "item"
      ? { name: "AppMenuItem", hash: HASH.item, key: "AppMenuItem" }
      : { name: "AppMenuPicker", hash: HASH.picker, key: "AppMenuPicker" };
  const variables = op.name === "AppMenuPicker"
    ? { id: product.id, storeId, serviceMode: "pickup", activeDayparts: dayparts }
    : { id: product.id, storeId, serviceMode: "pickup" };
  const url = persistedQuery(op.name, op.hash, variables);
  try {
    const payload = await apiJson(url, { headers: HEADERS, preferDirect: true });
    const node = payload.data?.[op.key];
    if (!node) return null;
    return {
      id: node._id,
      name: node.name?.locale || product.name,
      price: node.price,
      section: product.section,
    };
  } catch {
    return null;
  }
}

function chickenProducts(menu) {
  const products = [];
  for (const section of menu?.options ?? []) {
    const sectionName = section.name?.locale || "";
    if (!CHICKEN_SECTIONS.has(sectionName) && !/chicken|tender|wing|sandwich|wrap/i.test(sectionName)) {
      continue;
    }
    collectProducts(section.options ?? [], sectionName, products);
  }
  return products;
}

function collectProducts(nodes, section, products) {
  for (const node of nodes ?? []) {
    const type = node._type;
    const name = node.name?.locale || "";
    if (type === "section" || type === "bundle") {
      collectProducts(node.options ?? [], name || section, products);
      continue;
    }
    if (!/chicken|tender|wing|sandwich|wrap|nugget|biscuit/i.test(name) && !/Signature|Tenders|Wings|Family/i.test(section)) {
      if (!/chicken|tender|wing|sandwich|wrap/i.test(section)) continue;
    }
    if (/sauce|drink|fries|pie|dessert|mac & cheese|biscuit$/i.test(name) && !/chicken|honey chicken/i.test(name)) {
      continue;
    }
    if (type === "picker" || type === "combo" || type === "item") {
      products.push({ id: node._id, type, name, section });
    }
    if (node.options) collectProducts(node.options, section, products);
  }
}

function persistedQuery(operationName, sha256Hash, variables) {
  const params = new URLSearchParams({
    operationName,
    variables: JSON.stringify(variables),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash } }),
  });
  return `${GRAPHQL}?${params}`;
}

function priceCents(price) {
  if (!price) return null;
  const value = Number(price.default ?? price.min);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function roundMiles(value) {
  return Math.round(Number(value) * 100) / 100;
}
