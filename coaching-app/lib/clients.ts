import { db, q } from "./supabase";
import type { ClientInput, Stage } from "./client-input";
import { formatDate, isIsoDate } from "./dates";

export type ClientRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  stage: Stage;
  coaching_weeks: number | null;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  notes: string | null;
  invited_at: string | null;
  first_signed_in_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  onboarding_step: string;
  onboarding_completed_at: string | null;
  kickoff_at: string | null;
  kickoff_booking_uid: string | null;
  health_flag: boolean;
  health_note: string | null;
};

export type ClientEvent = {
  id: number;
  client_id: string;
  kind: string;
  detail: Record<string, unknown>;
  created_at: string;
};

export async function listClients(): Promise<ClientRow[]> {
  return db<ClientRow[]>("clients?select=*&order=created_at.desc");
}

export async function getClient(id: string): Promise<ClientRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<ClientRow[]>(`clients?select=*&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function getClientByEmail(email: string): Promise<ClientRow | null> {
  const rows = await db<ClientRow[]>(`clients?select=*&email=eq.${q(email.trim().toLowerCase())}`);
  return rows[0] ?? null;
}

export async function getClientByUserId(userId: string): Promise<ClientRow | null> {
  const rows = await db<ClientRow[]>(`clients?select=*&user_id=eq.${q(userId)}`);
  return rows[0] ?? null;
}

export async function createClient(input: ClientInput): Promise<ClientRow> {
  const rows = await db<ClientRow[]>("clients", {
    method: "POST",
    prefer: "return=representation",
    body: {
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      coaching_weeks: input.coachingWeeks,
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes,
      stage: "invited",
    },
  });
  return rows[0];
}

export async function updateClient(id: string, patch: Partial<Omit<ClientRow, "id" | "created_at">>): Promise<ClientRow> {
  const rows = await db<ClientRow[]>(`clients?id=eq.${q(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: patch,
  });
  return rows[0];
}

export async function addEvent(clientId: string, kind: string, detail: Record<string, unknown> = {}): Promise<void> {
  await db("client_events", { method: "POST", prefer: "return=minimal", body: { client_id: clientId, kind, detail } });
}

export async function listEvents(clientId: string, limit = 50): Promise<ClientEvent[]> {
  return db<ClientEvent[]>(`client_events?select=*&client_id=eq.${q(clientId)}&order=created_at.desc&limit=${limit}`);
}

/** Plain-English line for the CRM timeline. */
export function describeEvent(e: ClientEvent): string {
  const d = e.detail || {};
  switch (e.kind) {
    case "created":
      return "Added to the CRM";
    case "invite_sent":
      return "Invite email sent";
    case "invite_failed":
      return `Invite email failed${typeof d.reason === "string" ? `: ${d.reason}` : ""}`;
    case "signin_link_sent":
      return "Asked for a sign-in link";
    case "first_sign_in":
      return "Signed in for the first time";
    case "stage_changed":
      return `Stage changed from ${String(d.from ?? "?")} to ${String(d.to ?? "?")}`;
    case "package_changed":
      return `Package changed to ${String(d.weeks ?? "?")} weeks, ${String(d.start ?? "?")} to ${String(d.end ?? "?")}`;
    case "details_updated":
      return "Details updated";
    case "onboarding_step":
      return `Onboarding: finished “${String(d.label ?? d.step ?? "a step")}”`;
    case "agreement_signed":
      return d.parqYes ? "Signed the coaching agreement (answered YES on the health questions)" : "Signed the coaching agreement";
    case "questions_submitted":
      return "Submitted their onboarding questions";
    case "kickoff_booked":
      return `Booked their kickoff call${typeof d.when === "string" ? ` for ${d.when}` : ""}`;
    case "kickoff_self_reported":
      return "Said they booked their kickoff call";
    case "kickoff_cancelled":
      return "Cancelled their kickoff call";
    case "checkin_call_booked":
      return `Booked a check-in call${typeof d.when === "string" ? ` for ${d.when}` : ""}`;
    case "checkin_call_cancelled":
      return "Cancelled a check-in call";
    case "first_meal_logged":
      return "Logged their first meal";
    case "plan_drafted":
      return "The AI drafted their plan";
    case "plan_revised":
      return `The AI updated their plan draft${d.part && d.part !== "both" ? ` (${String(d.part)})` : ""}`;
    case "plan_draft_failed":
      return `Plan draft didn't finish${typeof d.reason === "string" ? `: ${d.reason}` : ""}`;
    case "plan_published":
      return d.update ? "Published changes to their plan" : "Their plan was published";
    case "health_override":
      return "Health answers reviewed; plan drafted anyway";
    case "schedule_added":
      return `Added to their calendar: ${Array.isArray(d.added) ? (d.added as string[]).join(", ") : "schedule"}`;
    case "habit_assigned":
      return `New habit: ${String(d.habit ?? "")}`;
    case "habit_removed":
      return `Habit removed: ${String(d.habit ?? "")}`;
    case "photos_uploaded":
      return "Uploaded progress photos";
    case "checkin_submitted":
      return typeof d.date === "string" && isIsoDate(d.date) ? `Sent their check-in for ${formatDate(d.date, false)}` : "Sent their check-in";
    case "form_submitted":
      return `Filled in “${String(d.form ?? "a form")}”`;
    case "checkin_replied":
      return "You replied to their check-in";
    case "email_failed":
      return `An email didn't send${typeof d.what === "string" ? ` (${d.what})` : ""}`;
    default:
      return e.kind.replace(/_/g, " ");
  }
}
