/*
 * Pantry — recipe helpers.
 *
 * Ingredient scaling only touches a leading quantity, so lines such as
 * "zout naar smaak" or "1 blik tomaten (400 g)" stay readable. The parser
 * accepts whole numbers, decimals with . or ,, fractions, mixed fractions,
 * unicode fractions, and simple ranges like "2-3".
 */

import { getLanguageMeta } from "./i18n.js";

const UNICODE_FRACTIONS = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅐": 1 / 7,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
  "⅑": 1 / 9,
  "⅒": 1 / 10
};

const UNICODE_CHARS = Object.keys(UNICODE_FRACTIONS).join("");
const QTY = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+\s*[${UNICODE_CHARS}]|\d+(?:[.,]\d+)?|[${UNICODE_CHARS}])`;
const LEADING_QTY = new RegExp(
  String.raw`^(\s*(?:[-*•·]\s*)?)(${QTY})(?:\s*[-–—]\s*(${QTY}))?`
);

const UNIT_TOKENS = new Set([
  "g", "gr", "gram", "grams", "gramm", "kg", "mg", "kilo", "kilogram", "kilogramm",
  "ml", "cl", "dl", "l", "liter", "litre", "liters", "litres", "milliliter",
  "el", "eetlepel", "eetlepels", "tl", "theelepel", "theelepels", "tsp", "tbsp",
  "esslöffel", "teelöffel", "cup", "cups", "tasse", "tassen", "glas", "gläser",
  "oz", "lb", "lbs", "ounce", "ounces", "pound", "pounds", "pint", "pints",
  "quart", "quarts", "stuk", "stuks", "stukje", "stukjes", "blik", "blikken",
  "pot", "potten", "zak", "zakken", "teen", "tenen", "zehe", "zehen", "snuf",
  "snufje", "snufjes", "pinch", "pinches", "can", "cans", "package", "packages",
  "pkg", "bunch", "bunches", "slice", "slices", "scheut", "scheutje", "handje",
  "bos", "bossen", "takje", "takjes", "pond", "dose", "dosen", "päckchen",
  "bund", "bünde", "prise", "prisen", "scheibe", "scheiben"
]);

const GENERIC_STAPLES = new Set([
  "zout", "peper", "water", "suiker", "olie", "boter", "room"
]);

const PLURAL_SUFFIXES = ["en", "s", "n"];

const COMMON_FRACTIONS = [
  [1 / 10, "1/10"],
  [1 / 8, "1/8"],
  [1 / 6, "1/6"],
  [1 / 5, "1/5"],
  [1 / 4, "1/4"],
  [1 / 3, "1/3"],
  [3 / 8, "3/8"],
  [2 / 5, "2/5"],
  [1 / 2, "1/2"],
  [3 / 5, "3/5"],
  [5 / 8, "5/8"],
  [2 / 3, "2/3"],
  [3 / 4, "3/4"],
  [4 / 5, "4/5"],
  [5 / 6, "5/6"],
  [7 / 8, "7/8"],
  [9 / 10, "9/10"]
];

/** Split a textarea value into clean, non-empty lines. */
export function splitLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseQuantity(text) {
  const raw = String(text || "").trim();
  if (!raw) return NaN;

  if (UNICODE_FRACTIONS[raw] !== undefined) {
    return UNICODE_FRACTIONS[raw];
  }

  const mixedUnicode = raw.match(new RegExp(String.raw`^(\d+)\s*([${UNICODE_CHARS}])$`));
  if (mixedUnicode) {
    return Number(mixedUnicode[1]) + (UNICODE_FRACTIONS[mixedUnicode[2]] || 0);
  }

  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    return denominator ? Number(mixed[1]) + Number(mixed[2]) / denominator : NaN;
  }

  const fraction = raw.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator ? Number(fraction[1]) / denominator : NaN;
  }

  const number = Number(raw.replace(",", "."));
  return Number.isFinite(number) ? number : NaN;
}

/** Format a numeric quantity using common fractions and the UI locale. */
function formatQuantity(value) {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 1e-9) return "0";

  const rounded = Math.round(value * 100) / 100;
  const whole = Math.floor(rounded + 1e-9);
  const fractionPart = rounded - whole;

  let bestLabel = null;
  let bestDiff = 0.02;
  for (const [fraction, label] of COMMON_FRACTIONS) {
    const diff = Math.abs(fractionPart - fraction);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestLabel = label;
    }
  }

  if (bestLabel) {
    return whole > 0 ? `${whole} ${bestLabel}` : bestLabel;
  }

  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return String(Math.round(rounded));
  }

  try {
    return new Intl.NumberFormat(getLanguageMeta().locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(rounded);
  } catch {
    return String(rounded);
  }
}

/** Scale one ingredient line by a factor. */
export function scaleIngredientLine(line, factor) {
  const text = String(line || "");
  if (!Number.isFinite(factor) || factor === 1) return text;

  const match = text.match(LEADING_QTY);
  if (!match) return text;

  const prefix = match[1] || "";
  const first = parseQuantity(match[2]);
  if (!Number.isFinite(first)) return text;

  let replacement = formatQuantity(first * factor);
  if (match[3]) {
    const second = parseQuantity(match[3]);
    if (Number.isFinite(second)) {
      replacement = `${replacement}–${formatQuantity(second * factor)}`;
    }
  }

  return `${prefix}${replacement}${text.slice(match[0].length)}`;
}

function stripLeadingQuantityAndUnits(line) {
  let rest = String(line || "").trim();
  rest = rest.replace(/^[-*•·]\s*/, "");

  const quantity = new RegExp(
    String.raw`^${QTY}(?:\s*[-–—]\s*${QTY})?\s*`
  );
  rest = rest.replace(quantity, "");

  let removed = true;
  while (removed && rest) {
    removed = false;
    const lower = rest.toLowerCase();
    for (const unit of UNIT_TOKENS) {
      if (!lower.startsWith(unit)) continue;
      const next = lower.charAt(unit.length);
      if (next && /[\p{L}\p{N}]/u.test(next)) continue;
      rest = rest.slice(unit.length).trimStart();
      removed = true;
      break;
    }
  }

  return rest;
}

/**
 * Return the searchable ingredient name: no leading quantity or unit, no
 * parenthetical notes, and nothing after the first comma. Lowercased.
 */
export function ingredientName(line) {
  const rest = stripLeadingQuantityAndUnits(line)
    .replace(/\([^)]*\)/g, " ")
    .split(",")[0];

  return rest.replace(/\s+/g, " ").trim().toLowerCase();
}

function nameWords(line) {
  return ingredientName(line).match(/[\p{L}\p{N}]+/gu) || [];
}

function stepWordVariants(word) {
  const variants = new Set([word]);
  for (const suffix of PLURAL_SUFFIXES) {
    if (word.length > suffix.length && word.endsWith(suffix)) {
      variants.add(word.slice(0, -suffix.length));
    }
  }
  return variants;
}

/**
 * Match ingredient lines against one step of text.
 *
 * Returns the best matching ingredient line (or null), the number of other
 * matched ingredients, and every matched line for highlighting. Generic
 * staples count at half weight so specific ingredients win.
 */
export function matchStepIngredients(ingredientLines, stepText) {
  const lines = Array.isArray(ingredientLines) ? ingredientLines : [];
  const stepWords = String(stepText || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

  const stepStems = new Set();
  for (const word of stepWords) {
    for (const variant of stepWordVariants(word)) stepStems.add(variant);
  }

  const matches = [];
  let top = null;
  let topScore = 0;

  for (const line of lines) {
    const words = nameWords(line);
    let score = 0;

    for (const word of words) {
      if ([...stepWordVariants(word)].some((variant) => stepStems.has(variant))) {
        score += word.length;
      }
    }

    if (score <= 0) continue;

    const generic = words.some((word) => GENERIC_STAPLES.has(word));
    const weightedScore = generic ? score / 2 : score;

    matches.push(line);
    if (weightedScore > topScore) {
      topScore = weightedScore;
      top = line;
    }
  }

  return {
    top,
    others: top ? matches.length - 1 : 0,
    matches
  };
}

function normalizeSearchText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Match all search terms against the title and ingredients. */
export function matchesSearch(recipe, query) {
  const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalizeSearchText(`${recipe?.title || ""}\n${recipe?.ingredients || ""}`);
  return terms.every((term) => haystack.includes(term));
}
