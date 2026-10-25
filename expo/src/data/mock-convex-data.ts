import type { Chain, MenuDeal, MenuOffer, StoreLocation } from '@/data/menu-schema';

export const MOCK_CHAINS: Chain[] = [
  { id: 'mcdonalds', name: "McDonald's" },
  { id: 'wendys', name: "Wendy's" },
  { id: 'popeyes', name: 'Popeyes' },
  { id: 'kfc', name: 'KFC' },
  { id: 'burger-king', name: 'Burger King' },
  { id: 'chick-fil-a', name: 'Chick-fil-A' },
  { id: 'wingstop', name: 'Wingstop' },
  { id: 'raising-canes', name: "Raising Cane's" },
  { id: 'daves-hot-chicken', name: "Dave's Hot Chicken" },
];

export const MOCK_LOCATIONS: StoreLocation[] = [
  { id: 'market-mcd', chain_id: 'mcdonalds', store_name: 'Market Street', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
  { id: 'civic-wendys', chain_id: 'wendys', store_name: 'Civic Center', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
  { id: 'soma-popeyes', chain_id: 'popeyes', store_name: 'SoMa', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
  { id: 'north-kfc', chain_id: 'kfc', store_name: 'North Beach', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
  { id: 'sunset-bk', chain_id: 'burger-king', store_name: 'Sunset', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
  { id: 'union-cfa', chain_id: 'chick-fil-a', store_name: 'Union Square', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
  { id: 'mission-wingstop', chain_id: 'wingstop', store_name: 'Mission District', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
  { id: 'tenderloin-canes', chain_id: 'raising-canes', store_name: 'Tenderloin', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
  { id: 'embarcadero-daves', chain_id: 'daves-hot-chicken', store_name: 'Embarcadero', address: 'Fictional address - San Francisco, CA', latitude: null, longitude: null, pickup: true },
];

const DEFAULT_OBSERVED_AT = '2026-10-24T16:00:00.000Z';
const MOCK_SOURCE_ROOT = 'https://example.invalid/mock-source';
const CUT_MIX_PARTS = ['breast', 'thigh', 'drum', 'wing'] as const;

type OfferSeed = Pick<
  MenuOffer,
  'id' | 'chain_id' | 'location_id' | 'category' | 'original_name' | 'quantity' | 'list_price_cents'
> & Partial<MenuOffer>;

function offer(seed: OfferSeed): MenuOffer {
  const offerKind = seed.offer_kind ?? 'ala_carte';
  const channel = seed.ordering_channel ?? 'first_party_pickup';
  const prep = seed.prep ?? null;
  const heat = seed.heat ?? null;
  const build = seed.build ?? null;
  const variant = JSON.stringify([
    prep,
    heat,
    seed.breading ?? null,
    build,
    seed.flavor ?? null,
    seed.cut_mix ? CUT_MIX_PARTS.map((part) => seed.cut_mix?.[part] ?? null) : null,
    seed.meat ?? null,
    seed.protein_pieces ?? null,
    seed.protein_category ?? null,
  ]);
  const productKey = [seed.location_id, seed.category ?? 'unclassified', seed.quantity ?? 'na', variant, offerKind].join('|');
  const comparable = seed.comparable ?? (
    offerKind === 'ala_carte' && seed.category != null && seed.quantity != null &&
    seed.list_price_cents != null && seed.validation_status !== 'excluded'
  );
  const validationStatus = seed.validation_status ?? (comparable ? 'verified' : 'needs_review');

  return {
    id: seed.id,
    chain_id: seed.chain_id,
    location_id: seed.location_id,
    offer_kind: offerKind,
    category: seed.category,
    original_name: seed.original_name,
    quantity: seed.quantity,
    quantity_label: seed.quantity_label ?? null,
    list_price_cents: seed.list_price_cents,
    currency: seed.currency ?? 'USD',
    prep,
    heat,
    build,
    breading: seed.breading ?? null,
    flavor: seed.flavor ?? null,
    cut_mix: seed.cut_mix ?? null,
    meat: seed.meat ?? null,
    protein_pieces: seed.protein_pieces ?? null,
    protein_category: seed.protein_category ?? null,
    includes: seed.includes ?? [],
    ordering_channel: channel,
    comparable,
    validation_status: validationStatus,
    source_provider: seed.source_provider ?? 'bright_data',
    source_url: seed.source_url ?? `${MOCK_SOURCE_ROOT}/${seed.chain_id}`,
    source_item_id: seed.source_item_id ?? null,
    observed_at: seed.observed_at ?? DEFAULT_OBSERVED_AT,
    product_key: seed.product_key ?? productKey,
    offer_key: seed.offer_key ?? `${productKey}|${channel}`,
    delivery_fee_cents: seed.delivery_fee_cents ?? null,
    service_fee_cents: seed.service_fee_cents ?? null,
    small_order_fee_cents: seed.small_order_fee_cents ?? null,
    components: seed.components,
  };
}

export const MOCK_OFFERS: MenuOffer[] = [
  offer({ id: 'mcd-10-nuggets', source_item_id: 'DEMO-001', chain_id: 'mcdonalds', location_id: 'market-mcd', category: 'chicken-nugget', original_name: '10 pc Chicken McNuggets', quantity: 10, quantity_label: '10 pc', list_price_cents: 649 }),
  offer({ id: 'mcd-20-nuggets', source_item_id: 'DEMO-002', chain_id: 'mcdonalds', location_id: 'market-mcd', category: 'chicken-nugget', original_name: '20 pc Chicken McNuggets', quantity: 20, quantity_label: '20 pc', list_price_cents: 1099 }),
  offer({ id: 'mcd-6-nuggets', source_item_id: 'DEMO-003', chain_id: 'mcdonalds', location_id: 'market-mcd', category: 'chicken-nugget', original_name: '6 pc Chicken McNuggets', quantity: 6, quantity_label: '6 pc', list_price_cents: 449, observed_at: '2026-10-20T16:00:00.000Z' }),
  offer({ id: 'wendys-10-nuggets', source_item_id: 'DEMO-004', chain_id: 'wendys', location_id: 'civic-wendys', category: 'chicken-nugget', original_name: '10 pc Chicken Nuggets', quantity: 10, quantity_label: '10 pc', list_price_cents: 599 }),
  offer({ id: 'wendys-4-nuggets', source_item_id: 'DEMO-005', chain_id: 'wendys', location_id: 'civic-wendys', category: 'chicken-nugget', original_name: '4 pc Chicken Nuggets', quantity: 4, quantity_label: '4 pc', list_price_cents: 299, observed_at: '2026-10-22T16:00:00.000Z' }),
  offer({ id: 'wendys-uncounted-tenders', source_item_id: 'DEMO-006', chain_id: 'wendys', location_id: 'civic-wendys', category: 'chicken-tender', original_name: 'Crispy Chicken Tenders - size not shown', quantity: null, quantity_label: 'Size not shown', list_price_cents: 549, comparable: false }),
  offer({ id: 'popeyes-3-tenders', source_item_id: 'DEMO-007', chain_id: 'popeyes', location_id: 'soma-popeyes', category: 'chicken-tender', original_name: '3 pc Classic Tenders', quantity: 3, quantity_label: '3 pc', list_price_cents: 549, heat: 'classic' }),
  offer({ id: 'popeyes-5-tenders', source_item_id: 'DEMO-008', chain_id: 'popeyes', location_id: 'soma-popeyes', category: 'chicken-tender', original_name: '5 pc Classic Tenders', quantity: 5, quantity_label: '5 pc', list_price_cents: 849, heat: 'classic' }),
  offer({ id: 'popeyes-8-nuggets', source_item_id: 'DEMO-009', chain_id: 'popeyes', location_id: 'soma-popeyes', category: 'chicken-nugget', original_name: '8 pc Nuggets - price not returned', quantity: 8, quantity_label: '8 pc', list_price_cents: null, comparable: false }),
  offer({ id: 'kfc-8-nuggets', source_item_id: 'DEMO-010', chain_id: 'kfc', location_id: 'north-kfc', category: 'chicken-nugget', original_name: '8 pc Nuggets', quantity: 8, quantity_label: '8 pc', list_price_cents: 579, observed_at: '2026-10-21T16:00:00.000Z' }),
  offer({ id: 'kfc-12-nuggets', source_item_id: 'DEMO-011', chain_id: 'kfc', location_id: 'north-kfc', category: 'chicken-nugget', original_name: '12 pc Nuggets', quantity: 12, quantity_label: '12 pc', list_price_cents: 799 }),
  offer({ id: 'kfc-3-tenders', source_item_id: 'DEMO-012', chain_id: 'kfc', location_id: 'north-kfc', category: 'chicken-tender', original_name: '3 pc Tenders', quantity: 3, quantity_label: '3 pc', list_price_cents: 599, observed_at: '2026-10-21T16:00:00.000Z' }),
  offer({ id: 'bk-nuggets-unavailable', source_item_id: 'DEMO-013', chain_id: 'burger-king', location_id: 'sunset-bk', category: 'chicken-nugget', original_name: 'Chicken Nuggets - price unavailable in sample', quantity: 8, quantity_label: '8 pc', list_price_cents: null, comparable: false }),
  offer({ id: 'cfa-grilled-8', source_item_id: 'DEMO-014', chain_id: 'chick-fil-a', location_id: 'union-cfa', category: 'chicken-nugget', original_name: '8 ct Grilled Nuggets', quantity: 8, quantity_label: '8 ct', list_price_cents: 499, prep: 'grilled', breading: null }),
  offer({ id: 'cfa-grilled-12', source_item_id: 'DEMO-015', chain_id: 'chick-fil-a', location_id: 'union-cfa', category: 'chicken-nugget', original_name: '12 ct Grilled Nuggets', quantity: 12, quantity_label: '12 ct', list_price_cents: 699, prep: 'grilled', breading: null }),
  offer({ id: 'kfc-bucket-8', source_item_id: 'DEMO-016', chain_id: 'kfc', location_id: 'north-kfc', category: 'chicken-bucket', original_name: '8 pc Original Recipe Bucket', quantity: 8, quantity_label: '8 pc', list_price_cents: 1699, cut_mix: { breast: 2, thigh: 2, drum: 2, wing: 2 }, meat: 'mixed' }),
  offer({ id: 'wingstop-10-wings', source_item_id: 'DEMO-017', chain_id: 'wingstop', location_id: 'mission-wingstop', category: 'chicken-wing', original_name: '10 pc Classic Wings', quantity: 10, quantity_label: '10 pc', list_price_cents: 999, heat: 'classic', flavor: 'Lemon Pepper' }),
  offer({ id: 'wingstop-10-boneless', source_item_id: 'DEMO-018', chain_id: 'wingstop', location_id: 'mission-wingstop', category: 'chicken-boneless-wing', original_name: '10 pc Boneless Wings', quantity: 10, quantity_label: '10 pc', list_price_cents: 849, breading: 'sauced', flavor: 'Atomic' }),
  offer({ id: 'popeyes-sandwich', source_item_id: 'DEMO-019', chain_id: 'popeyes', location_id: 'soma-popeyes', category: 'chicken-sandwich', original_name: 'Classic Chicken Sandwich', quantity: 1, quantity_label: '1 sandwich', list_price_cents: 699, build: 'classic', protein_pieces: 1 }),
  offer({ id: 'daves-slider', source_item_id: 'DEMO-020', chain_id: 'daves-hot-chicken', location_id: 'embarcadero-daves', category: 'chicken-slider', original_name: 'Single Slider - Medium Heat', quantity: 1, quantity_label: '1 slider', list_price_cents: 659, heat: 'medium', build: 'classic', protein_pieces: 1 }),
  offer({ id: 'cfa-wrap', source_item_id: 'DEMO-021', chain_id: 'chick-fil-a', location_id: 'union-cfa', category: 'chicken-wrap', original_name: 'Cool Wrap', quantity: 1, quantity_label: '1 wrap', list_price_cents: 899, prep: 'grilled', build: 'classic', protein_pieces: 1 }),
  offer({ id: 'bk-chicken-fries', source_item_id: 'DEMO-022', chain_id: 'burger-king', location_id: 'sunset-bk', category: 'chicken-fry', original_name: 'Chicken Fries - 9 pc', quantity: 9, quantity_label: '9 pc', list_price_cents: 599 }),
  offer({
    id: 'canes-box-combo', source_item_id: 'DEMO-023', chain_id: 'raising-canes', location_id: 'tenderloin-canes',
    category: 'chicken-tender', original_name: 'The Box Combo', quantity: 4, quantity_label: '4 fingers',
    list_price_cents: 1189, offer_kind: 'combo', comparable: false,
    includes: ["Cane's Sauce", 'Crinkle-Cut Fries', 'Texas Toast', 'Coleslaw', 'Regular fountain drink'],
    components: [
      { role: 'chicken', category: 'chicken-tender', quantity: 4 },
      { role: 'side', name: 'Crinkle-Cut Fries', quantity: 1 },
      { role: 'side', name: 'Texas Toast', quantity: 1 },
      { role: 'side', name: 'Coleslaw', quantity: 1 },
      { role: 'sauce', name: "Cane's Sauce", quantity: 1 },
      { role: 'drink', name: 'Regular fountain drink', quantity: 1, size: '22 oz' },
    ],
  }),
];

export const MOCK_DEALS: MenuDeal[] = [
  {
    id: 'mock-wendys-free-nuggets',
    chain_id: 'wendys',
    location_id: 'civic-wendys',
    name: 'App reward - illustrative sample',
    deal_type: 'free_item',
    price_cents: null,
    amount_off_cents: null,
    percent_off: null,
    applies_to: { category: 'chicken-nugget', quantity: null },
    receives: [{ role: 'chicken', category: 'chicken-nugget', quantity: null, name: 'Nuggets - approximate quantity' }],
    schedule: [],
    conditions: { channel: 'first_party_pickup', requires_app: true, requires_account: true, minimum_subtotal_cents: 500, stackable: false },
    source_url: `${MOCK_SOURCE_ROOT}/deals/DEMO-DEAL-001`,
    observed_at: DEFAULT_OBSERVED_AT,
    location_confirmed: false,
  },
];

export const MOCK_DISTANCE_MILES: Record<'market' | 'north-beach', Record<string, number>> = {
  market: {
    'market-mcd': 0.7,
    'civic-wendys': 1.2,
    'soma-popeyes': 2.1,
    'north-kfc': 3.4,
    'sunset-bk': 4.9,
    'union-cfa': 1.8,
    'mission-wingstop': 2.8,
    'tenderloin-canes': 4.4,
    'embarcadero-daves': 4.7,
  },
  'north-beach': {
    'market-mcd': 3.8,
    'civic-wendys': 2.4,
    'soma-popeyes': 2.9,
    'north-kfc': 0.5,
    'sunset-bk': 8.2,
    'union-cfa': 2.3,
    'mission-wingstop': 2.4,
    'tenderloin-canes': 5.6,
    'embarcadero-daves': 1.9,
  },
};
