/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as ingest from "../ingest.js";
import type * as lib_apifyMarketplace from "../lib/apifyMarketplace.js";
import type * as lib_brightData from "../lib/brightData.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_offerShape from "../lib/offerShape.js";
import type * as lib_takeout from "../lib/takeout.js";
import type * as myFunctions from "../myFunctions.js";
import type * as offers from "../offers.js";
import type * as scrapeNear from "../scrapeNear.js";
import type * as scrapers from "../scrapers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  ingest: typeof ingest;
  "lib/apifyMarketplace": typeof lib_apifyMarketplace;
  "lib/brightData": typeof lib_brightData;
  "lib/geo": typeof lib_geo;
  "lib/offerShape": typeof lib_offerShape;
  "lib/takeout": typeof lib_takeout;
  myFunctions: typeof myFunctions;
  offers: typeof offers;
  scrapeNear: typeof scrapeNear;
  scrapers: typeof scrapers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
