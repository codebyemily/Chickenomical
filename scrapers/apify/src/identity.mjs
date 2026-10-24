// This is intentionally normalization, not fuzzy matching. It prevents two
// differently named menu items that share a category/quantity from becoming a
// cross-channel price comparison merely because their product keys collide.
export function comparisonIdentity(offer) {
  const label = String(offer.original_name ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return `${offer.product_key}|${label}`;
}
