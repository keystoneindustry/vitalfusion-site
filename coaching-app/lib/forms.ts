/**
 * Forms the coach builds (the weekly check-in is one) and the client's submissions.
 * Pure helpers first (tested), then the database functions.
 */

import { db, q } from "./supabase";

export * from "./form-schema";
import type { Form, FormQuestion, Submission } from "./form-schema";

// ───────── Database ─────────

export async function listForms(includeArchived = false): Promise<Form[]> {
  return db<Form[]>(`forms?select=*${includeArchived ? "" : "&archived=eq.false"}&order=created_at.asc`);
}

export async function getForm(id: string): Promise<Form | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<Form[]>(`forms?select=*&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function checkinForm(): Promise<Form | null> {
  const rows = await db<Form[]>(`forms?select=*&kind=eq.checkin&limit=1`);
  return rows[0] ?? null;
}

export async function insertForm(row: Pick<Form, "title" | "intro" | "questions">): Promise<Form> {
  const rows = await db<Form[]>("forms", { method: "POST", prefer: "return=representation", body: { ...row, kind: "custom" } });
  return rows[0];
}

export async function updateForm(id: string, patch: Partial<Pick<Form, "title" | "intro" | "questions" | "archived">>): Promise<void> {
  await db(`forms?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: patch });
}

export async function listSubmissions(clientId: string, limit = 50): Promise<Submission[]> {
  return db<Submission[]>(`form_submissions?select=*&client_id=eq.${q(clientId)}&order=submitted_at.desc&limit=${limit}`);
}

export async function getSubmission(id: string): Promise<Submission | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<Submission[]>(`form_submissions?select=*&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function findSubmission(clientId: string, formId: string, dueDate: string): Promise<Submission | null> {
  const rows = await db<Submission[]>(`form_submissions?select=*&client_id=eq.${q(clientId)}&form_id=eq.${q(formId)}&due_date=eq.${dueDate}`);
  return rows[0] ?? null;
}

export async function insertSubmission(row: Pick<Submission, "client_id" | "form_id" | "due_date" | "answers" | "questions" | "ai_status">): Promise<Submission> {
  const rows = await db<Submission[]>("form_submissions?on_conflict=client_id,form_id,due_date", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: { ...row, submitted_at: new Date().toISOString() },
  });
  return rows[0];
}

export async function updateSubmission(id: string, patch: Partial<Submission>): Promise<void> {
  await db(`form_submissions?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: patch });
}

/** Submissions across all clients that still need a reply (for the coach dashboard). */
export async function awaitingReply(): Promise<Pick<Submission, "id" | "client_id" | "due_date" | "submitted_at">[]> {
  return db(`form_submissions?select=id,client_id,due_date,submitted_at&replied_at=is.null&order=submitted_at.asc`);
}
