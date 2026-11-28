/**
 * Ads report (pure): for each Meta ad, how many leads it brought and how far they got
 * (lead → qualified → booked a call → client), with spend and cost per step when spend is known.
 */
import type { Person } from "./crm-logic";

export type SpendRow = { day: string; ad_id: string; ad_name: string | null; adset_name: string | null; campaign_name: string | null; spend: number | string; impressions: number | null; clicks: number | null };

export type AdRow = {
  key: string;
  ad: string;
  adset: string | null;
  campaign: string | null;
  leads: number;
  qualified: number;
  booked: number;
  clients: number;
  /** null = no spend recorded for this ad. */
  spend: number | null;
  clicks: number | null;
  names: { lead: string; stage: "client" | "booked" | "qualified" | "lead" }[];
};

/** Qualified = applied for coaching, or you've moved them to "In conversation" or further, or they booked a call. */
export function stageOf(p: Person, bookedEmails: Set<string>): "client" | "booked" | "qualified" | "lead" {
  if (p.status === "client") return "client";
  if (p.status === "call_booked" || (p.email && bookedEmails.has(p.email.toLowerCase()))) return "booked";
  if (p.applied || p.status === "talking") return "qualified";
  return "lead";
}

const PAID = /facebook|\bfb\b|meta|instagram ad|paid/i;
export const UNTRACKED_KEY = "untracked";

/**
 * One row per ad (matched by Meta's ad id when we have it, else by name), most leads first, plus one row for people
 * who came from a Facebook ad before the ad links carried their details. Ads with spend but no leads are listed too.
 */
export function adsReport(people: Person[], spend: SpendRow[], bookedEmails: Iterable<string>): { rows: AdRow[]; total: AdRow } {
  const booked = new Set([...bookedEmails].map((e) => e.toLowerCase()));
  const rows = new Map<string, AdRow>();
  const blank = (key: string, ad: string, adset: string | null, campaign: string | null): AdRow => ({ key, ad, adset, campaign, leads: 0, qualified: 0, booked: 0, clients: 0, spend: null, clicks: null, names: [] });
  const nameKey = (campaign: string | null, ad: string | null) => `name:${(campaign ?? "").toLowerCase()}|${(ad ?? "").toLowerCase()}`;

  for (const p of people) {
    let row: AdRow;
    if (p.ad) {
      const key = p.ad.adId ? `id:${p.ad.adId}` : nameKey(p.ad.campaign, p.ad.ad);
      row = rows.get(key) ?? rows.set(key, blank(key, p.ad.ad ?? "(ad name not sent)", p.ad.adset, p.ad.campaign)).get(key)!;
    } else if (p.firstSource && PAID.test(p.firstSource) && !/^instagram$/i.test(p.firstSource)) {
      row = rows.get(UNTRACKED_KEY) ?? rows.set(UNTRACKED_KEY, blank(UNTRACKED_KEY, "Facebook ad (which ad wasn't recorded)", null, null)).get(UNTRACKED_KEY)!;
    } else continue;
    const stage = stageOf(p, booked);
    row.leads++;
    if (stage !== "lead") row.qualified++;
    if (stage === "booked" || stage === "client") row.booked++;
    if (stage === "client") row.clients++;
    row.names.push({ lead: p.name, stage });
  }

  for (const s of spend) {
    const amount = Number(s.spend) || 0;
    let row = rows.get(`id:${s.ad_id}`) ?? rows.get(nameKey(s.campaign_name, s.ad_name));
    if (!row) {
      if (amount === 0) continue;
      row = blank(`id:${s.ad_id}`, s.ad_name ?? "(unnamed ad)", s.adset_name, s.campaign_name);
      rows.set(row.key, row);
    }
    row.spend = Math.round(((row.spend ?? 0) + amount) * 100) / 100;
    row.clicks = (row.clicks ?? 0) + (s.clicks ?? 0);
    row.ad = row.ad === "(ad name not sent)" && s.ad_name ? s.ad_name : row.ad;
    row.adset ??= s.adset_name;
    row.campaign ??= s.campaign_name;
  }

  const list = [...rows.values()].sort((a, b) => (a.key === UNTRACKED_KEY ? 1 : b.key === UNTRACKED_KEY ? -1 : b.leads - a.leads || (b.spend ?? 0) - (a.spend ?? 0)));
  const total = blank("total", "All ads", null, null);
  for (const r of list) {
    total.leads += r.leads;
    total.qualified += r.qualified;
    total.booked += r.booked;
    total.clients += r.clients;
    if (r.spend !== null) total.spend = Math.round(((total.spend ?? 0) + r.spend) * 100) / 100;
  }
  return { rows: list, total };
}

/** "$12.50", or "–" when there's no spend or nothing to divide by. */
export function costPer(spend: number | null, count: number): string {
  if (spend === null || count === 0) return "–";
  const v = spend / count;
  return `$${v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2)}`;
}

/** The line to paste into an ad's "URL parameters" box in Meta Ads Manager. */
export const AD_URL_PARAMETERS =
  "source=facebook-ad&utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}&ad_id={{ad.id}}&adset_id={{adset.id}}&campaign_id={{campaign.id}}";
