import { endDateFromWeeks, formatDate, isIsoDate } from "./dates";

/** Stages a client moves through in the CRM. Matches the `client_stage` enum in Supabase. */
export const STAGES = [
  { value: "lead", label: "Lead" },
  { value: "invited", label: "Invited" },
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "finished", label: "Finished" },
] as const;

export type Stage = (typeof STAGES)[number]["value"];

export function isStage(value: string): value is Stage {
  return STAGES.some((s) => s.value === value);
}

export function stageLabel(value: string): string {
  return STAGES.find((s) => s.value === value)?.label ?? value;
}

/** How a client pays: a set package paid up front, or month to month until they cancel. */
export type Billing = "package" | "monthly";

export type ClientInput = {
  fullName: string;
  email: string;
  phone: string | null;
  billing: Billing;
  /** Null for monthly. */
  coachingWeeks: number | null;
  startDate: string;
  /** Null for monthly until they cancel (then their last paid day). */
  endDate: string | null;
  notes: string | null;
};

export type FieldErrors = Partial<Record<"fullName" | "email" | "phone" | "coachingWeeks" | "startDate" | "endDate", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Reads and checks the add/edit client form. End date defaults to start + weeks. */
export function parseClientForm(form: FormData): { input?: ClientInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const fullName = text(form, "fullName").replace(/\s+/g, " ");
  const email = text(form, "email").toLowerCase();
  const phone = text(form, "phone");
  const billing: Billing = text(form, "billing") === "monthly" ? "monthly" : "package";
  const weeksRaw = text(form, "coachingWeeks");
  const startDate = text(form, "startDate");
  let endDate = text(form, "endDate");
  const notes = text(form, "notes");

  if (!fullName) errors.fullName = "Enter the client's name.";
  else if (fullName.length > 120) errors.fullName = "That name is too long.";

  if (!email) errors.email = "Enter the client's email.";
  else if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "That email doesn't look right.";

  if (phone && !/^[\d\s()+.-]{7,25}$/.test(phone)) errors.phone = "That phone number doesn't look right.";

  const coachingWeeks = Number(weeksRaw);
  if (billing === "package") {
    if (!weeksRaw) errors.coachingWeeks = "Enter how many weeks they paid for.";
    else if (!Number.isInteger(coachingWeeks) || coachingWeeks < 1 || coachingWeeks > 260)
      errors.coachingWeeks = "Use a whole number of weeks between 1 and 260.";
  }

  if (!startDate) errors.startDate = "Pick a start date.";
  else if (!isIsoDate(startDate)) errors.startDate = "That start date isn't valid.";

  // Packages get an end date from the weeks; monthly clients only get one when they cancel.
  if (billing === "package" && !endDate && !errors.startDate && !errors.coachingWeeks) endDate = endDateFromWeeks(startDate, coachingWeeks);
  if (endDate && !isIsoDate(endDate)) errors.endDate = "That end date isn't valid.";
  else if (endDate && startDate && !errors.startDate && endDate < startDate)
    errors.endDate = "The end date has to be after the start date.";

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    input: {
      fullName,
      email,
      phone: phone || null,
      billing,
      coachingWeeks: billing === "monthly" ? null : coachingWeeks,
      startDate,
      endDate: endDate || null,
      notes: notes || null,
    },
  };
}

/** "12-week package · Nov 23 – Feb 14, 2027" or "Monthly · since Nov 23, 2026" (+ "· ends …" once cancelled). */
export function coachingSummary(c: { billing?: string | null; coaching_weeks: number | null; start_date: string | null; end_date: string | null }): string {
  if (!c.start_date) return "No dates set";
  if (c.billing === "monthly") {
    return `Monthly · since ${formatDate(c.start_date)}${c.end_date ? ` · last day ${formatDate(c.end_date)}` : ""}`;
  }
  return `${c.coaching_weeks ? `${c.coaching_weeks}-week package · ` : ""}${formatDate(c.start_date, false)} – ${formatDate(c.end_date)}`;
}

export function firstName(fullName: string | null | undefined): string {
  return (fullName || "").trim().split(/\s+/)[0] || "there";
}
