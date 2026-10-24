import { comparisonIdentity } from "./identity.mjs";

export function comparisonRows(direct, marketplace) {
  const directByIdentity = new Map(direct.map((offer) => [comparisonIdentity(offer), offer]));
  // DoorDash may place the same purchasable item in "Most Ordered" and its
  // category. One comparison row is enough when its strict identity is equal.
  const marketplaceByIdentity = new Map(marketplace.map((offer) => [comparisonIdentity(offer), offer]));
  return [...marketplaceByIdentity.values()].flatMap((offer) => {
    const counterpart = directByIdentity.get(comparisonIdentity(offer));
    return counterpart ? [{
      chain_id: offer.chain_id,
      location_id: offer.location_id,
      product_key: offer.product_key,
      item: offer.original_name,
      direct_channel: counterpart.ordering_channel,
      direct_price_cents: counterpart.list_price_cents,
      marketplace_channel: offer.ordering_channel,
      marketplace_price_cents: offer.list_price_cents,
      markup_cents: offer.list_price_cents - counterpart.list_price_cents,
    }] : [];
  });
}
