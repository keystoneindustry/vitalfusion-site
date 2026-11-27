/**
 * CRM (pure, safe for the browser): turns the website's lead records (funnel_leads) plus Tyler's own notes (crm_leads)
 * into one row per person, and picks who to follow up with today.
 */
import { daysBetween } from "./dates";

export type FunnelLead = { id: number; kind: string; email: string; name: string | null; source: string | null; created_at: string; details: Record<string, unknown> | null };

export type CrmRow = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  instagram: string | null;
  status: Status;
  notes: string | null;
  follow_up_on: string | null;
  last_contacted_at: string | null;
  manual: boolean;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "talking", label: "In conversation" },
  { value: "call_booked", label: "Call booked" },
  { value: "client", label: "Client" },
  { value: "not_fit", label: "Not a fit" },
] as const;
export type Status = (typeof STATUSES)[number]["value"];

export function isStatus(v: string): v is Status {
  return STATUSES.some((s) => s.value === v);
}
export function statusLabel(v: string): string {
  return STATUSES.find((s) => s.value === v)?.label ?? v;
}

const KIND_LABEL: Record<string, string> = {
  application: "Applied for coaching",
  calculator: "Macro calculator",
  meal_plan: "Free meal plan",
  grocery_list: "Grocery list",
  blueprint: "Blueprint",
};
export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind.replace(/_/g, " ");
}

export type Activity = { kind: string; label: string; source: string | null; at: string; detail: string | null };

export type Person = {
  /** Lowercased email, or "id:<crm id>" for a hand-added lead with no email. */
  key: string;
  crmId: string | null;
  email: string | null;
  name: string;
  phone: string | null;
  instagram: string | null;
  status: Status;
  /** True when "Client" was worked out (they're a client in the app or signed an agreement), not set by hand. */
  autoClient: boolean;
  notes: string | null;
  followUpOn: string | null;
  lastContactedAt: string | null;
  manual: boolean;
  firstSeen: string;
  lastSeen: string;
  activities: Activity[];
  sources: string[];
  applied: boolean;
  rating: string | null;
  goal: string | null;
};

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const GOAL_LABEL: Record<string, string> = { lose: "Lose fat", build: "Build muscle", maintain: "Maintain" };

/** One row per person, newest activity first. `clientEmails` = app clients + people who signed an agreement. */
export function buildPeople(funnel: FunnelLead[], crm: CrmRow[], clientEmails: Iterable<string>): Person[] {
  const clients = new Set([...clientEmails].map((e) => e.trim().toLowerCase()));
  const byEmail = new Map<string, FunnelLead[]>();
  for (const f of funnel) {
    const e = (f.email || "").trim().toLowerCase();
    if (!e) continue;
    (byEmail.get(e) ?? byEmail.set(e, []).get(e)!).push(f);
  }
  const crmByEmail = new Map(crm.filter((c) => c.email).map((c) => [c.email!, c]));
  const people: Person[] = [];

  const make = (key: string, email: string | null, leads: FunnelLead[], c: CrmRow | undefined): Person => {
    const sorted = [...leads].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const activities: Activity[] = sorted.map((l) => ({
      kind: l.kind,
      label: kindLabel(l.kind),
      source: text(l.source),
      at: l.created_at,
      detail: text(l.details?.plan) ?? null,
    }));
    const calc = sorted.find((l) => l.kind === "calculator" && l.details);
    const application = sorted.find((l) => l.kind === "application");
    const rawGoal = text(calc?.details?.goal) ?? text(application?.details?.goal);
    const isClient = email ? clients.has(email) : false;
    const stored = c?.status ?? "new";
    const dates = [...sorted.map((l) => l.created_at), ...(c ? [c.created_at] : [])].sort();
    return {
      key,
      crmId: c?.id ?? null,
      email,
      name: text(c?.name) ?? text(sorted.find((l) => text(l.name))?.name) ?? email ?? "Unnamed lead",
      phone: text(c?.phone) ?? text(application?.details?.phone),
      instagram: text(c?.instagram) ?? text(application?.details?.instagram),
      status: isClient && stored !== "not_fit" ? "client" : stored,
      autoClient: isClient && stored !== "client",
      notes: text(c?.notes),
      followUpOn: c?.follow_up_on ?? null,
      lastContactedAt: c?.last_contacted_at ?? null,
      manual: Boolean(c?.manual) && sorted.length === 0,
      firstSeen: dates[0] ?? new Date(0).toISOString(),
      lastSeen: dates[dates.length - 1] ?? new Date(0).toISOString(),
      activities,
      sources: [...new Set([...sorted.map((l) => text(l.source)), text(c?.source)].filter((s): s is string => Boolean(s)))],
      applied: Boolean(application),
      rating: text(calc?.details?.rating),
      goal: rawGoal ? (GOAL_LABEL[rawGoal] ?? rawGoal) : null,
    };
  };

  for (const [email, leads] of byEmail) people.push(make(email, email, leads, crmByEmail.get(email)));
  for (const c of crm) {
    if (c.email && byEmail.has(c.email)) continue;
    people.push(make(c.email ?? `id:${c.id}`, c.email, [], c));
  }
  return people.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : a.lastSeen > b.lastSeen ? -1 : 0));
}

export type FollowUp = { person: Person; reason: string; priority: number };

/**
 * Who to reach out to today, most important first:
 * 0 applied and not contacted · 1 a follow-up date you set is due · 2 hot calculator lead this week ·
 * 3 grabbed 2+ freebies in two weeks · 4 you reached out 4+ days ago and nothing since.
 */
export function followUps(people: Person[], today: string): FollowUp[] {
  const out: FollowUp[] = [];
  const ago = (iso: string) => Math.max(0, daysBetween(iso.slice(0, 10), today));
  const days = (n: number) => (n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);
  for (const p of people) {
    if (p.status === "client" || p.status === "not_fit") continue;
    const waiting = p.followUpOn && p.followUpOn > today; // you already picked a later day
    if (p.followUpOn && p.followUpOn <= today) {
      out.push({ person: p, priority: 1, reason: p.followUpOn === today ? "You set a follow-up for today" : `Follow-up was due ${days(ago(p.followUpOn))}` });
      continue;
    }
    if (waiting) continue;
    if (p.status === "new") {
      const application = p.activities.find((a) => a.kind === "application");
      if (application) {
        out.push({ person: p, priority: 0, reason: `Applied for coaching ${days(ago(application.at))}, not contacted yet` });
        continue;
      }
      const recent = p.activities.filter((a) => ago(a.at) <= 14);
      const kinds = new Set(recent.map((a) => a.kind));
      if (p.rating === "Hot" && ago(p.lastSeen) <= 7) {
        out.push({ person: p, priority: 2, reason: `Hot lead from the macro calculator${p.goal ? ` (${p.goal.toLowerCase()})` : ""}` });
      } else if (kinds.size >= 2) {
        out.push({ person: p, priority: 3, reason: `Grabbed ${kinds.size} freebies in the last two weeks` });
      }
      continue;
    }
    if ((p.status === "contacted" || p.status === "talking") && p.lastContactedAt && ago(p.lastContactedAt) >= 4) {
      out.push({ person: p, priority: 4, reason: `No update since you reached out ${days(ago(p.lastContactedAt))}` });
    }
  }
  return out.sort((a, b) => a.priority - b.priority || (a.person.lastSeen < b.person.lastSeen ? 1 : -1));
}

/** Leads per week for the last `weeks` weeks (Monday-start, oldest first), counting each signup. */
export function leadsByWeek(funnel: Pick<FunnelLead, "created_at">[], today: string, weeks = 8): { week: string; count: number }[] {
  const d = new Date(`${today}T00:00:00Z`);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
  const out = Array.from({ length: weeks }, (_, i) => ({ week: new Date(monday.getTime() - (weeks - 1 - i) * 7 * 86400000).toISOString().slice(0, 10), count: 0 }));
  for (const f of funnel) {
    const day = f.created_at.slice(0, 10);
    for (let i = out.length - 1; i >= 0; i--) {
      if (day >= out[i].week) {
        if (i < out.length - 1 || day <= today) out[i].count++;
        break;
      }
    }
  }
  return out;
}

/** Per source: people, how many applied, how many became clients. */
export function bySource(people: Person[]): { source: string; people: number; applied: number; clients: number }[] {
  const map = new Map<string, { source: string; people: number; applied: number; clients: number }>();
  for (const p of people) {
    // Credit the first place we saw them.
    const first = [...p.activities].reverse().find((a) => a.source)?.source ?? p.sources[0] ?? "Unknown";
    const row = map.get(first) ?? map.set(first, { source: first, people: 0, applied: 0, clients: 0 }).get(first)!;
    row.people++;
    if (p.applied) row.applied++;
    if (p.status === "client") row.clients++;
  }
  return [...map.values()].sort((a, b) => b.people - a.people);
}
