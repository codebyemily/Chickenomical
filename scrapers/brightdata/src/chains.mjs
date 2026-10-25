export const chains = [
  {
    id: "mcdonalds",
    name: "McDonald's",
    urls: ["https://www.mcdonalds.com/us/en-us/full-menu.html"],
  },
  {
    id: "chick-fil-a",
    name: "Chick-fil-A",
    urls: [
      "https://www.chick-fil-a.com/menu/entrees",
      "https://www.chick-fil-a.com/menu/kids-meals",
    ],
  },
  {
    id: "wendys",
    name: "Wendy's",
    urls: ["https://www.wendys.com/menu"],
  },
  {
    id: "burger-king",
    name: "Burger King",
    urls: ["https://www.bk.com/menu"],
  },
  {
    id: "kfc",
    name: "KFC",
    urls: ["https://www.kfc.com/menu"],
  },
  {
    id: "popeyes",
    name: "Popeyes",
    urls: ["https://www.popeyes.com/menu"],
  },
  {
    id: "raising-canes",
    name: "Raising Cane's",
    urls: ["https://www.raisingcanes.com/menu/"],
    refine(card) {
      const name = card.original_name.toLowerCase();
      const body = card.body ?? "";
      if (/fries|sauce|toast|coleslaw|lemonade|tea|fountain|jug/.test(name)) return { skip: true };
      if (/tailgate/.test(name)) {
        return { category: "chicken-tender", offer_kind: "ala_carte", includes: ["Cane's Sauce"] };
      }
      if (/sandwich/.test(name)) {
        return {
          category: "chicken-sandwich",
          quantity: 1,
          protein_pieces: 3,
          protein_category: "chicken-tender",
          offer_kind: /combo/.test(name) ? "combo" : "ala_carte",
        };
      }
      if (/^chicken finger$/.test(name)) {
        return { category: "chicken-tender", quantity: 1, offer_kind: "ala_carte" };
      }
      if (/finger|box|caniac|kids combo|3 finger/.test(name) || /chicken fingers/.test(body.toLowerCase())) {
        return { category: "chicken-tender" };
      }
      return null;
    },
  },
  {
    id: "jollibee",
    name: "Jollibee",
    urls: [
      "https://www.jollibeefoods.com/menu/chicken-nuggets",
      "https://www.jollibeefoods.com/menu/chickenjoy-fried-chicken",
      "https://www.jollibeefoods.com/menu/chicken-tenders",
      "https://www.jollibeefoods.com/menu/chicken-sandwiches",
    ],
    refine(card) {
      const name = card.original_name.toLowerCase();
      if (/spaghetti|palabok|burger steak|peach mango|pie\b|utensil|napkin/.test(name) && !/chicken/.test(name)) {
        return { skip: true };
      }
      if (/chickenjoy|bucket treat|pc chickenjoy/.test(name)) {
        return { category: "chicken-bucket" };
      }
      if (/tender/.test(name)) return { category: "chicken-tender" };
      if (/nugget/.test(name)) return { category: "chicken-nugget" };
      if (/sandwich/.test(name)) return { category: "chicken-sandwich" };
      return null;
    },
  },
  {
    id: "wingstop",
    name: "Wingstop",
    urls: ["https://www.wingstop.com/menu"],
    refine(card) {
      const name = card.original_name.toLowerCase();
      if (/thigh bite/.test(name)) return { category: null };
      if (/boneless/.test(name)) return { category: "chicken-boneless-wing" };
      if (/classic/.test(name) && /wing/.test(name)) return { category: "chicken-wing" };
      if (/tender/.test(name)) return { category: "chicken-tender" };
      return null;
    },
  },
  {
    id: "zaxbys",
    name: "Zaxby's",
    urls: ["https://www.zaxbys.com/menu"],
    refine(card) {
      const name = card.original_name.toLowerCase();
      if (/nibbler/.test(name)) return { category: "chicken-slider" };
      if (/finger/.test(name)) return { category: "chicken-tender" };
      if (/boneless/.test(name)) return { category: "chicken-boneless-wing" };
      if (/traditional/.test(name) && /wing/.test(name)) return { category: "chicken-wing" };
      return null;
    },
  },
  {
    id: "churchs",
    name: "Church's",
    urls: ["https://www.churchs.com/menu.html"],
  },
  {
    id: "bojangles",
    name: "Bojangles",
    urls: ["https://www.bojangles.com/menu/"],
    refine(card) {
      const name = card.original_name.toLowerCase();
      if (/supreme|homestyle tender/.test(name)) return { category: "chicken-tender" };
      if (/bone-in|chicken only|bo box|pc chicken/.test(name)) return { category: "chicken-bucket" };
      return null;
    },
  },
  {
    id: "daves-hot-chicken",
    name: "Dave's Hot Chicken",
    urls: ["https://daveshotchicken.com/menu/", "https://store.daveshotchicken.com/menu/"],
    refine(card) {
      const name = card.original_name.toLowerCase();
      if (/cauli|not chicken|not ckn|hot mozz|slusher|shake/.test(name)) return { skip: true };
      if (/bite/.test(name)) return { category: null };
      if (/mini/.test(name)) return { category: "chicken-slider", quantity: 4 };
      if (/slider/.test(name)) return { category: "chicken-slider", quantity: 1 };
      if (/tender/.test(name)) return { category: "chicken-tender" };
      return null;
    },
  },
];

export function findChain(id) {
  return chains.find((chain) => chain.id === id) ?? null;
}
