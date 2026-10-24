export type Category = 'nuggets' | 'tenders';
export type Freshness = 'sample-recent' | 'sample-stale' | 'incomplete' | 'unavailable';
export type DemoArea = 'market' | 'north-beach' | 'nowhere' | 'custom';

export type DemoOffer = {
  id: string;
  sourceRecordId: string;
  locationId: string;
  itemName: string;
  category: Category;
  pieceCount: number | null;
  priceCents: number | null;
  freshness: Freshness;
  mockChecked: string;
  sourceName: string;
  channel: string;
};

export type DemoLocation = {
  id: string;
  chain: string;
  displayName: string;
  address: string;
  areaLabel: string;
  distanceMiles: Record<'market' | 'north-beach', number>;
  offers: DemoOffer[];
};

const fixture = (sourceRecordId: string) => ({
  sourceRecordId,
  sourceName: 'Synthetic prototype source',
  channel: 'Pickup · illustrative sample',
});

export const DEMO_DATA_NOTICE =
  'Prototype data only. Restaurant examples, locations, prices, distances, sources, and check times are synthetic, not current menu information.';

export const DEMO_LOCATIONS: DemoLocation[] = [
  {
    id: 'market-mcd',
    chain: "McDonald's",
    displayName: 'Market Street · demo location',
    address: 'Fictional address · San Francisco, CA',
    areaLabel: 'Market Street demo location',
    distanceMiles: { market: 0.7, 'north-beach': 3.8 },
    offers: [
      {
        id: 'mcd-10-nuggets',
        ...fixture('DEMO-001'),
        locationId: 'market-mcd',
        itemName: '10 pc Chicken McNuggets',
        category: 'nuggets',
        pieceCount: 10,
        priceCents: 649,
        freshness: 'sample-recent',
        mockChecked: 'sample perch check · 18 min ago',
      },
      {
        id: 'mcd-20-nuggets',
        ...fixture('DEMO-002'),
        locationId: 'market-mcd',
        itemName: '20 pc Chicken McNuggets',
        category: 'nuggets',
        pieceCount: 20,
        priceCents: 1099,
        freshness: 'sample-recent',
        mockChecked: 'sample perch check · 18 min ago',
      },
      {
        id: 'mcd-6-nuggets',
        ...fixture('DEMO-003'),
        locationId: 'market-mcd',
        itemName: '6 pc Chicken McNuggets',
        category: 'nuggets',
        pieceCount: 6,
        priceCents: 449,
        freshness: 'sample-stale',
        mockChecked: 'sample perch check · 4 days ago',
      },
    ],
  },
  {
    id: 'civic-wendys',
    chain: "Wendy's",
    displayName: 'Civic Center · demo location',
    address: 'Fictional address · San Francisco, CA',
    areaLabel: 'Civic Center demo location',
    distanceMiles: { market: 1.2, 'north-beach': 2.4 },
    offers: [
      {
        id: 'wendys-10-nuggets',
        ...fixture('DEMO-004'),
        locationId: 'civic-wendys',
        itemName: '10 pc Chicken Nuggets',
        category: 'nuggets',
        pieceCount: 10,
        priceCents: 599,
        freshness: 'sample-recent',
        mockChecked: 'sample perch check · 42 min ago',
      },
      {
        id: 'wendys-4-nuggets',
        ...fixture('DEMO-005'),
        locationId: 'civic-wendys',
        itemName: '4 pc Chicken Nuggets',
        category: 'nuggets',
        pieceCount: 4,
        priceCents: 299,
        freshness: 'sample-stale',
        mockChecked: 'sample perch check · 2 days ago',
      },
      {
        id: 'wendys-uncounted-tenders',
        ...fixture('DEMO-006'),
        locationId: 'civic-wendys',
        itemName: 'Crispy Chicken Tenders · size not shown',
        category: 'tenders',
        pieceCount: null,
        priceCents: 549,
        freshness: 'incomplete',
        mockChecked: 'sample perch check · 42 min ago',
      },
    ],
  },
  {
    id: 'soma-popeyes',
    chain: 'Popeyes',
    displayName: 'SoMa · demo location',
    address: 'Fictional address · San Francisco, CA',
    areaLabel: 'SoMa demo location',
    distanceMiles: { market: 2.1, 'north-beach': 2.9 },
    offers: [
      {
        id: 'popeyes-3-tenders',
        ...fixture('DEMO-007'),
        locationId: 'soma-popeyes',
        itemName: '3 pc Classic Tenders',
        category: 'tenders',
        pieceCount: 3,
        priceCents: 549,
        freshness: 'sample-recent',
        mockChecked: 'sample perch check · 31 min ago',
      },
      {
        id: 'popeyes-5-tenders',
        ...fixture('DEMO-008'),
        locationId: 'soma-popeyes',
        itemName: '5 pc Classic Tenders',
        category: 'tenders',
        pieceCount: 5,
        priceCents: 849,
        freshness: 'sample-recent',
        mockChecked: 'sample perch check · 31 min ago',
      },
      {
        id: 'popeyes-8-nuggets',
        ...fixture('DEMO-009'),
        locationId: 'soma-popeyes',
        itemName: '8 pc Nuggets',
        category: 'nuggets',
        pieceCount: 8,
        priceCents: 579,
        freshness: 'unavailable',
        mockChecked: 'sample perch check · 31 min ago',
      },
    ],
  },
  {
    id: 'north-kfc',
    chain: 'KFC',
    displayName: 'North Beach · demo location',
    address: 'Fictional address · San Francisco, CA',
    areaLabel: 'North Beach demo location',
    distanceMiles: { market: 3.4, 'north-beach': 0.5 },
    offers: [
      {
        id: 'kfc-8-nuggets',
        ...fixture('DEMO-010'),
        locationId: 'north-kfc',
        itemName: '8 pc Nuggets',
        category: 'nuggets',
        pieceCount: 8,
        priceCents: 579,
        freshness: 'sample-stale',
        mockChecked: 'sample perch check · 3 days ago',
      },
      {
        id: 'kfc-12-nuggets',
        ...fixture('DEMO-011'),
        locationId: 'north-kfc',
        itemName: '12 pc Nuggets',
        category: 'nuggets',
        pieceCount: 12,
        priceCents: 799,
        freshness: 'sample-recent',
        mockChecked: 'sample perch check · 27 min ago',
      },
      {
        id: 'kfc-3-tenders',
        ...fixture('DEMO-012'),
        locationId: 'north-kfc',
        itemName: '3 pc Tenders',
        category: 'tenders',
        pieceCount: 3,
        priceCents: 599,
        freshness: 'sample-stale',
        mockChecked: 'sample perch check · 3 days ago',
      },
    ],
  },
  {
    id: 'sunset-bk',
    chain: 'Burger King',
    displayName: 'Sunset · demo location',
    address: 'Fictional address · San Francisco, CA',
    areaLabel: 'Sunset demo location',
    distanceMiles: { market: 5.4, 'north-beach': 8.2 },
    offers: [
      {
        id: 'bk-nuggets-unavailable',
        ...fixture('DEMO-013'),
        locationId: 'sunset-bk',
        itemName: 'Chicken Nuggets · currently unavailable',
        category: 'nuggets',
        pieceCount: 8,
        priceCents: null,
        freshness: 'unavailable',
        mockChecked: 'sample perch check · 1 hour ago',
      },
    ],
  },
];

export function getLocation(locationId: string) {
  return DEMO_LOCATIONS.find((location) => location.id === locationId);
}

export function getOffer(offerId: string) {
  for (const location of DEMO_LOCATIONS) {
    const offer = location.offers.find((item) => item.id === offerId);
    if (offer) return { location, offer };
  }
  return undefined;
}

export function getOfferBySourceRecord(sourceRecordId: string) {
  for (const location of DEMO_LOCATIONS) {
    const offer = location.offers.find((item) => item.sourceRecordId === sourceRecordId);
    if (offer) return { location, offer };
  }
  return undefined;
}
