import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { listClients } from "@/lib/clients";
import { STAGES, isStage, stageLabel } from "@/lib/client-input";
import { daysBetween, formatDate, packageLabel, renewalDue, timeAgo, todayIn } from "@/lib/dates";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { formatCallTime } from "@/lib/booking";
import { planSummaries } from "@/lib/plans";
import { awaitingReply } from "@/lib/forms";
import { loadAtRisk } from "@/lib/at-risk";

function onboardingLine(step: string, kickoffAt: string | null, tz: string): string | null {
  if (step === "done") return kickoffAt ? `Kickoff: ${formatCallTime(kickoffAt, tz)}` : "Onboarding done";
  const i = ONBOARDING_STEPS.findIndex((s) => s.id === step);
  return i >= 0 ? `Onboarding ${i + 1}/${ONBOARDING_STEPS.length}: ${ONBOARDING_STEPS[i].label}` : null;
}

export const metadata = { title: "Clients · Vital Fusion Coach" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ stage?: string; deleted?: string }> }) {
  await requireCoach("/coach/clients");
  const { stage, deleted } = await searchParams;
  const filter = stage && isStage(stage) ? stage : null;

  const [clients, plans, unreplied] = await Promise.all([listClients(), planSummaries(), awaitingReply()]);
  const risks = await loadAtRisk(clients).catch(() => []);
  const today = todayIn();
  const counts = Object.fromEntries(STAGES.map((s) => [s.value, clients.filter((c) => c.stage === s.value).length]));
  const current = clients.filter((c) => c.stage !== "finished");
  const shown = filter ? clients.filter((c) => c.stage === filter) : current;

  return (
    <>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <h1 className="h1" style={{ margin: 0 }}>Clients</h1>
        <Link className="btn btn-sm" href="/coach/clients/new">
          + Add client
        </Link>
      </div>
      <p className="lead">
        {current.length} current client{current.length === 1 ? "" : "s"}
        {counts.finished ? ` · ${counts.finished} finished` : ""}
      </p>

      {deleted && <div className="notice notice-good">{deleted} and all their data were deleted.</div>}
      <div className="filters" aria-label="Filter by stage">
        <Link className="chip" aria-pressed={!filter} href="/coach/clients">
          Current ({current.length})
        </Link>
        {STAGES.filter((s) => s.value !== "lead" || counts.lead > 0).map((s) => (
          <Link key={s.value} className="chip" aria-pressed={filter === s.value} href={`/coach/clients?stage=${s.value}`}>
            {s.label} ({counts[s.value] ?? 0})
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card empty">
          {clients.length === 0 ? (
            <>
              <p style={{ marginTop: 0 }}>No clients yet. Add your first one and they'll get their invite email right away.</p>
              <Link className="btn" href="/coach/clients/new">
                + Add your first client
              </Link>
            </>
          ) : (
            <p style={{ margin: 0 }}>No clients in this stage.</p>
          )}
        </div>
      ) : (
        <ul className="client-list">
          {shown.map((c) => (
            <li key={c.id} className="client-item">
              <Link href={`/coach/clients/${c.id}`}>
                <div className="row-between">
                  <span className="name">{c.full_name}</span>
                  <span className={`pill pill-${c.stage}`}>{stageLabel(c.stage)}</span>
                </div>
                <div className="meta">
                  {c.coaching_weeks ? `${c.coaching_weeks}-week package · ` : ""}
                  {packageLabel(c.start_date, c.end_date, today)}
                  <br />
                  {c.start_date ? `${formatDate(c.start_date, false)} – ${formatDate(c.end_date)}` : "No dates set"}
                  {" · "}
                  {c.last_seen_at ? `Last opened the app ${timeAgo(c.last_seen_at)}` : c.invited_at ? "Not signed in yet" : "Not invited yet"}
                  {(() => {
                    const r = risks.find((x) => x.clientId === c.id);
                    return r ? (
                      <>
                        <br />
                        <span style={{ color: r.level === "high" ? "#ff8a8a" : "var(--warn)" }}>
                          {r.level === "high" ? "🔴" : "🟡"} At risk: {r.reasons.join(" · ")}
                        </span>
                      </>
                    ) : null;
                  })()}
                  {c.first_signed_in_at && (c.stage === "onboarding" || c.onboarding_step !== "done") && (
                    <>
                      <br />
                      {onboardingLine(c.onboarding_step, c.kickoff_at, c.timezone)}
                    </>
                  )}
                  {c.health_flag && (
                    <>
                      <br />
                      <span style={{ color: "var(--warn)" }}>⚠️ Health questions need review</span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
