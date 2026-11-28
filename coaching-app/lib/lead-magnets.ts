/**
 * Lead magnets (pure, safe for the browser): the freebies on the website, the Resend automation that follows each one up,
 * and how many emails went out. Signups come from funnel_leads; automations and email counts are copied from Resend
 * (lib/resend-read.ts).
 */

export type Magnet = {
  id: string;
  name: string;
  /** Where people sign up. */
  url: string;
  /** funnel_leads.kind */
  kind: string;
  /** Resend event(s) the website sends on signup: the automation with that trigger belongs to this magnet. */
  events: string[];
  /** Subject of the email that delivers the freebie (sent by the website right away). */
  deliverySubject: string;
  /** For magnets with versions (the two meal plans): details.plan value → label, and which event each sends. */
  versions?: { plan: string; label: string; event: string; url: string }[];
};

const SITE = "https://vitalfusioncoaching.com";

export const MAGNETS: Magnet[] = [
  { id: "calculator", name: "Nutrition plan calculator", url: `${SITE}/macros`, kind: "calculator", events: ["macro_quiz.completed"], deliverySubject: "Your nutrition plan 💪" },
  {
    id: "meal_plan",
    name: "Free 60-day meal plan",
    url: `${SITE}/plan/workday`,
    kind: "meal_plan",
    events: ["meal_plan_workday.requested", "meal_plan_everyday.requested"],
    deliverySubject: "Your 60-day meal plan is here 💪",
    versions: [
      { plan: "workday", label: "The 9-to-5 Plan", event: "meal_plan_workday.requested", url: `${SITE}/plan/workday` },
      { plan: "everyday", label: "The Everyday Plan", event: "meal_plan_everyday.requested", url: `${SITE}/plan/everyday` },
    ],
  },
  { id: "grocery_list", name: "Fat loss grocery list", url: `${SITE}/grocery-list`, kind: "grocery_list", events: ["grocery_list.signed_up"], deliverySubject: "Your Fat Loss Grocery List is here 🛒" },
  { id: "blueprint", name: "Busy Professional Blueprint", url: `${SITE}/blueprint`, kind: "blueprint", events: ["blueprint.signed_up"], deliverySubject: "The Busy Professional Blueprint is here 💪" },
];

export type EmailStep = { day: number | null; subject: string };
export type RunCounts = { total: number; running: number; completed: number; stopped: number };
export type Automation = { id: string; name: string; status: string; trigger_event: string | null; steps: EmailStep[]; runs: Partial<RunCounts>; created_at: string | null };
export type EmailCount = { sent: number; delivered: number; bounced: number; opened: number; clicked: number };

/** "2 days" → 2, "36 hours" → 1.5, "1 week" → 7. Unknown → null. */
export function waitDays(text: unknown): number | null {
  const m = String(text ?? "").trim().match(/^(\d+(?:\.\d+)?)\s*(minute|hour|day|week)s?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  return unit === "week" ? n * 7 : unit === "day" ? n : unit === "hour" ? n / 24 : n / 1440;
}

type RawStep = { key?: string; type?: string; config?: Record<string, unknown>; next?: string | null; branches?: Record<string, string | null> };
type RawConnection = { from?: string; to?: string; type?: string };

/**
 * Walks a Resend workflow from the trigger and returns its email steps in order, each with the day it goes out
 * (adding up the waits before it). Follows the "keep going" path: a wait's timeout branch, a condition's branch that
 * leads on. Handles both shapes Resend uses: steps with `next` / `branches`, and (the REST API) steps plus a
 * `connections` list of { from, to, type }.
 */
export function emailSteps(raw: unknown, connections?: unknown): { trigger: string | null; steps: EmailStep[] } {
  const list: RawStep[] = Array.isArray(raw) ? (raw as RawStep[]) : [];
  const conns: RawConnection[] = Array.isArray(connections) ? (connections as RawConnection[]) : [];
  const byKey = new Map(list.filter((s) => s && typeof s.key === "string").map((s) => [s.key!, s]));
  const cfg = (s: RawStep | undefined, ...names: string[]) => {
    for (const n of names) if (s?.config && s.config[n] !== undefined && s.config[n] !== null) return s.config[n];
    return undefined;
  };
  /** Where a step leads, preferring the given branch names in order. */
  const follow = (s: RawStep, prefer: string[]): string | null => {
    for (const name of prefer) {
      if (s.branches && name in s.branches) {
        if (s.branches[name]) return s.branches[name]!;
        continue;
      }
      const c = conns.find((x) => x.from === s.key && x.type === name && x.to);
      if (c) return c.to!;
    }
    if (s.next) return s.next;
    const fallback = conns.find((x) => x.from === s.key && x.to && (x.type === "default" || !x.type)) ?? (prefer.length === 0 ? conns.find((x) => x.from === s.key && x.to) : undefined);
    return fallback?.to ?? null;
  };
  const start = list.find((s) => s?.type === "trigger");
  const eventName = cfg(start, "eventName", "event_name");
  const trigger = typeof eventName === "string" ? eventName : null;
  const steps: EmailStep[] = [];
  let day: number | null = 0;
  let cur: RawStep | undefined = start;
  for (let guard = 0; cur && guard < 100; guard++) {
    let next: string | null;
    if (cur.type === "send_email") {
      steps.push({ day: day === null ? null : Math.round(day * 10) / 10, subject: String(cfg(cur, "subject") ?? "").trim() });
      next = follow(cur, []);
    } else if (cur.type === "delay" || cur.type === "wait_for_event") {
      const d = waitDays(cfg(cur, "timeout", "duration", "delay"));
      day = d === null || day === null ? null : day + d;
      next = follow(cur, cur.type === "wait_for_event" ? ["timeout"] : []);
    } else if (cur.type === "condition") {
      next = follow(cur, ["condition_not_met", "condition_met"]);
    } else {
      next = follow(cur, []);
    }
    cur = next ? byKey.get(next) : undefined;
  }
  return { trigger, steps };
}

const DELIVERED = new Set(["delivered", "opened", "clicked", "complained"]);
const NOT_SENT = new Set(["scheduled", "queued", "canceled", "cancelled", "failed"]);

/** Email counts per exact subject. */
export function countBySubject(rows: { subject: string; last_event: string }[]): Map<string, EmailCount> {
  const map = new Map<string, EmailCount>();
  for (const r of rows) {
    const c = map.get(r.subject) ?? map.set(r.subject, { sent: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0 }).get(r.subject)!;
    const e = (r.last_event || "").toLowerCase();
    if (NOT_SENT.has(e)) continue;
    c.sent++;
    if (DELIVERED.has(e)) c.delivered++;
    if (e === "bounced") c.bounced++;
    if (e === "opened" || e === "clicked") c.opened++;
    if (e === "clicked") c.clicked++;
  }
  return map;
}

const ZERO: EmailCount = { sent: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0 };

export type MagnetView = {
  magnet: Magnet;
  signups: number;
  signups7: number;
  people: number;
  delivery: EmailCount;
  versions: { label: string; url: string; signups: number }[];
  automations: (Automation & { emails: (EmailStep & EmailCount)[] })[];
};

/** Everything the Lead magnets tab shows, plus automations that don't belong to a magnet. */
export function buildMagnets(
  funnel: { kind: string; email: string; created_at: string; details: Record<string, unknown> | null }[],
  automations: Automation[],
  counts: Map<string, EmailCount>,
  weekAgoIso: string,
): { magnets: MagnetView[]; other: MagnetView["automations"] } {
  const withEmails = (a: Automation) => ({ ...a, emails: a.steps.map((s) => ({ ...s, ...(counts.get(s.subject) ?? ZERO) })) });
  const used = new Set<string>();
  const magnets = MAGNETS.map((m) => {
    const rows = funnel.filter((f) => f.kind === m.kind);
    const mine = automations
      .filter((a) => a.trigger_event && m.events.includes(a.trigger_event))
      .sort((a, b) => (a.status === b.status ? m.events.indexOf(a.trigger_event!) - m.events.indexOf(b.trigger_event!) : a.status === "enabled" ? -1 : 1));
    for (const a of mine) used.add(a.id);
    return {
      magnet: m,
      signups: rows.length,
      signups7: rows.filter((r) => r.created_at >= weekAgoIso).length,
      people: new Set(rows.map((r) => r.email.toLowerCase())).size,
      delivery: counts.get(m.deliverySubject) ?? ZERO,
      versions: (m.versions ?? []).map((v) => ({ label: v.label, url: v.url, signups: rows.filter((r) => r.details?.plan === v.plan).length })),
      automations: mine.map(withEmails),
    };
  });
  return { magnets, other: automations.filter((a) => !used.has(a.id)).map(withEmails) };
}
