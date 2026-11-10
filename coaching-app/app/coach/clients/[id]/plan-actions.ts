"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient, updateClient, type ClientRow } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { appOrigin } from "@/lib/origin";
import { planPublishedClientEmail, sendEmail } from "@/lib/email";
import { fillMissing } from "@/lib/food-data";
import { getResponse } from "@/lib/onboarding-data";
import { withTrainingNotes } from "@/lib/training-brief";
import { applyDefaultSchedule } from "@/lib/progress";
import { defaultTargets, loadContext, runDraft, startDraft } from "@/lib/plan-draft";
import { computeTargets, isActivity, isPace, type Targets } from "@/lib/targets";
import { partState, sanitizeEditedMeals, sanitizeEditedTraining, sanitizePerfectDay, type PlanMeal, type PlanPart } from "@/lib/plan";
import {
  claimForDrafting,
  getOpenPlan,
  getPublishedPlan,
  hasContent,
  isDrafting,
  publishPart,
  updatePlan,
  workingPlan,
  type ReadyPlan,
} from "@/lib/plans";

const TAB: Record<PlanPart, string> = { nutrition: "meals", training: "training" };

function back(clientId: string, part: PlanPart, params: Record<string, string> = {}, hash = ""): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/coach/clients/${clientId}/${TAB[part]}${qs ? `?${qs}` : ""}${hash}`);
}

async function loadClient(clientId: string): Promise<ClientRow> {
  await requireCoach(`/coach/clients/${clientId}`);
  const client = await getClient(clientId);
  if (!client) redirect("/coach");
  return client;
}

/** The coach's working copy (created if needed). */
async function work(client: ClientRow): Promise<ReadyPlan> {
  return workingPlan(client, () => loadContext(client).then(defaultTargets));
}

function str(form: FormData, key: string, max = 4000): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function asPart(v: string): PlanPart {
  return v === "training" ? "training" : "nutrition";
}

// ───────── The AI ─────────

/** Drafts the meals or the workouts from scratch (replacing that part only). */
export async function draftPartAction(clientId: string, partRaw: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const part = asPart(partRaw);
  const allowHealth = form.get("health") === "yes";
  const res = await startDraft(client, part, { allowHealthFlag: allowHealth });
  if (!res.ok) back(client.id, part, { error: res.error });
  if (client.health_flag && allowHealth) await addEvent(client.id, "health_override", { part });
  after(() => runDraft(res.planId, { part, fresh: true }));
  back(client.id, part, { msg: "drafting" });
}

/** Updates the meals or the workouts with the coach's call notes and/or instructions. */
export async function reviseAction(clientId: string, partRaw: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const part = asPart(partRaw);
  const instruction = str(form, "instruction", 3000);
  const callNotes = str(form, "callNotes", 6000);
  if (!instruction && !callNotes) back(client.id, part, { error: "Write your call notes or what to change first." }, "#ai");
  const plan = await work(client);
  const has = part === "nutrition" ? plan.content.meals.length > 0 : plan.content.training.days.length > 0;
  if (!has) back(client.id, part, { error: `There's nothing to update yet. Draft the ${part === "nutrition" ? "meals" : "workouts"} first.` });
  await updatePlan(plan.id, { call_notes: callNotes || null });
  if (!(await claimForDrafting(plan.id, part))) back(client.id, part, { error: "The AI is already working on this plan. Give it a minute." });
  after(() => runDraft(plan.id, { part, instruction }));
  back(client.id, part, { msg: "revising" });
}

export async function saveCallNotesAction(clientId: string, partRaw: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await work(client);
  await updatePlan(plan.id, { call_notes: str(form, "callNotes", 6000) || null });
  back(client.id, asPart(partRaw), { msg: "notes" }, "#ai");
}

// ───────── Targets ─────────

export async function targetsAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await work(client);
  let targets: Targets;
  if (form.get("mode") === "manual") {
    const num = (k: string) => Math.round(Number(form.get(k)));
    const t = { calories: num("calories"), protein: num("protein"), carbs: num("carbs"), fat: num("fat"), fiber: num("fiber"), waterOz: num("waterOz") };
    if (Object.values(t).some((v) => !Number.isFinite(v) || v < 0) || t.calories < 800 || t.calories > 6000) {
      back(client.id, "nutrition", { error: "Check the numbers: calories must be between 800 and 6,000." }, "#targets");
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
  back(client.id, "nutrition", { msg: "targets" }, "#targets");
}

export async function resetTargetsAction(clientId: string): Promise<void> {
  const client = await loadClient(clientId);
  const plan = await work(client);
  await updatePlan(plan.id, { targets: defaultTargets(await loadContext(client)) });
  back(client.id, "nutrition", { msg: "targets" }, "#targets");
}

// ───────── Builders ─────────

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
  const plan = await work(client);
  if (isDrafting(plan, "training")) return { ok: false, error: "The AI is working on the workouts right now. Wait for it to finish, then edit." };
  const checked = sanitizeEditedTraining(parseJson(payload));
  if (!checked.ok) return checked;
  const answers = (await getResponse(client.id))?.answers ?? {};
  await updatePlan(plan.id, {
    content: { ...plan.content, training: checked.training, coachNotes: withTrainingNotes(plan.content.coachNotes, checked.training, answers) },
  });
  return { ok: true, message: "Workouts saved ✓" };
}

/** Saves the meal library, perfect day and client messages from the meal builder. */
export async function saveNutritionAction(clientId: string, payload: string): Promise<SaveResult> {
  const client = await loadClient(clientId);
  const plan = await work(client);
  if (isDrafting(plan, "nutrition")) return { ok: false, error: "The AI is working on the meals right now. Wait for it to finish, then edit." };
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
    meals,
    message: missing.length
      ? `Saved, but there's no nutrition data for: ${missing.join(", ")}. Try a more common name (e.g. “chicken breast, cooked”).`
      : "Meals saved ✓",
  };
}

// ───────── Publishing ─────────

export async function publishPartAction(clientId: string, partRaw: string): Promise<void> {
  const client = await loadClient(clientId);
  const part = asPart(partRaw);
  const open = await getOpenPlan(client.id);
  if (!hasContent(open)) back(client.id, part, { error: "There's nothing to publish yet." });
  if (isDrafting(open, part)) back(client.id, part, { error: "Wait for the AI to finish first." });
  if (part === "nutrition" && open.content.meals.length === 0) back(client.id, part, { error: "Add at least one meal before publishing." });
  if (part === "training" && open.content.training.days.length === 0) back(client.id, part, { error: "Add at least one training day before publishing." });

  const { firstTime } = await publishPart(open, part);
  if (client.stage === "onboarding" || client.stage === "invited") {
    await updateClient(client.id, { stage: "active" });
    await addEvent(client.id, "stage_changed", { from: client.stage === "invited" ? "Invited" : "Onboarding", to: "Active" });
  }
  await addEvent(client.id, "plan_published", { part, update: !firstTime });
  // The first time a plan goes live, the client gets their starting setup (step goal, weigh-ins, photos).
  await applyDefaultSchedule(client).catch((err) => console.error("Default schedule failed", err));
  if (firstTime) {
    try {
      const msg = planPublishedClientEmail(firstName(client.full_name), part, `${await appOrigin()}/${part === "nutrition" ? "nutrition" : "train"}`);
      await sendEmail({ to: client.email, ...msg });
    } catch (err) {
      console.error("Plan email failed", err);
      await addEvent(client.id, "email_failed", { what: `${part} published email` }).catch(() => undefined);
    }
  }
  back(client.id, part, { msg: firstTime ? "published" : "updated" });
}

/** Throws away unpublished changes to one part (back to what the client sees). */
export async function revertPartAction(clientId: string, partRaw: string): Promise<void> {
  const client = await loadClient(clientId);
  const part = asPart(partRaw);
  const [open, pub] = await Promise.all([getOpenPlan(client.id), getPublishedPlan(client.id)]);
  if (!hasContent(open) || !hasContent(pub) || isDrafting(open, part)) back(client.id, part);
  if (partState(open, pub, part) !== "changed") back(client.id, part);
  if (part === "nutrition") {
    const trainingNotes = open.content.coachNotes.filter((n) => n.startsWith("Training: "));
    await updatePlan(open.id, {
      targets: pub.targets,
      content: {
        ...pub.content,
        coachNotes: [...pub.content.coachNotes.filter((n) => !n.startsWith("Training: ")), ...trainingNotes],
        training: open.content.training,
      },
    });
  } else {
    await updatePlan(open.id, { content: { ...open.content, training: pub.content.training } });
  }
  back(client.id, part, { msg: "reverted" });
}
