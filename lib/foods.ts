// Food preference options for the macro calculator. People tap the foods they
// like and the ones they don't eat; the AI builds their sample day around them.

export const FOOD_GROUPS = [
  {
    label: "Proteins",
    foods: ["Chicken", "Turkey", "Lean beef", "Steak", "Salmon", "Shrimp", "White fish", "Tuna", "Eggs", "Greek yogurt", "Cottage cheese", "Protein shakes"],
  },
  {
    label: "Carbs",
    foods: ["Rice", "Potatoes", "Sweet potatoes", "Oats", "Pasta", "Bread", "Bagels", "Tortillas & wraps", "Quinoa", "Cereal"],
  },
  {
    label: "Fruits & veggies",
    foods: ["Berries", "Bananas", "Apples", "Pineapple", "Broccoli", "Green beans", "Peppers", "Salad greens", "Asparagus", "Zucchini"],
  },
  {
    label: "Extras",
    foods: ["Peanut butter", "Avocado", "Cheese", "Nuts", "Dark chocolate", "Honey"],
  },
] as const;

export const AVOID_OPTIONS = [
  "Fish & seafood",
  "Red meat",
  "Pork",
  "Dairy",
  "Eggs",
  "Gluten",
  "Nuts",
  "Spicy food",
  "Vegetarian (no meat)",
] as const;

export const ALL_FOODS: readonly string[] = FOOD_GROUPS.flatMap((g) => g.foods);

/** Keeps typed-in food notes short and plain. */
export function cleanFoodText(v: unknown): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>{}\[\]`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** One readable line, e.g. "Chicken, Rice, Berries; also: sushi". */
export function foodsLine(list: readonly string[], other: string): string {
  const parts = [...list];
  if (other) parts.push(other);
  return parts.join(", ");
}

// Words that mean a meal uses a food they said they don't eat (used to reject AI meals and
// to hide fallback meals). Gluten and spicy food are left to the AI instructions.

const AVOID_WORDS: Record<string, RegExp> = {
  "Fish & seafood": /\b(fish|salmon|tuna|cod|tilapia|halibut|trout|sardines?|anchov\w*|mahi|haddock|pollock|catfish|shrimp|prawns?|crab|lobster|scallops?|clams?|mussels?|oysters?|seafood|sushi)\b/i,
  "Red meat": /\b(beef|steak|sirloin|brisket|lamb|bison|venison|veal|burger|meatballs?)\b/i,
  Pork: /\b(pork|bacon|ham|prosciutto|chorizo|pepperoni|salami)\b/i,
  Dairy: /\b(milk|cheese|cheddar|mozzarella|parmesan|feta|ricotta|yogurt|yoghurt|butter|cream|whey|kefir|cottage)\b/i,
  Eggs: /\b(eggs?|egg whites?)\b/i,
  Nuts: /\b(nuts?|almonds?|peanuts?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamia)\b/i,
  "Vegetarian (no meat)":
    /\b(chicken|turkey|beef|steak|pork|bacon|ham|lamb|veal|bison|sausage|fish|salmon|tuna|cod|tilapia|shrimp|crab|seafood|jerky)\b/i,
};

/** Foods in this meal that clash with what they said they don't eat (empty = fine). */
export function avoidClashes(texts: string[], avoid: string[]): string[] {
  const all = texts.join(" ");
  return avoid.filter((a) => {
    const re = AVOID_WORDS[a];
    if (!re) return false;
    // "Peanut butter" is fine for dairy-free; "almond milk", "coconut milk", "oat milk" are dairy-free too.
    const text = a === "Dairy" ? all.replace(/\b(peanut|almond|cashew|nut|sunflower|seed)\s+butter\b/gi, "").replace(/\b(almond|oat|coconut|soy|cashew|rice)\s+milk\b/gi, "") : all;
    return re.test(text);
  });
}

