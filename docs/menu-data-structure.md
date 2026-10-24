# Menu data structure

One record shape for every chicken chain. A McNugget, a Chick-fil-A Nugget, and a Wendy's Nugg are different brands and different piece ladders, and they still land in `chicken-nugget` with a quantity, a price, a channel, and any deal that changes what the customer pays.

This is the comparison contract behind Chickenomical: the same product across brands, quantity per dollar, location by location, with the math left visible. It extends the logical schema in `idea.md` (`chains`, `locations`, `menu_offers`) so deals, bundles, and delivery channels from `vision.md` fit the same rows instead of becoming one-off fields per restaurant.

Prices below are **shapes**, not live quotes. Real rows keep the source URL and the time they were checked. A missing price stays missing.

## Comparison unit

Every purchasable row is a **menu offer**: one product, at one location, in one ordering channel, at one observed price.

```text
chain
  └── location
        └── menu offer  (category + quantity + list price + channel)
              ├── components   (only when the row is a bundle)
              └── deals        (rules that can change the charged price)
```

Rankings compare offers only when all of the following match:

| Must match | Why |
|---|---|
| `category` | A tender is a different product from a nugget, a wing, or a bucket piece. |
| `prep` | Fried and grilled are different products. Spicy stays in the same category and can be filtered. |
| `ordering_channel` | Pickup, first-party delivery, DoorDash, and Uber Eats are separate prices. |
| `offer_kind: ala_carte` for per-piece rank | A combo price includes fries and a drink. |
| Known `quantity` | "Party pack" or "about 45–50" cannot produce a price per piece. |
| Same currency | Store money as integer cents. |

`product_key` ties the same menu item across channels. `offer_key` is that product in one channel.

```text
product_key = location + category + quantity + variant + offer_kind
offer_key   = product_key + ordering_channel
```

`variant` is the stable signature of prep, heat, breading, sandwich build, and bucket cut mix. Two sizes are two products: a 6-piece and a 10-piece do not share an offer key.

## Categories

Category ids are closed. Ingestion maps a raw name into one id, or marks the row for review. It does not invent a new id per chain.

| Id | Unit | What counts as 1 | Shared by |
|---|---|---|---|
| `chicken-nugget` | piece | One bite-size breaded nugget | McDonald's, Chick-fil-A, Wendy's, Burger King, KFC, Jollibee; Popeyes only where that location lists nuggets |
| `chicken-tender` | piece | One strip, finger, or tender | Chick-fil-A, McDonald's, Wendy's, KFC, Popeyes, Raising Cane's, Jollibee, Wingstop, Zaxby's, Church's, Bojangles, Dave's Hot Chicken |
| `chicken-bucket` | piece | One bone-in fried piece inside a counted box or bucket | KFC, Popeyes, Church's, Jollibee Chickenjoy, Bojangles |
| `chicken-wing` | piece | One bone-in wing (flat or drumette) | Wingstop, KFC, Popeyes, Zaxby's, Church's |
| `chicken-boneless-wing` | piece | One boneless wing, usually sauced | Wingstop, Zaxby's; other chains only when the menu uses that name |
| `chicken-sandwich` | sandwich | One bun with a chicken fillet or patty as the protein | McDonald's, Chick-fil-A, Wendy's, Burger King, KFC, Popeyes, Jollibee, Wingstop, Zaxby's |
| `chicken-slider` | slider | One small bun; quantity is the slider count | Dave's Hot Chicken; Wingstop and Zaxby's where they sell multi-slider items |
| `chicken-wrap` | wrap | One tortilla | Chick-fil-A, McDonald's, Wendy's, Burger King, KFC, Zaxby's, Church's |
| `chicken-fry` | piece | One fry-shaped breaded piece | Burger King Chicken Fries today; kept so those rows are not filed as nuggets |

Default per-piece rankings use `chicken-nugget` and `chicken-tender`. The other ids use this same offer shape so a later bucket or wing comparison does not need a second schema.

### Attributes that travel with the category

| Field | Values | Comparison rule |
|---|---|---|
| `prep` | `fried`, `grilled`, `blackened` | Rankings match `prep`. Chick-fil-A Grilled Nuggets stay `chicken-nugget` with `prep: grilled`. |
| `heat` | `classic`, `spicy`, or a flavor code such as `nashville-hot` | Same category. Shown on the row. A "classic only" filter drops the rest. |
| `breading` | `breaded`, `tempura`, `sauced` | Recorded. Sauced nuggets (KFC "saucy") stay nuggets and display the coating. |
| `build` | `classic`, `deluxe`, `club`, `value` | Sandwiches and wraps. Default sandwich ranking uses `build: classic` (one standard fillet). `value` is the smaller sandwich: McChicken, Chicken Jr. `deluxe` and `club` add toppings on that fillet. |
| `protein_pieces` | integer | How many chicken pieces are inside one sandwich, slider, or wrap. A standard fillet is `1`. Raising Cane's sandwich is `3` tenders on a bun, so it stays out of the one-fillet sandwich ranking. |
| `cut_mix` | counts of `breast`, `thigh`, `drum`, `wing` | Required for `chicken-bucket` when the menu states the mix. Price per piece still uses total `quantity`. The mix is always shown. |
| `meat` | `white`, `dark`, `mixed`, `unknown` | Buckets and wings. Jollibee Chickenjoy buckets in the US are leg and thigh. |

Boneless wings stay in `chicken-boneless-wing` even when the kitchen product resembles a nugget. Bone-in wings stay in `chicken-wing`. A later opt-in view can place nuggets and boneless wings side by side; the default ranking does not.

## Where the menus actually overlap

Checked **23 October 2026** against chain menu pages and current menu writeups. Piece ladders are national patterns. A location can omit a size, add a limited run, or price it differently. Confirm each row from that location's own menu.

### `chicken-nugget`

| Chain | Menu name | Quantities |
|---|---|---|
| McDonald's | Chicken McNuggets; Spicy McNuggets when offered | 4, 6, 10, 20, 40 |
| Chick-fil-A | Chick-fil-A Nuggets | 5, 8, 12, 30. Grilled Nuggets use the same counts with `prep: grilled`. Kids meals add smaller counts at some locations. |
| Wendy's | Chicken Nuggets, crispy and spicy | 4, 6, 10, 20. The Wednesday app reward is about 45–50 pieces and has **no exact quantity**. |
| Burger King | Chicken Nuggets | 4, 10, 20 on the national menu; 6 in the King Jr. meal. Older listings still show 8 and 16 — trust the location menu. |
| KFC | Nuggets | 5, 8, 10, 12, 24, 36, 50, plus sauced versions of the smaller boxes |
| Jollibee | Chicken Nuggets | 5, 8, 15, 30 |
| Popeyes | Nuggets | Some delivery menus list 6, 10, and 20. The national US menu surface is tenders, wings, and signature chicken. Store the row only when that location lists it. |

### `chicken-tender`

| Chain | Menu name | Quantities |
|---|---|---|
| Chick-fil-A | Chick-n-Strips | 2, 3, 4 |
| McDonald's | McCrispy Strips | 3, 4 |
| Wendy's | Chicken Tenders (Tendys) | 3, 4; kids meal 2 |
| KFC | Tenders, Original and flavored | 1 (à la carte), 2 (kids), 3, 4, 5, 8, 12, 16. Many of these are sold only as meals — see bundles. |
| Popeyes | Tenders | 3, 5, 8, and larger share boxes (12, 16) on delivery menus |
| Raising Cane's | Chicken Fingers | 1 as an extra; 2, 3, 4, 6 inside combos; tailgates at 25, 50, 75, 100 |
| Jollibee | Chicken Tenders | 6 and 10 on the family menu; some locations also list 3 and 4 |
| Wingstop | Crispy Tenders | 3, 4, 5, 7, 15, 20, 30 |
| Zaxby's | Chicken Fingerz | 5, 10, 20 à la carte; 3, 4, 5, 6 inside meals; platters at 40 and 60 |
| Church's | Tenders | 3 and 5 on current delivery menus |
| Bojangles | Chicken Supremes and Homestyle Tenders | Supremes 4; Homestyle Tenders 3; family meals at 12 |
| Dave's Hot Chicken | Tenders | 1 à la carte; meals built from 2 |

### `chicken-bucket`

Bone-in fried chicken sold by the piece. A bucket piece is not a nugget and not a tender.

| Chain | Menu name | Quantities and mix |
|---|---|---|
| KFC | Chicken bucket / box | 8, 12, 16. Variety is an even split of breast, thigh, drum, and wing. Drum & Thigh is dark meat only. Smaller 2, 3, and 4 piece boxes exist and use the same category. |
| Popeyes | Signature Chicken | 8, 12, 16 are the share sizes; many locations also sell 2, 3, and 4. |
| Jollibee | Chickenjoy | 6 (3 legs, 3 thighs) and 10 (5 legs, 5 thighs). Meal deals add 8 and 12, still leg and thigh. `heat` is original or spicy. |
| Church's | Bone-in chicken | 2 and 3 piece orders, and a 6-piece dark-meat meal on current delivery menus. Original or spicy. Larger family counts go on the row only when that location lists them. |
| Bojangles | Bone-in chicken | 2 and 3 piece boxes with sides; 8 and 12 piece chicken-only; larger family meals. |

### `chicken-wing` and `chicken-boneless-wing`

Wingstop sells both in the same counts and at different prices. The category is chosen by the bone-in / boneless selector, not by the number.

| Chain | Bone-in | Boneless |
|---|---|---|
| Wingstop | Classic wings: combo 6, 8, 10; by the piece 10, 15, 20, 30, 50, 75, 100; packs at those counts too | Same counts, separate price |
| KFC | Hot & Spicy and sauced wings: 6, 12, 20, plus a single wing | Only when the item name says boneless |
| Popeyes | 6, 12, 24, plus group packs | Older menus listed boneless wings; current location menus decide |
| Zaxby's | Traditional wings: 5, 10, 20 | Boneless wings: 5, 10, 20, 30 |
| Church's | Bone-in wings, including a 6-piece | — |

Wing flavor (lemon pepper, atomic, honey BBQ) is `heat` plus a `flavor` string. It does not create a new category. Price per wing compares items in the same category; flavor is displayed and filterable.

### `chicken-sandwich`, `chicken-slider`, `chicken-wrap`

| Chain | Sandwich (`quantity: 1`) | Slider | Wrap |
|---|---|---|---|
| McDonald's | McCrispy, Spicy, Deluxe (`build`), McChicken (`build: value`) | — | Snack Wrap |
| Chick-fil-A | Chicken Sandwich, Spicy, Deluxe, Grilled (`prep`) | — | Cool Wrap |
| Wendy's | Classic, Spicy, Grilled | — | Menu wraps |
| Burger King | Original Chicken Sandwich; Royal Crispy Chicken; Flame-Grilled (`prep`); Chicken Jr. (`build: value`) | — | Royal Crispy, Original, and Flame-Grilled wraps |
| KFC | Chicken sandwich, classic and spicy | — | Wraps where listed |
| Popeyes | Classic, Spicy, Honey BBQ, bacon-and-cheese builds | — | — |
| Jollibee | Deluxe chicken sandwich | — | — |
| Wingstop | Chicken Sandwich, flavor on the fillet | Triple combo is 3 sliders | — |
| Zaxby's | Signature fillet; grilled fillet (`prep`) | 3 Nibblerz (finger on a small bun) | Finger wrap, `protein_pieces: 3` |
| Raising Cane's | The Sandwich Combo is 3 fingers on a bun: `chicken-sandwich`, `protein_pieces: 3`, `protein_category: chicken-tender` | — | — |
| Dave's Hot Chicken | — | 1 slider; mini order is 4; hot box is 10 or 20 | — |

Dave's heat level (no spice through Reaper) is `heat` on the slider or tender. Cauliflower items are not chicken and stay out of these categories.

### Leave for review

These show up on real menus and do not have a shared id yet. Store the original name, leave `category` empty, and set `validation_status: needs_review`.

| Item | Why it waits |
|---|---|
| Wingstop Thigh Bites | Bite-size dark meat in its own counts (6, 10, 20). Different from a nugget and from a boneless wing. |
| Dave's Bites | White-meat bites, often 10 or a 40-piece box. Same hold until a location menu gives an exact count and the team decides they match `chicken-nugget`. |
| Wendy's nugget reward | Published as about 45–50 pieces. A range cannot be a quantity. |
| Mixed family meals | Already representable as bundles, and they stay out of single-category rankings. |

## Offer fields

| Field | Type | Required | Role |
|---|---|---|---|
| `id` | string | yes | Row id. |
| `chain_id` | string | yes | `mcdonalds`, `chick-fil-a`, `kfc`, `popeyes`, `wendys`, `raising-canes`, `jollibee`, `wingstop`, … |
| `location_id` | string | yes | One store. Two stores of the same chain keep separate prices. |
| `offer_kind` | enum | yes | `ala_carte`, `combo`, `family_meal`, `kids_meal`. |
| `category` | category id | yes for chicken rows | Null only for a non-chicken side stored as its own row. |
| `original_name` | string | yes | Exact menu label. Never rewritten. |
| `quantity` | integer | yes for per-piece rank | Count of the category unit. This is `piece_count` in `idea.md`. |
| `quantity_label` | string | no | Menu's own words: `10 pc`, `Box`, `Caniac`. |
| `list_price_cents` | integer | yes | Price on that channel before deals, fees, and tax. |
| `currency` | string | yes | `USD` for the US demo. |
| `prep`, `heat`, `build`, `breading`, `flavor` | enums / string | when known | Variant. Unknown stays unknown; it is not guessed. |
| `cut_mix` | object | buckets, when stated | `{ "breast": 2, "thigh": 2, "drum": 2, "wing": 2 }`. |
| `protein_pieces` | integer | sandwiches, sliders, wraps | Pieces of chicken inside one unit. |
| `protein_category` | category id | when the protein is a different category | Cane's sandwich points at `chicken-tender`. |
| `ordering_channel` | enum | yes | See channels below. |
| `includes` | string[] | no | Sauces, biscuits, or sides that come with an otherwise single-category item, when they are not priced separately. |
| `comparable` | boolean | yes | False when quantity, price, or category is too weak for a ranking. |
| `validation_status` | enum | yes | `verified`, `needs_review`, `excluded`. |
| `source_provider` | string | yes | `apify`, `bright_data`, `first_party`, … |
| `source_url` | string | yes | Page a person can open. |
| `source_item_id` | string | when the menu has one | Stable id from the ordering API. |
| `observed_at` | timestamp | yes | When this price was read. |
| `product_key` | string | yes | Same item across channels. |
| `offer_key` | string | yes | Unique with channel. |

Unit price is `list_price_cents / quantity`. Keep the ratio exact. Round only on screen.

### Channels

| `ordering_channel` | What it is |
|---|---|
| `first_party_pickup` | Restaurant site or app, pickup. Default ranking channel. |
| `first_party_delivery` | Restaurant's own delivery. |
| `doordash_pickup` | DoorDash, pickup. |
| `doordash_delivery` | DoorDash, delivery. |
| `ubereats_pickup` | Uber Eats, pickup. |
| `ubereats_delivery` | Uber Eats, delivery. |

A channel row may also carry fees. Fees are not folded into `list_price_cents`.

| Fee field | Meaning |
|---|---|
| `delivery_fee_cents` | Quoted delivery fee, if the source showed one. |
| `service_fee_cents` | Platform service fee, if shown. |
| `small_order_fee_cents` | Small-order fee, if shown. |

Tax, tip, and driver promotions stay off the row until a source actually returns them. Comparing "order direct vs DoorDash" means: same `product_key`, both channels, list prices side by side, fees added only where observed, deals applied only where their conditions are known.

### Bundles

A combo is one offer with `offer_kind: combo` and a `components` list. The parent price is what the customer pays. Component prices are filled only when the menu states them.

```json
{
  "offer_kind": "combo",
  "original_name": "The Box Combo",
  "category": "chicken-tender",
  "quantity": 4,
  "list_price_cents": 1189,
  "comparable": false,
  "components": [
    { "role": "chicken", "category": "chicken-tender", "quantity": 4 },
    { "role": "side", "name": "Crinkle-Cut Fries", "quantity": 1 },
    { "role": "side", "name": "Texas Toast", "quantity": 1 },
    { "role": "side", "name": "Coleslaw", "quantity": 1 },
    { "role": "sauce", "name": "Cane's Sauce", "quantity": 1 },
    { "role": "drink", "name": "Regular fountain drink", "size": "22 oz" }
  ]
}
```

`comparable: false` keeps this out of price-per-finger rankings. Raising Cane's still appears in a **combo** ranking against other finger meals, because the component list says the chicken is 4 tenders.

Mixed boxes are stored and excluded from a single-category ranking:

| Raw item | How it is stored |
|---|---|
| KFC 6 pc chicken + 12 pc nuggets family meal | `offer_kind: family_meal`, two chicken components (`chicken-bucket` × 6, `chicken-nugget` × 12), `comparable: false` |
| Wingstop All-In Bundle (16 boneless + 6 tenders + fries) | Two chicken components, `comparable: false` |
| KFC 8 pc tenders only | `ala_carte`, `chicken-tender`, `quantity: 8`, sauces noted in `includes` |

The quantity solver in `idea.md` uses à la carte offers in one category. It can repeat a size (two 6-piece nuggets). It does not pull pieces out of a combo unless that combo is the only way the chain sells the product **and** the UI is in combo mode.

## Deals

A deal is a separate object. It references offers or a category. It does not overwrite `list_price_cents`. The list price remains the menu price a person can check. The quote math shows the deal on top.

| Field | Type | Role |
|---|---|---|
| `id` | string | Deal id. |
| `chain_id` | string | Brand. |
| `location_id` | string or null | Null means "advertised chain-wide." A location still has to be confirmed before the deal is applied there. |
| `name` | string | Menu or ad name. |
| `deal_type` | enum | `fixed_price`, `amount_off`, `percent_off`, `bogo`, `free_item`, `bundle_price`. |
| `price_cents` | integer | Fixed or bundle price, when that is the offer. |
| `amount_off_cents` | integer | For `amount_off`. |
| `percent_off` | number | For `percent_off`. 15 means 15%. |
| `applies_to` | object | Category, quantity, build, or specific `offer_key`s. |
| `receives` | component[] | What the customer gets, if it differs from `applies_to` (a free item, a weekday rotation). |
| `schedule` | object[] | Weekday rotation. Empty means "whenever the deal is active." |
| `conditions` | object | Channel, app, account, minimum subtotal, stackable flag, start, end. |
| `source_url`, `observed_at` | | Same provenance rules as offers. |
| `location_confirmed` | boolean | False until this store's menu or checkout showed the deal. |

### Deal types, from menus that already run them

**Fixed price, rotating product.** KFC's weekday bucket (reported May 2026) is one price and a different category each day:

| Day | Customer receives | Category | Quantity |
|---|---|---|---|
| Monday, Friday | Nuggets and sauces | `chicken-nugget` | 24 |
| Tuesday | Drums and thighs | `chicken-bucket` | 8 |
| Wednesday | Wings and sauces | `chicken-wing` | 10 |
| Thursday | Tenders and sauces | `chicken-tender` | 8 |

Advertised price was $10, with sides as a paid add-on. Two writeups disagreed on Thursday's sauce count. That is a `fixed_price` deal with a `schedule`, `location_confirmed: false` until a store shows it, and sauces stored as includes rather than guessed.

**Free item with a gate.** Wendy's free-nugget reward is app-only, needs a minimum purchase, and is excluded from outside delivery. The published size is approximate, so `quantity` is null, `comparable` is false, and the row cannot enter price-per-piece math. It can show as a conditional deal: "free nuggets after a $5 app purchase," with the size called approximate.

**Value price on a normal item.** McDonald's 4-piece on the Under $3 menu is still a `chicken-nugget` offer. If the value price is the location's pickup price, it is `list_price_cents`. If it only appears inside the app, it is a `fixed_price` deal pointed at the 4-piece offer, with `conditions.requires_app: true`.

**Platform promo.** A DoorDash percent-off is `percent_off` with `conditions.ordering_channels` set to the DoorDash channels. It applies in the quote for those channels. It does not change the restaurant's pickup list price.

**Bundle price.** "8 tenders + 2 sides for one price" is usually better stored as a combo offer. Use `bundle_price` when the discount is a promotion on top of items that also exist à la carte.

### Quote

Read-time math, not a stored overwrite:

```text
charged_price = list_price after the single best eligible deal
unit_price    = charged_price / quantity          (only if quantity is exact)
out_the_door  = charged_price + observed fees     (tax excluded until a source provides it)
savings       = list_price - charged_price
direct_delta  = this channel's out_the_door - first_party_pickup list price
```

Eligibility requires every condition the source stated: channel, day, app, minimum, and `location_confirmed`. Unstackable is the default. Two deals never combine unless both say they stack. A quote with an applied deal shows the deal name, the list price, and the charged price together.

## Worked rows

Illustrative cents, so the shape is concrete. They are not a claim about a store's price.

À la carte nuggets, the MVP row:

```json
{
  "chain_id": "mcdonalds",
  "location_id": "loc_demo_1",
  "offer_kind": "ala_carte",
  "category": "chicken-nugget",
  "original_name": "10 pc Chicken McNuggets",
  "quantity": 10,
  "prep": "fried",
  "heat": "classic",
  "list_price_cents": 549,
  "currency": "USD",
  "ordering_channel": "first_party_pickup",
  "comparable": true,
  "validation_status": "verified",
  "product_key": "loc_demo_1|chicken-nugget|10|fried|classic|ala_carte",
  "offer_key": "loc_demo_1|chicken-nugget|10|fried|classic|ala_carte|first_party_pickup"
}
```

The same 10-piece on DoorDash is a second offer with the same `product_key`, a different `offer_key`, its own `list_price_cents`, and fee fields if the page showed them.

A bucket that can be compared per piece, with the mix attached:

```json
{
  "chain_id": "kfc",
  "offer_kind": "ala_carte",
  "category": "chicken-bucket",
  "original_name": "8 pc. Chicken Bucket",
  "quantity": 8,
  "prep": "fried",
  "heat": "classic",
  "meat": "mixed",
  "cut_mix": { "breast": 2, "thigh": 2, "drum": 2, "wing": 2 },
  "list_price_cents": 2099,
  "ordering_channel": "first_party_pickup",
  "comparable": true
}
```

Jollibee's 6-piece is the same category and a different mix: `quantity: 6`, `meat: dark`, `cut_mix: { "thigh": 3, "drum": 3 }`. Price per piece is valid. The cut mix is part of the label so a breast-and-wing bucket is not presented as identical chicken.

A deal points at a category instead of copying prices onto the nugget row:

```json
{
  "id": "kfc-bucket-of-the-day",
  "chain_id": "kfc",
  "location_id": null,
  "name": "Bucket of the Day",
  "deal_type": "fixed_price",
  "price_cents": 1000,
  "schedule": [
    { "days": ["monday", "friday"], "receives": [{ "category": "chicken-nugget", "quantity": 24 }] },
    { "days": ["tuesday"], "receives": [{ "category": "chicken-bucket", "quantity": 8, "meat": "dark" }] },
    { "days": ["wednesday"], "receives": [{ "category": "chicken-wing", "quantity": 10 }] },
    { "days": ["thursday"], "receives": [{ "category": "chicken-tender", "quantity": 8 }] }
  ],
  "conditions": {
    "ordering_channels": ["first_party_pickup", "first_party_delivery"],
    "requires_app": false,
    "stackable": false
  },
  "location_confirmed": false
}
```

## How a scraped item becomes an offer

1. **Collect** the location menu for one channel. Keep the raw name, raw price, URL, and timestamp.
2. **Match the category** with the table above. `nugget` / `nugg` / `McNugget` → `chicken-nugget`. `tender` / `strip` / `finger` / `Chick-n-Strip` / `Supreme` (Bojangles) → `chicken-tender`. `bucket` and bone-in "pc chicken" → `chicken-bucket`. `boneless wing` → `chicken-boneless-wing`. `bone-in` or `classic wing` → `chicken-wing`.
3. **Read quantity** from `8 ct`, `10-piece`, `6 pc`, or a size selector. Tailgates and party packs with an exact count qualify. Ranges do not.
4. **Set the variant** from words the menu actually uses: spicy, grilled, deluxe, drum and thigh, flavor name.
5. **Split bundles** into components when the description lists them. Mark the parent `comparable: false` for per-piece rank.
6. **Attach deals** by chain, location, day, and channel. Leave `location_confirmed` false until this store shows the deal.
7. **Validate.** Quantity and price are positive integers. Category is in the closed list. Channel is set. Duplicate observations update the same `offer_key` and do not create a second visible row.

Ambiguous names can go through a classifier. The classifier may suggest a category and a confidence score. It may not fill in a price, a quantity, or a deal.

## What each ranking is allowed to use

| Question | Rows | Price |
|---|---|---|
| Cheapest per piece | `comparable` à la carte, one category, one prep, one channel | `list_price_cents / quantity`, or the deal quote when the deal is confirmed and the user includes deals |
| Cheapest single order | Same filter, sort by charged price | One offer, any quantity |
| At least N pieces | Same filter, combinations of sizes at one location | Solver from `idea.md`. Confirmed fixed-price deals enter as extra sizes (the Tuesday 8-piece at its deal price). |
| Is the extra mile worth it | Winning quote per location | Quote total, then straight-line distance |
| Order direct or in the app | Same `product_key` across channels | List price plus observed fees plus confirmed channel deals |

Freshness stays on the offer: show when it was checked, and separate fresh, stale, unverified, and unavailable. A deal with `location_confirmed: false` can be described as advertised. It is not applied to a store total.

## MVP slice

The first demo fills this same shape and ranks only part of it.

| Use now | Keep on the row, rank later |
|---|---|
| `chicken-nugget`, `chicken-tender` | Bucket, wing, boneless wing, sandwich, slider, wrap, fry |
| `first_party_pickup` | Delivery channels and fee fields |
| À la carte, exact quantity | Combos, with components stored once parsing is reliable |
| List price, source, `observed_at` | Deal quotes, after a deal is confirmed at the location |

Fixture rows use this JSON and are labeled test data. Live rows use it only with a source URL and a check time.

## Sources

Menu structure, not a price sheet. Location prices move, and third-party menus disagree with first-party ones often enough that ingestion should prefer the store's own ordering page.

- McDonald's nugget and strip sizes: [McDonald's McNuggets and McCrispy Strips](https://www.mcdonalds.com/us/en-us/full-menu/mcnuggets-and-mccrispy-strips.html), [4 piece product page](https://www.mcdonalds.com/us/en-us/product/chicken-mcnuggets-4-piece.html)
- Chick-fil-A entrées: [Chick-fil-A entrées](https://www.chick-fil-a.com/menu/entrees); counts from location menu pages such as [Roseville nuggets](https://www.chick-fil-a.com/locations/mn/roseville-mn/menu/chick-fil-a-nuggets)
- Wendy's nugget counts from Wendy's core nutrition PDF; tenders as 3- and 4-piece from Wendy's September 2025 launch; Wednesday reward described as about 45–50 pieces on [Wendy's chicken page](https://www.wendys.com/blog/wendys-knows-chicken)
- Burger King national menu writeup, checked October 2026: nuggets at 4, 10, 20, Chicken Fries separate, Royal Crispy / Original / Flame-Grilled sandwiches and wraps
- KFC piece lists summarized from KFC's ordering catalog (buckets 8/12/16, tenders through 16, nuggets 5 through 50, wings 6/12/20)
- KFC weekday bucket: [QSR Magazine, 4 May 2026](https://www.qsrmagazine.com/news/kfc-expands-10-tuesday-into-weeklong-bucket-of-the-day-deal/), [Restaurant Dive](https://www.restaurantdive.com/news/kfc-10-dollar-weekday-bucket-value-deal-new-sauces/819269/)
- Popeyes wings and tenders: [Popeyes menu](https://www.popeyes.com/menu); signature-chicken and nugget counts vary by location and delivery menu
- Raising Cane's: [menu](https://www.raisingcanes.com/menu/) (kids 2, 3-finger, Box 4, Caniac 6, sandwich of 3 fingers, tailgates)
- Jollibee: [family meals](https://www.jollibeefoods.com/menu/family-meals), [nuggets](https://www.jollibeefoods.com/crispy-juicy-bites-of-joy)
- Wingstop counts: [Wingstop menu](https://www.wingstop.com/menu)
- Zaxby's Fingerz and wings: Zaxby's menu PDFs and current meal pages (5/10/20, plates, Nibblerz)
- Church's and Bojangles: current delivery and brand menu pages for bone-in counts, tenders, and Supremes
- Dave's Hot Chicken: delivery menus (single tender, single slider, 4 minis, bites and hot boxes)
