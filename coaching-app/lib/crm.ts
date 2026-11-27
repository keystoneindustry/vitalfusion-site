/** CRM data access (server only). Logic lives in lib/crm-logic.ts. */
import { db, q } from "./supabase";
import { buildPeople, type CrmRow, type FunnelLead, type Person, type Status } from "./crm-logic";

export async function loadFunnel(): Promise<FunnelLead[]> {
  return db<FunnelLead[]>("funnel_leads?select=id,kind,email,name,source,created_at,details&order=created_at.desc&limit=5000");
}

export async function loadCrmRows(): Promise<CrmRow[]> {
  return db<CrmRow[]>("crm_leads?select=*&order=created_at.desc&limit=5000");
}

/** Emails that count as clients: people in the coaching app (not leads) and anyone who signed an agreement from the Legal tab. */
export async function clientEmails(): Promise<string[]> {
  const [clients, signed] = await Promise.all([
    db<{ email: string }[]>("clients?select=email&stage=neq.lead"),
    db<{ email: string; contact: { email?: string } | null }[]>("legal_requests?select=email,contact&status=eq.signed").catch(() => []),
  ]);
  return [...clients.map((c) => c.email), ...signed.flatMap((s) => [s.email, s.contact?.email ?? ""])].filter(Boolean);
}

export async function loadPeople(): Promise<{ people: Person[]; funnel: FunnelLead[] }> {
  const [funnel, crm, clients] = await Promise.all([loadFunnel(), loadCrmRows(), clientEmails()]);
  return { people: buildPeople(funnel, crm, clients), funnel };
}

type Patch = { status?: Status; notes?: string | null; follow_up_on?: string | null; last_contacted_at?: string | null; name?: string | null; phone?: string | null; instagram?: string | null };

/** Saves Tyler's notes for a lead: by email (creating the row the first time) or by id for a hand-added lead. */
export async function saveLead(key: { email?: string | null; id?: string | null }, patch: Patch): Promise<void> {
  const body = { ...patch, updated_at: new Date().toISOString() };
  if (key.id) {
    await db(`crm_leads?id=eq.${q(key.id)}`, { method: "PATCH", prefer: "return=minimal", body });
    return;
  }
  if (!key.email) throw new Error("No lead to save");
  await db("crm_leads?on_conflict=email", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: { email: key.email.toLowerCase(), ...body } });
}

export async function addManualLead(l: { name: string; email: string | null; phone: string | null; instagram: string | null; source: string | null; notes: string | null }): Promise<void> {
  const row = { ...l, email: l.email ? l.email.toLowerCase() : null, manual: true };
  if (row.email) {
    await db("crm_leads?on_conflict=email", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: row });
  } else {
    await db("crm_leads", { method: "POST", prefer: "return=minimal", body: row });
  }
}

export async function deleteManualLead(id: string): Promise<void> {
  await db(`crm_leads?id=eq.${q(id)}&manual=eq.true`, { method: "DELETE", prefer: "return=minimal" });
}
