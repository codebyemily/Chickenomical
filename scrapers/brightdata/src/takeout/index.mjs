import { chains } from "../chains.mjs";
import { locateCanes, canesOffers } from "./canes.mjs";
import { locateChickfila, chickfilaOffers } from "./chickfila.mjs";
import { locateMcdonalds, mcdonaldsOffers } from "./mcdonalds.mjs";
import { locatePopeyes, popeyesOffers } from "./popeyes.mjs";
import { locateWendys, wendysOffers } from "./wendys.mjs";
import { locateWingstop, wingstopOffers } from "./wingstop.mjs";

const adapters = {
  mcdonalds: {
    locate: locateMcdonalds,
    offers: mcdonaldsOffers,
    menu_note: "Pickup ordering on the web sends you to the McDonald's app, so this store list has no public takeout prices.",
  },
  "chick-fil-a": {
    locate: locateChickfila,
    offers: chickfilaOffers,
    menu_note: "Chick-fil-A menu pricing requires an order.chick-fil-a.com guest session; locate uses the public Yext API.",
  },
  wendys: { locate: locateWendys, offers: wendysOffers },
  popeyes: { locate: locatePopeyes, offers: popeyesOffers },
  "raising-canes": { locate: locateCanes, offers: canesOffers },
  wingstop: { locate: locateWingstop, offers: wingstopOffers },
};

export function takeoutAdapter(chainId) {
  return adapters[chainId] ?? null;
}

export function takeoutChains() {
  return chains.map((chain) => ({
    ...chain,
    takeout: Boolean(adapters[chain.id]),
  }));
}
