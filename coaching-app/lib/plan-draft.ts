/**
 * Drafting a client's plan with the AI.
 *  - Nutrition (food-log insights, call agenda, meal library, perfect day) and training are asked for
 *    in two calls at the same time, so a draft takes about as long as the slower of the two.
 *  - Calories and macros are NOT the AI's: they come from the calculator (lib/targets.ts).
 *  - Meal macros are recalculated from USDA data where possible (lib/food-data.ts).
 * Tyler always reviews and publishes; nothing reaches the client from here.
 */

import { askForJson, aiConfigured, type AiUsage, type ContentBlock, type ToolSpec } from "./ai";
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
  cleanNutrition,
  cleanTraining,
  ingredientMacros,
  roundMacros,
  type Nutrition,
  type PlanContent,
  type Training,
} from "./plan";
import { getOpenPlan, getPlan, hasContent, hasTargets, insertPlan, claimForDrafting, updatePlan, type PlanRow } from "./plans";
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

const NUTRITION_SYSTEM = `You help Tyler Kendrick, owner and coach at Vital Fusion Coaching, draft a new client's nutrition plan. Tyler reviews and edits everything before the client sees it.

You get the client's onboarding answers, their fixed daily targets, and their food log (meal photos with times and notes from the days before their kickoff call).

Rules:
1. The targets are fixed. Never change them. Design the meals so that the perfect day lands within 5% of the calories and protein targets and close on carbs and fat.
2. Build around what they already eat and like (from the photos and their answers). Keep their favorite foods, swap in better versions rather than replacing their diet. Strictly respect allergies, foods they won't eat, and their way of eating. Match their cooking time, kitchen skills, budget and how often they eat out.
3. Use their real meal times and number of meals (from the food log and their wake, bed and training times).
4. Meal library: 5 breakfasts, 5 lunches, 5 dinners and 5 snacks. Meals in the same category should have similar calories and protein so they can swap one for another. Keep them realistic and simple.
5. Ingredients use plain, generic names the way the USDA food database writes them, including the state: e.g. "chicken breast, cooked", "white rice, cooked", "rolled oats, dry", "egg, whole", "greek yogurt, nonfat, plain", "olive oil". Avoid brand names. Give grams, a household measure (e.g. "1 cup", "1 palm-size piece") and your estimate of calories, protein, carbs, fat and fiber for THAT amount.
6. The perfect day uses meals from the library (by exact name), at their usual times, with servings (usually 1; snacks can be 0.5 to 2).
7. Food-log insights: what and when they eat, portion sizes, snack/drink/weekend patterns, and a rough estimate of what they eat now (photos are rough; say so). If that estimate is far from the target (about 400+ kcal off, or protein far below), suggest easing in over 1 to 2 weeks in "easingIn"; otherwise leave it empty.
8. Call agenda: 4 to 8 specific questions or topics for Tyler's kickoff call, based on gaps or surprises in the log and answers.
9. Coach notes: anything Tyler should double-check before publishing (health answers, unclear allergies, photos you couldn't read, numbers that look off, signs of disordered eating). Never diagnose.
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

const NUTRITION_TOOL: ToolSpec = {
  name: "submit_nutrition_plan",
  description: "Submit the drafted nutrition plan for Tyler to review.",
  input_schema: {
    type: "object",
    properties: {
      welcome: { type: "string", description: "2-4 sentences to the client introducing their plan." },
      insights: {
        type: "object",
        properties: {
          summary: { type: "string" },
          usualFoods: { type: "array", items: { type: "string" } },
          mealTiming: { type: "string" },
          portions: { type: "string" },
          patterns: { type: "string" },
          estimatedCalories: { type: "number", description: "Rough current daily calories; omit if there's no log." },
          estimatedProtein: { type: "number" },
          intakeNote: { type: "string" },
          easingIn: { type: "string" },
        },
        required: ["summary", "usualFoods", "mealTiming", "portions", "patterns", "intakeNote", "easingIn"],
      },
      callAgenda: { type: "array", items: { type: "string" } },
      coachNotes: { type: "array", items: { type: "string" } },
      meals: {
        type: "array",
        items: {
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
          required: ["category", "name", "time", "ingredients", "instructions", "why"],
        },
      },
      perfectDay: {
        type: "object",
        properties: {
          note: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { time: { type: "string" }, mealName: { type: "string" }, servings: { type: "number" } },
              required: ["time", "mealName", "servings"],
            },
          },
        },
        required: ["note", "items"],
      },
    },
    required: ["welcome", "insights", "callAgenda", "coachNotes", "meals", "perfectDay"],
  },
};

const TRAINING_TOOL: ToolSpec = {
  name: "submit_training_program",
  description: "Submit the drafted training program for Tyler to review.",
  input_schema: {
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
    `Here is the current ${kind} as JSON. Return the COMPLETE updated ${kind} through the tool. Keep everything that the changes below don't touch exactly as it is.`,
    JSON.stringify(current),
    callNotes ? `TYLER'S KICKOFF CALL NOTES (these override the earlier answers where they differ):\n${callNotes}` : "",
    instruction ? `TYLER'S REQUESTED CHANGES:\n${instruction}` : "Update it to reflect the call notes.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ───────── Running a draft ─────────

async function draftNutrition(ctx: ClientContext, t: Targets, revise: { current: Nutrition; instruction: string; callNotes: string } | null) {
  const content: ContentBlock[] = [
    { type: "text", text: `CLIENT PROFILE\n${profileText(ctx)}` },
    { type: "text", text: targetsText(t) },
  ];
  if (revise) {
    content.push({ type: "text", text: revisionText("nutrition plan", nutritionForAi(revise.current), revise.instruction, revise.callNotes) });
  } else {
    content.push(...(await foodLogBlocks(ctx)));
    if (ctx.client.kickoff_at) content.push({ type: "text", text: `Kickoff call: ${formatCallTime(ctx.client.kickoff_at, ctx.client.timezone)}.` });
    content.push({ type: "text", text: "Draft the nutrition plan now." });
  }
  const res = await askForJson({ system: NUTRITION_SYSTEM, content, tool: NUTRITION_TOOL, maxTokens: 20000 });
  const n = cleanNutrition(res.input);
  if (n.meals.length === 0) throw new Error("The AI's nutrition plan came back empty. Try again.");
  const { meals } = await applyUsda(n.meals);
  return { value: { ...n, meals }, usage: res.usage, model: res.model };
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
  const res = await askForJson({ system: TRAINING_SYSTEM, content, tool: TRAINING_TOOL, maxTokens: 8000 });
  let training = cleanTraining(res.input);
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
        tool: TRAINING_TOOL,
        maxTokens: 8000,
      });
      const fixed = cleanTraining(fix.input);
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
 * Gets a plan ready to draft (creating it with calculator targets if needed) and marks it "drafting".
 * The slow AI work then runs in `runDraft`, usually after the response has been sent.
 */
export async function startDraft(client: ClientRow, opts: { allowHealthFlag?: boolean } = {}): Promise<StartResult> {
  if (!aiConfigured()) return { ok: false, error: "The Claude API key isn't set up yet. Add ANTHROPIC_API_KEY in Vercel (see Settings)." };
  if (client.health_flag && !opts.allowHealthFlag) {
    return { ok: false, error: "They answered YES on the health questions. Review that first, then confirm to draft anyway." };
  }
  let plan = await getOpenPlan(client.id);
  if (!plan) {
    const ctx = await loadContext(client);
    plan = await insertPlan({ client_id: client.id, status: "draft", targets: defaultTargets(ctx), content: {} as never });
  } else if (!hasTargets(plan)) {
    const ctx = await loadContext(client);
    plan = await updatePlan(plan.id, { targets: defaultTargets(ctx) });
  }
  const claimed = await claimForDrafting(plan.id);
  if (!claimed) return { ok: false, error: "A draft is already being written. Give it a minute." };
  return { ok: true, planId: plan.id };
}

/**
 * Writes (or revises) the plan. `part` limits a revision to nutrition or training.
 * Never throws: failures are saved on the plan so the coach sees them.
 */
export async function runDraft(
  planId: string,
  opts: {
    part?: DraftPart;
    instruction?: string;
    /** Draft `part` from scratch instead of revising it. */
    fresh?: boolean;
    notifyCoach?: (client: ClientRow, plan: PlanRow) => Promise<void>;
  } = {},
): Promise<void> {
  const before = await getPlan(planId);
  if (!before || !hasTargets(before)) return;
  const client = await getClient(before.client_id);
  if (!client) return;
  const part = opts.part ?? "both";
  const instruction = (opts.instruction ?? "").trim();
  const callNotes = (before.call_notes ?? "").trim();
  const existing = hasContent(before) ? before.content : null;
  const revising = !!existing && !opts.fresh && (instruction !== "" || callNotes !== "") && opts.part !== undefined;

  try {
    const ctx = await loadContext(client);
    const doNutrition = part !== "training" || !existing;
    const doTraining = part !== "nutrition" || !existing;
    const [n, t] = await Promise.all([
      doNutrition ? draftNutrition(ctx, before.targets, revising && existing ? { current: existing, instruction, callNotes } : null) : null,
      doTraining ? draftTraining(ctx, before.targets, revising && existing ? { current: existing.training, instruction, callNotes } : null) : null,
    ]);
    const nutrition: Nutrition = n ? n.value : (existing as Nutrition);
    const training = t ? t.value : existing!.training;
    const content: PlanContent = { ...nutrition, coachNotes: withTrainingNotes(nutrition.coachNotes, training, ctx.answers), training };
    const usage = addUsage(before.usage, [n?.usage, ...(t?.usage ?? [])].filter((u): u is AiUsage => !!u));
    const saved = await updatePlan(planId, { status: "draft", content, error: null, ai_model: n?.model ?? t?.model ?? before.ai_model, usage });
    await addEvent(client.id, revising ? "plan_revised" : "plan_drafted", { part: existing ? part : "both" });
    if (!revising && opts.notifyCoach) await opts.notifyCoach(client, saved).catch((e) => console.error("Plan email failed", e));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    console.error("Plan draft failed", err);
    await updatePlan(planId, { status: existing ? "draft" : "failed", error: message }).catch(() => undefined);
    await addEvent(client.id, "plan_draft_failed", { reason: message.slice(0, 200) }).catch(() => undefined);
  }
}

export function planTitle(client: ClientRow): string {
  return `${firstName(client.full_name)}'s plan`;
}

export { targetLine };
