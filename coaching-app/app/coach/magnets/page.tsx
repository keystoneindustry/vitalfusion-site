import { after } from "next/server";
import { requireCoach } from "@/lib/auth";
import { loadFunnel } from "@/lib/crm";
import { addDays, timeAgo, todayIn } from "@/lib/dates";
import { buildMagnets, countBySubject, type EmailCount, type MagnetView } from "@/lib/lead-magnets";
import { isStale, lastSync, loadAutomations, loadEmailRows, resendReadConfigured, syncResend } from "@/lib/resend-read";

export const metadata = { title: "Lead magnets · Vital Fusion" };
export const maxDuration = 60;

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

function Delivered({ c }: { c: EmailCount }) {
  if (c.sent === 0) return <span className="muted">none sent yet</span>;
  return (
    <span>
      <b>{c.delivered}</b> delivered of {c.sent} sent ({pct(c.delivered, c.sent)})
      {c.bounced > 0 && <span className="mag-bounce"> · {c.bounced} bounced</span>}
      {c.opened > 0 && <span className="muted"> · {c.opened} opened</span>}
    </span>
  );
}

function AutomationCard({ a }: { a: MagnetView["automations"][number] }) {
  const r = a.runs;
  return (
    <div className="mag-auto">
      <div className="legal-head">
        <b>{a.name}</b>
        <span className={`pill ${a.status === "enabled" ? "pill-active" : "pill-finished"}`}>{a.status === "enabled" ? "On" : "Off"}</span>
      </div>
      <p className="small muted" style={{ margin: "4px 0 8px" }}>
        {(r.total ?? 0) === 0
          ? "Nobody has entered it yet."
          : `${r.total} entered · ${r.running ?? 0} still getting emails · ${r.completed ?? 0} finished${r.stopped ? ` · ${r.stopped} stopped early` : ""}`}
      </p>
      {a.emails.length === 0 ? (
        <p className="small muted" style={{ margin: 0 }}>No emails in this automation.</p>
      ) : (
        <ol className="mag-steps">
          {a.emails.map((e, i) => (
            <li key={i}>
              <span className="mag-day">{e.day === null ? `Email ${i + 1}` : e.day === 0 ? "Right away" : `Day ${e.day}`}</span>
              <span className="mag-step-text">
                <b>{e.subject || "(no subject)"}</b>
                <span className="small">
                  <Delivered c={e} />
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Every freebie on the website: signups, the email that delivers it, and the Resend automation that follows it up. */
export default async function LeadMagnetsPage() {
  await requireCoach("/coach/magnets");
  const today = todayIn();
  const connected = resendReadConfigured();
  let state = connected ? await lastSync() : { at: null, note: null };
  if (connected && !state.at) state = await syncResend(); // first visit: fill it in now
  else if (connected && isStale(state)) after(() => syncResend().then(() => undefined)); // otherwise refresh behind the scenes

  const [funnel, automations, emails] = await Promise.all([loadFunnel(), loadAutomations().catch(() => []), loadEmailRows().catch(() => [])]);
  const { magnets, other } = buildMagnets(funnel, automations, countBySubject(emails), `${addDays(today, -7)}T00:00:00Z`);

  return (
    <>
      <h1 className="h1">Lead magnets</h1>
      <p className="lead" style={{ marginTop: -4 }}>
        Every freebie on your website, how many people signed up, and the follow-up emails each one sends.
        {connected && state.at ? ` Email numbers updated ${timeAgo(state.at)}.` : ""}
      </p>

      {!connected && (
        <section className="card card-accent">
          <h2 className="h2" style={{ marginTop: 0 }}>Connect Resend to see the emails</h2>
          <p style={{ marginTop: 0 }}>Signups below are live. To add the automations and delivery numbers, one-time setup (about 3 minutes):</p>
          <ol className="setup-steps">
            <li>In Resend, open <b>API Keys → Create API key</b>.</li>
            <li>Name it “Coach portal (read)”. Set Permission to <b>Full access</b> (Resend only lets full-access keys read emails). Create it and copy the key.</li>
            <li>In Vercel, open the <b>vitalfusion-app</b> project → <b>Settings → Environment Variables</b>. Add <code>RESEND_READ_KEY</code> with the key as its value, for Production.</li>
            <li>Tell Claude “Resend key added” and it will redeploy so the numbers show up here.</li>
          </ol>
        </section>
      )}
      {connected && state.note && (
        <p className="notice notice-warn">Couldn't read from Resend just now ({state.note}). Showing the last numbers saved.</p>
      )}

      {magnets.map((m) => (
        <section className="card" key={m.magnet.id}>
          <div className="legal-head">
            <h2 className="h2" style={{ margin: 0 }}>{m.magnet.name}</h2>
            <a className="small" href={m.magnet.url} target="_blank" rel="noopener noreferrer">
              Open page ↗
            </a>
          </div>
          <div className="kpi-grid" style={{ marginTop: 12 }}>
            <div className="kpi">
              <b>{m.signups}</b>
              <span>signups</span>
              <em>{m.people === 1 ? "1 person" : `${m.people} different people`}</em>
            </div>
            <div className="kpi">
              <b>{m.signups7}</b>
              <span>in the last 7 days</span>
            </div>
            {connected && (
              <div className="kpi">
                <b>{m.delivery.delivered}</b>
                <span>freebie emails delivered</span>
                <em>
                  {m.delivery.sent} sent{m.delivery.bounced ? ` · ${m.delivery.bounced} bounced` : ""}
                </em>
              </div>
            )}
            {connected && (
              <div className="kpi">
                <b>{m.automations.reduce((n, a) => n + (a.runs.running ?? 0), 0)}</b>
                <span>getting follow-ups now</span>
                <em>{m.automations.reduce((n, a) => n + (a.runs.total ?? 0), 0)} entered in total</em>
              </div>
            )}
          </div>
          {m.versions.length > 0 && (
            <p className="small muted" style={{ margin: "10px 0 0" }}>
              {m.versions.map((v) => `${v.label}: ${v.signups}`).join(" · ")}
            </p>
          )}
          {connected && (
            <>
              <p className="small" style={{ margin: "12px 0 4px" }}>
                <b>Delivery email</b> “{m.magnet.deliverySubject}”: <Delivered c={m.delivery} />
              </p>
              {m.automations.length === 0 ? (
                <p className="small muted" style={{ margin: "8px 0 0" }}>No follow-up automation found in Resend for this one.</p>
              ) : (
                m.automations.map((a) => <AutomationCard key={a.id} a={a} />)
              )}
            </>
          )}
        </section>
      ))}

      {connected && other.length > 0 && (
        <section className="card">
          <h2 className="h2" style={{ marginTop: 0 }}>Other automations</h2>
          <p className="small muted" style={{ marginTop: -4 }}>In Resend but not tied to a lead magnet.</p>
          {other.map((a) => (
            <AutomationCard key={a.id} a={a} />
          ))}
        </section>
      )}

      {connected && <p className="small muted">Opens and clicks aren't tracked on your Resend domain, so only sent, delivered and bounced are shown.</p>}
    </>
  );
}
