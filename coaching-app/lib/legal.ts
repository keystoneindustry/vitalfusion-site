/**
 * Standalone agreements (coach → Legal): Tyler emails a signing link to someone who is NOT an app client (he coaches them
 * in another app). They sign on a public page keyed by an unguessable token; the signed PDF is stored and emailed to both.
 * Table `legal_requests`; PDFs in the private `agreements` bucket under `legal/`.
 */
import { randomBytes } from "node:crypto";
import { db, q } from "./supabase";
import type { Contact, PackageTerms } from "./agreement";

export type LegalRequest = {
  id: string;
  token: string;
  full_name: string;
  email: string;
  phone: string | null;
  billing: "package" | "monthly";
  coaching_weeks: number | null;
  start_date: string;
  end_date: string | null;
  include_parq: boolean;
  status: "sent" | "signed";
  last_sent_at: string;
  opened_at: string | null;
  version: string | null;
  contact: Contact | null;
  parq: boolean[] | null;
  parq_any_yes: boolean | null;
  parq_explanation: string | null;
  signed_name: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  pdf_path: string | null;
  created_at: string;
};

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isToken(s: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(s);
}

export function packageOf(r: Pick<LegalRequest, "billing" | "coaching_weeks" | "start_date" | "end_date">): PackageTerms {
  return { billing: r.billing, coachingWeeks: r.coaching_weeks, startDate: r.start_date, endDate: r.end_date };
}

export async function listLegalRequests(): Promise<LegalRequest[]> {
  return db<LegalRequest[]>("legal_requests?select=*&order=created_at.desc&limit=200");
}

export async function getLegalRequest(id: string): Promise<LegalRequest | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<LegalRequest[]>(`legal_requests?select=*&id=eq.${q(id)}&limit=1`);
  return rows[0] ?? null;
}

export async function getLegalByToken(token: string): Promise<LegalRequest | null> {
  if (!isToken(token)) return null;
  const rows = await db<LegalRequest[]>(`legal_requests?select=*&token=eq.${q(token)}&limit=1`);
  return rows[0] ?? null;
}

export async function insertLegalRequest(r: {
  full_name: string;
  email: string;
  phone: string | null;
  billing: "package" | "monthly";
  coaching_weeks: number | null;
  start_date: string;
  end_date: string | null;
  include_parq: boolean;
}): Promise<LegalRequest> {
  const rows = await db<LegalRequest[]>("legal_requests", { method: "POST", prefer: "return=representation", body: { ...r, token: newToken() } });
  return rows[0];
}

export async function updateLegalRequest(id: string, patch: Partial<LegalRequest>): Promise<void> {
  await db(`legal_requests?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: patch });
}

/** Marks it signed only if it wasn't already (so a double tap can't sign twice). Returns false if someone got there first. */
export async function markSigned(id: string, patch: Partial<LegalRequest>): Promise<boolean> {
  const rows = await db<{ id: string }[]>(`legal_requests?id=eq.${q(id)}&status=eq.sent&select=id`, {
    method: "PATCH",
    prefer: "return=representation",
    body: { ...patch, status: "signed" },
  });
  return rows.length > 0;
}

export async function deleteLegalRequest(id: string): Promise<void> {
  await db(`legal_requests?id=eq.${q(id)}`, { method: "DELETE", prefer: "return=minimal" });
}
