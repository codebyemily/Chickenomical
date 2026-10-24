import { useCallback, useEffect, useState } from 'react';

import { MOCK_CHAINS, MOCK_DEALS, MOCK_DISTANCE_MILES, MOCK_LOCATIONS, MOCK_OFFERS } from '@/data/mock-convex-data';
import type { Category, Chain, DemoArea, MenuDeal, MenuOffer, StoreLocation } from '@/data/menu-schema';

export type OfferRecord = {
  offer: MenuOffer;
  location: StoreLocation;
  chain: Chain;
  distance_miles: number;
};

export type DealRecord = {
  deal: MenuDeal;
  location: StoreLocation | null;
  chain: Chain;
};

export type NearbyOffersArgs = { category: Category; area: DemoArea; radiusMiles: number };

export type MockQueryReference<Args, Result> = {
  name: string;
  execute: (args: Args) => Promise<Result>;
};

const MOCK_QUERY_DELAY_MS = 180;

function mockQuery<Args, Result>(name: string, resolve: (args: Args) => Result): MockQueryReference<Args, Result> {
  return {
    name,
    execute: async (args) => {
      await new Promise((finish) => setTimeout(finish, MOCK_QUERY_DELAY_MS));
      return resolve(args);
    },
  };
}
function getRecord(offer: MenuOffer, area: DemoArea): OfferRecord | undefined {
  const location = MOCK_LOCATIONS.find((row) => row.id === offer.location_id);
  const chain = MOCK_CHAINS.find((row) => row.id === offer.chain_id);
  if (!location || !chain) return undefined;

  const distanceArea = area === 'north-beach' ? 'north-beach' : 'market';
  return {
    offer,
    location,
    chain,
    distance_miles: MOCK_DISTANCE_MILES[distanceArea][location.id] ?? Number.POSITIVE_INFINITY,
  };
}

function getDealRecord(deal: MenuDeal): DealRecord | undefined {
  const chain = MOCK_CHAINS.find((row) => row.id === deal.chain_id);
  if (!chain) return undefined;
  const location = deal.location_id ? MOCK_LOCATIONS.find((row) => row.id === deal.location_id) ?? null : null;
  return { deal, location, chain };
}

export const api = {
  offers: {
    nearby: mockQuery('offers.nearby', ({ category, area, radiusMiles }: NearbyOffersArgs) => area === 'nowhere' ? [] :
      MOCK_OFFERS
        .filter((offer) => offer.category === category)
        .map((offer) => getRecord(offer, area))
        .filter((record): record is OfferRecord => record !== undefined && record.distance_miles <= radiusMiles)
        .sort((a, b) => a.distance_miles - b.distance_miles),
    ),
    all: mockQuery('offers.all', ({ area }: { area: DemoArea }) =>
      MOCK_OFFERS
        .map((offer) => getRecord(offer, area))
        .filter((record): record is OfferRecord => Boolean(record))
        .sort((a, b) => a.chain.name.localeCompare(b.chain.name) || a.offer.original_name.localeCompare(b.offer.original_name)),
    ),
    byId: mockQuery('offers.byId', ({ id, area }: { id: string; area: DemoArea }) => {
      const offer = MOCK_OFFERS.find((row) => row.id === id);
      return offer ? getRecord(offer, area) ?? null : null;
    }),
    bySourceItemId: mockQuery('offers.bySourceItemId', ({ sourceItemId, area }: { sourceItemId: string; area: DemoArea }) => {
      const offer = MOCK_OFFERS.find((row) => row.source_item_id === sourceItemId);
      return offer ? getRecord(offer, area) ?? null : null;
    }),
  },
  deals: {
    all: mockQuery('deals.all', () =>
      MOCK_DEALS
        .map(getDealRecord)
        .filter((record): record is DealRecord => Boolean(record))
        .sort((a, b) => a.chain.name.localeCompare(b.chain.name) || a.deal.name.localeCompare(b.deal.name)),
    ),
  },
};

type QueryResult<Result> =
  | { key: string; status: 'loading' }
  | { key: string; status: 'success'; data: Result }
  | { key: string; status: 'error'; error: Error };

export function useMockConvexQuery<Args, Result>(query: MockQueryReference<Args, Result>, args: Args) {
  const argsKey = JSON.stringify(args) ?? 'null';
  const [revision, setRevision] = useState(0);
  const requestKey = `${query.name}:${argsKey}:${revision}`;
  const [result, setResult] = useState<QueryResult<Result>>({ key: '', status: 'loading' });

  useEffect(() => {
    let current = true;
    const argsSnapshot = JSON.parse(argsKey) as Args;
    void query.execute(argsSnapshot).then(
      (data) => {
        if (current) setResult({ key: requestKey, status: 'success', data });
      },
      (reason: unknown) => {
        if (current) setResult({
          key: requestKey,
          status: 'error',
          error: reason instanceof Error ? reason : new Error('The local mock query failed.'),
        });
      },
    );

    return () => {
      current = false;
    };
  }, [argsKey, query, requestKey]);

  const refetch = useCallback(() => setRevision((current) => current + 1), []);
  const current = result.key === requestKey ? result : { key: requestKey, status: 'loading' as const };

  return {
    status: current.status,
    data: current.status === 'success' ? current.data : undefined,
    error: current.status === 'error' ? current.error : undefined,
    refetch,
  };
}
