import { geocode, milesBetween } from "./geo";
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

export const SCRAPE_CHAINS = ["raising-canes", "jollibee", "wingstop", "popeyes"] as const;
export type ScrapeChainId = (typeof SCRAPE_CHAINS)[number];

export const CHAIN_NAMES: Record<ScrapeChainId, string> = {
  "raising-canes": "Raising Cane's",
  jollibee: "Jollibee",
  wingstop: "Wingstop",
  popeyes: "Popeyes",
};

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
