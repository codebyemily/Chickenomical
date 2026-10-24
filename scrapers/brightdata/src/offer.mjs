import { classifyName, inferBuild, inferHeat, inferKind, inferPrep, parseCutMix, parsePriceCents, parseQuantity } from "./extract.mjs";

export function toOffer(chain, card, sourceUrl, observedAt) {
  const blob = `${card.original_name} ${card.href ?? ""} ${card.body ?? ""}`;
  const category = Object.prototype.hasOwnProperty.call(card, "category") && card.category !== undefined
    ? card.category
    : classifyName(card.original_name);
  if (!category && card.category !== null) return null;

  const quantity = card.quantity === undefined
    ? parseQuantity(card.original_name, card.href, card.body)
    : card.quantity;
  const resolvedQuantity = quantity ?? defaultQuantity(category);
  const listPriceCents = card.list_price_cents === undefined ? parsePriceCents(blob) : card.list_price_cents;
  const offerKind = card.offer_kind ?? inferKind(card.original_name, card.section);
  const prep = card.prep === undefined ? inferPrep(card.original_name) ?? inferPrep(blob) : card.prep;
  const heat = card.heat ?? inferHeat(card.original_name);
  const build = card.build === undefined ? inferBuild(card.original_name, category) : card.build;
  const cutMix = card.cut_mix === undefined ? parseCutMix(blob) : card.cut_mix;
  const locationId = card.location_id ?? "national";
  const variant = [prep, heat, build].filter(Boolean).join("|") || "plain";
  const comparable = offerKind === "ala_carte"
    && Number.isInteger(resolvedQuantity)
    && resolvedQuantity > 0
    && Number.isInteger(listPriceCents)
    && listPriceCents >= 0;

  return {
    chain_id: chain.id,
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
    quantity_label: card.quantity_label ?? null,
    list_price_cents: listPriceCents,
    currency: "USD",
    prep,
    heat,
    build,
    cut_mix: cutMix,
    protein_pieces: card.protein_pieces ?? null,
    protein_category: card.protein_category ?? null,
    includes: card.includes ?? [],
    ordering_channel: "first_party_pickup",
    comparable,
    validation_status: comparable ? "verified" : "needs_review",
    source_provider: "bright_data",
    source_url: sourceUrl,
    source_item_id: card.href || null,
    observed_at: observedAt,
    product_key: [locationId, category ?? "unclassified", resolvedQuantity ?? "na", variant, offerKind].join("|"),
    offer_key: [locationId, category ?? "unclassified", resolvedQuantity ?? "na", variant, offerKind, "first_party_pickup"].join("|"),
  };
}

function defaultQuantity(category) {
  if (category === "chicken-sandwich" || category === "chicken-slider" || category === "chicken-wrap") return 1;
  return null;
}
