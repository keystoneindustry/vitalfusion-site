/** Plans in the database. A client has at most one open plan (drafting / draft / failed) and any number of old ones. */

import { db, q } from "./supabase";
import { emptyContent, type PlanContent } from "./plan";
import type { Targets } from "./targets";

export type PlanStatus = "drafting" | "draft" | "failed" | "published" | "archived";

export type PlanRow = {
  id: string;
  client_id: string;
  status: PlanStatus;
  targets: Targets | Record<string, never>;
  content: PlanContent | Record<string, never>;
  call_notes: string | null;
  error: string | null;
  /** Which part the AI is working on while status is "drafting". */
  drafting_part: "nutrition" | "training" | "both" | null;
  ai_model: string | null;
  usage: { input_tokens?: number; output_tokens?: number; runs?: number } | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type ReadyPlan = PlanRow & { targets: Targets; content: PlanContent };

/** A draft that's been "drafting" this long has died (the server gives up after 5 minutes). */
export const STALE_MS = 6 * 60 * 1000;

export function isStale(p: Pick<PlanRow, "status" | "updated_at">, now = Date.now()): boolean {
  return p.status === "drafting" && now - Date.parse(p.updated_at) > STALE_MS;
}

export function hasTargets(p: PlanRow | null): p is PlanRow & { targets: Targets } {
  return !!p && typeof (p.targets as Targets).calories === "number";
}

export function hasContent(p: PlanRow | null): p is ReadyPlan {
  return hasTargets(p) && Array.isArray((p.content as PlanContent).meals) && !!(p.content as PlanContent).training;
}

export async function getPlan(id: string): Promise<PlanRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<PlanRow[]>(`plans?select=*&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function getOpenPlan(clientId: string): Promise<PlanRow | null> {
  const rows = await db<PlanRow[]>(`plans?select=*&client_id=eq.${q(clientId)}&status=in.(drafting,draft,failed)&limit=1`);
  return rows[0] ?? null;
}

export async function getPublishedPlan(clientId: string): Promise<PlanRow | null> {
  const rows = await db<PlanRow[]>(
    `plans?select=*&client_id=eq.${q(clientId)}&status=eq.published&order=published_at.desc&limit=1`,
  );
  return rows[0] ?? null;
}

/** Open plans and the latest published plan for every client (for the coach dashboard). */
export async function planSummaries(): Promise<Pick<PlanRow, "client_id" | "status" | "updated_at" | "published_at" | "error">[]> {
  return db(`plans?select=client_id,status,updated_at,published_at,error&status=in.(drafting,draft,failed,published)`);
}

export async function insertPlan(row: Partial<PlanRow> & { client_id: string }): Promise<PlanRow> {
  const rows = await db<PlanRow[]>("plans", { method: "POST", prefer: "return=representation", body: row });
  return rows[0];
}

export async function updatePlan(id: string, patch: Partial<Omit<PlanRow, "id" | "client_id" | "created_at">>): Promise<PlanRow> {
  const rows = await db<PlanRow[]>(`plans?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=representation", body: patch });
  return rows[0];
}

/**
 * Marks a plan as "drafting" `part` only if no AI run is going on it right now. Returns false when one is
 * (e.g. a double tap), so two AI runs never overwrite each other.
 */
export async function claimForDrafting(id: string, part: "nutrition" | "training" | "both"): Promise<boolean> {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const rows = await db<PlanRow[]>(`plans?id=eq.${q(id)}&or=(status.neq.drafting,updated_at.lt.${q(cutoff)})`, {
    method: "PATCH",
    prefer: "return=representation",
    body: { status: "drafting", drafting_part: part, error: null },
  });
  return rows.length > 0;
}

/** True when the AI is working on `part` (or on both) right now. */
export function isDrafting(p: PlanRow | null, part: "nutrition" | "training"): boolean {
  return !!p && p.status === "drafting" && !isStale(p) && (p.drafting_part === part || p.drafting_part === "both" || !p.drafting_part);
}

/**
 * The coach's working copy of a client's plan: the open draft, or a copy of the published plan, or a new
 * empty plan with calculator targets. Always has targets and content.
 */
export async function workingPlan(client: { id: string }, defaultTargets: () => Promise<Targets>): Promise<ReadyPlan> {
  const open = await getOpenPlan(client.id);
  if (open) {
    if (hasContent(open) && open.status !== "failed") return open;
    const patch: Partial<PlanRow> = {};
    if (!hasTargets(open)) patch.targets = await defaultTargets();
    if (!hasContent(open)) patch.content = emptyContent();
    if (open.status === "failed") patch.status = "draft";
    return (await updatePlan(open.id, patch)) as ReadyPlan;
  }
  const pub = await getPublishedPlan(client.id);
  if (hasContent(pub)) {
    return (await insertPlan({
      client_id: client.id,
      status: "draft",
      targets: pub.targets,
      content: pub.content,
      call_notes: pub.call_notes,
      ai_model: pub.ai_model,
      usage: pub.usage,
    })) as ReadyPlan;
  }
  return (await insertPlan({ client_id: client.id, status: "draft", targets: await defaultTargets(), content: emptyContent() })) as ReadyPlan;
}

/**
 * Publishes just the meals (with the targets) or just the workouts from the working copy. The client then
 * sees the new part next to whatever was already published for the other part.
 */
export async function publishPart(work: ReadyPlan, part: "nutrition" | "training"): Promise<{ firstTime: boolean }> {
  const pub = await getPublishedPlan(work.client_id);
  const base = hasContent(pub) ? pub : null;
  const baseContent = base?.content ?? emptyContent();
  const content: PlanContent =
    part === "nutrition" ? { ...work.content, training: baseContent.training } : { ...baseContent, training: work.content.training };
  const targets = part === "nutrition" || !base ? work.targets : base.targets;
  const firstTime = part === "nutrition" ? !(baseContent.meals.length > 0) : !(baseContent.training.days.length > 0);
  await db(`plans?client_id=eq.${q(work.client_id)}&status=eq.published`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { status: "archived" },
  });
  await insertPlan({
    client_id: work.client_id,
    status: "published",
    targets,
    content,
    call_notes: work.call_notes,
    ai_model: work.ai_model,
    usage: work.usage,
    published_at: new Date().toISOString(),
  });
  return { firstTime };
}
