import type { MenuCategory, MenuOffer } from '@/data/menu-schema';
import { categoryUnit } from '@/data/menu-schema';
import type { OfferRecord } from '@/data/mock-convex';

const CUT_MIX_FIELDS = ['breast', 'thigh', 'drum', 'wing'] as const;

export function money(cents: number | null | undefined, currency = 'USD') {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function unitPrice(offer: MenuOffer) {
  if (!isRankable(offer)) return null;
  return offer.list_price_cents / offer.quantity;
}

export function unitMoney(offer: MenuOffer) {
  const amount = unitPrice(offer);
  return amount == null ? '—' : money(amount, offer.currency);
}

export function unitPriceLabel(category: MenuCategory | null) {
  return category ? `per ${categoryUnit(category, 1)}` : 'per unit';
}

export function freshnessText(offer: MenuOffer) {
  if (offer.validation_status === 'excluded') return 'EXCLUDED FROM COMPARISON';
  if (!offer.comparable) return exclusionText(offer);

  const observedAt = Date.parse(offer.observed_at);
  if (Number.isFinite(observedAt) && Date.now() - observedAt > 24 * 60 * 60 * 1000) {
    return 'STALE SAMPLE · RECHECK BEFORE ORDERING';
  }
  return 'SAMPLE · VERIFIED FIELDS';
}

export function exclusionText(offer: MenuOffer) {
  if (offer.offer_kind !== 'ala_carte') return 'BUNDLE · SCRATCHED FROM UNIT RANKING';
  if (offer.quantity == null) return 'QUANTITY NOT STATED · SCRATCHED FROM RANKING';
  if (!Number.isInteger(offer.quantity) || offer.quantity <= 0) return 'QUANTITY MUST BE A POSITIVE INTEGER';
  if (offer.list_price_cents == null) return 'PRICE NOT RETURNED · SCRATCHED FROM RANKING';
  if (!Number.isInteger(offer.list_price_cents) || offer.list_price_cents <= 0) return 'PRICE MUST BE A POSITIVE WHOLE-CENT VALUE';
  if (offer.ordering_channel !== 'first_party_pickup') return 'CHANNEL DOES NOT MATCH PICKUP RANKING';
  if (offer.validation_status !== 'verified') return 'NEEDS REVIEW · SCRATCHED FROM RANKING';
  return 'NOT COMPARABLE · SCRATCHED FROM RANKING';
}

export function isRankable(offer: MenuOffer): offer is MenuOffer & { category: MenuCategory; quantity: number; list_price_cents: number } {
  return offer.comparable &&
    offer.validation_status === 'verified' &&
    offer.offer_kind === 'ala_carte' &&
    offer.ordering_channel === 'first_party_pickup' &&
    offer.category != null &&
    offer.quantity != null &&
    Number.isInteger(offer.quantity) &&
    offer.quantity > 0 &&
    offer.list_price_cents != null &&
    Number.isInteger(offer.list_price_cents) &&
    offer.list_price_cents > 0;
}

/**
 * A variant signature follows the documented menu schema. Null remains a
 * distinct value: an unstated prep or flavor must not be treated as a known
 * fried/classic variant.
 */
export function offerVariantKey(offer: MenuOffer) {
  const cutMix = offer.cut_mix
    ? CUT_MIX_FIELDS.map((key) => offer.cut_mix?.[key] ?? null)
    : null;
  return JSON.stringify([
    offer.category,
    offer.prep,
    offer.heat,
    offer.breading,
    offer.build,
    offer.flavor,
    cutMix,
    offer.meat,
    offer.protein_pieces,
    offer.protein_category,
    offer.currency,
    offer.ordering_channel,
  ]);
}

export function offerVariantLabel(offer: MenuOffer) {
  const details: string[] = [];
  if (offer.prep) details.push(capitalize(offer.prep));
  if (offer.heat) details.push(capitalize(offer.heat.replaceAll('-', ' ')));
  if (offer.breading) details.push(capitalize(offer.breading));
  if (offer.build) details.push(`${capitalize(offer.build)} build`);
  if (offer.flavor) details.push(offer.flavor);
  if (offer.cut_mix) {
    const mix = CUT_MIX_FIELDS
      .flatMap((key) => {
        const count = offer.cut_mix?.[key];
        return count == null ? [] : [`${count} ${key}${count === 1 ? '' : 's'}`];
      })
      .join(' · ');
    if (mix) details.push(mix);
  }
  if (offer.meat) details.push(`${capitalize(offer.meat)} meat`);
  if (offer.protein_pieces != null) details.push(`${offer.protein_pieces} chicken ${offer.protein_pieces === 1 ? 'piece' : 'pieces'}`);
  if (offer.protein_category) details.push(`Chicken: ${offer.protein_category.replaceAll('-', ' ')}`);

  const variant = details.length > 0 ? details.join(' · ') : 'Variant not stated';
  const channel = offer.ordering_channel.replaceAll('_', ' ');
  return `${variant} · ${offer.currency} · ${capitalize(channel)}`;
}

export type ComparisonMatrixGroup = {
  key: string;
  label: string;
  records: OfferRecord[];
};

export function comparisonMatrixGroups(records: OfferRecord[], category: MenuCategory): ComparisonMatrixGroup[] {
  const groups = new Map<string, OfferRecord[]>();
  for (const record of records) {
    if (record.offer.category !== category || !isRankable(record.offer)) continue;
    const key = offerVariantKey(record.offer);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return [...groups].map(([key, group]) => ({
    key,
    label: offerVariantLabel(group[0].offer),
    records: [...group].sort((a, b) =>
      a.chain.name.localeCompare(b.chain.name) ||
      a.offer.quantity! - b.offer.quantity! ||
      a.offer.original_name.localeCompare(b.offer.original_name) ||
      a.distance_miles - b.distance_miles,
    ),
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export type QuantitySolution = {
  location: OfferRecord['location'];
  chain: OfferRecord['chain'];
  variantKey: string;
  variant: string;
  currency: string;
  orders: { offer: MenuOffer; quantity: number }[];
  units: number;
  extraUnits: number;
  totalCents: number;
  distance_miles: number;
};

export function solveAllLocations(records: OfferRecord[], category: MenuCategory, target: number) {
  const byLocationAndVariant = new Map<string, OfferRecord[]>();
  for (const record of records) {
    if (record.offer.category !== category || !isRankable(record.offer)) continue;
    const key = `${record.location.id}:${offerVariantKey(record.offer)}`;
    const group = byLocationAndVariant.get(key) ?? [];
    group.push(record);
    byLocationAndVariant.set(key, group);
  }

  return [...byLocationAndVariant.values()]
    .map((locationRecords) => solveAtLocation(locationRecords, target))
    .filter((solution): solution is QuantitySolution => solution != null)
    .sort((a, b) =>
      a.currency.localeCompare(b.currency) ||
      a.variant.localeCompare(b.variant) ||
      a.totalCents - b.totalCents ||
      a.extraUnits - b.extraUnits ||
      a.distance_miles - b.distance_miles,
    );
}

function solveAtLocation(records: OfferRecord[], target: number): QuantitySolution | undefined {
  const offers = records.map(({ offer }) => offer);
  if (!offers.length || target <= 0) return undefined;

  const maxQuantity = Math.max(...offers.map((offer) => offer.quantity!));
  const cap = target + maxQuantity - 1;
  const best = Array<number>(cap + 1).fill(Number.POSITIVE_INFINITY);
  const previous = Array<{ from: number; offerIndex: number } | null>(cap + 1).fill(null);
  best[0] = 0;

  for (let count = 1; count <= cap; count += 1) {
    offers.forEach((offer, offerIndex) => {
      const prior = count - offer.quantity!;
      if (prior < 0 || !Number.isFinite(best[prior])) return;
      const next = best[prior] + offer.list_price_cents!;
      if (next < best[count]) {
        best[count] = next;
        previous[count] = { from: prior, offerIndex };
      }
    });
  }

  let winningCount = -1;
  for (let count = target; count <= cap; count += 1) {
    if (!Number.isFinite(best[count])) continue;
    if (winningCount < 0 || best[count] < best[winningCount] || (best[count] === best[winningCount] && count < winningCount)) {
      winningCount = count;
    }
  }
  if (winningCount < 0) return undefined;

  const counts = Array<number>(offers.length).fill(0);
  let cursor = winningCount;
  while (cursor > 0) {
    const step = previous[cursor];
    if (!step) return undefined;
    counts[step.offerIndex] += 1;
    cursor = step.from;
  }

  const first = records[0];
  return {
    location: first.location,
    chain: first.chain,
    variantKey: offerVariantKey(first.offer),
    variant: offerVariantLabel(first.offer),
    currency: first.offer.currency,
    orders: offers.flatMap((offer, index) => (counts[index] ? [{ offer, quantity: counts[index] }] : [])),
    units: winningCount,
    extraUnits: winningCount - target,
    totalCents: best[winningCount],
    distance_miles: first.distance_miles,
  };
}

function capitalize(value: string) {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
