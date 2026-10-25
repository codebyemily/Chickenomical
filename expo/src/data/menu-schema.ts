export const MENU_CATEGORIES = [
  'chicken-nugget',
  'chicken-tender',
  'chicken-bucket',
  'chicken-wing',
  'chicken-boneless-wing',
  'chicken-sandwich',
  'chicken-slider',
  'chicken-wrap',
  'chicken-fry',
] as const;

export type KnownMenuCategory = (typeof MENU_CATEGORIES)[number];
/** Categories are owned by Convex; this list only supplies labels for known values. */
export type MenuCategory = string & {};
export type OrderingChannel =
  | 'first_party_pickup'
  | 'first_party_delivery'
  | 'doordash_pickup'
  | 'doordash_delivery'
  | 'ubereats_pickup'
  | 'ubereats_delivery'
  | (string & {});
export type OfferKind = 'ala_carte' | 'combo' | 'family_meal' | 'kids_meal' | (string & {});
export type ValidationStatus = 'verified' | 'needs_review' | 'excluded' | (string & {});
export type Prep = 'fried' | 'grilled' | 'blackened' | (string & {});

export type Chain = {
  id: string;
  name: string;
};

export type StoreLocation = {
  id: string;
  chain_id: string;
  store_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  pickup: boolean;
};

export type CutMix = Partial<Record<'breast' | 'thigh' | 'drum' | 'wing', number>>;

export type OfferComponent = {
  role: 'chicken' | 'side' | 'sauce' | 'drink';
  category?: string;
  name?: string;
  quantity?: number | null;
  size?: string;
};

/** Offer fields follow docs/menu-data-structure.md and scrapers/brightdata/src/offer.mjs. */
export type MenuOffer = {
  id: string;
  chain_id: string;
  location_id: string;
  offer_kind: OfferKind;
  category: string | null;
  original_name: string;
  quantity: number | null;
  quantity_label: string | null;
  list_price_cents: number | null;
  currency: string;
  prep: Prep | null;
  heat: string | null;
  build: string | null;
  breading: string | null;
  flavor: string | null;
  cut_mix: CutMix | null;
  meat: 'white' | 'dark' | 'mixed' | 'unknown' | null;
  protein_pieces: number | null;
  protein_category: string | null;
  includes: string[];
  ordering_channel: OrderingChannel;
  comparable: boolean;
  validation_status: ValidationStatus;
  source_provider: string;
  source_url: string;
  source_item_id: string | null;
  observed_at: string;
  product_key: string;
  offer_key: string;
  delivery_fee_cents?: number | null;
  service_fee_cents?: number | null;
  small_order_fee_cents?: number | null;
  components?: OfferComponent[];
};

export type DealComponent = OfferComponent;

export type MenuDeal = {
  id: string;
  chain_id: string;
  location_id: string | null;
  name: string;
  deal_type: 'fixed_price' | 'amount_off' | 'percent_off' | 'bogo' | 'free_item' | 'bundle_price';
  price_cents: number | null;
  amount_off_cents: number | null;
  percent_off: number | null;
  applies_to: {
    category?: string;
    quantity?: number | null;
    build?: string;
    offer_keys?: string[];
  };
  receives: DealComponent[];
  schedule: { weekday: number; description: string }[];
  conditions: {
    channel?: OrderingChannel;
    requires_app?: boolean;
    requires_account?: boolean;
    minimum_subtotal_cents?: number;
    stackable?: boolean;
    starts_at?: string;
    ends_at?: string;
  };
  source_url: string;
  observed_at: string;
  location_confirmed: boolean;
};

export type DemoArea = 'market' | 'north-beach' | 'nowhere' | 'custom';
export type Category = MenuCategory;

export const CATEGORY_INFO: Record<KnownMenuCategory, { label: string; unit: string; plural: string }> = {
  'chicken-nugget': { label: 'Nuggets', unit: 'piece', plural: 'pieces' },
  'chicken-tender': { label: 'Tenders', unit: 'piece', plural: 'pieces' },
  'chicken-bucket': { label: 'Bone-in chicken', unit: 'piece', plural: 'pieces' },
  'chicken-wing': { label: 'Bone-in wings', unit: 'piece', plural: 'pieces' },
  'chicken-boneless-wing': { label: 'Boneless wings', unit: 'piece', plural: 'pieces' },
  'chicken-sandwich': { label: 'Sandwiches', unit: 'sandwich', plural: 'sandwiches' },
  'chicken-slider': { label: 'Sliders', unit: 'slider', plural: 'sliders' },
  'chicken-wrap': { label: 'Wraps', unit: 'wrap', plural: 'wraps' },
  'chicken-fry': { label: 'Chicken fries', unit: 'piece', plural: 'pieces' },
};

export const CATEGORY_OPTIONS = MENU_CATEGORIES.map((id) => ({ id, ...CATEGORY_INFO[id] }));

export function categoryInfo(category: string | null) {
  if (!category) return { label: 'Unclassified chicken', unit: 'item', plural: 'items' };
  const known = CATEGORY_INFO[category as KnownMenuCategory];
  if (known) return known;
  const label = category
    .replace(/^chicken[-_]/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { label: label || category, unit: 'item', plural: 'items' };
}

export function categoryUnit(category: string | null, count = 2) {
  const info = categoryInfo(category);
  return count === 1 ? info.unit : info.plural;
}

export function categoryLabel(category: string | null) {
  return categoryInfo(category).label;
}

export function quantityText(category: string | null, quantity: number | null) {
  if (quantity == null) return 'Quantity not stated';
  return `${quantity} ${categoryUnit(category, quantity)}`;
}

export const DEMO_DATA_NOTICE =
  'Prototype data only. Restaurant examples, locations, prices, distances, sources, and check times are synthetic, not current menu information.';
