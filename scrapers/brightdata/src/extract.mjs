const PIECE_COUNTS = [
  /(\d+)\s*[- ]?(?:pc|pcs|piece|pieces|ct|count)s?\b/i,
  /(\d+)\s*[- ]?fingers?\b/i,
  /(\d+)\s+(?:chicken\s+)?fingers?\b/i,
  /(\d+)\s*[- ]?wings?\b/i,
  /(\d+)\s+boneless\b/i,
];

export function parseQuantity(...parts) {
  for (const part of parts) {
    const text = String(part ?? "");
    for (const pattern of PIECE_COUNTS) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

export function cleanText(value) {
  return String(value ?? "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_`#\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cardsFromMarkdown(markdown) {
  const cards = [];
  let section = "";
  let current = null;

  let sectionIsCard = false;

  const flush = () => {
    if (!current) return;
    current.body = current.body.trim();
    cards.push(current);
    current = null;
    sectionIsCard = false;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading2 = line.match(/^\s*##\s+(.+)$/);
    if (heading2) {
      flush();
      section = cleanText(heading2[1]);
      if (classifyName(section)) {
        current = { section, original_name: section, href: "", body: "" };
        sectionIsCard = true;
      }
      continue;
    }

    const heading3 = line.match(/^\s*###\s+(.+)$/);
    if (heading3) {
      flush();
      current = { section, original_name: cleanText(heading3[1]), href: "", body: "" };
      continue;
    }

    if (line.includes("![")) {
      if (current) current.body += `${line}\n`;
      continue;
    }

    const linked = menuLink(line);
    if (linked) {
      const name = cleanText(linked[1]);
      const href = linked[2];
      if (sectionIsCard && current && !namesMatch(current.original_name, name)) {
        current = null;
        sectionIsCard = false;
      }
      if (current && !current.href && namesMatch(current.original_name, name) && isMenuHref(href)) {
        current.href = href;
        continue;
      }
      if (!current && isItemName(name) && isMenuHref(href)) {
        cards.push({ section, original_name: name, href, body: "" });
      }
      continue;
    }

    if (current) current.body += `${line}\n`;
  }

  flush();
  return dedupeCards(cards.filter((card) => card.original_name && !isSkippableLabel(card.original_name)));
}

export function parsePriceCents(text) {
  const source = String(text ?? "");
  const amounts = [...source.matchAll(/\$\s*(\d{1,3}(?:,\d{3})*)(?:\.(\d{2}))?/g)];
  if (amounts.length !== 1) return null;
  const dollars = Number(amounts[0][1].replace(/,/g, ""));
  const cents = amounts[0][2] ? Number(amounts[0][2]) : 0;
  if (!Number.isInteger(dollars) || !Number.isInteger(cents)) return null;
  return dollars * 100 + cents;
}

export function classifyName(name) {
  const text = name.toLowerCase();
  if (/cauliflower|not chicken|not ckn/.test(text)) return null;
  if (/\bfish\b|filet-o-fish|pollock/.test(text)) return null;
  if (/\b(dip|sauce)$/.test(text)) return null;
  if (/chicken fries?/.test(text)) return "chicken-fry";
  if (/nugget|\bnugg/.test(text)) return "chicken-nugget";
  if (/boneless/.test(text) && /wing/.test(text)) return "chicken-boneless-wing";
  if (/thigh bite/.test(text)) return null;
  if (/\bwing/.test(text)) return "chicken-wing";
  if (/slider|nibbler/.test(text)) return "chicken-slider";
  if (/\bwrap\b/.test(text)) return "chicken-wrap";
  if (/bucket|chickenjoy/.test(text)) return "chicken-bucket";
  if (/(tender|strip|finger|tendy|chick-n-strip|supreme)/.test(text) && !/sandwich|slider|wrap/.test(text)) {
    return "chicken-tender";
  }
  if (/sandwich|mccrispy|mcchicken|royal crispy|chicken jr/.test(text)) {
    if (/\bsandwiches?\b/.test(text) && !/chicken|mccrispy|mcchicken|royal|crispy|spicy|deluxe|club|filet/.test(text)) {
      return null;
    }
    return "chicken-sandwich";
  }
  if (/\bchicken\b/.test(text) && /\b(pc|piece|box)\b/.test(text)) return "chicken-bucket";
  return null;
}

export function inferKind(name, section) {
  const text = `${section} ${name}`.toLowerCase();
  if (/happy meal|kid['’]?s?\b/.test(text)) return "kids_meal";
  if (/family meal|family pack|party pack|crew pack/.test(text)) return "family_meal";
  if (/\bcombo\b|\bmeal\b/.test(text)) return "combo";
  return "ala_carte";
}

export function inferPrep(name) {
  const text = name.toLowerCase();
  if (/grilled|chargrilled/.test(text)) return "grilled";
  if (/blackened/.test(text)) return "blackened";
  if (/fried|crispy|nugget|tender|finger|wing|sandwich|bucket/.test(text)) return "fried";
  return null;
}

export function inferHeat(name) {
  const text = name.toLowerCase();
  if (/reaper/.test(text)) return "reaper";
  if (/nashville/.test(text)) return "nashville-hot";
  if (/spicy|hot honey|atomic|ghost pepper|fiery/.test(text)) return "spicy";
  return "classic";
}

export function inferBuild(name, category) {
  const text = name.toLowerCase();
  if (/mcchicken|chicken jr|junior/.test(text)) return "value";
  if (/deluxe/.test(text)) return "deluxe";
  if (/club|bacon and cheese|bacon & cheese/.test(text)) return "club";
  if (category === "chicken-sandwich" || category === "chicken-wrap" || category === "chicken-slider") {
    return "classic";
  }
  return null;
}

export function parseCutMix(text) {
  const mix = {};
  const patterns = [
    ["breast", /(\d+)\s+breasts?\b/i],
    ["thigh", /(\d+)\s+thighs?\b/i],
    ["drum", /(\d+)\s+(?:drums?|legs?)\b/i],
    ["wing", /(\d+)\s+wings?\b/i],
  ];
  for (const [cut, pattern] of patterns) {
    const match = String(text ?? "").match(pattern);
    if (match) mix[cut] = Number(match[1]);
  }
  return Object.keys(mix).length ? mix : null;
}

function menuLink(line) {
  const match = line.match(/(?:^|\s)([^\[\]\n]{2,80})]\(([^)\s]+)\)/);
  if (!match) return null;
  const nameIndex = line.indexOf(`${match[1]}](`);
  const before = line.slice(0, nameIndex);
  if (before.lastIndexOf("[") > before.lastIndexOf("]")) return null;
  return match;
}

function namesMatch(left, right) {
  return cleanText(left).toLowerCase() === cleanText(right).toLowerCase();
}

function isItemName(name) {
  return Boolean(name) && !isSkippableLabel(name) && !/https?:|www\.|\.com|%26|%3d|scene7|fmt=/i.test(name);
}

function isMenuHref(href) {
  if (!href) return false;
  if (/\.(png|jpe?g|gif|svg|webp)(\?|$)/i.test(href)) return false;
  if (/scene7\.com|imgix\.net|wp-content\/uploads/i.test(href)) return false;
  return true;
}

function isSkippableLabel(name) {
  return /^(order now|view all|view all entr[eé]es|our menu|menu|entr[eé]es|combos|extras|drinks|sides|salads|breakfast|catering|beverages|treats|sauces?)$/i.test(name);
}

function dedupeCards(cards) {
  const seen = new Set();
  const unique = [];
  for (const card of cards) {
    const key = `${card.section}|${card.original_name}|${card.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(card);
  }
  return unique;
}
