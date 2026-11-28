import { requireCoach } from "@/lib/auth";
import { loadPeople } from "@/lib/crm";
import { bySource, kindLabel, leadsByWeek } from "@/lib/crm-logic";
import { formatDate, todayIn } from "@/lib/dates";
import { loadRevenue, money, stripeConfigured, type Revenue } from "@/lib/stripe";
import { db } from "@/lib/supabase";
import { loadUpcomingCalls } from "@/lib/cal";
import CallSchedule from "../CallSchedule";

export const metadata = { title: "Business · Vital Fusion" };

function Bars({ data }: { data: { label: string; value: number; show: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars" role="img" aria-label={data.map((d) => `${d.label}: ${d.show}`).join(", ")}>
      {data.map((d) => (
        <div key={d.label}>
          <b>{d.show}</b>
          <i style={{ height: `${Math.round((d.value / max) * 78)}%` }} />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** How the business is running: money in (Stripe), leads and where they come from, conversion, costs. */
export default async function BusinessPage() {
  await requireCoach("/coach/business");
  const today = todayIn();
  const monthStart = `${today.slice(0, 8)}01`;
  const [{ people, funnel }, ai, clients, signed] = await Promise.all([
    loadPeople(),
    db<{ cost_usd: number | null }[]>(`ai_usage?select=cost_usd&created_at=gte.${monthStart}T00:00:00Z`).catch(() => []),
    db<{ stage: string }[]>("clients?select=stage").catch(() => []),
    db<{ id: string }[]>("legal_requests?select=id&status=eq.signed").catch(() => []),
  ]);
  let revenue: Revenue | null = null;
  let revenueError = false;
  try {
    revenue = await loadRevenue();
  } catch (err) {
    console.error("Stripe revenue failed", err);
    revenueError = true;
  }

  const schedule = await loadUpcomingCalls();
  const weeks = leadsByWeek(funnel, today, 8);
  const kinds = new Map<string, number>();
  for (const f of funnel) kinds.set(f.kind, (kinds.get(f.kind) ?? 0) + 1);
  const sources = bySource(people);
  const applied = people.filter((p) => p.applied).length;
  const becameClients = people.filter((p) => p.status === "client").length;
  const aiCost = ai.reduce((n, r) => n + (Number(r.cost_usd) || 0), 0);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

  return (
    <>
      <h1 className="h1">Business</h1>
      <p className="lead" style={{ marginTop: -4 }}>Money in, leads, and how well they turn into clients.</p>

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>💵 Revenue</h2>
        {revenue ? (
          <>
            <div className="kpi-grid">
              <div className="kpi">
                <b>{money(revenue.thisMonth)}</b>
                <span>this month</span>
              </div>
              <div className="kpi">
                <b>{money(revenue.lastMonth)}</b>
                <span>last month</span>
              </div>
              <div className="kpi">
                <b>{money(revenue.last30)}</b>
                <span>last 30 days</span>
              </div>
              <div className="kpi">
                <b>{revenue.months[revenue.months.length - 1]?.count ?? 0}</b>
                <span>payments this month</span>
              </div>
            </div>
            <Bars data={revenue.months.map((m) => ({ label: m.label, value: m.total, show: money(Math.round(m.total)) }))} />
            <p className="small muted" style={{ marginTop: 8 }}>From Stripe, after refunds, before Stripe's fees.</p>
            {revenue.recent.length > 0 && (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Recent payments</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.recent.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.who}
                          <br />
                          <span className="small muted">
                            {formatDate(new Date(p.created * 1000).toISOString().slice(0, 10), false)} · {p.what}
                          </span>
                        </td>
                        <td className="num">{money(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : revenueError ? (
          <p className="notice notice-warn" style={{ margin: 0 }}>Stripe didn't accept the key in Vercel (STRIPE_READ_KEY). Check that it's a restricted key with Charges set to Read.</p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>Stripe isn't connected yet. One-time setup, about 3 minutes:</p>
            <ol className="setup-steps">
              <li>In Stripe, open <b>Developers → API keys → Create restricted key</b>.</li>
              <li>Name it “Coach portal”. Set <b>Charges</b> to <b>Read</b> and leave everything else on None. Create it and copy the key (starts with <code>rk_live_</code>).</li>
              <li>In Vercel, open the <b>vitalfusion-app</b> project → <b>Settings → Environment Variables</b>. Add <code>STRIPE_READ_KEY</code> with the key as its value, for Production.</li>
              <li>Tell Claude “Stripe key added” and it will redeploy so the numbers show up here.</li>
            </ol>
          </>
        )}
      </section>

      <CallSchedule result={schedule} limit={20} setup />

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>🧲 Leads per week</h2>
        <Bars data={weeks.map((w) => ({ label: formatDate(w.week, false), value: w.count, show: String(w.count) }))} />
        <p className="small muted" style={{ marginTop: 8 }}>Every signup on the website. The last bar is this week so far.</p>
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>🔻 Lead to client</h2>
        <div className="kpi-grid">
          <div className="kpi">
            <b>{people.length}</b>
            <span>people</span>
          </div>
          <div className="kpi">
            <b>{applied}</b>
            <span>applied</span>
            <em>{pct(applied, people.length)} of people</em>
          </div>
          <div className="kpi">
            <b>{becameClients}</b>
            <span>became clients</span>
            <em>{pct(becameClients, people.length)} of people</em>
          </div>
          <div className="kpi">
            <b>{clients.filter((c) => c.stage !== "lead" && c.stage !== "finished").length + signed.length}</b>
            <span>current clients</span>
            <em>app clients + signed agreements</em>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>📍 Where leads come from</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th className="num">People</th>
                <th className="num">Applied</th>
                <th className="num">Clients</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source}>
                  <td>{s.source}</td>
                  <td className="num">{s.people}</td>
                  <td className="num">{s.applied}</td>
                  <td className="num">{s.clients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>Each person is counted once, under the first place they signed up from.</p>
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>🎁 What they signed up for</h2>
        <div className="table-scroll">
          <table className="data-table">
            <tbody>
              {[...kinds.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => (
                  <tr key={k}>
                    <td>{kindLabel(k)}</td>
                    <td className="num">{n}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>🤖 AI costs this month</h2>
        <p style={{ margin: 0 }}>
          <b>{money(Math.round(aiCost * 100) / 100)}</b> <span className="muted">estimated, for plan drafts, check-in reviews and the nutrition assistant. The exact bill is in your Anthropic console.</span>
        </p>
      </section>
    </>
  );
}
