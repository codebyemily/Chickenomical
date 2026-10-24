import type { Category, DemoLocation, DemoOffer, DemoArea } from '@/data/demo';
import { DEMO_LOCATIONS, getOffer } from '@/data/demo';

export type SortMode = 'unit' | 'total' | 'distance';

export function money(cents: number | null | undefined) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

export function unitPrice(offer: DemoOffer) {
  if (!offer.priceCents || !offer.pieceCount) return null;
  return offer.priceCents / offer.pieceCount;
}

export function unitMoney(offer: DemoOffer) {
  const amount = unitPrice(offer);
  return amount == null ? '—' : '$' + (amount / 100).toFixed(2);
}

export function freshnessText(offer: DemoOffer) {
  switch (offer.freshness) {
    case 'sample-recent':
      return 'FRESH FROM THE NEST · NOT LIVE';
    case 'sample-stale':
      return 'LEFTOVERS · RECHECK BEFORE YOU PECK';
    case 'incomplete':
      return 'HALF-HATCHED · SCRATCHED FROM RANKING';
    case 'unavailable':
      return 'FLEW THE COOP · NO COMPARABLE PRICE';
  }
}

export function distanceFor(location: DemoLocation, area: DemoArea) {
  return location.distanceMiles[area === 'north-beach' ? 'north-beach' : 'market'];
}

export function locationsInRadius(
  area: DemoArea,
  radiusMiles: number,
  category: Category,
) {
  if (area === 'nowhere') return [];
  return DEMO_LOCATIONS.filter(
    (location) =>
      distanceFor(location, area) <= radiusMiles &&
      location.offers.some((offer) => offer.category === category),
  ).sort((a, b) => distanceFor(a, area) - distanceFor(b, area));
}

export type RankedOffer = {
  offer: DemoOffer;
  location: DemoLocation;
  distance: number;
};

export function rankedOffers(
  locations: DemoLocation[],
  category: Category,
  sort: SortMode,
  area: DemoArea,
): RankedOffer[] {
  const rows = locations.flatMap((location) => {
    const distance = distanceFor(location, area);
    return location.offers
      .filter(
        (offer) =>
          offer.category === category &&
          offer.pieceCount != null &&
          offer.priceCents != null &&
          (offer.freshness === 'sample-recent' || offer.freshness === 'sample-stale'),
      )
      .map((offer) => ({ offer, location, distance }));
  });

  return rows.sort((a, b) => {
    if (sort === 'distance') return a.distance - b.distance || a.offer.priceCents! - b.offer.priceCents!;
    if (sort === 'total') return a.offer.priceCents! - b.offer.priceCents! || a.distance - b.distance;
    const unitCompare = a.offer.priceCents! * b.offer.pieceCount! - b.offer.priceCents! * a.offer.pieceCount!;
    return unitCompare || a.offer.priceCents! - b.offer.priceCents! || a.distance - b.distance;
  });
}

export type QuantitySolution = {
  location: DemoLocation;
  orders: { offer: DemoOffer; quantity: number }[];
  pieces: number;
  extraPieces: number;
  totalCents: number;
  distance: number;
};

export function solveMinimumOrders(
  location: DemoLocation,
  category: Category,
  target: number,
  area: DemoArea,
): QuantitySolution | undefined {
  const offers = location.offers.filter(
    (offer) =>
      offer.category === category &&
      offer.priceCents != null &&
      offer.pieceCount != null &&
      (offer.freshness === 'sample-recent' || offer.freshness === 'sample-stale'),
  );
  if (!offers.length || target <= 0) return undefined;

  const maxPieces = Math.max(...offers.map((offer) => offer.pieceCount!));
  const cap = target + maxPieces - 1;
  const best = Array<number>(cap + 1).fill(Number.POSITIVE_INFINITY);
  const previous = Array<{ from: number; offerIndex: number } | null>(cap + 1).fill(null);
  best[0] = 0;

  for (let count = 1; count <= cap; count += 1) {
    offers.forEach((offer, offerIndex) => {
      const prior = count - offer.pieceCount!;
      if (prior < 0 || !Number.isFinite(best[prior])) return;
      const next = best[prior] + offer.priceCents!;
      if (next < best[count]) {
        best[count] = next;
        previous[count] = { from: prior, offerIndex };
      }
    });
  }

  let winningCount = -1;
  for (let count = target; count <= cap; count += 1) {
    if (!Number.isFinite(best[count])) continue;
    if (
      winningCount < 0 ||
      best[count] < best[winningCount] ||
      (best[count] === best[winningCount] && count < winningCount)
    ) {
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

  return {
    location,
    orders: offers.flatMap((offer, index) => (counts[index] ? [{ offer, quantity: counts[index] }] : [])),
    pieces: winningCount,
    extraPieces: winningCount - target,
    totalCents: best[winningCount],
    distance: distanceFor(location, area),
  };
}

export function solveAllLocations(
  locations: DemoLocation[],
  category: Category,
  target: number,
  area: DemoArea,
) {
  return locations
    .map((location) => solveMinimumOrders(location, category, target, area))
    .filter((solution): solution is QuantitySolution => Boolean(solution))
    .sort((a, b) => a.totalCents - b.totalCents || a.extraPieces - b.extraPieces || a.distance - b.distance);
}

export function findOfferContext(offerId: string) {
  return getOffer(offerId);
}
