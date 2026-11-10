/**
 * The shape of a client's plan (nutrition + training) and the pure helpers around it:
 * cleaning up what the AI returns, macro totals, and the plain-text edit formats the coach uses.
 * No database or network here, so it's all testable.
 */

export type Macros = { calories: number; protein: number; carbs: number; fat: number; fiber: number };

export type Ingredient = {
  food: string;
  grams: number;
  household: string;
  /** Nutrition per 100 g. */
  per100: Macros | null;
  /** Where per100 came from: the USDA database, the AI's estimate, or nowhere. */
  source: "usda" | "ai" | "none";
  usdaName?: string;
};

export const MEAL_CATEGORIES = [
  { value: "breakfast", label: "Breakfasts" },
  { value: "lunch", label: "Lunches" },
  { value: "dinner", label: "Dinners" },
  { value: "snack", label: "Snacks" },
] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number]["value"];

export type PlanMeal = {
  id: string;
  category: MealCategory;
  name: string;
  /** When they'd usually eat it, e.g. "7:00 AM" or "After training". */
  time: string;
  prepMinutes: number | null;
  ingredients: Ingredient[];
  instructions: string;
  /** Why it's in their plan, written to the client. */
  why: string;
};

export type Exercise = { name: string; sets: string; reps: string; rest: string; notes: string };
export type TrainingDay = { name: string; focus: string; exercises: Exercise[] };
export type Training = { overview: string; warmup: string; progression: string; days: TrainingDay[]; notes: string };

export type Insights = {
  summary: string;
  usualFoods: string[];
  mealTiming: string;
  portions: string;
  patterns: string;
  estimatedCalories: number | null;
  estimatedProtein: number | null;
  intakeNote: string;
  easingIn: string;
};

/** One line of the "perfect day": a meal from the library, at a time, with a number of servings. */
export type PerfectDayItem = { time: string; mealId: string; servings: number };

export type Nutrition = {
  insights: Insights;
  /** Things for the coach to ask or cover on the kickoff call. */
  callAgenda: string[];
  /** Things the coach should double-check before publishing. */
  coachNotes: string[];
  /** Message to the client shown at the top of their plan. */
  welcome: string;
  meals: PlanMeal[];
  perfectDay: { note: string; items: PerfectDayItem[] };
};

export type PlanContent = Nutrition & { training: Training };

export const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

// ───────── Cleaning up AI output ─────────

function s(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "";
}
function n(v: unknown): number | null {
  const x = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(x) ? x : null;
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function strings(v: unknown, max = 30): string[] {
  return arr(v)
    .map((x) => s(x, 300))
    .filter(Boolean)
    .slice(0, max);
}

let idCounter = 0;
export function newId(prefix = "m"): string {
  idCounter = (idCounter + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Turns "the AI's numbers for this amount" into per-100 g numbers. */
function per100FromAmount(m: Record<string, unknown>, grams: number): Macros | null {
  const cal = n(m.calories);
  if (cal === null || grams <= 0) return null;
  const f = 100 / grams;
  return {
    calories: Math.max(0, cal * f),
    protein: Math.max(0, (n(m.protein) ?? 0) * f),
    carbs: Math.max(0, (n(m.carbs) ?? 0) * f),
    fat: Math.max(0, (n(m.fat) ?? 0) * f),
    fiber: Math.max(0, (n(m.fiber) ?? 0) * f),
  };
}

export function cleanIngredient(raw: unknown): Ingredient | null {
  const r = obj(raw);
  const food = s(r.food, 120);
  const grams = n(r.grams);
  if (!food || grams === null || grams <= 0 || grams > 3000) return null;
  const per100 = per100FromAmount(r, grams);
  return { food, grams: Math.round(grams), household: s(r.household, 60), per100, source: per100 ? "ai" : "none" };
}

function isCategory(v: string): v is MealCategory {
  return MEAL_CATEGORIES.some((c) => c.value === v);
}

export function cleanMeal(raw: unknown, fallback: MealCategory = "lunch"): PlanMeal | null {
  const r = obj(raw);
  const name = s(r.name, 120);
  const ingredients = arr(r.ingredients)
    .map(cleanIngredient)
    .filter((x): x is Ingredient => !!x)
    .slice(0, 20);
  if (!name || ingredients.length === 0) return null;
  const cat = s(r.category).toLowerCase();
  const prep = n(r.prepMinutes ?? r.prep_minutes);
  return {
    id: newId(),
    category: isCategory(cat) ? cat : fallback,
    name,
    time: s(r.time, 40),
    prepMinutes: prep !== null && prep >= 0 && prep < 600 ? Math.round(prep) : null,
    ingredients,
    instructions: s(r.instructions, 1500),
    why: s(r.why, 400),
  };
}

function cleanExercise(raw: unknown): Exercise | null {
  const r = obj(raw);
  const name = s(r.name, 100);
  if (!name) return null;
  return { name, sets: s(r.sets, 20), reps: s(r.reps, 30), rest: s(r.rest, 30), notes: s(r.notes, 300) };
}

export function cleanTraining(raw: unknown): Training {
  const r = obj(raw);
  return {
    overview: s(r.overview, 1500),
    warmup: s(r.warmup, 800),
    progression: s(r.progression, 1000),
    notes: s(r.notes, 1000),
    days: arr(r.days)
      .map((d) => {
        const o = obj(d);
        const exercises = arr(o.exercises)
          .map(cleanExercise)
          .filter((x): x is Exercise => !!x)
          .slice(0, 15);
        return { name: s(o.name, 60), focus: s(o.focus, 120), exercises };
      })
      .filter((d) => d.name && d.exercises.length)
      .slice(0, 7),
  };
}

function cleanInsights(raw: unknown): Insights {
  const ins = obj(raw);
  return {
    summary: s(ins.summary, 1500),
    usualFoods: strings(ins.usualFoods, 25),
    mealTiming: s(ins.mealTiming, 600),
    portions: s(ins.portions, 600),
    patterns: s(ins.patterns, 800),
    estimatedCalories: n(ins.estimatedCalories),
    estimatedProtein: n(ins.estimatedProtein),
    intakeNote: s(ins.intakeNote, 600),
    easingIn: s(ins.easingIn, 800),
  };
}

/** Cleans the AI's nutrition answer. Perfect-day lines point at library meals by name. */
export function cleanNutrition(raw: unknown): Nutrition {
  const r = obj(raw);
  const meals = arr(r.meals)
    .map((m) => cleanMeal(m))
    .filter((x): x is PlanMeal => !!x)
    .slice(0, 40);
  const pd = obj(r.perfectDay ?? r.perfect_day);
  const byName = new Map(meals.map((m) => [m.name.toLowerCase(), m.id]));
  const items: PerfectDayItem[] = [];
  for (const it of arr(pd.items)) {
    const o = obj(it);
    const id = byName.get(s(o.mealName ?? o.meal).toLowerCase());
    const servings = n(o.servings) ?? 1;
    if (id) items.push({ time: s(o.time, 40), mealId: id, servings: Math.max(0.25, Math.min(4, Math.round(servings * 4) / 4)) });
  }
  return {
    welcome: s(r.welcome, 800),
    insights: cleanInsights(r.insights),
    callAgenda: strings(r.callAgenda, 12),
    coachNotes: strings(r.coachNotes, 12),
    meals,
    perfectDay: { note: s(pd.note, 600), items: items.slice(0, 10) },
  };
}

export const EMPTY_TRAINING: Training = { overview: "", warmup: "", progression: "", notes: "", days: [] };

// ───────── Macros ─────────

export function ingredientMacros(i: Ingredient): Macros {
  if (!i.per100) return { ...ZERO };
  const f = i.grams / 100;
  return {
    calories: i.per100.calories * f,
    protein: i.per100.protein * f,
    carbs: i.per100.carbs * f,
    fat: i.per100.fat * f,
    fiber: i.per100.fiber * f,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
      fiber: a.fiber + m.fiber,
    }),
    { ...ZERO },
  );
}

export function mealMacros(m: PlanMeal): Macros {
  return sumMacros(m.ingredients.map(ingredientMacros));
}

export function scaleMacros(m: Macros, f: number): Macros {
  return { calories: m.calories * f, protein: m.protein * f, carbs: m.carbs * f, fat: m.fat * f, fiber: m.fiber * f };
}

/** The perfect day's lines with their library meals (lines whose meal was removed are skipped). */
export function perfectDayLines(n: Pick<Nutrition, "meals" | "perfectDay">): { item: PerfectDayItem; meal: PlanMeal }[] {
  const out: { item: PerfectDayItem; meal: PlanMeal }[] = [];
  for (const item of n.perfectDay.items) {
    const meal = n.meals.find((m) => m.id === item.mealId);
    if (meal) out.push({ item, meal });
  }
  return out;
}

export function perfectDayMacros(n: Pick<Nutrition, "meals" | "perfectDay">): Macros {
  return sumMacros(perfectDayLines(n).map(({ item, meal }) => scaleMacros(mealMacros(meal), item.servings)));
}

/** "half a serving", "1½ servings", "2 servings" ("" for exactly 1). */
export function servingsLabel(x: number): string {
  if (x === 1) return "";
  if (x === 0.25) return "a quarter serving";
  if (x === 0.5) return "half a serving";
  if (x === 0.75) return "three-quarters of a serving";
  const whole = Math.floor(x);
  const frac = x - whole;
  const f = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : "";
  return `${whole}${f} servings`;
}

export function roundMacros(m: Macros): Macros {
  return {
    calories: Math.round(m.calories),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
    fiber: Math.round(m.fiber),
  };
}

/** "520 kcal · 42P · 55C · 14F" */
export function macroLine(m: Macros): string {
  const r = roundMacros(m);
  return `${r.calories.toLocaleString("en-US")} kcal · ${r.protein}P · ${r.carbs}C · ${r.fat}F`;
}

/** How close a day is to the targets: "on" within 5%, "near" within 10%, else "off". */
export function closeness(actual: number, target: number): "on" | "near" | "off" {
  if (target <= 0) return "on";
  const d = Math.abs(actual - target) / target;
  return d <= 0.05 ? "on" : d <= 0.1 ? "near" : "off";
}

export function hasEstimates(meals: PlanMeal[]): boolean {
  return meals.some((m) => m.ingredients.some((i) => i.source !== "usda"));
}

// ───────── Plain-text edit formats ─────────

/** "150 g | chicken breast, cooked | about 1 palm" — one ingredient per line. */
export function ingredientsToText(list: Ingredient[]): string {
  return list.map((i) => [`${i.grams} g`, i.food, i.household].filter(Boolean).join(" | ")).join("\n");
}

export function parseIngredientLines(text: string): { ok: true; items: { grams: number; food: string; household: string }[] } | { ok: false; error: string } {
  const items: { grams: number; food: string; household: string }[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const parts = line.split("|").map((p) => p.trim());
    let grams: number | null = null;
    let food = "";
    let household = "";
    const m = /^(\d+(?:\.\d+)?)\s*g\b\s*(.*)$/i.exec(parts[0]);
    if (m) {
      grams = parseFloat(m[1]);
      food = m[2].trim() || parts[1] || "";
      household = m[2].trim() ? parts[1] || "" : parts[2] || "";
    }
    if (grams === null || grams <= 0 || grams > 3000 || !food) {
      return { ok: false, error: `Line ${i + 1} should look like “150 g | chicken breast, cooked | 1 palm”.` };
    }
    items.push({ grams: Math.round(grams), food: food.slice(0, 120), household: household.slice(0, 60) });
  }
  if (items.length === 0) return { ok: false, error: "Add at least one ingredient." };
  return { ok: true, items };
}

/** "Barbell back squat | 3 | 6–8 | 2 min | keep chest up" — one exercise per line. */
export function exercisesToText(list: Exercise[]): string {
  return list.map((e) => [e.name, e.sets, e.reps, e.rest, e.notes].join(" | ").replace(/( \| )+$/, "")).join("\n");
}

export function parseExerciseLines(text: string): { ok: true; items: Exercise[] } | { ok: false; error: string } {
  const items: Exercise[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const [name, sets = "", reps = "", rest = "", ...notes] = line.split("|").map((p) => p.trim());
    if (!name) return { ok: false, error: `Line ${i + 1} needs an exercise name.` };
    items.push({
      name: name.slice(0, 100),
      sets: sets.slice(0, 20),
      reps: reps.slice(0, 30),
      rest: rest.slice(0, 30),
      notes: notes.join(" | ").slice(0, 300),
    });
  }
  if (items.length === 0) return { ok: false, error: "Add at least one exercise." };
  return { ok: true, items };
}

export function categoryLabel(c: string): string {
  return MEAL_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

// ───────── Saving the coach's builders ─────────

export function emptyContent(): PlanContent {
  return {
    welcome: "",
    insights: {
      summary: "",
      usualFoods: [],
      mealTiming: "",
      portions: "",
      patterns: "",
      estimatedCalories: null,
      estimatedProtein: null,
      intakeNote: "",
      easingIn: "",
    },
    callAgenda: [],
    coachNotes: [],
    meals: [],
    perfectDay: { note: "", items: [] },
    training: { ...EMPTY_TRAINING, days: [] },
  };
}

function cleanPer100(v: unknown): Macros | null {
  const o = obj(v);
  const cal = n(o.calories);
  if (cal === null) return null;
  const pos = (x: unknown) => Math.max(0, Math.min(1000, n(x) ?? 0));
  return { calories: pos(cal), protein: pos(o.protein), carbs: pos(o.carbs), fat: pos(o.fat), fiber: pos(o.fiber) };
}

/**
 * Checks meals sent from the coach's meal builder (same shape as PlanMeal). Keeps ids and nutrition
 * data; an ingredient with no data is looked up again when saved. Returns an error for anything unusable.
 */
export function sanitizeEditedMeals(raw: unknown): { ok: true; meals: PlanMeal[] } | { ok: false; error: string } {
  const meals: PlanMeal[] = [];
  const seen = new Set<string>();
  for (const [i, m] of arr(raw).slice(0, 60).entries()) {
    const o = obj(m);
    const name = s(o.name, 120);
    if (!name) return { ok: false, error: `Meal ${i + 1} needs a name.` };
    const ingredients: Ingredient[] = [];
    for (const [j, ing] of arr(o.ingredients).slice(0, 25).entries()) {
      const x = obj(ing);
      const food = s(x.food, 120);
      const grams = n(x.grams);
      if (!food && (grams === null || grams === 0)) continue; // empty row
      if (!food) return { ok: false, error: `“${name}”, ingredient ${j + 1}: add the food.` };
      if (grams === null || grams <= 0 || grams > 3000) return { ok: false, error: `“${name}”: grams for ${food} must be between 1 and 3,000.` };
      const per100 = cleanPer100(x.per100);
      const source = x.source === "usda" || x.source === "ai" ? x.source : "none";
      ingredients.push({
        food,
        grams: Math.round(grams),
        household: s(x.household, 60),
        per100,
        source: per100 ? (source === "none" ? "ai" : source) : "none",
        ...(source === "usda" && per100 && typeof x.usdaName === "string" ? { usdaName: s(x.usdaName, 200) } : {}),
      });
    }
    if (ingredients.length === 0) return { ok: false, error: `“${name}” needs at least one ingredient.` };
    let id = s(o.id, 40);
    if (!/^[a-z0-9]+$/i.test(id) || seen.has(id)) id = newId();
    seen.add(id);
    const cat = s(o.category).toLowerCase();
    const prep = n(o.prepMinutes);
    meals.push({
      id,
      category: isCategory(cat) ? cat : "lunch",
      name,
      time: s(o.time, 40),
      prepMinutes: prep !== null && prep > 0 && prep < 600 ? Math.round(prep) : null,
      ingredients,
      instructions: s(o.instructions, 1500),
      why: s(o.why, 400),
    });
  }
  return { ok: true, meals };
}

export function sanitizePerfectDay(raw: unknown, meals: PlanMeal[]): { note: string; items: PerfectDayItem[] } {
  const o = obj(raw);
  const ids = new Set(meals.map((m) => m.id));
  const items: PerfectDayItem[] = [];
  for (const it of arr(o.items).slice(0, 12)) {
    const x = obj(it);
    const mealId = s(x.mealId, 40);
    if (!ids.has(mealId)) continue;
    const sv = n(x.servings) ?? 1;
    items.push({ time: s(x.time, 40), mealId, servings: Math.max(0.25, Math.min(4, Math.round(sv * 4) / 4)) });
  }
  return { note: s(o.note, 600), items };
}

/** Checks a program sent from the coach's workout builder. */
export function sanitizeEditedTraining(raw: unknown): { ok: true; training: Training } | { ok: false; error: string } {
  const o = obj(raw);
  const days: TrainingDay[] = [];
  for (const [i, d] of arr(o.days).slice(0, 7).entries()) {
    const x = obj(d);
    const name = s(x.name, 60) || `Day ${i + 1}`;
    const exercises: Exercise[] = [];
    for (const e of arr(x.exercises).slice(0, 20)) {
      const ex = cleanExercise(e);
      if (ex) exercises.push(ex);
    }
    if (exercises.length === 0) return { ok: false, error: `${name} needs at least one exercise (or remove the day).` };
    days.push({ name, focus: s(x.focus, 120), exercises });
  }
  return {
    ok: true,
    training: { overview: s(o.overview, 1500), warmup: s(o.warmup, 800), progression: s(o.progression, 1000), notes: s(o.notes, 1000), days },
  };
}

// ───────── Meals and workouts are published separately ─────────

export type PlanPart = "nutrition" | "training";
export type PartState = "empty" | "draft" | "live" | "changed";

type HasPart = { content: PlanContent; targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number; waterOz: number } };

function partHas(p: HasPart | null, part: PlanPart): boolean {
  if (!p) return false;
  return part === "nutrition" ? p.content.meals.length > 0 : p.content.training.days.length > 0;
}

/** Everything the client sees for one part, as a string, to tell whether the draft differs from what's live. */
export function partSnapshot(p: HasPart, part: PlanPart): string {
  if (part === "training") return JSON.stringify(p.content.training);
  const t = p.targets;
  return JSON.stringify({
    t: [t.calories, t.protein, t.carbs, t.fat, t.fiber, t.waterOz],
    meals: p.content.meals,
    day: p.content.perfectDay,
    welcome: p.content.welcome,
    easing: p.content.insights.easingIn,
  });
}

/** empty = nothing yet · draft = not published yet · live = client sees exactly this · changed = live, with unpublished edits. */
export function partState(work: HasPart | null, pub: HasPart | null, part: PlanPart): PartState {
  if (!partHas(pub, part)) return partHas(work, part) ? "draft" : "empty";
  if (!work) return "live";
  return partSnapshot(work, part) === partSnapshot(pub!, part) ? "live" : "changed";
}

export function partStateLabel(s: PartState): string {
  return { empty: "Not started", draft: "Draft · not published", live: "Live ✓", changed: "Live · unpublished changes" }[s];
}
