import assert from "node:assert/strict";
import test from "node:test";
import { findChain } from "../src/chains.mjs";
import { parseMenu } from "../src/parse.mjs";

const observedAt = "2026-10-24T00:00:00.000Z";

test("Raising Cane's combos, tailgate, and single finger", () => {
  const markdown = `
## Combos
### The Box Combo®
**4 Chicken Fingers, Crinkle-Cut Fries, One Cane’s Sauce®, Texas Toast, Coleslaw, Regular Fountain Drink/Tea (22 oz.)**
### The Caniac™ Combo
**6 Chicken Fingers, Crinkle-Cut Fries, 2 Cane’s Sauce®**
### The Sandwich Combo
**3 Chicken Fingers, Cane’s Sauce®, Lettuce, Toasted Bun, Crinkle-Cut Fries**
### The Kids Combo
**2 Chicken Fingers, Crinkle-Cut Fries, One Cane’s Sauce®**
## Tailgates™
### 25-Finger Tailgate™
Includes 8 Cane’s Sauce®
## Extras
### Chicken Finger
130 Cal per finger
### Crinkle-Cut Fries
400 Cal per serving
`;
  const offers = parseMenu(findChain("raising-canes"), markdown, "https://www.raisingcanes.com/menu/", observedAt);
  const names = offers.map((offer) => offer.original_name);
  assert.deepEqual(names, [
    "The Box Combo®",
    "The Caniac™ Combo",
    "The Sandwich Combo",
    "The Kids Combo",
    "25-Finger Tailgate™",
    "Chicken Finger",
  ]);
  assert.equal(offers[0].category, "chicken-tender");
  assert.equal(offers[0].quantity, 4);
  assert.equal(offers[0].offer_kind, "combo");
  assert.equal(offers[0].list_price_cents, null);
  assert.equal(offers[0].comparable, false);
  assert.equal(offers[2].category, "chicken-sandwich");
  assert.equal(offers[2].protein_pieces, 3);
  assert.equal(offers[3].offer_kind, "kids_meal");
  assert.equal(offers[4].quantity, 25);
  assert.equal(offers[4].offer_kind, "ala_carte");
  assert.equal(offers[5].quantity, 1);
});

test("McDonald's chicken rows keep sizes and drop fish and burgers", () => {
  const markdown = `
## Burgers
    Hamburger](/us/en-us/product/hamburger.html)
## Chicken & Fish Sandwiches
    McCrispy®](/us/en-us/product/mccrispy-chicken-sandwich.html)
    Deluxe McCrispy®](/us/en-us/product/deluxe-mccrispy-chicken-sandwich.html)
    Spicy McCrispy®](/us/en-us/product/spicy-mccrispy-chicken-sandwich.html)
    McChicken®](/us/en-us/product/mcchicken.html)
    Filet-O-Fish®](/us/en-us/product/filet-o-fish.html)
## McNuggets® & McCrispy® Strips
    4 Piece Chicken McNuggets®](/us/en-us/product/chicken-mcnuggets-4-piece.html)
    McCrispy® Strips](/us/en-us/product/mccrispy-strips-3-piece.html)
## Snack Wrap®
    Ranch Snack Wrap®](/us/en-us/product/ranch-snack-wrap.html)
## Extra Value Meals
    10 piece Chicken McNuggets® Meal](/us/en-us/meal/chicken-mcnuggets-10-piece-meal.html)
## Happy Meal®
    6 Piece McNuggets® Happy Meal®](/us/en-us/meal/6-piece-chicken-mcnuggets-happy-meal.html)
`;
  const offers = parseMenu(findChain("mcdonalds"), markdown, "https://www.mcdonalds.com/us/en-us/full-menu.html", observedAt);
  const byName = Object.fromEntries(offers.map((offer) => [offer.original_name, offer]));
  assert.equal(byName.Hamburger, undefined);
  assert.equal(byName["Filet-O-Fish®"], undefined);
  assert.equal(byName["McCrispy®"].category, "chicken-sandwich");
  assert.equal(byName["McCrispy®"].quantity, 1);
  assert.equal(byName["McCrispy®"].build, "classic");
  assert.equal(byName["Deluxe McCrispy®"].build, "deluxe");
  assert.equal(byName["Spicy McCrispy®"].heat, "spicy");
  assert.equal(byName["McChicken®"].build, "value");
  assert.equal(byName["4 Piece Chicken McNuggets®"].category, "chicken-nugget");
  assert.equal(byName["4 Piece Chicken McNuggets®"].quantity, 4);
  assert.equal(byName["4 Piece Chicken McNuggets®"].offer_kind, "ala_carte");
  assert.equal(byName["McCrispy® Strips"].category, "chicken-tender");
  assert.equal(byName["McCrispy® Strips"].quantity, 3);
  assert.equal(byName["Ranch Snack Wrap®"].category, "chicken-wrap");
  assert.equal(byName["10 piece Chicken McNuggets® Meal"].offer_kind, "combo");
  assert.equal(byName["10 piece Chicken McNuggets® Meal"].quantity, 10);
  assert.equal(byName["6 Piece McNuggets® Happy Meal®"].offer_kind, "kids_meal");
  assert.equal(byName["4 Piece Chicken McNuggets®"].source_provider, "bright_data");
  assert.equal(byName["4 Piece Chicken McNuggets®"].list_price_cents, null);
});

test("Chick-fil-A headings become nuggets and a sandwich", () => {
  const markdown = `
## Entrées
### Chick-fil-A® Chicken Sandwich
](https://www.chick-fil-a.com/menu/entrees/chick-fil-a-chicken-sandwich)
### 8 ct Chick-fil-A® Nuggets
](https://www.chick-fil-a.com/menu/entrees/8-ct-chick-fil-a-nuggets)
### Grilled Nuggets
### Mac & Cheese
## Kid’s Meals
### 5 Ct Nuggets Kid’s Meal
`;
  const offers = parseMenu(findChain("chick-fil-a"), markdown, "https://www.chick-fil-a.com/menu/entrees", observedAt);
  assert.equal(offers.some((offer) => offer.original_name === "Mac & Cheese"), false);
  const nuggets = offers.find((offer) => offer.original_name.startsWith("8 ct"));
  assert.equal(nuggets.category, "chicken-nugget");
  assert.equal(nuggets.quantity, 8);
  const grilled = offers.find((offer) => offer.original_name === "Grilled Nuggets");
  assert.equal(grilled.prep, "grilled");
  assert.equal(grilled.category, "chicken-nugget");
  const kids = offers.find((offer) => offer.original_name.includes("Kid"));
  assert.equal(kids.offer_kind, "kids_meal");
  assert.equal(kids.quantity, 5);
});

test("a printed price becomes integer cents and a price range stays empty", () => {
  const markdown = `
### 10 pc Chicken Nuggets
$5.49
### 20 pc Chicken Nuggets
$7.00–$9.00
`;
  const offers = parseMenu(findChain("wendys"), markdown, "https://www.wendys.com/menu", observedAt);
  assert.equal(offers[0].list_price_cents, 549);
  assert.equal(offers[0].comparable, true);
  assert.equal(offers[0].validation_status, "verified");
  assert.equal(offers[1].list_price_cents, null);
  assert.equal(offers[1].comparable, false);
});

test("Jollibee buckets keep the leg and thigh mix", () => {
  const markdown = `
### 6pc Chickenjoy Bucket
6pc of fried chicken (3 legs, 3 thighs). Choose between Original or Spicy. $22.49
`;
  const offers = parseMenu(findChain("jollibee"), markdown, "https://www.jollibeefoods.com/menu/chickenjoy-fried-chicken", observedAt);
  assert.equal(offers.length, 1);
  assert.equal(offers[0].category, "chicken-bucket");
  assert.equal(offers[0].quantity, 6);
  assert.equal(offers[0].list_price_cents, 2249);
  assert.deepEqual(offers[0].cut_mix, { thigh: 3, drum: 3 });
});

test("a bare Sandwiches heading is not a chicken sandwich", () => {
  const offers = parseMenu(findChain("bojangles"), "## Sandwiches\n", "https://www.bojangles.com/menu/", observedAt);
  assert.equal(offers.length, 0);
});
