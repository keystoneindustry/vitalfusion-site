/**
 * Grocery list from a client's "perfect day": every ingredient × servings × number of days, added up,
 * turned into "what to buy" amounts (cooked rice/pasta/meat → raw or dry weight, eggs and apples by count)
 * and grouped by store section. Pure and safe for the browser.
 */

import type { Nutrition } from "./plan";

export type Aisle = "Produce" | "Meat & fish" | "Dairy & eggs" | "Bread, grains & pasta" | "Pantry" | "Frozen" | "Other";
export const AISLES: Aisle[] = ["Produce", "Meat & fish", "Dairy & eggs", "Bread, grains & pasta", "Pantry", "Frozen", "Other"];

export type GroceryItem = {
  key: string;
  name: string;
  aisle: Aisle;
  /** What to buy, e.g. "2.4 lb", "8 eggs", "1 dozen eggs". */
  amount: string;
  /** Extra detail, e.g. "cooked weight 1.2 kg, buy dry". */
  note: string;
  grams: number;
};

const KEYWORDS: [Aisle, RegExp][] = [
  ["Frozen", /\bfrozen\b/],
  ["Pantry", /\b((peanut|almond|cashew|nut|sunflower|seed) butter|protein powder|whey protein)\b/],
  ["Dairy & eggs", /\b(eggs?|egg whites?|milk|yogh?urt|cheese|cottage|butter|cream|kefir|skyr|whey)\b/],
  ["Meat & fish", /\b(chicken|turkey|beef|steak|pork|ham|bacon|sausage|salmon|tuna|cod|tilapia|shrimp|fish|lamb|bison|venison|jerky|mince|ground)\b/],
  ["Bread, grains & pasta", /\b(rice|pasta|spaghetti|noodles?|bread|bagel|tortillas?|wraps?|oats?|oatmeal|quinoa|couscous|cereal|granola|pita|english muffin|potato bread|rice cakes?|crackers?)\b/],
  ["Produce", /\b(apples?|bananas?|berries|blueberries|strawberries|raspberries|oranges?|grapes?|pears?|peach(es)?|mango|pineapple|melon|watermelon|kiwi|lemon|lime|avocados?|spinach|kale|lettuce|greens|broccoli|cauliflower|carrots?|peppers?|onions?|garlic|tomato(es)?|cucumbers?|zucchini|squash|asparagus|green beans|beans, green|celery|mushrooms?|potato(es)?|sweet potato(es)?|corn|peas|cabbage|brussels|herbs?|cilantro|parsley|basil|ginger|fruit|salad|veg(etables?|gies)?)\b/],
  ["Pantry", /\b(oil|olive|peanut butter|almond butter|nut butter|honey|syrup|jam|sauce|salsa|ketchup|mustard|mayo|vinegar|spice|salt|pepper|seasoning|protein powder|powder|almonds|walnuts|cashews|nuts|seeds|chia|flax|beans|lentils|chickpeas|hummus|canned|broth|stock|chocolate|coffee|tea|sugar|flour|baking)\b/],
];

export function aisleFor(food: string): Aisle {
  const f = food.toLowerCase();
  for (const [aisle, re] of KEYWORDS) if (re.test(f)) return aisle;
  return "Other";
}

/** Cooked food you'd buy raw or dry: how much raw/dry weight gives 1 g cooked. */
const COOKED: [RegExp, number, string][] = [
  [/\b(rice|quinoa|couscous)\b/, 1 / 3, "dry"],
  [/\b(pasta|spaghetti|noodles?)\b/, 1 / 2.3, "dry"],
  [/\b(oats?|oatmeal)\b/, 1 / 4, "dry"],
  [/\b(chicken|turkey|beef|steak|pork|ground|salmon|fish|cod|tilapia|shrimp|lamb|bison)\b/, 1.33, "raw"],
  [/\b(lentils|beans|chickpeas)\b/, 1 / 2.5, "dry"],
];

/** Things counted, not weighed: "3 large" eggs, "1 medium" apple, "2 slices" bread. */
const COUNT = /^\s*(\d+(?:\.\d+)?|½|¼|¾|\d+\/\d+)\s*(x\s*)?(large|medium|small|extra[- ]large|whole|slices?|pieces?|cloves?|tortillas?|wraps?|bagels?|muffins?|rice cakes?|scoops?|cans?|bars?|patties?|links?|strips?)?\b/i;
const UNIT_WORDS = /\b(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|g|grams?|ml|lb|pounds?)\b/i;

function num(s: string): number {
  if (s === "½") return 0.5;
  if (s === "¼") return 0.25;
  if (s === "¾") return 0.75;
  if (s.includes("/")) {
    const [a, b] = s.split("/").map(Number);
    return b ? a / b : 0;
  }
  return Number(s);
}

/** Grams of one counted piece, from a household measure, or null when it isn't a count. */
export function unitGrams(household: string, grams: number): { each: number; unit: string } | null {
  if (!household || UNIT_WORDS.test(household)) return null;
  const m = COUNT.exec(household);
  if (!m) return null;
  const n = num(m[1]);
  if (!(n > 0) || !(grams > 0)) return null;
  const word = (m[3] || "").toLowerCase();
  const unit = /slice/.test(word) ? "slices" : /clove/.test(word) ? "cloves" : /scoop/.test(word) ? "scoops" : /can/.test(word) ? "cans" : "";
  return { each: grams / n, unit };
}

/** Plain name for the list: drops "cooked", "raw", "nonfat" style notes after a comma. */
export function shopName(food: string): string {
  return food
    .replace(/,\s*(cooked|raw|dry|uncooked|boiled|grilled|baked|roasted|steamed)\b.*$/i, "")
    .replace(/\s+\((cooked|raw|dry)\)/i, "")
    .trim();
}

export function formatWeight(grams: number): string {
  if (grams >= 454) {
    const lb = grams / 453.6;
    return `${lb >= 10 ? Math.round(lb) : Math.round(lb * 10) / 10} lb`;
  }
  const oz = grams / 28.35;
  if (oz < 1) return `${Math.max(1, Math.round(grams / 5) * 5)} g`;
  return `${oz >= 4 ? Math.round(oz) : Math.round(oz * 2) / 2} oz`;
}

function plural(n: number, one: string): string {
  return n === 1 ? one : one.endsWith("y") && !/[aeiou]y$/.test(one) ? `${one.slice(0, -1)}ies` : `${one}s`;
}

/** The grocery list for `days` days of the perfect day. */
export function groceryList(n: Pick<Nutrition, "meals" | "perfectDay">, days: number): GroceryItem[] {
  const byId = new Map(n.meals.map((m) => [m.id, m]));
  type Acc = { name: string; grams: number; counted: number | null; unit: string; cookedGrams: number; buyAs: string; ratio: number };
  const acc = new Map<string, Acc>();

  for (const item of n.perfectDay.items) {
    const meal = byId.get(item.mealId);
    if (!meal) continue;
    const times = (item.servings || 1) * days;
    for (const ing of meal.ingredients) {
      if (!ing.food || !(ing.grams > 0)) continue;
      const name = shopName(ing.food);
      const key = name.toLowerCase();
      const cooked = /\bcooked\b/i.test(ing.food) ? COOKED.find(([re]) => re.test(name.toLowerCase())) : undefined;
      const g = ing.grams * times;
      const piece = cooked ? null : unitGrams(ing.household, ing.grams);
      const a = acc.get(key) ?? { name, grams: 0, counted: piece ? 0 : null, unit: piece?.unit ?? "", cookedGrams: 0, buyAs: "", ratio: 1 };
      if (piece && a.counted !== null) a.counted += g / piece.each;
      else a.counted = null; // mixed measures: fall back to weight
      if (cooked) {
        a.cookedGrams += g;
        a.buyAs = cooked[2];
        a.ratio = cooked[1];
        a.grams += g * cooked[1];
      } else {
        a.grams += g;
      }
      acc.set(key, a);
    }
  }

  const out: GroceryItem[] = [];
  for (const [key, a] of acc) {
    let amount: string;
    let note = "";
    if (a.counted !== null && a.counted > 0) {
      const c = Math.ceil(a.counted - 0.05);
      const word = a.unit || (/\beggs?\b/i.test(a.name) ? "egg" : "");
      if (/\beggs?\b/i.test(a.name) && !/white/i.test(a.name) && c >= 12) amount = c % 12 === 0 ? `${c / 12} dozen` : `${c} (${Math.ceil(c / 12)} dozen)`;
      else amount = word ? `${c} ${plural(c, word.replace(/s$/, ""))}` : `${c}`;
      note = formatWeight(a.grams);
    } else {
      amount = formatWeight(a.grams);
      if (a.buyAs) note = `${formatWeight(a.cookedGrams)} cooked = about ${amount} ${a.buyAs}`;
    }
    out.push({ key, name: a.name, aisle: aisleFor(a.name), amount, note, grams: Math.round(a.grams) });
  }
  return out.sort((x, y) => AISLES.indexOf(x.aisle) - AISLES.indexOf(y.aisle) || x.name.localeCompare(y.name));
}
