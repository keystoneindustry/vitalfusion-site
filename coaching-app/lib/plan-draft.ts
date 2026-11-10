/**
 * Drafting a client's plan with the AI.
 *  - Nutrition (food-log insights, call agenda, meal library, perfect day) and training are asked for
 *    in two calls at the same time, so a draft takes about as long as the slower of the two.
 *  - Calories and macros are NOT the AI's: they come from the calculator (lib/targets.ts).
 *  - Meal macros are recalculated from USDA data where possible (lib/food-data.ts).
 * Tyler always reviews and publishes; nothing reaches the client from here.
 */

import { askForJson, aiConfigured, type AiUsage, type ContentBlock, type JsonSpec } from "./ai";
import { addEvent, getClient, type ClientRow } from "./clients";
import { firstName } from "./client-input";
import { getResponse, latestAgreement } from "./onboarding-data";
import { summarize, type Answers } from "./onboarding-questions";
import { listMeals, mealLabel, hungerLabel, dayIn, timeIn, MEAL_PHOTO_BUCKET, type MealLog } from "./meals";
import { downloadFile } from "./storage";
import { applyUsda } from "./food-data";
import { ageOn } from "./agreement";
import { todayIn } from "./dates";
import { computeTargets, inputsFromAnswers, targetLine, type Targets } from "./targets";
import {
  emptyContent,
  cleanNutrition,
  cleanTraining,
  ingredientMacros,
  roundMacros,
  type MealCategory,
  type Nutrition,
  type PlanContent,
  type Training,
} from "./plan";
import { getPlan, hasContent, hasTargets, claimForDrafting, updatePlan, workingPlan, type PlanRow, type ReadyPlan } from "./plans";
import { formatCallTime } from "./booking";
import { trainingBrief, trainingWarnings, withTrainingNotes } from "./training-brief";

export type DraftPart = "nutrition" | "training" | "both";

// ───────── Inputs ─────────

export type ClientContext = {
  client: ClientRow;
  answers: Answers;
  age: number | null;
  meals: MealLog[];
};

export async function loadContext(client: ClientRow): Promise<ClientContext> {
  const [response, agreement, meals] = await Promise.all([getResponse(client.id), latestAgreement(client.id), listMeals(client.id)]);
  const dob = agreement?.contact?.dob;
  const age = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? ageOn(dob, todayIn(client.timezone)) : null;
  return { client, answers: response?.answers ?? {}, age, meals };
}

export function defaultTargets(ctx: ClientContext): Targets {
  return computeTargets(inputsFromAnswers(ctx.answers, ctx.age).inputs);
}

function profileText(ctx: ClientContext): string {
  const groups = summarize(ctx.answers);
  const lines = [`Name: ${ctx.client.full_name}`, `Age: ${ctx.age ?? "unknown"}`];
  if (ctx.client.coaching_weeks) lines.push(`Coaching package: ${ctx.client.coaching_weeks} weeks`);
  if (ctx.client.health_flag) lines.push(`HEALTH SCREENING: answered YES (coach has reviewed it). Their note: ${ctx.client.health_note ?? "—"}`);
  for (const g of groups) {
    lines.push(`\n## ${g.section}`);
    for (const i of g.items) lines.push(`- ${i.prompt} ${i.answer}`);
  }
  return lines.join("\n");
}

function targetsText(t: Targets): string {
  return `Daily targets (fixed, set by Tyler's calculator; do not change them): ${t.calories} kcal, ${t.protein} g protein, ${t.carbs} g carbs, ${t.fat} g fat, ${t.fiber} g fiber, ${t.waterOz} oz water. Goal: ${t.inputs.goal}. Maintenance is about ${t.maintenance} kcal.`;
}

const MAX_PHOTOS = 24;

/** Picks up to MAX_PHOTOS photos spread across the log, oldest first. */
function pickPhotos(meals: MealLog[]): Set<string> {
  const withPhoto = meals.filter((m) => m.photo_path).sort((a, b) => a.eaten_at.localeCompare(b.eaten_at));
  if (withPhoto.length <= MAX_PHOTOS) return new Set(withPhoto.map((m) => m.id));
  const step = withPhoto.length / MAX_PHOTOS;
  return new Set(Array.from({ length: MAX_PHOTOS }, (_, i) => withPhoto[Math.floor(i * step)].id));
}

function mediaType(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function foodLogBlocks(ctx: ClientContext): Promise<ContentBlock[]> {
  const tz = ctx.client.timezone;
  const meals = [...ctx.meals].sort((a, b) => a.eaten_at.localeCompare(b.eaten_at));
  if (meals.length === 0) return [{ type: "text", text: "FOOD LOG: they haven't logged any meals. Build from their answers only, and say so in insights." }];
  const days = [...new Set(meals.map((m) => dayIn(m.eaten_at, tz)))];
  const photos = pickPhotos(meals);
  const blocks: ContentBlock[] = [
    { type: "text", text: `FOOD LOG: ${meals.length} entries over ${days.length} day(s). Each entry is followed by its photo when there is one.` },
  ];
  for (const m of meals) {
    const d = days.indexOf(dayIn(m.eaten_at, tz)) + 1;
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(m.eaten_at));
    const bits = [`Day ${d} (${weekday}) ${timeIn(m.eaten_at, tz)}`, mealLabel(m.meal)];
    if (m.place) bits.push(`at ${m.place}`);
    const h = hungerLabel(m.hunger);
    if (h) bits.push(`hunger before: ${h}`);
    if (m.note) bits.push(`note: "${m.note}"`);
    if (m.photo_path && !photos.has(m.id)) bits.push("(photo not included)");
    blocks.push({ type: "text", text: bits.join(" · ") });
    if (m.photo_path && photos.has(m.id)) {
      const bytes = await downloadFile(MEAL_PHOTO_BUCKET, m.photo_path).catch(() => null);
      if (bytes) blocks.push({ type: "image", source: { type: "base64", media_type: mediaType(m.photo_path), data: Buffer.from(bytes).toString("base64") } });
    }
  }
  return blocks;
}

// ───────── Prompts ─────────

const VOICE = `Anything written TO THE CLIENT (welcome, each meal's "why" and instructions, training notes) is in Tyler's voice: friendly, direct and encouraging, plain English, short sentences, no hype, no medical claims, at most one emoji. Use US units.`;

const NUTRITION_RULES = `- The daily targets are fixed. Never change them.
- Build around what they already eat and like (from the photos and their answers). Keep their favorite foods and swap in better versions rather than replacing their diet. Strictly respect allergies, foods they won't eat and their way of eating. Match their cooking time, kitchen skills, budget and how often they eat out.
- Ingredients use plain, generic names the way the USDA food database writes them, including the state: e.g. "chicken breast, cooked", "white rice, cooked", "rolled oats, dry", "egg, whole", "greek yogurt, nonfat, plain", "olive oil". No brand names. Give grams, a household measure (e.g. "1 cup", "1 palm-size piece") and your estimate of calories, protein, carbs, fat and fiber for THAT amount.
- Keep meals realistic and simple, with short instructions.`;

const ANALYSIS_SYSTEM = `You help Tyler Kendrick, owner and coach at Vital Fusion Coaching, plan a new client's nutrition. Tyler reviews and edits everything before the client sees it.

You get the client's onboarding answers, their fixed daily targets, and their food log (meal photos with times and notes from the days before their kickoff call). In this step you study how they eat and lay out their day; separate writers then create the meals from your notes.

Rules:
1. Insights: what and when they eat, portion sizes, snack/drink/weekend patterns, and a rough estimate of what they eat now (photos are rough; say so). If that estimate is far from the target (about 400+ kcal off, or protein far below), suggest easing in over 1 to 2 weeks in "easingIn"; otherwise leave it empty.
2. Slots: their perfect day as 3 to 6 eating times, using their real meal times and number of meals (from the food log and their wake, bed and training times). Each slot is a breakfast, lunch, dinner or snack with its share of the day's calories, protein, carbs and fat. The slots must add up to the daily targets.
3. Food guide: a short brief for the meal writers: the foods, dishes, flavors and cuisines to build around, foods to avoid, cooking time, budget and eating-out habits.
4. Call agenda: 4 to 8 specific questions or topics for Tyler's kickoff call, based on gaps or surprises in the log and answers.
5. Coach notes: anything Tyler should double-check before publishing (health answers, unclear allergies, photos you couldn't read, numbers that look off, signs of disordered eating). Never diagnose.
${VOICE}`;

const MEALS_SYSTEM = `You write meal options for a client of Tyler Kendrick, coach at Vital Fusion Coaching. Tyler reviews and edits everything before the client sees it.

Rules:
- Write exactly the number of meals asked for, all in the requested group. Each one is ONE serving that lands close to the given calories and protein (within about 5%) and near the carbs and fat, so the client can swap any of them for another.
- Make the options genuinely different from each other.
${NUTRITION_RULES}
${VOICE}`;

const NUTRITION_REVISE_SYSTEM = `You update a client's nutrition plan for Tyler Kendrick, coach at Vital Fusion Coaching, following his call notes and requested changes. Tyler reviews everything before the client sees it.

Return ONLY what changes: meals to replace (give the old meal's exact name), new meals (empty old name), meals to remove (exact names), and the full perfect day (meal names, times and servings) after your changes. Leave everything that the changes don't touch alone.
${NUTRITION_RULES}
${VOICE}`;

const TRAINING_SYSTEM = `You help Tyler Kendrick, owner and coach at Vital Fusion Coaching, draft a new client's training program. Tyler reviews and edits everything before the client sees it.

Rules:
1. Follow the TRAINING REQUIREMENTS block exactly: their goal, the exact number of training days (one day object per session), the session length, ONLY the equipment they have, and their experience level. The program must clearly serve their goal; say how in the overview.
2. Work around injuries and pain: leave out movements that could aggravate them and mention safer swaps in the exercise notes.
3. Use standard exercise names (e.g. "Barbell back squat", "Dumbbell Romanian deadlift", "Lat pulldown"). Prefer exercises they said they enjoy; avoid ones they hate.
4. For each exercise give sets, reps (a range like "8–10"), rest (e.g. "90 sec") and a short coaching cue. Fit the session length including the warm-up.
5. Goals: fat loss and general fitness keep strength training at the center; muscle building gets enough weekly volume per muscle. Add a step or cardio suggestion in notes when it fits their goal.
6. Progression: a simple rule they can follow, like double progression (add reps until the top of the range, then add weight).
7. Training days are named "Day 1 – Upper", "Day 2 – Lower" etc., not weekdays.
${VOICE}`;

const INGREDIENT_SCHEMA = {
  type: "object",
  properties: {
    food: { type: "string" },
    grams: { type: "number" },
    household: { type: "string" },
    calories: { type: "number" },
    protein: { type: "number" },
    carbs: { type: "number" },
    fat: { type: "number" },
    fiber: { type: "number" },
  },
  required: ["food", "grams", "household", "calories", "protein", "carbs", "fat"],
};

const MEAL_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
    name: { type: "string" },
    time: { type: "string", description: "When they'd usually eat it, e.g. 7:00 AM" },
    prepMinutes: { type: "number" },
    ingredients: { type: "array", items: INGREDIENT_SCHEMA },
    instructions: { type: "string" },
    why: { type: "string", description: "One sentence to the client on why it's in their plan." },
  },
};

const INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    usualFoods: { type: "array", items: { type: "string" } },
    mealTiming: { type: "string" },
    portions: { type: "string" },
    patterns: { type: "string" },
    estimatedCalories: { type: "number", description: "Rough current daily calories; 0 if there's no food log." },
    estimatedProtein: { type: "number", description: "Rough current daily protein in grams; 0 if there's no food log." },
    intakeNote: { type: "string" },
    easingIn: { type: "string" },
  },
};

const ANALYSIS_OUTPUT: JsonSpec = {
  name: "nutrition_analysis",
  schema: {
    type: "object",
    properties: {
      welcome: { type: "string", description: "2-4 sentences to the client introducing their plan." },
      insights: INSIGHTS_SCHEMA,
      callAgenda: { type: "array", items: { type: "string" } },
      coachNotes: { type: "array", items: { type: "string" } },
      foodGuide: { type: "string" },
      perfectDayNote: { type: "string", description: "1-2 sentences to the client about their perfect day." },
      slots: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
            time: { type: "string" },
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fat: { type: "number" },
          },
        },
      },
    },
  },
};

const MEALS_OUTPUT: JsonSpec = {
  name: "meal_options",
  schema: { type: "object", properties: { meals: { type: "array", items: MEAL_SCHEMA } } },
};

const NUTRITION_REVISION_OUTPUT: JsonSpec = {
  name: "nutrition_changes",
  schema: {
    type: "object",
    properties: {
      replace: {
        type: "array",
        items: { type: "object", properties: { oldName: { type: "string", description: "Exact name of the meal to replace; empty for a new meal." }, meal: MEAL_SCHEMA } },
      },
      remove: { type: "array", items: { type: "string" } },
      perfectDay: {
        type: "array",
        items: { type: "object", properties: { time: { type: "string" }, mealName: { type: "string" }, servings: { type: "number" } } },
      },
      perfectDayNote: { type: "string" },
      welcome: { type: "string" },
      coachNotes: { type: "array", items: { type: "string" }, description: "Things Tyler should double-check after these changes (may be empty)." },
    },
  },
};

const TRAINING_OUTPUT: JsonSpec = {
  name: "training_program",
  schema: {
    type: "object",
    properties: {
      overview: { type: "string", description: "2-3 sentences to the client about the program." },
      warmup: { type: "string" },
      progression: { type: "string" },
      notes: { type: "string", description: "Steps, cardio, recovery tips." },
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            focus: { type: "string" },
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  sets: { type: "string" },
                  reps: { type: "string" },
                  rest: { type: "string" },
                  notes: { type: "string" },
                },
                required: ["name", "sets", "reps", "rest"],
              },
            },
          },
          required: ["name", "focus", "exercises"],
        },
      },
    },
    required: ["overview", "warmup", "progression", "notes", "days"],
  },
};

/** The current nutrition plan in the same shape the AI writes, for revisions. */
function nutritionForAi(n: Nutrition): unknown {
  return {
    welcome: n.welcome,
    insights: n.insights,
    callAgenda: n.callAgenda,
    coachNotes: n.coachNotes,
    meals: n.meals.map((m) => ({
      category: m.category,
      name: m.name,
      time: m.time,
      prepMinutes: m.prepMinutes,
      instructions: m.instructions,
      why: m.why,
      ingredients: m.ingredients.map((i) => ({ food: i.food, grams: i.grams, household: i.household, ...roundMacros(ingredientMacros(i)) })),
    })),
    perfectDay: {
      note: n.perfectDay.note,
      items: n.perfectDay.items.map((it) => ({ time: it.time, mealName: n.meals.find((m) => m.id === it.mealId)?.name ?? "", servings: it.servings })),
    },
  };
}

function revisionText(kind: "nutrition plan" | "training program", current: unknown, instruction: string, callNotes: string): string {
  return [
    `Here is the current ${kind} as JSON. Return the COMPLETE updated ${kind}. Keep everything that the changes below don't touch exactly as it is.`,
    JSON.stringify(current),
    callNotes ? `TYLER'S KICKOFF CALL NOTES (these override the earlier answers where they differ):\n${callNotes}` : "",
    instruction ? `TYLER'S REQUESTED CHANGES:\n${instruction}` : "Update it to reflect the call notes.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ───────── Running a draft ─────────

type Slot = { category: MealCategory; time: string; calories: number; protein: number; carbs: number; fat: number };

/** The analysis' eating slots, scaled so they add up exactly to the targets. */
export function normalizeSlots(raw: unknown, t: Targets): Slot[] {
  const cats = ["breakfast", "lunch", "dinner", "snack"];
  let slots: Slot[] = (Array.isArray(raw) ? raw : [])
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
    .filter((x) => cats.includes(String(x.category).toLowerCase()))
    .slice(0, 6)
    .map((x) => ({
      category: String(x.category).toLowerCase() as MealCategory,
      time: typeof x.time === "string" ? x.time.slice(0, 40) : "",
      calories: Math.max(0, Number(x.calories) || 0),
      protein: Math.max(0, Number(x.protein) || 0),
      carbs: Math.max(0, Number(x.carbs) || 0),
      fat: Math.max(0, Number(x.fat) || 0),
    }));
  if (slots.length < 2) {
    slots = [
      { category: "breakfast", time: "8:00 AM", calories: 0.25, protein: 0.25, carbs: 0.25, fat: 0.25 },
      { category: "lunch", time: "12:30 PM", calories: 0.3, protein: 0.3, carbs: 0.3, fat: 0.3 },
      { category: "snack", time: "3:30 PM", calories: 0.15, protein: 0.15, carbs: 0.15, fat: 0.15 },
      { category: "dinner", time: "6:30 PM", calories: 0.3, protein: 0.3, carbs: 0.3, fat: 0.3 },
    ];
  }
  const scale = (k: "calories" | "protein" | "carbs" | "fat") => {
    const sum = slots.reduce((a, x) => a + x[k], 0);
    const target = t[k];
    slots = slots.map((x) => ({ ...x, [k]: Math.round(sum > 0 ? (x[k] / sum) * target : target / slots.length) }));
  };
  scale("calories");
  scale("protein");
  scale("carbs");
  scale("fat");
  return slots;
}

/** One meal-size budget per group: the average of that group's slots (or a typical share if it has none). */
export function budgets(slots: Slot[], t: Targets): Record<MealCategory, Omit<Slot, "category" | "time">> {
  const share: Record<MealCategory, number> = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.15 };
  const out = {} as Record<MealCategory, Omit<Slot, "category" | "time">>;
  for (const c of ["breakfast", "lunch", "dinner", "snack"] as MealCategory[]) {
    const list = slots.filter((x) => x.category === c);
    const avg = (k: "calories" | "protein" | "carbs" | "fat") =>
      Math.round(list.length ? list.reduce((a, x) => a + x[k], 0) / list.length : t[k] * share[c]);
    out[c] = { calories: avg("calories"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat") };
  }
  return out;
}

const MEALS_PER_GROUP = 5;

async function draftNutrition(ctx: ClientContext, t: Targets, revise: { current: Nutrition; instruction: string; callNotes: string } | null) {
  const profile: ContentBlock = { type: "text", text: `CLIENT PROFILE\n${profileText(ctx)}` };
  const targets: ContentBlock = { type: "text", text: targetsText(t) };
  if (revise) return reviseNutrition(revise, profile, targets);

  // 1. Study the food log and lay out the day (with the photos).
  const content: ContentBlock[] = [profile, targets, ...(await foodLogBlocks(ctx))];
  if (ctx.client.kickoff_at) content.push({ type: "text", text: `Kickoff call: ${formatCallTime(ctx.client.kickoff_at, ctx.client.timezone)}.` });
  content.push({ type: "text", text: "Study their eating and lay out their day now." });
  const analysis = await askForJson({ system: ANALYSIS_SYSTEM, content, output: ANALYSIS_OUTPUT, maxTokens: 16000, effort: "low", timeoutMs: 150_000 });
  const a = (analysis.data && typeof analysis.data === "object" ? analysis.data : {}) as Record<string, unknown>;
  const slots = normalizeSlots(a.slots, t);
  const sizes = budgets(slots, t);
  const guide = typeof a.foodGuide === "string" ? a.foodGuide : "";
  const insights = a.insights && typeof a.insights === "object" ? JSON.stringify(a.insights) : "";

  // 2. Write each group's meals at the same time (no photos needed: the analysis describes them).
  const groups = (["breakfast", "lunch", "dinner", "snack"] as MealCategory[]).map(async (c) => {
    const b = sizes[c];
    const times = slots.filter((x) => x.category === c).map((x) => x.time).filter(Boolean);
    const res = await askForJson({
      system: MEALS_SYSTEM,
      content: [
        profile,
        targets,
        { type: "text", text: `FOOD GUIDE FROM THE FOOD-LOG REVIEW:\n${guide}\n\nFOOD-LOG INSIGHTS: ${insights}` },
        {
          type: "text",
          text: `Write ${MEALS_PER_GROUP} ${c} options${times.length ? ` (usually eaten around ${times.join(", ")})` : ""}. Each one serving ≈ ${b.calories} kcal, ${b.protein} g protein, ${b.carbs} g carbs, ${b.fat} g fat.`,
        },
      ],
      output: MEALS_OUTPUT,
      maxTokens: 16000,
      effort: "low",
      timeoutMs: 120_000,
    });
    const list = (res.data as { meals?: unknown[] })?.meals ?? [];
    return { list: list.map((m) => ({ ...(m as object), category: c })), usage: res.usage };
  });
  const written = await Promise.all(groups);

  // 3. The perfect day: each slot gets the next meal of its group, in time order.
  const allMeals = written.flatMap((w) => w.list) as Record<string, unknown>[];
  const used: Record<string, number> = {};
  const items = slots.map((sl) => {
    const options = allMeals.filter((m) => m.category === sl.category);
    const i = used[sl.category] ?? 0;
    used[sl.category] = i + 1;
    const pick = options[i % Math.max(1, options.length)];
    return { time: sl.time, mealName: pick ? String(pick.name ?? "") : "", servings: 1 };
  });

  const n = cleanNutrition({
    welcome: a.welcome,
    insights: a.insights,
    callAgenda: a.callAgenda,
    coachNotes: a.coachNotes,
    meals: allMeals,
    perfectDay: { note: a.perfectDayNote, items },
  });
  if (n.meals.length === 0) throw new Error("The AI's meals came back empty. Try again.");
  const { meals } = await applyUsda(n.meals);
  return { value: { ...n, meals }, usage: [analysis.usage, ...written.map((w) => w.usage)], model: analysis.model };
}

/** Applies only the meals the AI changed, so a revision stays short and fast. */
async function reviseNutrition(revise: { current: Nutrition; instruction: string; callNotes: string }, profile: ContentBlock, targets: ContentBlock) {
  const current = nutritionForAi(revise.current) as { meals: Record<string, unknown>[]; perfectDay: { note: string; items: unknown[] }; welcome: string; insights: unknown; callAgenda: string[]; coachNotes: string[] };
  const res = await askForJson({
    system: NUTRITION_REVISE_SYSTEM,
    content: [
      profile,
      targets,
      { type: "text", text: `CURRENT MEAL LIBRARY AND PERFECT DAY (JSON):\n${JSON.stringify({ meals: current.meals, perfectDay: current.perfectDay })}` },
      revise.callNotes ? { type: "text", text: `TYLER'S KICKOFF CALL NOTES (these override earlier answers where they differ):\n${revise.callNotes}` } : { type: "text", text: "No call notes." },
      { type: "text", text: revise.instruction ? `TYLER'S REQUESTED CHANGES:\n${revise.instruction}` : "Update the plan to reflect the call notes." },
    ],
    output: NUTRITION_REVISION_OUTPUT,
    maxTokens: 24000,
  });
  const d = (res.data && typeof res.data === "object" ? res.data : {}) as {
    replace?: { oldName?: string; meal?: Record<string, unknown> }[];
    remove?: string[];
    perfectDay?: unknown[];
    perfectDayNote?: string;
    welcome?: string;
    coachNotes?: string[];
  };
  const lower = (x: unknown) => String(x ?? "").trim().toLowerCase();
  const removed = new Set((d.remove ?? []).map(lower));
  let meals = current.meals.filter((m) => !removed.has(lower(m.name)));
  for (const r of d.replace ?? []) {
    if (!r.meal) continue;
    const idx = r.oldName ? meals.findIndex((m) => lower(m.name) === lower(r.oldName)) : -1;
    if (idx >= 0) meals = meals.map((m, k) => (k === idx ? r.meal! : m));
    else meals = [...meals, r.meal];
  }
  const n = cleanNutrition({
    welcome: d.welcome || current.welcome,
    insights: current.insights,
    callAgenda: current.callAgenda,
    coachNotes: [...current.coachNotes.filter((x) => !x.startsWith("Training: ")), ...(d.coachNotes ?? [])],
    meals,
    perfectDay: { note: d.perfectDayNote || current.perfectDay.note, items: d.perfectDay?.length ? d.perfectDay : current.perfectDay.items },
  });
  if (n.meals.length === 0) throw new Error("The AI removed every meal. Try again with a clearer instruction.");
  const fixed = await applyUsda(n.meals);
  return { value: { ...n, meals: fixed.meals }, usage: [res.usage], model: res.model };
}

async function draftTraining(ctx: ClientContext, t: Targets, revise: { current: Training; instruction: string; callNotes: string } | null) {
  const base: ContentBlock[] = [
    { type: "text", text: `CLIENT PROFILE\n${profileText(ctx)}` },
    { type: "text", text: trainingBrief(ctx.answers) },
    { type: "text", text: `Their nutrition targets for context: ${targetLine(t)} (goal: ${t.inputs.goal}).` },
  ];
  const content = [
    ...base,
    {
      type: "text" as const,
      text: revise ? revisionText("training program", revise.current, revise.instruction, revise.callNotes) : "Draft the training program now.",
    },
  ];
  const res = await askForJson({ system: TRAINING_SYSTEM, content, output: TRAINING_OUTPUT, maxTokens: 16000 });
  let training = cleanTraining(res.data);
  const usage: AiUsage[] = [res.usage];
  if (training.days.length === 0) throw new Error("The AI's training program came back empty. Try again.");

  // One automatic fix-up pass if the program breaks their answers (wrong number of days, too long, missing equipment).
  const problems = trainingWarnings(training, ctx.answers);
  if (problems.length) {
    try {
      const fix = await askForJson({
        system: TRAINING_SYSTEM,
        content: [
          ...base,
          {
            type: "text",
            text: revisionText(
              "training program",
              training,
              `Fix these problems so the program matches their onboarding answers:\n- ${problems.join("\n- ")}`,
              revise?.callNotes ?? "",
            ),
          },
        ],
        output: TRAINING_OUTPUT,
        maxTokens: 16000,
      });
      const fixed = cleanTraining(fix.data);
      usage.push(fix.usage);
      if (fixed.days.length && trainingWarnings(fixed, ctx.answers).length <= problems.length) training = fixed;
    } catch (err) {
      console.error("Training fix-up pass failed", err);
    }
  }
  return { value: training, usage, model: res.model };
}

function addUsage(a: PlanRow["usage"], more: AiUsage[]): NonNullable<PlanRow["usage"]> {
  return {
    input_tokens: (a?.input_tokens ?? 0) + more.reduce((s, u) => s + (u.input_tokens ?? 0), 0),
    output_tokens: (a?.output_tokens ?? 0) + more.reduce((s, u) => s + (u.output_tokens ?? 0), 0),
    runs: (a?.runs ?? 0) + 1,
  };
}

export type StartResult = { ok: true; planId: string } | { ok: false; error: string };

/**
 * Gets the client's working plan ready for the AI (creating an empty one with calculator targets if
 * needed) and marks `part` as drafting. The slow AI work then runs in `runDraft`, after the response.
 */
export async function startDraft(client: ClientRow, part: DraftPart, opts: { allowHealthFlag?: boolean } = {}): Promise<StartResult> {
  if (!aiConfigured()) return { ok: false, error: "The Claude API key isn't set up yet. Add ANTHROPIC_API_KEY in Vercel (see Settings)." };
  if (client.health_flag && !opts.allowHealthFlag) {
    return { ok: false, error: "They answered YES on the health questions. Tick the box to confirm you've reviewed it." };
  }
  const plan = await workingPlan(client, () => loadContext(client).then(defaultTargets));
  const claimed = await claimForDrafting(plan.id, part);
  if (!claimed) return { ok: false, error: "The AI is already working on this plan. Give it a minute." };
  return { ok: true, planId: plan.id };
}

/**
 * Drafts (or revises, when there's an instruction or call notes and the part already has content) the
 * meals, the workouts, or both. The result is merged into the LATEST saved plan, so edits the coach saved
 * to the other part meanwhile are kept. Never throws: failures are saved on the plan for the coach to see.
 */
export async function runDraft(
  planId: string,
  opts: {
    part: DraftPart;
    instruction?: string;
    /** Draft from scratch even if the part has content. */
    fresh?: boolean;
    notifyCoach?: (client: ClientRow, plan: ReadyPlan) => Promise<void>;
  },
): Promise<void> {
  const before = await getPlan(planId);
  if (!before || !hasTargets(before)) return;
  const client = await getClient(before.client_id);
  if (!client) return;
  const part = opts.part;
  const instruction = (opts.instruction ?? "").trim();
  const callNotes = (before.call_notes ?? "").trim();
  const current = hasContent(before) ? before.content : emptyContent();
  const wantsRevision = !opts.fresh && (instruction !== "" || callNotes !== "");
  const reviseNutrition = wantsRevision && current.meals.length > 0;
  const reviseTraining = wantsRevision && current.training.days.length > 0;

  try {
    const ctx = await loadContext(client);
    const [n, t] = await Promise.all([
      part !== "training" ? draftNutrition(ctx, before.targets, reviseNutrition ? { current, instruction, callNotes } : null) : null,
      part !== "nutrition" ? draftTraining(ctx, before.targets, reviseTraining ? { current: current.training, instruction, callNotes } : null) : null,
    ]);

    // Merge into whatever is saved now.
    const latest = await getPlan(planId);
    const base = latest && hasContent(latest) ? latest.content : current;
    let content: PlanContent = { ...base };
    if (n) {
      const trainingNotes = base.coachNotes.filter((x) => x.startsWith("Training: "));
      content = { ...content, ...n.value, coachNotes: [...n.value.coachNotes, ...trainingNotes], training: base.training };
    }
    if (t) content = { ...content, training: t.value, coachNotes: withTrainingNotes(content.coachNotes, t.value, ctx.answers) };
    const usage = addUsage(before.usage, [...(n?.usage ?? []), ...(t?.usage ?? [])]);
    const saved = await updatePlan(planId, {
      status: "draft",
      drafting_part: null,
      content,
      error: null,
      ai_model: n?.model ?? t?.model ?? before.ai_model,
      usage,
    });
    const revised = (n && reviseNutrition) || (t && reviseTraining);
    await addEvent(client.id, revised ? "plan_revised" : "plan_drafted", { part });
    if (!revised && opts.notifyCoach && hasContent(saved)) await opts.notifyCoach(client, saved).catch((e) => console.error("Plan email failed", e));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    console.error("Plan draft failed", err);
    await updatePlan(planId, { status: "draft", drafting_part: null, error: message }).catch(() => undefined);
    await addEvent(client.id, "plan_draft_failed", { reason: message.slice(0, 200), part }).catch(() => undefined);
  }
}

export function planTitle(client: ClientRow): string {
  return `${firstName(client.full_name)}'s plan`;
}

export { targetLine };
