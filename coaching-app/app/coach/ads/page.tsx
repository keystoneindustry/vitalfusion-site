import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { AD_RANGES, AD_URL_PARAMETERS, adsReport, byCampaign, costPer, UNTRACKED_KEY, type AdRow, type SpendRow } from "@/lib/ads";
import { loadBookedEmails } from "@/lib/cal";
import { clientEmails, loadCrmRows, loadFunnel } from "@/lib/crm";
import { buildPeople } from "@/lib/crm-logic";
import { addDays, formatDate, todayIn } from "@/lib/dates";
import { money } from "@/lib/stripe";
import { db } from "@/lib/supabase";

export const metadata = { title: "Ads · Vital Fusion" };

const num = (n: number | null) => (n === null ? "–" : n.toLocaleString("en-US"));
const each = (spend: number | null, n: number) => (costPer(spend, n) === "–" ? "–" : `${costPer(spend, n)} each`);

function Steps({ r }: { r: AdRow }) {
  return (
    <div className="ad-steps">
      {(
        [
          ["Leads", r.leads],
          ["Qualified", r.qualified],
          ["Booked a call", r.booked],
          ["Clients", r.clients],
        ] as [string, number][]
      ).map(([label, n]) => (
        <div key={label}>
          <b>{n}</b>
          <span>{label}</span>
          <em>{each(r.spend, n)}</em>
        </div>
      ))}
    </div>
  );
}

function Delivery({ r }: { r: AdRow }) {
  if (r.spend === null) return null;
  const ctr = r.impressions && r.clicks !== null ? `${((r.clicks / r.impressions) * 100).toFixed(1)}%` : "–";
  return (
    <p className="small muted" style={{ margin: "8px 0 0" }}>
      {num(r.impressions)} views · {num(r.clicks)} clicks ({ctr} clicked) · {costPer(r.spend, r.clicks ?? 0)} per click
      {r.clicks ? ` · ${Math.round((r.leads / r.clicks) * 100)}% of clicks became leads` : ""}
    </p>
  );
}

/** Every Meta ad: what it cost, the leads it brought and how far they got (lead → qualified → booked a call → client). */
export default async function AdsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireCoach("/coach/ads");
  const sp = await searchParams;
  const today = todayIn();
  const range = AD_RANGES.find((r) => r.value === sp.range) ?? AD_RANGES[1];
  const since = range.days ? addDays(today, -(range.days - 1)) : null;

  const [funnelAll, crm, clients, bookedEmails, spendAll] = await Promise.all([
    loadFunnel(),
    loadCrmRows(),
    clientEmails(),
    loadBookedEmails(),
    db<SpendRow[]>("ad_spend?select=day,ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks&limit=20000").catch(() => [] as SpendRow[]),
  ]);
  // A lead counts in a range by when they first signed up; their later steps (call, client) count whenever they happen.
  const people = buildPeople(funnelAll, crm, clients).filter((p) => !since || p.firstSeen.slice(0, 10) >= since);
  const spend = spendAll.filter((s) => !since || s.day >= since);
  const { rows, total } = adsReport(people, spend, bookedEmails);
  const campaigns = byCampaign(rows);
  const spendThrough = spendAll.reduce((m, s) => (s.day > m ? s.day : m), "");
  const hasSpend = spendAll.length > 0;
  const tracked = rows.filter((r) => r.key !== UNTRACKED_KEY);

  return (
    <>
      <h1 className="h1">Ads</h1>
      <p className="lead" style={{ marginTop: -4 }}>
        Every Meta ad: what it cost, the leads it brought, and how far they got.
        {hasSpend ? ` Spend is through ${formatDate(spendThrough, false)}.` : ""}
      </p>

      <nav className="lift-chips" aria-label="Time range">
        {AD_RANGES.map((r) => (
          <Link key={r.value} href={`/coach/ads?range=${r.value}`} aria-current={range.value === r.value ? "true" : undefined} scroll={false}>
            {r.label}
          </Link>
        ))}
      </nav>

      {!hasSpend && (
        <p className="notice notice-warn">
          Ad spend isn't connected yet, so costs show “–” and only ads that brought a lead are listed. Ask Claude for a new “Connect Meta Ads” link to
          turn on spend, views and clicks for every ad.
        </p>
      )}

      <div className="kpi-grid">
        <div className="kpi">
          <b>{total.spend === null ? "–" : money(total.spend)}</b>
          <span>spent</span>
          <em>{num(total.clicks)} clicks</em>
        </div>
        <div className="kpi">
          <b>{total.leads}</b>
          <span>leads</span>
          <em>{each(total.spend, total.leads)}</em>
        </div>
        <div className="kpi">
          <b>{total.qualified}</b>
          <span>qualified</span>
          <em>{each(total.spend, total.qualified)}</em>
        </div>
        <div className="kpi">
          <b>{total.booked}</b>
          <span>booked a call</span>
          <em>{each(total.spend, total.booked)}</em>
        </div>
        <div className="kpi">
          <b>{total.clients}</b>
          <span>clients</span>
          <em>{each(total.spend, total.clients)}</em>
        </div>
        <div className="kpi">
          <b>{total.leads ? `${Math.round((total.booked / total.leads) * 100)}%` : "–"}</b>
          <span>of leads booked a call</span>
          <em>{total.booked ? `${Math.round((total.clients / total.booked) * 100)}% of calls became clients` : "no calls yet"}</em>
        </div>
      </div>
      <p className="small muted" style={{ margin: "8px 0 14px" }}>
        Qualified = applied for coaching, or you marked them “In conversation” or further in the CRM, or they booked a call. Booked a call = they have a
        Cal.com booking or you marked them “Call booked”.
      </p>

      {campaigns.length > 1 && (
        <section className="card">
          <h2 className="h2" style={{ marginTop: 0 }}>By campaign</h2>
          <div className="ad-list">
            {campaigns.map((r) => (
              <div className="ad-row" key={r.key}>
                <div className="legal-head">
                  <b>{r.ad}</b>
                  <span className="small muted">{r.spend === null ? "spend –" : `${money(r.spend)} spent`}</span>
                </div>
                <Steps r={r} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>Each ad{tracked.length ? ` (${tracked.length})` : ""}</h2>
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No leads from ads in this range yet. New leads show up here as soon as someone clicks one of your tagged ads and signs up.
          </p>
        ) : (
          <div className="ad-list">
            {rows.map((r) => (
              <div className="ad-row" key={r.key}>
                <div className="legal-head">
                  <b>{r.ad}</b>
                  <span className="small muted">{r.spend === null ? "spend –" : `${money(r.spend)} spent`}</span>
                </div>
                {(r.campaign || r.adset) && <p className="small muted" style={{ margin: "2px 0 0" }}>{[r.campaign, r.adset].filter(Boolean).join(" · ")}</p>}
                <Steps r={r} />
                <Delivery r={r} />
                {r.names.length > 0 && (
                  <p className="small muted" style={{ margin: "8px 0 0" }}>
                    {r.names
                      .slice(0, 15)
                      .map((x) => `${x.lead}${x.stage === "lead" ? "" : ` (${x.stage === "booked" ? "call booked" : x.stage})`}`)
                      .join(" · ")}
                    {r.names.length > 15 ? ` · +${r.names.length - 15} more` : ""}
                  </p>
                )}
                {r.key === UNTRACKED_KEY && <p className="small muted" style={{ margin: "6px 0 0" }}>These came in before your ad links carried the ad's name, so they can't be tied to one ad.</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>Tracking a new ad</h2>
        <p className="small" style={{ margin: "0 0 6px" }}>
          When you create an ad in Meta Ads Manager, paste this line into <b>Tracking → URL parameters</b> before you publish. Meta fills in the campaign,
          ad set and ad for every click, and your website saves them with the lead.
        </p>
        <code className="ad-params">{AD_URL_PARAMETERS}</code>
        <p className="small muted" style={{ margin: "8px 0 0" }}>
          See each person in the <Link href="/coach/crm">CRM</Link>. Move someone to “In conversation” or “Call booked” there and they move along here too.
        </p>
      </section>
    </>
  );
}
