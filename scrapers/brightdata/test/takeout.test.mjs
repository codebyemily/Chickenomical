import assert from "node:assert/strict";
import test from "node:test";
import { milesBetween, parseAt } from "../src/geo.mjs";
import { offersFromCanesMenu } from "../src/takeout/canes.mjs";
import { offersFromChickfilaMenu } from "../src/takeout/chickfila.mjs";
import { offersFromJollibeeProducts } from "../src/takeout/jollibee.mjs";
import { offersFromPopeyesPriced } from "../src/takeout/popeyes.mjs";
import { offersFromWendysMenu } from "../src/takeout/wendys.mjs";
import { offersFromWingstopProduct } from "../src/takeout/wingstop.mjs";

const observedAt = "2026-10-24T00:00:00.000Z";
const store = {
  id: "30",
  name: "Wendy's Lemmon Ave",
  address: "4018 LEMMON AVE., DALLAS, TX 75219",
  latitude: 32.81,
  longitude: -96.81,
  distance_miles: 2.69,
};

test("coordinates parse as latitude,longitude", () => {
  assert.deepEqual(parseAt("32.7767, -96.7970"), { latitude: 32.7767, longitude: -96.797 });
  assert.throws(() => parseAt("Dallas"), /latitude,longitude/);
});

test("distance is zero at the same point and a few miles across downtown", () => {
  const here = { latitude: 32.7767, longitude: -96.797 };
  assert.equal(milesBetween(here, here), 0);
  const miles = milesBetween(here, { latitude: 32.81, longitude: -96.81 });
  assert.ok(miles > 2 && miles < 4);
});

test("Wendy's store menu prices a 4-piece nugget at that store", () => {
  const offers = offersFromWendysMenu({
    menuLists: {
      salesItems: [{ salesItemId: 40021, price: 0, categoryName: "Chicken, Nuggets & More" }],
      menuItems: [{
        menuItemId: 30021,
        defaultItemId: 40021,
        isAvailable: true,
        displayName: "4 PC. Spicy Chicken Nuggets",
        name: "4 Piece Spicy Chicken Nuggets",
        description: "Spicy nuggets.",
        priceRange: "$2.89",
        price: 0,
      }, {
        menuItemId: 1,
        defaultItemId: 2,
        isAvailable: true,
        displayName: "Dave's Single",
        name: "Dave's Single",
        priceRange: "$6.49",
      }],
    },
  }, store, "https://order.wendys.com/store/30", observedAt);

  assert.equal(offers.length, 1);
  assert.equal(offers[0].location_id, "wendys:30");
  assert.equal(offers[0].category, "chicken-nugget");
  assert.equal(offers[0].quantity, 4);
  assert.equal(offers[0].heat, "spicy");
  assert.equal(offers[0].list_price_cents, 289);
  assert.equal(offers[0].comparable, true);
  assert.equal(offers[0].address, store.address);
  assert.equal(offers[0].ordering_channel, "first_party_pickup");
});

test("Wingstop boneless and classic wings are separate priced offers", () => {
  const wingStore = { ...store, id: "124308", name: "Wingstop Harwood" };
  const offers = offersFromWingstopProduct({
    id: 31026248,
    name: "10 Wings",
    cost: 0,
  }, [
    { name: "Boneless", cost: 11.49, adjustsparentprice: true },
    { name: "Classic", cost: 12.99, adjustsparentprice: true },
  ], "Wings By The Piece", wingStore, "https://api.wingstop.com/restaurants/124308/menu", observedAt);

  assert.equal(offers.length, 2);
  const boneless = offers.find((offer) => offer.original_name.includes("Boneless"));
  const classic = offers.find((offer) => offer.original_name.includes("Classic"));
  assert.equal(boneless.category, "chicken-boneless-wing");
  assert.equal(boneless.quantity, 10);
  assert.equal(boneless.list_price_cents, 1149);
  assert.equal(boneless.location_id, "wingstop:124308");
  assert.equal(classic.category, "chicken-wing");
  assert.equal(classic.list_price_cents, 1299);
});

test("Raising Cane's store menu prices the Box Combo from the product description", () => {
  const offers = offersFromCanesMenu({
    categories: [{
      name: "Combos",
      products: [{
        id: 1,
        name: "The Box Combo®",
        description: "4 Chicken Fingers\nCrinkle-Cut Fries",
        cost: 14.79,
      }, {
        id: 2,
        name: "Crinkle-Cut Fries",
        description: "Fries",
        cost: 3.29,
      }],
    }],
  }, {
    id: "283678",
    name: "Raising Cane's #1212",
    address: "211 Jefferson ST, San Francisco, CA, 94133",
    latitude: 37.8,
    longitude: -122.41,
    distance_miles: 1.8,
  }, "https://nomnom-prod-api.raisingcanes.com/restaurants/283678/menu", observedAt);
  assert.equal(offers.length, 1);
  assert.equal(offers[0].category, "chicken-tender");
  assert.equal(offers[0].quantity, 4);
  assert.equal(offers[0].list_price_cents, 1479);
  assert.equal(offers[0].offer_kind, "combo");
  assert.equal(offers[0].location_id, "raising-canes:283678");
  assert.equal(offers[0].comparable, false);
});

test("Popeyes priced picker becomes a store offer", () => {
  const offers = offersFromPopeyesPriced([{
    id: "a99dfd5a-01ce-478c-a265-0105a0afece2",
    name: "Classic Chicken Sandwich",
    section: "Sandwiches",
    price: { default: 1149, min: 599, max: 1878 },
  }], {
    id: "2118",
    name: "Popeyes Fillmore",
    address: "1426 Fillmore St, San Francisco, CA 94115",
    latitude: 37.783128,
    longitude: -122.432375,
    distance_miles: 1.6,
  }, "https://www.popeyes.com/graphql", observedAt);
  assert.equal(offers.length, 1);
  assert.equal(offers[0].location_id, "popeyes:2118");
  assert.equal(offers[0].category, "chicken-sandwich");
  assert.equal(offers[0].list_price_cents, 1149);
  assert.equal(offers[0].comparable, true);
});

test("Chick-fil-A decoupled menu prices nuggets from minorUnits", () => {
  const offers = offersFromChickfilaMenu({
    menu: {
      all: {
        "8_CT_NUGGETS": {
          tag: "8_CT_NUGGETS",
          name: "8 ct Chick-fil-A® Nuggets",
          description: "Bite-sized nuggets",
          disabled: false,
          isSellable: true,
          itemPrice: { minorUnits: "529" },
          dayPart: "DAY_PART_ALL_DAY",
        },
        "LARGE_FRIES": {
          tag: "LARGE_FRIES",
          name: "Large Waffle Potato Fries®",
          itemPrice: { minorUnits: "329" },
          disabled: false,
          isSellable: true,
        },
      },
    },
  }, {
    id: "04932",
    name: "Emeryville",
    address: "1525 40th St, Oakland, CA 94608",
    latitude: 37.829,
    longitude: -122.288,
    distance_miles: 8.95,
  }, "https://commerce.api.my.chick-fil-a.com/menu", observedAt);
  assert.equal(offers.length, 1);
  assert.equal(offers[0].location_id, "chick-fil-a:04932");
  assert.equal(offers[0].category, "chicken-nugget");
  assert.equal(offers[0].quantity, 8);
  assert.equal(offers[0].list_price_cents, 529);
});

test("Jollibee store menu prices Chickenjoy buckets and sandwiches", () => {
  const jolliStore = {
    id: "265845",
    name: "San Francisco Downtown Market St",
    address: "934 Market Street, San Francisco, CA 94102",
    latitude: 37.7839,
    longitude: -122.4087,
    distance_miles: 0.85,
  };
  const offers = offersFromJollibeeProducts([
    { Id: 1, Name: "6pc Chickenjoy Bucket", Cost: 19.99, Available: true, Slug: "6pc-chickenjoy-bucket" },
    { Id: 2, Name: "Original Chicken Sandwich", Cost: 6.99, Available: true, Slug: "original-chicken-sandwich" },
    { Id: 3, Name: "Napkins", Cost: 0, Available: true },
  ], jolliStore, "https://www.jollibeefoods.com/menu/chickenjoy-fried-chicken", observedAt);

  assert.equal(offers.length, 2);
  const bucket = offers.find((offer) => offer.category === "chicken-bucket");
  const sandwich = offers.find((offer) => offer.category === "chicken-sandwich");
  assert.equal(bucket.location_id, "jollibee:265845");
  assert.equal(bucket.quantity, 6);
  assert.equal(bucket.list_price_cents, 1999);
  assert.equal(sandwich.list_price_cents, 699);
  assert.equal(sandwich.comparable, true);
});
