import { cardsFromMarkdown } from "./extract.mjs";
import { toOffer } from "./offer.mjs";

export function parseMenu(chain, markdown, sourceUrl, observedAt = new Date().toISOString()) {
  const offers = [];
  const seen = new Set();

  for (const card of cardsFromMarkdown(markdown)) {
    const refinement = chain.refine ? chain.refine(card) : null;
    if (refinement?.skip) continue;
    const offer = toOffer(chain, { ...card, ...refinement }, sourceUrl, observedAt);
    if (!offer) continue;
    if (seen.has(offer.offer_key + offer.original_name)) continue;
    seen.add(offer.offer_key + offer.original_name);
    offers.push(offer);
  }

  return offers;
}
