import { internalMutation } from "./_generated/server";
import { parseQuantity } from "./lib/offerShape";

const RESTAURANT_BRANDS = [
  { id: "jack-in-the-box", aliases: ["jackinthebox"] },
  { id: "ihop", aliases: ["ihop"] },
  { id: "buffalo-wild-wings", aliases: ["buffalowildwings"] },
] as const;

/** One-off cleanup for recent marketplace rows with known brand or review errors. */
export const repairRecentMarketplaceOffers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("menuOffers").order("desc").take(1000);
    let updated = 0;
    let brandCorrections = 0;
    let verified = 0;
    let quantitiesFilled = 0;

    for (const row of rows) {
      const brandText = normalizeBrand(`${row.store_name ?? ""} ${row.source_url}`);
      const matchedBrands = RESTAURANT_BRANDS.filter((brand) =>
        brand.aliases.some((alias) => brandText.includes(alias)),
      );
      const candidateBrand = matchedBrands.length === 1 && matchedBrands[0].id !== row.chain_id
        ? matchedBrands[0].id
        : row.chain_id;
      const correctedBrand = candidateBrand !== row.chain_id
        && row.location_id.startsWith(`${row.chain_id}:`)
        ? candidateBrand
        : row.chain_id;
      const correctedLocation = correctedBrand !== row.chain_id
        ? `${correctedBrand}${row.location_id.slice(row.chain_id.length)}`
        : row.location_id;

      const parsedQuantity = parseQuantity(row.original_name, row.source_item_id);
      const quantity = row.quantity ?? parsedQuantity;
      const validPrice = Number.isInteger(row.list_price_cents) && (row.list_price_cents ?? -1) >= 0;
      const verifiedAlaCarte = row.offer_kind === "ala_carte"
        && quantity != null && quantity > 0 && validPrice;
      const verifiedCountedCombo = row.offer_kind === "combo"
        && parsedQuantity != null && row.quantity === parsedQuantity && validPrice;
      const shouldVerify = row.validation_status === "needs_review"
        && (verifiedAlaCarte || verifiedCountedCombo);
      const nextComparable = verifiedAlaCarte || row.comparable;
      const nextStatus = shouldVerify ? "verified" : row.validation_status;
      const nextQuantity = quantity;
      const variant = [row.prep, row.heat, row.build].filter(Boolean).join("|") || "plain";
      const productKey = [
        correctedLocation,
        row.category ?? "unclassified",
        nextQuantity ?? "na",
        variant,
        row.offer_kind,
      ].join("|");
      const offerKey = `${productKey}|${row.ordering_channel}`;

      const changedBrand = correctedBrand !== row.chain_id && correctedLocation !== row.location_id;
      const changedQuantity = nextQuantity !== row.quantity;
      const changedComparable = nextComparable !== row.comparable;
      const changedStatus = nextStatus !== row.validation_status;
      const changedKeys = productKey !== row.product_key || offerKey !== row.offer_key;
      if (!changedBrand && !changedQuantity && !changedComparable && !changedStatus && !changedKeys) continue;

      await ctx.db.patch(row._id, {
        chain_id: correctedBrand,
        location_id: correctedLocation,
        quantity: nextQuantity,
        comparable: nextComparable,
        validation_status: nextStatus,
        product_key: productKey,
        offer_key: offerKey,
      });
      updated += 1;
      if (changedBrand && correctedBrand !== row.chain_id) brandCorrections += 1;
      if (shouldVerify) verified += 1;
      if (changedQuantity) quantitiesFilled += 1;
    }

    return { scanned: rows.length, updated, brandCorrections, verified, quantitiesFilled };
  },
});

function normalizeBrand(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}
