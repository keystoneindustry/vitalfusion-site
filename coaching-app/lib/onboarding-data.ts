import { db, q } from "./supabase";
import { addEvent, updateClient, type ClientRow } from "./clients";
import { nextStep, ONBOARDING_STEPS, stepIndex, type StepId } from "./onboarding";
import type { Answers } from "./onboarding-questions";

export type OnboardingResponse = {
  client_id: string;
  answers: Answers;
  current_question: number;
  submitted_at: string | null;
  updated_at: string;
};

export type AgreementRow = {
  id: string;
  client_id: string;
  version: string;
  coaching_weeks: number | null;
  start_date: string | null;
  end_date: string | null;
  contact: Record<string, string>;
  parq: boolean[];
  parq_any_yes: boolean;
  parq_explanation: string | null;
  signed_name: string;
  signed_at: string;
  signer_ip: string | null;
  signer_user_agent: string | null;
  pdf_path: string | null;
  created_at: string;
};

export async function getResponse(clientId: string): Promise<OnboardingResponse | null> {
  const rows = await db<OnboardingResponse[]>(`onboarding_responses?select=*&client_id=eq.${q(clientId)}`);
  return rows[0] ?? null;
}

export async function saveResponse(
  clientId: string,
  patch: { answers?: Answers; current_question?: number; submitted_at?: string | null },
): Promise<void> {
  await db("onboarding_responses?on_conflict=client_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { client_id: clientId, ...patch },
  });
}

export async function latestAgreement(clientId: string): Promise<AgreementRow | null> {
  const rows = await db<AgreementRow[]>(`agreements?select=*&client_id=eq.${q(clientId)}&order=signed_at.desc&limit=1`);
  return rows[0] ?? null;
}

export async function insertAgreement(row: Omit<AgreementRow, "id" | "created_at" | "pdf_path">): Promise<AgreementRow> {
  const rows = await db<AgreementRow[]>("agreements", { method: "POST", prefer: "return=representation", body: row });
  return rows[0];
}

export async function setAgreementPdf(id: string, path: string): Promise<void> {
  await db(`agreements?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: { pdf_path: path } });
}

/**
 * Moves the client past `from` if that's where they are. Returns the new step.
 * Calling it twice (e.g. a double tap) does nothing the second time.
 */
export async function completeStep(client: ClientRow, from: StepId, extra: Partial<ClientRow> = {}): Promise<StepId> {
  const current = (client.onboarding_step || "welcome") as StepId;
  if (stepIndex(current) !== stepIndex(from) || from === "done") {
    if (Object.keys(extra).length) await updateClient(client.id, extra);
    return current;
  }
  const next = nextStep(from);
  const patch: Partial<ClientRow> = { ...extra, onboarding_step: next };
  if (next === "done") patch.onboarding_completed_at = new Date().toISOString();
  await updateClient(client.id, patch);
  const label = ONBOARDING_STEPS.find((s) => s.id === from)?.label ?? from;
  await addEvent(client.id, "onboarding_step", { step: from, label });
  return next;
}
