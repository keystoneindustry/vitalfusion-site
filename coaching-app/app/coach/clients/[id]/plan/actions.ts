"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient, updateClient, type ClientRow } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { appOrigin } from "@/lib/origin";
import { planPublishedClientEmail, sendEmail } from "@/lib/email";
import { lookupFood } from "@/lib/food-data";
import { defaultTargets, loadContext, runDraft, startDraft, type DraftPart } from "@/lib/plan-draft";
import { computeTargets, isActivity, isPace, type Targets } from "@/lib/targets";
import {
  parseExerciseLines,
  parseIngredientLines,
  type Ingredient,
  type PerfectDayItem,
  type PlanContent,
} from "@/lib/plan";
import {
  claimForDrafting,
  getOpenPlan,
  getPublishedPlan,
  hasContent,
  insertPlan,
  publishPlan,
  updatePlan,
  type PlanRow,
  type ReadyPlan,
} from "@/lib/plans";

function back(clientId: string, params: Record<string, string> = {}, hash = ""): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/coach/clients/${clientId}/plan${qs ? `?${qs}` : ""}${hash}`);
}

async function loadClient(clientId: string): Promise<ClientRow> {
  await requireCoach(`/coach/clients/${clientId}/plan`);
  const client = await getClient(clientId);
  if (!client) redirect("/coach");
  return client;
}

/** The plan to edit: the open draft, or a fresh copy of the published plan. */
async function editable(client: ClientRow): Promise<ReadyPlan | null> {
  const open = await getOpenPlan(client.id);
  if (open) {
    if (open.status === "drafting") return null;
    return hasContent(open) ? open : null;
  }
  const pub = await getPublishedPlan(client.id);
  if (!hasContent(pub)) return null;
  const copy = await insertPlan({
    client_id: client.id,
    status: "draft",
    targets: pub.targets,
    content: pub.content,
    call_notes: pub.call_notes,
    ai_model: pub.ai_model,
    usage: pub.usage,
  });
  return copy as ReadyPlan;
}

function str(form: FormData, key: string, max = 4000): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

// ───────── Drafting with the AI ─────────

export async function draftPlanAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const allowHealth = form.get("health") === "yes";
  if (client.health_flag && allowHealth) await addEvent(client.id, "health_override");
  const res = await startDraft(client, { allowHealthFlag: allowHealth });
  if (!res.ok) back(client.id, { error: res.error });
  after(() => runDraft(res.planId));
  back(client.id, { msg: "drafting" });
}

export async function reviseAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id, { error: "There's no finished draft to update yet." });
  const instruction = str(form, "instruction", 3000);
  const callNotes = str(form, "callNotes", 6000);
  const partRaw = str(form, "part");
  const part: DraftPart = partRaw === "nutrition" || partRaw === "training" ? partRaw : "both";
  if (!instruction && !callNotes) back(client.id, { error: "Write your call notes or what to change first." });
  await updatePlan(plan.id, { call_notes: callNotes || null });
  if (!(await claimForDrafting(plan.id))) back(client.id, { error: "An update is already running. Give it a minute." });
  after(() => runDraft(plan.id, { part, instruction }));
  back(client.id, { msg: "revising" });
}

export async function saveCallNotesAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id, { error: "There's no draft to save notes on yet." });
  await updatePlan(plan.id, { call_notes: str(form, "callNotes", 6000) || null });
  back(client.id, { msg: "saved" }, "#call");
}

// ───────── Coach edits ─────────

export async function targetsAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id, { error: "There's no draft to edit." });
  let targets: Targets;
  if (form.get("mode") === "manual") {
    const num = (k: string) => Math.round(Number(form.get(k)));
    const t = { calories: num("calories"), protein: num("protein"), carbs: num("carbs"), fat: num("fat"), fiber: num("fiber"), waterOz: num("waterOz") };
    if (Object.values(t).some((v) => !Number.isFinite(v) || v < 0) || t.calories < 800 || t.calories > 6000) {
      back(client.id, { error: "Check the numbers: calories must be between 800 and 6,000." }, "#targets");
    }
    targets = { ...plan.targets, ...t, manual: true, notes: [] };
  } else {
    const inputs = { ...plan.targets.inputs };
    const activity = str(form, "activity");
    const pace = str(form, "pace");
    const goal = str(form, "goal");
    if (isActivity(activity)) inputs.activity = activity;
    if (goal === "lose" || goal === "muscle" || goal === "maintain") inputs.goal = goal;
    inputs.pace = inputs.goal === "lose" ? (isPace(pace) ? pace : "balanced") : "";
    const w = Number(form.get("weightLb"));
    if (Number.isFinite(w) && w >= 70 && w <= 700) inputs.weightLb = w;
    const gw = Number(form.get("goalWeightLb"));
    if (Number.isFinite(gw) && gw >= 70 && gw <= 700) inputs.goalWeightLb = gw;
    targets = computeTargets(inputs);
  }
  await updatePlan(plan.id, { targets });
  back(client.id, { msg: "targets" }, "#targets");
}

export async function resetTargetsAction(clientId: string): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id);
  await updatePlan(plan.id, { targets: defaultTargets(await loadContext(client)) });
  back(client.id, { msg: "targets" }, "#targets");
}

async function saveContent(plan: PlanRow, content: PlanContent): Promise<void> {
  await updatePlan(plan.id, { content });
}

export async function editMealAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id);
  const mealId = str(form, "mealId");
  const meal = plan.content.meals.find((m) => m.id === mealId);
  if (!meal) back(client.id, { error: "That meal is gone. Refresh the page." });
  const parsed = parseIngredientLines(str(form, "ingredients", 4000));
  if (!parsed.ok) back(client.id, { error: parsed.error }, `#${mealId}`);
  const known = new Map(plan.content.meals.flatMap((m) => m.ingredients).map((i) => [i.food.toLowerCase(), i]));
  const ingredients: Ingredient[] = [];
  for (const item of parsed.items) {
    const prev = known.get(item.food.toLowerCase());
    if (prev) {
      ingredients.push({ ...prev, grams: item.grams, household: item.household });
      continue;
    }
    const hit = await lookupFood(item.food).catch(() => null);
    ingredients.push(
      hit?.per100
        ? { food: item.food, grams: item.grams, household: item.household, per100: hit.per100, source: "usda", usdaName: hit.description ?? undefined }
        : { food: item.food, grams: item.grams, household: item.household, per100: null, source: "none" },
    );
  }
  const prep = Number(form.get("prepMinutes"));
  const updated = {
    ...meal,
    name: str(form, "name", 120) || meal.name,
    time: str(form, "time", 40),
    prepMinutes: Number.isFinite(prep) && prep > 0 ? Math.round(prep) : null,
    instructions: str(form, "instructions", 1500),
    why: str(form, "why", 400),
    ingredients,
  };
  await saveContent(plan, { ...plan.content, meals: plan.content.meals.map((m) => (m.id === mealId ? updated : m)) });
  back(client.id, { msg: "saved" }, `#${mealId}`);
}

export async function deleteMealAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id);
  const mealId = str(form, "mealId");
  await saveContent(plan, {
    ...plan.content,
    meals: plan.content.meals.filter((m) => m.id !== mealId),
    perfectDay: { ...plan.content.perfectDay, items: plan.content.perfectDay.items.filter((i) => i.mealId !== mealId) },
  });
  back(client.id, { msg: "saved" }, "#library");
}

/** Perfect day as lines: "7:00 AM | Meal name | 1". */
export async function perfectDayAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id);
  const byName = new Map(plan.content.meals.map((m) => [m.name.toLowerCase(), m.id]));
  const items: PerfectDayItem[] = [];
  const lines = str(form, "lines", 3000)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const [time = "", name = "", servings = "1"] = line.split("|").map((p) => p.trim());
    const id = byName.get(name.toLowerCase());
    if (!id) back(client.id, { error: `Line ${i + 1}: “${name}” isn't a meal in the library. Copy its name exactly.` }, "#perfect-day");
    const sv = Number(servings);
    items.push({ time, mealId: id, servings: Number.isFinite(sv) && sv > 0 && sv <= 4 ? Math.round(sv * 4) / 4 : 1 });
  }
  await saveContent(plan, { ...plan.content, perfectDay: { note: str(form, "note", 600), items } });
  back(client.id, { msg: "saved" }, "#perfect-day");
}

export async function trainingDayAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id);
  const index = Number(form.get("index"));
  const days = [...plan.content.training.days];
  const remove = form.get("remove") === "yes";
  if (remove) {
    days.splice(index, 1);
  } else {
    const parsed = parseExerciseLines(str(form, "exercises", 5000));
    if (!parsed.ok) back(client.id, { error: parsed.error }, `#day-${index}`);
    const day = { name: str(form, "name", 60) || `Day ${index + 1}`, focus: str(form, "focus", 120), exercises: parsed.items };
    if (index >= 0 && index < days.length) days[index] = day;
    else days.push(day);
  }
  await saveContent(plan, { ...plan.content, training: { ...plan.content.training, days } });
  back(client.id, { msg: "saved" }, "#training");
}

export async function textsAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) back(client.id);
  const c = plan.content;
  await saveContent(plan, {
    ...c,
    welcome: str(form, "welcome", 800),
    insights: { ...c.insights, easingIn: str(form, "easingIn", 800) },
    training: {
      ...c.training,
      overview: str(form, "overview", 1500),
      warmup: str(form, "warmup", 800),
      progression: str(form, "progression", 1000),
      notes: str(form, "trainingNotes", 1000),
    },
  });
  back(client.id, { msg: "saved" }, "#texts");
}

// ───────── Publishing ─────────

export async function publishAction(clientId: string): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await getOpenPlan(client.id);
  if (!hasContent(plan) || plan.status !== "draft") back(client.id, { error: "There's no finished draft to publish." });
  if (plan.content.meals.length === 0 || plan.content.training.days.length === 0) {
    back(client.id, { error: "The plan needs at least one meal and one training day before it can be published." });
  }
  const firstTime = !(await getPublishedPlan(client.id));
  await publishPlan(plan.id, client.id);
  if (client.stage === "onboarding" || client.stage === "invited") {
    await updateClient(client.id, { stage: "active" });
    await addEvent(client.id, "stage_changed", { from: client.stage === "invited" ? "Invited" : "Onboarding", to: "Active" });
  }
  await addEvent(client.id, "plan_published", { update: !firstTime });
  if (firstTime) {
    try {
      const msg = planPublishedClientEmail(firstName(client.full_name), `${await appOrigin()}/`);
      await sendEmail({ to: client.email, ...msg });
    } catch (err) {
      console.error("Plan email failed", err);
      await addEvent(client.id, "email_failed", { what: "plan published email" }).catch(() => undefined);
    }
  }
  back(client.id, { msg: firstTime ? "published" : "updated" });
}

export async function discardDraftAction(clientId: string): Promise<void> {
  const client = await loadClient(clientId);
  const open = await getOpenPlan(client.id);
  const pub = await getPublishedPlan(client.id);
  if (open && pub && open.status !== "drafting") await updatePlan(open.id, { status: "archived" });
  back(client.id, { msg: "discarded" });
}

export async function makeChangesAction(clientId: string): Promise<void> {
  const client = await loadClient(clientId);
  await editable(client);
  back(client.id, { msg: "editing" });
}
