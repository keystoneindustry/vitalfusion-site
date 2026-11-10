"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient, updateClient, type ClientRow } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { appOrigin } from "@/lib/origin";
import { planPublishedClientEmail, sendEmail } from "@/lib/email";
import { fillMissing } from "@/lib/food-data";
import { aiConfigured } from "@/lib/ai";
import { getResponse } from "@/lib/onboarding-data";
import { withTrainingNotes } from "@/lib/training-brief";
import { defaultTargets, loadContext, runDraft, startDraft, type DraftPart } from "@/lib/plan-draft";
import { computeTargets, isActivity, isPace, type Targets } from "@/lib/targets";
import { emptyContent, sanitizeEditedMeals, sanitizeEditedTraining, sanitizePerfectDay, type PlanMeal } from "@/lib/plan";
import {
  claimForDrafting,
  getOpenPlan,
  getPublishedPlan,
  hasContent,
  hasTargets,
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

export type SaveResult = { ok: true; message: string; meals?: PlanMeal[] } | { ok: false; error: string };

function parseJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/** Saves the whole program from the workout builder. */
export async function saveTrainingAction(clientId: string, payload: string): Promise<SaveResult> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) return { ok: false, error: "This plan can't be edited right now (the AI may be working on it). Refresh the page." };
  const checked = sanitizeEditedTraining(parseJson(payload));
  if (!checked.ok) return checked;
  const answers = (await getResponse(client.id))?.answers ?? {};
  await updatePlan(plan.id, {
    content: {
      ...plan.content,
      training: checked.training,
      coachNotes: withTrainingNotes(plan.content.coachNotes, checked.training, answers),
    },
  });
  return { ok: true, message: "Workouts saved ✓" };
}

/** Saves the meal library, perfect day and client messages from the meal builder. */
export async function saveNutritionAction(clientId: string, payload: string): Promise<SaveResult> {
  const client = await loadClient(clientId);
  const plan = await editable(client);
  if (!plan) return { ok: false, error: "This plan can't be edited right now (the AI may be working on it). Refresh the page." };
  const raw = (parseJson(payload) ?? {}) as Record<string, unknown>;
  const checked = sanitizeEditedMeals(raw.meals);
  if (!checked.ok) return checked;
  const { meals, missing } = await fillMissing(checked.meals);
  const text = (k: string, max: number) => (typeof raw[k] === "string" ? (raw[k] as string).trim().slice(0, max) : "");
  await updatePlan(plan.id, {
    content: {
      ...plan.content,
      meals,
      perfectDay: sanitizePerfectDay(raw.perfectDay, meals),
      welcome: text("welcome", 800),
      insights: { ...plan.content.insights, easingIn: text("easingIn", 800) },
    },
  });
  return {
    ok: true,
    message: missing.length
      ? `Saved, but there's no nutrition data for: ${missing.join(", ")}. Try a more common name (e.g. “chicken breast, cooked”).`
      : "Meals saved ✓",
    meals,
  };
}

/** Starts an empty plan (calculator targets, no meals, no workouts) for the coach to build himself. */
export async function buildManuallyAction(clientId: string): Promise<void> {
  const client = await loadClient(clientId);
  const open = await getOpenPlan(client.id);
  if (!open) {
    await insertPlan({ client_id: client.id, status: "draft", targets: defaultTargets(await loadContext(client)), content: emptyContent() });
  } else if (!hasContent(open) && open.status !== "drafting") {
    await updatePlan(open.id, {
      status: "draft",
      error: null,
      content: emptyContent(),
      ...(hasTargets(open) ? {} : { targets: defaultTargets(await loadContext(client)) }),
    });
  }
  back(client.id, { msg: "manual" });
}

/** Lets the AI draft just the meals or just the workouts, replacing that part. */
export async function aiPartAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const part = str(form, "part") === "training" ? "training" : "nutrition";
  if (!aiConfigured()) back(client.id, { error: "The Claude API key isn't set up yet (see Settings)." });
  if (client.health_flag && form.get("health") !== "yes") {
    back(client.id, { error: "They answered YES on the health questions. Tick the box to confirm you've reviewed it." });
  }
  const plan = await editable(client);
  if (!plan) back(client.id, { error: "This plan can't be edited right now. Refresh the page." });
  if (!(await claimForDrafting(plan.id))) back(client.id, { error: "The AI is already working on this plan. Give it a minute." });
  after(() => runDraft(plan.id, { part, fresh: true }));
  back(client.id, { msg: "drafting" });
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
