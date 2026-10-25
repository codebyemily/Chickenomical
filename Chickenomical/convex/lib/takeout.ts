import { geocode, milesBetween } from "./geo";
import { runApifyActor } from "./apifyMarketplace";
import { unlockerExchange, unlockerJson, unlockerText } from "./brightData";
import { dollarsToCents, roundMiles, toOffer, type MenuOffer } from "./offerShape";

export type Origin = { latitude: number; longitude: number; label: string };
export type Store = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_miles: number;
  pickup: boolean;
};

export const SCRAPE_CHAINS = [
  "raising-canes",
  "jollibee",
  "wingstop",
  "popeyes",
  "chick-fil-a",
  "mcdonalds",
  "kfc",
] as const;
export type ScrapeChainId = (typeof SCRAPE_CHAINS)[number];

export const CHAIN_NAMES: Record<ScrapeChainId, string> = {
  "raising-canes": "Raising Cane's",
  jollibee: "Jollibee",
  wingstop: "Wingstop",
  popeyes: "Popeyes",
  "chick-fil-a": "Chick-fil-A",
  mcdonalds: "McDonald's",
  kfc: "KFC",
};

/** Store-level CFA guest menu via Apify (Bright Data Unlocker alone gets 401). */
const CHICKFILA_MENU_ACTOR = "memo23/chick-fil-a-menu-scraper";
const CFA_YEXT_KEY = "23469f663d79c395602fba3788145555";
const CFA_MENU_DNA = "MENU_DNA_VERSION_3_2";

/** DoorDash search slug (lowercase display name). */
export function chainSearchName(chainId: ScrapeChainId) {
  return CHAIN_NAMES[chainId].toLowerCase();
}

export async function resolveOrigin(address: string): Promise<Origin> {
  return geocode(address);
}

export async function scrapeChains(
  origin: Origin,
  { radiusMiles, limit, chains }: { radiusMiles: number; limit: number; chains: ScrapeChainId[] },
  observedAt: string,
) {
  const results: Array<{
    chain_id: ScrapeChainId;
    name: string;
    stores: Array<Store & { offers: MenuOffer[]; offer_count: number; error?: string }>;
    error?: string;
  }> = [];
  const offers: MenuOffer[] = [];

  // Parallelize first-party chains — Bright Data phase should finish before Apify.
  const settled = await Promise.all(chains.map(async (chainId) => {
    try {
      const stores = await locate(chainId, origin, radiusMiles, limit);
      const scraped = [];
      for (const store of stores) {
        try {
          const storeOffers = await menuOffers(chainId, store, observedAt);
          scraped.push({ ...store, offers: storeOffers, offer_count: storeOffers.length });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          scraped.push({ ...store, offers: [], offer_count: 0, error: message });
        }
      }
      return { chain_id: chainId, name: CHAIN_NAMES[chainId], stores: scraped };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { chain_id: chainId, name: CHAIN_NAMES[chainId], stores: [], error: message };
    }
  }));

  for (const result of settled) {
    results.push(result);
    for (const store of result.stores) offers.push(...store.offers);
  }

  return { results, offers };
}

async function locate(chainId: ScrapeChainId, origin: Origin, radiusMiles: number, limit: number) {
  switch (chainId) {
    case "raising-canes":
      return locateCanes(origin, radiusMiles, limit);
    case "jollibee":
      return locateJollibee(origin, radiusMiles, limit);
    case "wingstop":
      return locateWingstop(origin, radiusMiles, limit);
    case "popeyes":
      return locatePopeyes(origin, radiusMiles, limit);
    case "chick-fil-a":
      return locateChickfila(origin, radiusMiles, limit);
    case "mcdonalds":
      return locateMcdonalds(origin, radiusMiles, limit);
    case "kfc":
      return locateKfc(origin, radiusMiles, limit);
  }
}

async function menuOffers(chainId: ScrapeChainId, store: Store, observedAt: string) {
  switch (chainId) {
    case "raising-canes":
      return canesOffers(store, observedAt);
    case "jollibee":
      return jollibeeOffers(store, observedAt);
    case "wingstop":
      return wingstopOffers(store, observedAt);
    case "popeyes":
      return popeyesOffers(store, observedAt);
    case "chick-fil-a":
      return chickfilaOffers(store, observedAt);
    case "mcdonalds":
      return mcdonaldsOffers(store, observedAt);
    case "kfc":
      return kfcOffers(store, observedAt);
  }
}

async function locateCanes(origin: Origin, radiusMiles: number, limit: number) {
  const url = new URL("https://nomnom-prod-api.raisingcanes.com/restaurants/near");
  url.searchParams.set("lat", String(origin.latitude));
  url.searchParams.set("long", String(origin.longitude));
  url.searchParams.set("radius", String(radiusMiles));
  url.searchParams.set("limit", String(limit));
  const payload = await unlockerJson(url, {
    headers: { clientid: "raisingcanes", "nomnom-platform": "web" },
  });
  return (payload.restaurants ?? [])
    .filter((store: { canpickup?: boolean }) => store.canpickup !== false)
    .map((store: Record<string, unknown>) => ({
      id: String(store.id),
      name: String(store.name ?? `Raising Cane's ${store.id}`),
      address: [store.streetaddress, store.city, store.state, store.zip].filter(Boolean).join(", "),
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
      distance_miles: roundMiles(Number(store.distance)),
      pickup: true,
    }))
    .filter((store: Store) => store.distance_miles <= radiusMiles)
    .sort((a: Store, b: Store) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

async function canesOffers(store: Store, observedAt: string) {
  const sourceUrl = `https://nomnom-prod-api.raisingcanes.com/restaurants/${store.id}/menu`;
  const menu = await unlockerJson(sourceUrl, {
    headers: { clientid: "raisingcanes", "nomnom-platform": "web" },
  });
  const offers: MenuOffer[] = [];
  for (const category of menu.categories ?? []) {
    for (const product of category.products ?? []) {
      const name = String(product.name ?? "");
      if (/sauce|drink|tea|lemonade|extra/i.test(name) && !/chicken|finger|sandwich|box|combo|tailgate/i.test(name)) {
        continue;
      }
      const offer = toOffer({
        chain_id: "raising-canes",
        location_id: `raising-canes:${store.id}`,
        store_name: store.name,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        distance_miles: store.distance_miles,
        original_name: name,
        body: String(product.description ?? ""),
        section: String(category.name ?? ""),
        list_price_cents: dollarsToCents(product.cost),
        href: String(product.id ?? ""),
      }, sourceUrl, observedAt);
      if (offer) offers.push(offer);
    }
  }
  return offers;
}

async function locateJollibee(origin: Origin, radiusMiles: number, limit: number) {
  // City labels sometimes miss Olo-enabled stores; fall back to lat,lng.
  const queries = [
    origin.label,
    `${origin.latitude},${origin.longitude}`,
    origin.label.split(",")[0]?.trim(),
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

  let results: unknown[] = [];
  let lastError: unknown;
  for (const query of queries) {
    try {
      const url = new URL("https://www.jollibeefoods.com/api/location/search");
      url.searchParams.set("query", query);
      const payload = await unlockerJson(url, { preferDirect: true });
      results = payload.results ?? [];
      if (results.length) break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!results.length && lastError) throw lastError;

  type JollibeeHit = {
    inOlo?: boolean;
    id?: string;
    name?: string;
    distanceMiles?: number;
    address?: { line1?: string; city?: string; region?: string; postalCode?: string };
    yextDisplayCoordinate?: { latitude: number; longitude: number };
  };

  return (results as JollibeeHit[])
    .filter((store) => store.inOlo && store.id && store.yextDisplayCoordinate)
    .map((store) => {
      const latitude = Number(store.yextDisplayCoordinate!.latitude);
      const longitude = Number(store.yextDisplayCoordinate!.longitude);
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
      } satisfies Store;
    })
    .filter((store) => Number.isFinite(store.latitude) && store.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

async function jollibeeOffers(store: Store, observedAt: string) {
  const cookie = await openJollibeeBasket(store.id);
  const slugs = [
    "chicken-nuggets",
    "chickenjoy-fried-chicken",
    "chicken-tenders",
    "chicken-sandwiches",
    "family-meals",
    "meal-deals",
    "limited-time-offers",
  ];
  const offers: MenuOffer[] = [];
  const seen = new Set<string>();
  // Parallel category fetches — empty/404 categories are soft-skipped.
  const categoryResults = await Promise.all(slugs.map(async (slug) => {
    try {
      return { slug, products: await fetchJollibeeCategory(slug, cookie) };
    } catch (error) {
      console.warn(`Jollibee ${store.id} menu/${slug}: ${error instanceof Error ? error.message : error}`);
      return { slug, products: [] as Record<string, unknown>[] };
    }
  }));

  for (const { slug, products } of categoryResults) {
    const sourceUrl = `https://www.jollibeefoods.com/menu/${slug}`;
    for (const product of products) {
      if (product.Available === false) continue;
      const name = String(product.Name ?? "");
      if (/spaghetti|palabok|burger steak|peach mango|pie\b|utensil|napkin/i.test(name) && !/chicken/i.test(name)) {
        continue;
      }
      let category: string | null | undefined;
      if (/chickenjoy|bucket treat|pc chickenjoy/i.test(name)) category = "chicken-bucket";
      else if (/tender/i.test(name)) category = "chicken-tender";
      else if (/nugget/i.test(name)) category = "chicken-nugget";
      else if (/sandwich/i.test(name)) category = "chicken-sandwich";
      const offer = toOffer({
        chain_id: "jollibee",
        location_id: `jollibee:${store.id}`,
        store_name: store.name,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        distance_miles: store.distance_miles,
        original_name: name,
        body: String(product.ShortDescription ?? ""),
        section: String(product.categoryName ?? slug),
        list_price_cents: dollarsToCents(product.Cost),
        category,
        href: String(product.Id ?? product.Slug ?? ""),
      }, sourceUrl, observedAt);
      if (!offer || seen.has(offer.offer_key)) continue;
      seen.add(offer.offer_key);
      offers.push(offer);
    }
  }
  if (offers.length === 0) {
    throw new Error(`Jollibee ${store.id} returned no priced chicken offers after basket open.`);
  }
  return offers;
}

async function openJollibeeBasket(locationId: string) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: "https://www.jollibeefoods.com",
    Referer: "https://www.jollibeefoods.com/locations",
  };
  const body = JSON.stringify({ Id: String(locationId) });
  // Direct first (cookie jar works), Unlocker fallback when Convex IP is blocked.
  const exchange = await unlockerExchange("https://www.jollibeefoods.com/api/basket", {
    preferDirect: true,
    method: "POST",
    headers,
    body,
  });
  if (!/JOL_BASKET_ID=/.test(exchange.setCookie)) {
    throw new Error("Jollibee basket response missing JOL_BASKET_ID cookie.");
  }
  return exchange.setCookie;
}

async function fetchJollibeeCategory(slug: string, cookie: string) {
  try {
    const html = await unlockerText(`https://www.jollibeefoods.com/menu/${slug}`, {
      preferDirect: true,
      headers: {
        Accept: "text/html",
        Cookie: cookie,
        Referer: "https://www.jollibeefoods.com/menu",
      },
    });
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (!match) return [];
    const next = JSON.parse(match[1]);
    const category = next.props?.pageProps?.category;
    return (category?.Products ?? []).map((product: Record<string, unknown>) => ({
      ...product,
      categoryName: category?.Name ?? slug,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/\b404\b/.test(message)) return [];
    throw error;
  }
}

async function locateWingstop(origin: Origin, radiusMiles: number, limit: number) {
  const url = new URL("https://api.wingstop.com/restaurants/near");
  url.searchParams.set("lat", String(origin.latitude));
  url.searchParams.set("long", String(origin.longitude));
  url.searchParams.set("radius", String(radiusMiles));
  url.searchParams.set("limit", String(Math.max(limit * 3, limit)));
  const payload = await unlockerJson(url);
  return (payload.restaurants ?? [])
    .filter((store: { canpickup?: boolean; latitude?: number; name?: string }) =>
      store.canpickup && store.latitude != null && !/coming soon/i.test(store.name ?? ""))
    .map((store: Record<string, unknown>) => ({
      id: String(store.id),
      name: String(store.name),
      address: [store.streetaddress, store.city, store.state, store.zip].filter(Boolean).join(", "),
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
      distance_miles: roundMiles(milesBetween(origin, {
        latitude: Number(store.latitude),
        longitude: Number(store.longitude),
      })),
      pickup: true,
    }))
    .filter((store: Store) => store.distance_miles <= radiusMiles)
    .sort((a: Store, b: Store) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

async function wingstopOffers(store: Store, observedAt: string) {
  const chickenCategories = new Set([
    "Deals", "Wing Combos", "Wing Group Packs", "Wings By The Piece", "Crispy Tenders", "Chicken Sandwich",
  ]);
  const menuUrl = `https://api.wingstop.com/restaurants/${store.id}/menu`;
  const menu = await unlockerJson(menuUrl);
  const offers: MenuOffer[] = [];
  for (const category of menu.categories ?? []) {
    if (!chickenCategories.has(category.name)) continue;
    for (const product of category.products ?? []) {
      let options: Array<{ name?: string; cost?: number; adjustsparentprice?: boolean }> = [];
      if (!(Number(product.cost) > 0)) {
        try {
          const payload = await unlockerJson(`https://api.wingstop.com/products/${product.id}/modifiers`);
          options = (payload.optiongroups ?? []).flatMap((group: { options?: unknown[] }) => group.options ?? []);
        } catch {
          options = [];
        }
      }
      const priced = options.filter((option) => option.adjustsparentprice && Number(option.cost) > 0);
      const distinctCosts = new Set(priced.map((option) => Number(option.cost)));
      const typed = priced.some((option) => /boneless|classic|bone/i.test(option.name ?? ""));
      const rows = priced.length === 0
        ? [{ name: String(product.name), cost: Number(product.cost), category: null as string | null }]
        : distinctCosts.size === 1 && !typed
          ? [{ name: String(product.name), cost: [...distinctCosts][0], category: null }]
          : priced.map((option) => ({
            name: `${product.name} — ${option.name}`,
            cost: Number(option.cost),
            category: /boneless/i.test(option.name ?? "")
              ? "chicken-boneless-wing"
              : /classic|bone/i.test(option.name ?? "")
                ? "chicken-wing"
                : null,
          }));
      for (const row of rows) {
        const kindText = `${category.name} ${product.name}`.toLowerCase();
        const offer = toOffer({
          chain_id: "wingstop",
          location_id: `wingstop:${store.id}`,
          store_name: store.name,
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
          distance_miles: store.distance_miles,
          original_name: row.name,
          section: String(category.name ?? ""),
          category: row.category ?? undefined,
          list_price_cents: dollarsToCents(row.cost),
          offer_kind: /combo|\bmeal\b/.test(kindText)
            ? "combo"
            : /group pack|party|crew/.test(kindText)
              ? "family_meal"
              : "ala_carte",
          href: String(product.id),
        }, menuUrl, observedAt);
        if (offer) offers.push(offer);
      }
    }
  }
  return offers;
}

async function locatePopeyes(origin: Origin, radiusMiles: number, limit: number) {
  const hash = "1be7666ba6d3a14702470fc07d403e780b0ae562eafdb3d318d7b1ed9723634b";
  const url = persistedQuery("GetNearbyRestaurants", hash, {
    input: {
      status: "OPEN",
      pagination: { first: Math.max(limit * 5, 10) },
      coordinates: { userLat: origin.latitude, userLng: origin.longitude },
      radiusStrictMode: true,
    },
  });
  const payload = await unlockerJson(url, {
    headers: {
      accept: "application/json",
      "x-ui-language": "en",
      "x-ui-platform": "web",
      "x-ui-region": "US",
      referer: "https://www.popeyes.com/menu",
    },
    preferDirect: true,
  });
  const nodes = payload.data?.restaurantsV2?.nearby?.nodes ?? [];
  return nodes
    .filter((store: { isAvailable?: boolean; latitude?: number }) => store.isAvailable !== false && store.latitude != null)
    .map((store: Record<string, unknown>) => {
      const address = (store.physicalAddress ?? {}) as Record<string, unknown>;
      const latitude = Number(store.latitude);
      const longitude = Number(store.longitude);
      return {
        id: String(store.storeId ?? store.number),
        name: String(store.name || `Popeyes ${store.storeId}`),
        address: [address.address1, address.city, address.stateProvinceShort || address.stateProvince, address.postalCode]
          .filter(Boolean)
          .join(", "),
        latitude,
        longitude,
        distance_miles: roundMiles(
          Number(store.distanceInMiles ?? store.distance)
            || milesBetween(origin, { latitude, longitude }),
        ),
        pickup: true,
      };
    })
    .filter((store: Store) => store.distance_miles <= radiusMiles)
    .sort((a: Store, b: Store) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

async function popeyesOffers(store: Store, observedAt: string) {
  const hashes = {
    menuFlat: "af20c07848d7804865a4c579cf5283e4d92af699d8b1d6478f99b01772a059ff",
    picker: "400829a4316a376f1bf999311373b7d756652524158de73425e96d52a9d930a2",
    combo: "93a521dc885dd520fcf1c6cd0efad9d712bf202a05e904d3a4aec38f97ad91d7",
    item: "764dadb9468eb7ad8f327308018d0374e0c17d5b323b63b61313cb67f80f4a2c",
  };
  const headers = {
    accept: "application/json",
    "x-ui-language": "en",
    "x-ui-platform": "web",
    "x-ui-region": "US",
    referer: "https://www.popeyes.com/menu",
  };
  const dayparts = ["All", "allDay", "Late Night", "Main Menu"];
  const menuUrl = persistedQuery("AppMenuMenuFlat", hashes.menuFlat, {
    id: "menu_1",
    storeId: store.id,
    serviceMode: "pickup",
    activeDayparts: dayparts,
  });
  const menuPayload = await unlockerJson(menuUrl, { headers, preferDirect: true });
  const products = chickenPopeyesProducts(menuPayload.data?.AppMenuMenu).slice(0, 40);
  const offers: MenuOffer[] = [];
  for (const product of products) {
    const priced = await fetchPopeyesPriced(product, store.id, dayparts, hashes, headers);
    if (!priced) continue;
    const listPriceCents = pricePopeyesCents(priced.price);
    if (listPriceCents == null) continue;
    const offer = toOffer({
      chain_id: "popeyes",
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

async function fetchPopeyesPriced(
  product: { id: string; type: string; name: string; section: string },
  storeId: string,
  dayparts: string[],
  hashes: Record<string, string>,
  headers: Record<string, string>,
) {
  const op = product.type === "combo"
    ? { name: "AppMenuCombo", hash: hashes.combo, key: "AppMenuCombo" }
    : product.type === "item"
      ? { name: "AppMenuItem", hash: hashes.item, key: "AppMenuItem" }
      : { name: "AppMenuPicker", hash: hashes.picker, key: "AppMenuPicker" };
  const variables = op.name === "AppMenuPicker"
    ? { id: product.id, storeId, serviceMode: "pickup", activeDayparts: dayparts }
    : { id: product.id, storeId, serviceMode: "pickup" };
  try {
    const payload = await unlockerJson(persistedQuery(op.name, op.hash, variables), {
      headers,
      preferDirect: true,
    });
    const node = payload.data?.[op.key];
    if (!node) return null;
    return {
      id: node._id as string,
      name: (node.name?.locale || product.name) as string,
      price: node.price,
      section: product.section,
    };
  } catch {
    return null;
  }
}

function chickenPopeyesProducts(menu: { options?: unknown[] } | undefined) {
  const products: Array<{ id: string; type: string; name: string; section: string }> = [];
  const chickenSections = new Set([
    "Limited Time Items", "Sandwiches", "Signature Chicken", "Tenders", "Chicken Wraps",
    "Wraps", "Classic Bone-In Wings", "Wings", "Family Meals", "$6 Faves", "Popeyes Faves Menu", "Kids Meals",
  ]);
  for (const section of menu?.options ?? []) {
    const node = section as { name?: { locale?: string }; options?: unknown[]; _type?: string; _id?: string };
    const sectionName = node.name?.locale || "";
    if (!chickenSections.has(sectionName) && !/chicken|tender|wing|sandwich|wrap/i.test(sectionName)) continue;
    collectPopeyes(node.options ?? [], sectionName, products);
  }
  return products;
}

function collectPopeyes(
  nodes: unknown[],
  section: string,
  products: Array<{ id: string; type: string; name: string; section: string }>,
) {
  for (const raw of nodes ?? []) {
    const node = raw as { _type?: string; name?: { locale?: string }; _id?: string; options?: unknown[] };
    const type = node._type;
    const name = node.name?.locale || "";
    if (type === "section" || type === "bundle") {
      collectPopeyes(node.options ?? [], name || section, products);
      continue;
    }
    if (!/chicken|tender|wing|sandwich|wrap|nugget|biscuit/i.test(name) && !/Signature|Tenders|Wings|Family/i.test(section)) {
      if (!/chicken|tender|wing|sandwich|wrap/i.test(section)) continue;
    }
    if (/sauce|drink|fries|pie|dessert|mac & cheese|biscuit$/i.test(name) && !/chicken|honey chicken/i.test(name)) {
      continue;
    }
    if ((type === "picker" || type === "combo" || type === "item") && node._id) {
      products.push({ id: node._id, type, name, section });
    }
    if (node.options) collectPopeyes(node.options, section, products);
  }
}

function persistedQuery(operationName: string, sha256Hash: string, variables: unknown) {
  const params = new URLSearchParams({
    operationName,
    variables: JSON.stringify(variables),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash } }),
  });
  return `https://www.popeyes.com/graphql?${params}`;
}

function pricePopeyesCents(price: { default?: number; min?: number } | null | undefined) {
  if (!price) return null;
  const value = Number(price.default ?? price.min);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

async function locateChickfila(origin: Origin, radiusMiles: number, limit: number) {
  const url = new URL("https://liveapi.yext.com/v2/accounts/me/entities/geosearch");
  url.searchParams.set("api_key", CFA_YEXT_KEY);
  url.searchParams.set("entityTypes", "restaurant");
  // Omit fields= so we get pickup flags (airport LIC stores often lack mobile pickup menus).
  url.searchParams.set("limit", String(Math.max(limit * 8, 20)));
  url.searchParams.set("location", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set("radius", String(Math.max(radiusMiles * 2, 25)));
  url.searchParams.set("v", "20200401");
  url.searchParams.set("countryBias", "US");

  const payload = await unlockerJson(url, { preferDirect: true });
  const entities = payload.response?.entities ?? [];
  const distances = new Map<string, number>(
    (payload.response?.distances ?? []).map((row: { id: string; distanceMiles: number }) => [String(row.id), Number(row.distanceMiles)]),
  );

  return entities
    .filter((entity: Record<string, unknown>) => {
      const meta = entity.meta as { id?: string } | undefined;
      const name = String(entity.c_locationName ?? entity.name ?? "");
      if (!meta?.id || /CLOSED/i.test(name) || entity.closed === true || entity.c_status === "CLOSED") return false;
      // Airport / food-court licenses often have no orderable pickup menu.
      if (entity.c_airport === true || entity.c_offersPickup === false || entity.c_carryout === false) return false;
      if (entity.c_offersOnlineOrdering === false && entity.c_offersMobileOrdering === false) return false;
      return true;
    })
    .map((entity: Record<string, unknown>) => {
      const meta = entity.meta as { id: string };
      const id = String(entity.c_eID ?? meta.id);
      const coords = (entity.geocodedCoordinate ?? entity.yextDisplayCoordinate ?? {}) as {
        latitude?: number;
        longitude?: number;
      };
      const latitude = Number(coords.latitude);
      const longitude = Number(coords.longitude);
      const address = (entity.address ?? {}) as {
        line1?: string; city?: string; region?: string; postalCode?: string;
      };
      return {
        id,
        name: String(entity.c_locationName || entity.name || `Chick-fil-A ${id}`),
        address: [address.line1, address.city, address.region, address.postalCode].filter(Boolean).join(", "),
        latitude,
        longitude,
        distance_miles: roundMiles(
          distances.get(String(meta.id))
            ?? distances.get(id)
            ?? milesBetween(origin, { latitude, longitude }),
        ),
        pickup: true,
      } satisfies Store;
    })
    .filter((store: Store) => Number.isFinite(store.latitude) && store.distance_miles <= radiusMiles)
    .sort((a: Store, b: Store) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

async function chickfilaOffers(store: Store, observedAt: string) {
  try {
    return await chickfilaOffersUnlocker(store, observedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/401|403|unauthenticated|Unauthorized/i.test(message)) throw error;
    console.warn(`Chick-fil-A ${store.id} Unlocker menu blocked (${message.slice(0, 80)}); falling back to Apify guest scraper.`);
    return chickfilaOffersApify(store, observedAt);
  }
}

async function chickfilaOffersUnlocker(store: Store, observedAt: string) {
  const message = {
    menudnaVersion: CFA_MENU_DNA,
    locationNumber: store.id.padStart(5, "0"),
    salesChannel: "SALES_CHANNEL_PICKUP",
  };
  const url = new URL("https://commerce.api.my.chick-fil-a.com/cfa.d2c.menu.v2.MenuService/GetDecoupledOldDataMenu");
  url.searchParams.set("connect", "v1");
  url.searchParams.set("encoding", "json");
  url.searchParams.set("message", JSON.stringify(message));
  const payload = await unlockerJson(url.toString(), {
    preferDirect: false,
    headers: {
      accept: "application/json",
      origin: "https://order.chick-fil-a.com",
      referer: "https://order.chick-fil-a.com/menu",
    },
  });
  return offersFromChickfilaMenu(payload, store, url.toString(), observedAt);
}

async function chickfilaOffersApify(store: Store, observedAt: string) {
  const locationNumber = store.id.replace(/\D/g, "").padStart(5, "0");
  const run = await runApifyActor({
    actorId: CHICKFILA_MENU_ACTOR,
    input: {
      // Prefer address resolution when location numbers are airport/non-orderable.
      addresses: store.address ? [store.address] : [],
      locationNumbers: [locationNumber],
      maxStoresPerAddress: 1,
      includeUnpriced: false,
      maxItems: 200,
    },
    timeoutMs: 180_000,
  });
  const offers: MenuOffer[] = [];
  const seen = new Set<string>();
  for (const item of run.items) {
    if (String(item.type ?? "menu-item") === "store") continue;
    const name = stripHtml(String(item.itemName ?? item.name ?? ""));
    const tag = String(item.tag ?? item.itemId ?? "");
    if (!name || !isChickfilaChicken(tag, name)) continue;
    const price = Number(item.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const sourceUrl = `https://order.chick-fil-a.com/menu?location=${locationNumber}`;
    const offer = toOffer({
      chain_id: "chick-fil-a",
      location_id: `chick-fil-a:${store.id}`,
      store_name: String(item.storeName ?? store.name),
      address: [
        item.storeAddress,
        item.storeCity,
        item.storeState,
        item.storePostalCode,
      ].filter(Boolean).join(", ") || store.address,
      latitude: numberOr(item.storeLatitude, store.latitude),
      longitude: numberOr(item.storeLongitude, store.longitude),
      distance_miles: store.distance_miles,
      original_name: name,
      body: String(item.description ?? ""),
      section: String(item.categoryName ?? item.dayPart ?? ""),
      list_price_cents: Math.round(price * 100),
      offer_kind: item.isMeal === true || /_MEAL$|_MEALS$/i.test(tag) || /\bmeal\b/i.test(name) ? "combo" : undefined,
      href: tag,
      source_provider: "apify",
    }, sourceUrl, observedAt);
    if (!offer || seen.has(offer.offer_key)) continue;
    seen.add(offer.offer_key);
    offers.push(offer);
  }
  if (offers.length === 0) {
    throw new Error(`Chick-fil-A ${store.id} Apify guest menu returned no priced chicken offers.`);
  }
  return offers;
}

function offersFromChickfilaMenu(
  payload: { menu?: { all?: Record<string, Record<string, unknown>> } },
  store: Store,
  sourceUrl: string,
  observedAt: string,
) {
  const items = payload.menu?.all ?? {};
  const offers: MenuOffer[] = [];
  for (const [tag, item] of Object.entries(items)) {
    if (!item || item.disabled || item.isSellable === false) continue;
    const name = stripHtml(String(item.name ?? tag));
    if (!isChickfilaChicken(tag, name)) continue;
    const listPriceCents = Number((item.itemPrice as { minorUnits?: number } | undefined)?.minorUnits);
    if (!Number.isFinite(listPriceCents) || listPriceCents <= 0) continue;
    const offer = toOffer({
      chain_id: "chick-fil-a",
      location_id: `chick-fil-a:${store.id}`,
      store_name: store.name,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      distance_miles: store.distance_miles,
      original_name: name,
      body: String(item.description ?? ""),
      section: String(item.dayPart ?? ""),
      list_price_cents: Math.round(listPriceCents),
      offer_kind: /_MEAL$|_MEALS$/.test(tag) || /\bmeal\b/i.test(name) ? "combo" : undefined,
      href: tag,
    }, sourceUrl, observedAt);
    if (offer) offers.push(offer);
  }
  if (offers.length === 0) {
    throw new Error(`Chick-fil-A ${store.id} Unlocker menu returned no priced chicken offers.`);
  }
  return offers;
}

function isChickfilaChicken(tag: string, name: string) {
  const blob = `${tag} ${name}`.toLowerCase();
  if (/sauce|drink|lemonade|frosted|waffle.?fry|hash.?brown|fruit|cookie|brownie|milk|coffee|tea\b|nugget.?tray.?sauce|mac.?cheese|side salad|chips|waffle$|gluten.?free.?bun|veggie/.test(blob)) {
    if (!/chicken|nugget|strip|filet|sandwich|minis|wrap/.test(blob)) return false;
  }
  return /chicken|nugget|strip|filet|sandwich|minis|wrap|grilled.?nugget|chick.?n/.test(blob);
}

async function locateMcdonalds(origin: Origin, radiusMiles: number, limit: number) {
  const url = new URL("https://www.mcdonalds.com/googleappsv2/geolocation");
  url.searchParams.set("latitude", String(origin.latitude));
  url.searchParams.set("longitude", String(origin.longitude));
  url.searchParams.set("radius", String(radiusMiles));
  url.searchParams.set("maxResults", String(Math.max(limit * 3, limit)));
  url.searchParams.set("country", "us");
  url.searchParams.set("language", "en-us");
  const headers = {
    Accept: "application/json",
    Referer: "https://www.mcdonalds.com/us/en-us/restaurant-locator.html",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
  // Prefer Unlocker — McD edge often 403s bare Convex egress.
  const payload = await unlockerJson(url, { headers, preferDirect: false });
  return (payload.features ?? [])
    .map((feature: {
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: [number, number] };
    }) => {
      const props = feature.properties ?? {};
      const [longitude, latitude] = feature.geometry?.coordinates ?? [];
      return {
        id: String(props.identifierValue ?? props.id ?? ""),
        name: String(props.longDescription || props.addressLine1 || `McDonald's`),
        address: [props.addressLine1, props.customAddress || props.addressLine3].filter(Boolean).join(", "),
        latitude: Number(latitude),
        longitude: Number(longitude),
        distance_miles: roundMiles(milesBetween(origin, { latitude: Number(latitude), longitude: Number(longitude) })),
        pickup: true,
      } satisfies Store;
    })
    .filter((store: Store) => store.id && Number.isFinite(store.latitude) && store.distance_miles <= radiusMiles)
    .sort((a: Store, b: Store) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

async function mcdonaldsOffers(store: Store, observedAt: string) {
  const sourceUrl = `https://us-prod.api.mcd.com/us/gma/api/v1/restaurants/${store.id}/menus`;
  const payload = await unlockerJson(sourceUrl, {
    headers: {
      accept: "application/json",
      "mcd-clientid": "GMA",
      "mcd-marketid": "US",
      "mcd-uuid": cryptoRandom(),
    },
  });
  const offers = offersFromMcdonaldsMenu(payload, store, sourceUrl, observedAt);
  if (offers.length === 0) {
    throw new Error(
      `McDonald's ${store.id}: GMA menu returned no priced chicken items (web pickup is app-gated; Unlocker may need a fresh GMA session).`,
    );
  }
  return offers;
}

function offersFromMcdonaldsMenu(
  payload: Record<string, unknown>,
  store: Store,
  sourceUrl: string,
  observedAt: string,
) {
  const offers: MenuOffer[] = [];
  const seen = new Set<string>();
  const roots = [
    payload.menu,
    payload.data,
    payload.restaurant,
    payload,
  ];
  for (const root of roots) {
    walkMcdonalds(root, (name, priceCents, href, section) => {
      if (!/chicken|nugget|mccrispy|mcchicken|strip|tenders?|sandwich|wrap/i.test(name)) return;
      if (/sauce|drink|fries|cola|coffee|shake|apple|cookie|pie\b/i.test(name) && !/chicken|nugget|mccrispy|mcchicken/i.test(name)) {
        return;
      }
      if (priceCents == null || priceCents <= 0) return;
      const offer = toOffer({
        chain_id: "mcdonalds",
        location_id: `mcdonalds:${store.id}`,
        store_name: store.name,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        distance_miles: store.distance_miles,
        original_name: name,
        section: section ?? "",
        list_price_cents: priceCents,
        href: href ?? name,
      }, sourceUrl, observedAt);
      if (!offer || seen.has(offer.offer_key)) return;
      seen.add(offer.offer_key);
      offers.push(offer);
    });
  }
  return offers;
}

function walkMcdonalds(
  node: unknown,
  emit: (name: string, priceCents: number | null, href: string | null, section: string | null) => void,
  section: string | null = null,
) {
  if (Array.isArray(node)) {
    for (const child of node) walkMcdonalds(child, emit, section);
    return;
  }
  if (!node || typeof node !== "object") return;
  const row = node as Record<string, unknown>;
  const name = String(row.name ?? row.productName ?? row.item_name ?? row.title ?? "");
  const nextSection = String(row.category ?? row.categoryName ?? row.family_group ?? section ?? "") || section;
  const priceCents = mcdonaldsPriceCents(row);
  if (name && priceCents != null) {
    emit(name, priceCents, String(row.id ?? row.productCode ?? row.item_id ?? ""), nextSection);
  }
  for (const key of ["categories", "products", "items", "menuItems", "meals", "children", "subcategories", "data"]) {
    if (row[key] != null) walkMcdonalds(row[key], emit, nextSection);
  }
}

function mcdonaldsPriceCents(row: Record<string, unknown>) {
  const candidates = [
    row.pickup_price,
    row.eat_in_price,
    row.price,
    (row.price as { amount?: number } | undefined)?.amount,
    (row.productPrice as { price?: number } | undefined)?.price,
    row.nationalPrice,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value > 100 ? Math.round(value) : Math.round(value * 100);
    }
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      const num = Number(value);
      return num > 100 ? Math.round(num) : Math.round(num * 100);
    }
  }
  return null;
}

async function locateKfc(origin: Origin, radiusMiles: number, limit: number) {
  const queries = [
    origin.label,
    `${origin.latitude},${origin.longitude}`,
    origin.label.split(",")[0]?.trim(),
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

  let results: Array<Record<string, unknown>> = [];
  let lastError: unknown;
  for (const address of queries) {
    try {
      const body = new URLSearchParams({
        address,
        distance: String(Math.max(radiusMiles, 10)),
        catering: "false",
        buffet: "false",
        wifi: "false",
      }).toString();
      const exchange = await unlockerExchange("https://services.kfc.com/services/query/locations", {
        preferDirect: false,
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://www.kfc.com",
          Referer: "https://www.kfc.com/store-locator",
        },
        body,
      });
      const payload = JSON.parse(exchange.text) as { results?: Array<Record<string, unknown>> };
      results = payload.results ?? [];
      if (results.length) break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!results.length && lastError) throw lastError;

  return results
    .map((store) => {
      const latitude = Number(store.latitude);
      const longitude = Number(store.longitude);
      return {
        id: String(store.storeNumber ?? store.entityID ?? ""),
        name: `KFC ${store.storeNumber ?? store.city ?? ""}`.trim(),
        address: [store.addressLine, store.city, store.state, store.postalCode].filter(Boolean).join(", "),
        latitude,
        longitude,
        distance_miles: roundMiles(
          Number(store.distance) || milesBetween(origin, { latitude, longitude }),
        ),
        pickup: true,
      } satisfies Store;
    })
    .filter((store: Store) => store.id && Number.isFinite(store.latitude) && store.distance_miles <= radiusMiles)
    .sort((a: Store, b: Store) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

async function kfcOffers(store: Store, observedAt: string) {
  // KFC US has no documented public priced-menu API; try a few live storefront shapes via Unlocker.
  const candidates = [
    `https://www.kfc.com/api/menu?storeNumber=${encodeURIComponent(store.id)}`,
    `https://www.kfc.com/menu?store=${encodeURIComponent(store.id)}`,
    `https://orders.kfc.com/api/menu/${encodeURIComponent(store.id)}`,
  ];
  let lastError: unknown;
  for (const sourceUrl of candidates) {
    try {
      const text = await unlockerText(sourceUrl, {
        headers: { Accept: "application/json, text/html", Referer: "https://www.kfc.com/menu" },
      });
      const offers = offersFromKfcPayload(text, store, sourceUrl, observedAt);
      if (offers.length) return offers;
    } catch (error) {
      lastError = error;
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "no priced chicken items");
  throw new Error(
    `KFC ${store.id}: first-party priced menu unavailable (${detail.slice(0, 160)}). Locator works; menu needs a digital-ordering session or marketplace compare.`,
  );
}

function offersFromKfcPayload(text: string, store: Store, sourceUrl: string, observedAt: string) {
  const offers: MenuOffer[] = [];
  const seen = new Set<string>();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (match) {
      try { parsed = JSON.parse(match[1]); } catch { parsed = null; }
    }
  }
  if (!parsed) return offers;

  walkKfc(parsed, (name, priceCents, href, section) => {
    if (!/chicken|tender|nugget|wing|sandwich|bucket|piece|wrap|drum|thigh|breast/i.test(name)) return;
    if (/sauce|drink|biscuit$|coleslaw|mac.?cheese|cookie|pie\b|potato|corn|gravy/i.test(name) && !/chicken|tender|nugget|wing/i.test(name)) {
      return;
    }
    if (priceCents == null || priceCents <= 0) return;
    const offer = toOffer({
      chain_id: "kfc",
      location_id: `kfc:${store.id}`,
      store_name: store.name,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      distance_miles: store.distance_miles,
      original_name: name,
      section: section ?? "",
      list_price_cents: priceCents,
      href: href ?? name,
    }, sourceUrl, observedAt);
    if (!offer || seen.has(offer.offer_key)) return;
    seen.add(offer.offer_key);
    offers.push(offer);
  });
  return offers;
}

function walkKfc(
  node: unknown,
  emit: (name: string, priceCents: number | null, href: string | null, section: string | null) => void,
  section: string | null = null,
) {
  if (Array.isArray(node)) {
    for (const child of node) walkKfc(child, emit, section);
    return;
  }
  if (!node || typeof node !== "object") return;
  const row = node as Record<string, unknown>;
  const name = String(row.name ?? row.displayName ?? row.title ?? row.productName ?? "");
  const nextSection = String(row.category ?? row.categoryName ?? section ?? "") || section;
  const priceCents = kfcPriceCents(row);
  if (name && priceCents != null) {
    emit(name, priceCents, String(row.id ?? row.productId ?? row.sku ?? ""), nextSection);
  }
  for (const value of Object.values(row)) {
    if (value && typeof value === "object") walkKfc(value, emit, nextSection);
  }
}

function kfcPriceCents(row: Record<string, unknown>) {
  const candidates = [
    row.price,
    row.priceCents,
    row.list_price_cents,
    (row.price as { amount?: number; cents?: number } | undefined)?.amount,
    (row.price as { amount?: number; cents?: number } | undefined)?.cents,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      // Heuristic: integer >= 100 is already cents; small floats are dollars.
      if (Number.isInteger(value) && value >= 100) return value;
      return Math.round(value * (value < 100 ? 100 : 1));
    }
    if (typeof value === "string" && /\$?\d/.test(value)) {
      const num = Number(value.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(num) && num > 0) return Math.round(num * 100);
    }
  }
  return null;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&reg;/g, "®").trim();
}

function numberOr(value: unknown, fallback: number) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function cryptoRandom() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
