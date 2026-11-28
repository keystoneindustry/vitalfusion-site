import { cleanAttribution } from "./attribution";
// Saves each Nutrition Plan Calculator signup, free meal plan request and coaching application to the coaching app's
// Supabase (table funnel_leads) so the business dashboard can follow lead → application → client
// by email and source. Insert-only, through the record_funnel_lead() function: the key below is the
// public "publishable" key, and FUNNEL_TOKEN (a Vercel env var) is the shared secret the function checks.
// Live site only, so preview tests don't count as leads. Never blocks or breaks the form.

const FUNNEL_URL = process.env.FUNNEL_SUPABASE_URL || "https://bcwytsuqudwghxctxoef.supabase.co";
const FUNNEL_KEY = process.env.FUNNEL_SUPABASE_KEY || "sb_publishable_OS3v8A4s959sEhvBx-aHZw_soV8aCHN";

export type FunnelKind = "calculator" | "application" | "meal_plan" | "grocery_list" | "blueprint";

export async function recordFunnelLead(
  kind: FunnelKind,
  lead: { email: string; name: string; source: string; details?: Record<string, unknown> },
): Promise<void> {
  const token = process.env.FUNNEL_TOKEN;
  if (!token || process.env.VERCEL_ENV !== "production") return;
  const res = await fetch(`${FUNNEL_URL}/rest/v1/rpc/record_funnel_lead`, {
    method: "POST",
    headers: { apikey: FUNNEL_KEY, Authorization: `Bearer ${FUNNEL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_token: token,
      p_kind: kind,
      p_email: lead.email,
      p_name: lead.name,
      p_source: lead.source,
      p_details: lead.details ?? {},
    }),
  });
  const body = await res.text();
  if (!res.ok || body.trim() !== "true") throw new Error(`Funnel save failed ${res.status}: ${body.slice(0, 200)}`);
}

/**
 * Adds the ad a lead came from (see lib/attribution.ts) to what gets saved: the ad details go into `details`, and the
 * ad link's own source tag (e.g. "facebook-ad") wins over the page's default source, so someone who clicked an ad and
 * signed up on a later page is still filed under the ad.
 */
export function withAttribution<T extends { source?: string; details?: Record<string, unknown> }>(lead: T, body: unknown, label: (s: string) => string): T {
  const attr = cleanAttribution(body && typeof body === "object" ? (body as Record<string, unknown>).attr : null);
  if (!attr) return lead;
  const { src, ...ad } = attr;
  return { ...lead, source: src ? label(src) : lead.source, details: { ...(lead.details ?? {}), ...ad } };
}
