/**
 * Read-only copy of what Resend knows, for the coach Lead magnets tab: sent emails (subject + latest status, no
 * recipients) and automations (steps + run counts). Needs RESEND_READ_KEY, a FULL ACCESS Resend key (the app's normal
 * RESEND_API_KEY can only send). Resend is slow to page, so results are kept in Supabase and refreshed in the background.
 */
import { db, q } from "./supabase";
import { emailSteps, type Automation, type RunCounts } from "./lead-magnets";

const API = "https://api.resend.com";
const STALE_MS = 15 * 60 * 1000;

export function resendReadConfigured(): boolean {
  return Boolean(process.env.RESEND_READ_KEY);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${process.env.RESEND_READ_KEY}` }, cache: "no-store" });
    if (res.status === 429 && attempt < 3) {
      await sleep(1200);
      continue;
    }
    if (!res.ok) throw new Error(`Resend ${res.status} on ${path.split("?")[0]}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  }
}

type List<T> = { data?: T[]; has_more?: boolean };
type ApiEmail = { id: string; subject?: string | null; last_event?: string | null; created_at: string };

/**
 * Copies sent emails into email_log, newest first. Stops once it reaches emails that are already stored and more than
 * 5 days old (their status no longer changes), so after the first run this is one or two requests.
 */
export async function syncEmails(maxPages = 40): Promise<number> {
  const known = await db<{ id: string }[]>("email_log?select=id&order=created_at.desc&limit=3000").catch(() => []);
  const have = new Set(known.map((k) => k.id));
  const settled = Date.now() - 5 * 86400000;
  let after = "";
  let saved = 0;
  for (let page = 0; page < maxPages; page++) {
    const res = await api<List<ApiEmail>>(`/emails?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`);
    const rows = res.data ?? [];
    if (rows.length === 0) break;
    await db("email_log?on_conflict=id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: rows.map((e) => ({ id: e.id, subject: (e.subject ?? "").slice(0, 300), last_event: e.last_event ?? "", created_at: new Date(e.created_at).toISOString(), synced_at: new Date().toISOString() })),
    });
    saved += rows.length;
    const last = rows[rows.length - 1];
    if (!res.has_more) break;
    if (have.has(last.id) && Date.parse(last.created_at) < settled) break;
    after = last.id;
    await sleep(350);
  }
  return saved;
}

type ApiAutomation = { id: string; name?: string; status?: string; created_at?: string; workflow?: { steps?: unknown } | null; steps?: unknown };
type ApiRun = { id: string; status?: string };

async function runCounts(id: string): Promise<RunCounts> {
  const c: RunCounts = { total: 0, running: 0, completed: 0, stopped: 0 };
  let after = "";
  for (let page = 0; page < 30; page++) {
    const res = await api<List<ApiRun>>(`/automations/${id}/runs?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`);
    const rows = res.data ?? [];
    for (const r of rows) {
      c.total++;
      if (r.status === "running" || r.status === "quota_exceeded") c.running++;
      else if (r.status === "completed") c.completed++;
      else c.stopped++;
    }
    if (!res.has_more || rows.length === 0) break;
    after = rows[rows.length - 1].id;
    await sleep(350);
  }
  return c;
}

/** Copies every automation (name, status, trigger, email steps, run counts) into email_automations. */
export async function syncAutomations(): Promise<number> {
  const list = await api<List<ApiAutomation>>("/automations?limit=100");
  const rows = [];
  for (const a of list.data ?? []) {
    await sleep(350);
    const full = await api<ApiAutomation>(`/automations/${a.id}`).catch(() => a);
    const { trigger, steps } = emailSteps(full.workflow?.steps ?? full.steps ?? []);
    await sleep(350);
    const runs = await runCounts(a.id).catch(() => ({ total: 0, running: 0, completed: 0, stopped: 0 }));
    rows.push({ id: a.id, name: full.name ?? a.name ?? "", status: full.status ?? a.status ?? "", trigger_event: trigger, steps, runs, created_at: full.created_at ?? a.created_at ?? null, synced_at: new Date().toISOString() });
  }
  if (rows.length) await db("email_automations?on_conflict=id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: rows });
  // Drop ones deleted in Resend.
  const ids = rows.map((r) => r.id);
  if (ids.length) await db(`email_automations?id=not.in.(${ids.map((i) => `"${i}"`).join(",")})`, { method: "DELETE", prefer: "return=minimal" }).catch(() => undefined);
  return rows.length;
}

export type SyncState = { at: string | null; note: string | null };

export async function lastSync(): Promise<SyncState> {
  const rows = await db<{ at: string; note: string | null }[]>(`sync_state?select=at,note&key=eq.${q("resend")}`).catch(() => []);
  return { at: rows[0]?.at ?? null, note: rows[0]?.note ?? null };
}

/** Runs both copies and records when (and any error, so the page can say what's wrong). */
export async function syncResend(): Promise<SyncState> {
  let note: string | null = null;
  try {
    await syncAutomations();
    await syncEmails();
  } catch (err) {
    console.error("Resend sync failed", err);
    note = err instanceof Error ? err.message.slice(0, 300) : "Sync failed";
  }
  const at = new Date().toISOString();
  await db("sync_state?on_conflict=key", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: { key: "resend", at, note } }).catch(() => undefined);
  return { at, note };
}

export function isStale(state: SyncState, now = Date.now()): boolean {
  return !state.at || now - Date.parse(state.at) > STALE_MS;
}

export async function loadAutomations(): Promise<Automation[]> {
  return db<Automation[]>("email_automations?select=id,name,status,trigger_event,steps,runs,created_at&order=created_at.asc");
}

export async function loadEmailRows(): Promise<{ subject: string; last_event: string }[]> {
  return db<{ subject: string; last_event: string }[]>("email_log?select=subject,last_event&order=created_at.desc&limit=20000");
}
