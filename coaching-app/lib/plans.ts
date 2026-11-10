/** Plans in the database. A client has at most one open plan (drafting / draft / failed) and any number of old ones. */

import { db, q } from "./supabase";
import type { PlanContent } from "./plan";
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
export async function planSummaries(): Promise<Pick<PlanRow, "client_id" | "status" | "updated_at" | "published_at">[]> {
  return db(`plans?select=client_id,status,updated_at,published_at&status=in.(drafting,draft,failed,published)`);
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
 * Marks a plan as "drafting" only if nobody else is drafting it right now. Returns false when a
 * draft is already running (e.g. a double tap), so two AI runs never overwrite each other.
 */
export async function claimForDrafting(id: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const rows = await db<PlanRow[]>(
    `plans?id=eq.${q(id)}&or=(status.neq.drafting,updated_at.lt.${q(cutoff)})`,
    { method: "PATCH", prefer: "return=representation", body: { status: "drafting", error: null } },
  );
  return rows.length > 0;
}

/** Publishes `id`: older published plans for the client are archived. */
export async function publishPlan(id: string, clientId: string): Promise<void> {
  await db(`plans?client_id=eq.${q(clientId)}&status=eq.published`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { status: "archived" },
  });
  await updatePlan(id, { status: "published", published_at: new Date().toISOString(), error: null });
}
