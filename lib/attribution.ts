/**
 * Which ad a visitor came from. Meta fills these in on every ad click when the ad's "URL parameters" box has:
 *   source=facebook-ad&utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}&ad_id={{ad.id}}&adset_id={{adset.id}}&campaign_id={{campaign.id}}
 * The browser remembers the last ad click (app/components/Attribution.tsx) and every form sends it along, so a lead who
 * signs up or applies later is still credited to the ad. Saved in funnel_leads.details; the coach portal's Ads report reads it.
 */
export type Attribution = {
  src?: string;
  utm_source?: string;
  utm_medium?: string;
  campaign?: string;
  adset?: string;
  ad?: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  landing?: string;
};

const KEYS: (keyof Attribution)[] = ["src", "utm_source", "utm_medium", "campaign", "adset", "ad", "ad_id", "adset_id", "campaign_id", "landing"];

function tidy(v: unknown, max = 120): string | undefined {
  if (typeof v !== "string") return undefined;
  // Meta leaves the placeholder as-is when a link is opened outside an ad (e.g. a preview): ignore those.
  const s = v.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s && !/^\{\{.*\}\}$/.test(s) ? s : undefined;
}

/** Reads the ad details out of a page address. Null when the visit didn't come from a tagged ad. */
export function attributionFromSearch(search: string, path = ""): Attribution | null {
  const q = new URLSearchParams(search);
  const a: Attribution = {
    src: tidy(q.get("source"), 60),
    utm_source: tidy(q.get("utm_source"), 60),
    utm_medium: tidy(q.get("utm_medium"), 60),
    campaign: tidy(q.get("utm_campaign")),
    adset: tidy(q.get("utm_term")),
    ad: tidy(q.get("utm_content")),
    ad_id: tidy(q.get("ad_id"), 40),
    adset_id: tidy(q.get("adset_id"), 40),
    campaign_id: tidy(q.get("campaign_id"), 40),
  };
  if (!a.campaign && !a.ad && !a.ad_id) return null;
  a.landing = tidy(path, 80);
  return cleanAttribution(a);
}

/** Keeps only the known fields, as short plain strings. Safe to run on anything a browser sends. */
export function cleanAttribution(raw: unknown): Attribution | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Attribution = {};
  for (const k of KEYS) {
    const v = tidy(r[k], k === "src" || k === "utm_source" || k === "utm_medium" ? 60 : k.endsWith("_id") ? 40 : 120);
    if (v) out[k] = v;
  }
  return out.campaign || out.ad || out.ad_id ? out : null;
}
