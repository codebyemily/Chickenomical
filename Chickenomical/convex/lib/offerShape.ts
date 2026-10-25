/** Minimal offer normalizer shared by Convex takeout scrapers. */

export type OfferCard = {
  chain_id: string;
  location_id: string;
  store_name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_miles?: number | null;
  original_name: string;
  body?: string;
  section?: string;
  list_price_cents?: number | null;
  quantity?: number | null;
  category?: string | null;
  offer_kind?: string;
  prep?: string | null;
  heat?: string | null;
  build?: string | null;
  href?: string | null;
  ordering_channel?: string;
  source_provider?: string;
};

export type MenuOffer = {
  chain_id: string;
  location_id: string;
  store_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_miles: number | null;
  offer_kind: string;
  category: string | null;
  original_name: string;
  quantity: number | null;
  quantity_label: string | null;
  list_price_cents: number | null;
  currency: string;
  prep: string | null;
  heat: string | null;
  build: string | null;
  cut_mix: Record<string, number> | null;
  protein_pieces: number | null;
  protein_category: string | null;
  includes: string[];
  ordering_channel: string;
  comparable: boolean;
  validation_status: string;
  source_provider: string;
  source_url: string;
  source_item_id: string | null;
  observed_at: string;
  product_key: string;
  offer_key: string;
};

export function toOffer(card: OfferCard, sourceUrl: string, observedAt: string): MenuOffer | null {
  const blob = `${card.original_name} ${card.href ?? ""} ${card.body ?? ""}`;
  const category = Object.prototype.hasOwnProperty.call(card, "category") && card.category !== undefined
    ? card.category
    : classifyName(card.original_name);
  if (!category && card.category !== null) return null;

  const quantity = card.quantity === undefined
    ? parseQuantity(card.original_name, card.href, card.body)
    : card.quantity;
  const resolvedQuantity = quantity ?? defaultQuantity(category);
  const listPriceCents = card.list_price_cents === undefined ? null : card.list_price_cents;
  const offerKind = card.offer_kind ?? inferKind(card.original_name, card.section);
  const prep = card.prep === undefined ? inferPrep(card.original_name) ?? inferPrep(blob) : card.prep;
  const heat = card.heat ?? inferHeat(card.original_name);
  const build = card.build === undefined ? inferBuild(card.original_name, category) : card.build;
  const locationId = card.location_id;
  const orderingChannel = card.ordering_channel ?? "first_party_pickup";
  const sourceProvider = card.source_provider ?? "bright_data";
  const variant = [prep, heat, build].filter(Boolean).join("|") || "plain";
  const comparable = offerKind === "ala_carte"
    && Number.isInteger(resolvedQuantity)
    && (resolvedQuantity as number) > 0
    && Number.isInteger(listPriceCents)
    && (listPriceCents as number) >= 0;

  return {
    chain_id: card.chain_id,
    location_id: locationId,
    store_name: card.store_name ?? null,
    address: card.address ?? null,
    latitude: card.latitude ?? null,
    longitude: card.longitude ?? null,
    distance_miles: card.distance_miles ?? null,
    offer_kind: offerKind,
    category,
    original_name: card.original_name,
    quantity: resolvedQuantity,
    quantity_label: null,
    list_price_cents: listPriceCents ?? null,
    currency: "USD",
    prep,
    heat,
    build,
    cut_mix: null,
    protein_pieces: null,
    protein_category: null,
    includes: [],
    ordering_channel: orderingChannel,
    comparable,
    validation_status: comparable ? "verified" : "needs_review",
    source_provider: sourceProvider,
    source_url: sourceUrl,
    source_item_id: card.href || null,
    observed_at: observedAt,
    product_key: [locationId, category ?? "unclassified", resolvedQuantity ?? "na", variant, offerKind].join("|"),
    offer_key: [locationId, category ?? "unclassified", resolvedQuantity ?? "na", variant, offerKind, orderingChannel].join("|"),
  };
}

export function parseQuantity(...parts: Array<string | null | undefined>) {
  const patterns = [
    /(\d+)\s*[- ]?(?:pc|pcs|piece|pieces|ct|count)s?\b/i,
    /(\d+)\s*[- ]?fingers?\b/i,
    /(\d+)\s+(?:chicken\s+)?fingers?\b/i,
    /(\d+)\s*[- ]?wings?\b/i,
    /(\d+)\s+boneless\b/i,
  ];
  for (const part of parts) {
    const text = String(part ?? "");
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

export function classifyName(name: string) {
  const text = name.toLowerCase();
  if (/cauliflower|not chicken|not ckn/.test(text)) return null;
  if (/\bfish\b|filet-o-fish|pollock/.test(text)) return null;
  if (/\b(dip|sauce)$/.test(text)) return null;
  if (/chicken fries?/.test(text)) return "chicken-fry";
  if (/nugget|\bnugg/.test(text)) return "chicken-nugget";
  if (/boneless/.test(text) && /wing/.test(text)) return "chicken-boneless-wing";
  if (/thigh bite/.test(text)) return null;
  if (/\bwing/.test(text)) return "chicken-wing";
  if (/slider|nibbler/.test(text)) return "chicken-slider";
  if (/\bwrap\b/.test(text)) return "chicken-wrap";
  if (/bucket|chickenjoy/.test(text)) return "chicken-bucket";
  if (/(tender|strip|finger|tendy|chick-n-strip|supreme)/.test(text) && !/sandwich|slider|wrap/.test(text)) {
    return "chicken-tender";
  }
  if (/sandwich|mccrispy|mcchicken|royal crispy|chicken jr/.test(text)) {
    if (/\bsandwiches?\b/.test(text) && !/chicken|mccrispy|mcchicken|royal|crispy|spicy|deluxe|club|filet/.test(text)) {
      return null;
    }
    return "chicken-sandwich";
  }
  if (/\bchicken\b/.test(text) && /\b(pc|piece|box)\b/.test(text)) return "chicken-bucket";
  return null;
}

function inferKind(name: string, section?: string) {
  const text = `${section ?? ""} ${name}`.toLowerCase();
  if (/happy meal|kid['’]?s?\b/.test(text)) return "kids_meal";
  if (/family meal|family pack|party pack|crew pack/.test(text)) return "family_meal";
  if (/\bcombo\b|\bmeal\b/.test(text)) return "combo";
  return "ala_carte";
}

function inferPrep(name: string) {
  const text = name.toLowerCase();
  if (/grilled|chargrilled/.test(text)) return "grilled";
  if (/blackened/.test(text)) return "blackened";
  if (/fried|crispy|nugget|tender|finger|wing|sandwich|bucket/.test(text)) return "fried";
  return null;
}

function inferHeat(name: string) {
  const text = name.toLowerCase();
  if (/reaper/.test(text)) return "reaper";
  if (/nashville/.test(text)) return "nashville-hot";
  if (/spicy|hot honey|atomic|ghost pepper|fiery/.test(text)) return "spicy";
  return "classic";
}

function inferBuild(name: string, category: string | null) {
  const text = name.toLowerCase();
  if (/mcchicken|chicken jr|junior/.test(text)) return "value";
  if (/deluxe/.test(text)) return "deluxe";
  if (/club|bacon and cheese|bacon & cheese/.test(text)) return "club";
  if (category === "chicken-sandwich" || category === "chicken-wrap" || category === "chicken-slider") {
    return "classic";
  }
  return null;
}

function defaultQuantity(category: string | null) {
  if (category === "chicken-sandwich" || category === "chicken-slider" || category === "chicken-wrap") return 1;
  return null;
}

export function dollarsToCents(dollars: unknown) {
  const value = Number(dollars);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function roundMiles(value: number) {
  return Math.round(Number(value) * 100) / 100;
}
