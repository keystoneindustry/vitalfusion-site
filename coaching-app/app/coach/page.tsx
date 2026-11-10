import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { listClients } from "@/lib/clients";
import { STAGES, isStage, stageLabel } from "@/lib/client-input";
import { daysBetween, formatDate, packageLabel, renewalDue, timeAgo, todayIn } from "@/lib/dates";

export const metadata = { title: "Clients · Vital Fusion Coach" };

export default async function CoachHome({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  await requireCoach("/coach");
  const { stage } = await searchParams;
  const filter = stage && isStage(stage) ? stage : null;

  const clients = await listClients();
  const today = todayIn();
  const counts = Object.fromEntries(STAGES.map((s) => [s.value, clients.filter((c) => c.stage === s.value).length]));
  const current = clients.filter((c) => c.stage !== "finished");
  const shown = filter ? clients.filter((c) => c.stage === filter) : current;

  // Things that need Tyler's attention.
  const flags: { id: string; text: string }[] = [];
  for (const c of current) {
    if (c.stage === "invited" && c.invited_at && !c.first_signed_in_at && daysBetween(c.invited_at.slice(0, 10), today) >= 3) {
      flags.push({ id: c.id, text: `${c.full_name} hasn't opened their invite (sent ${timeAgo(c.invited_at)})` });
    }
    if (c.stage === "invited" && !c.invited_at) {
      flags.push({ id: c.id, text: `${c.full_name} hasn't been sent an invite yet` });
    }
    if (renewalDue(c.end_date, today) && c.stage !== "paused") {
      flags.push({ id: c.id, text: `${c.full_name}'s package ends ${formatDate(c.end_date, false)}: renewal coming up` });
    }
  }

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

      {flags.length > 0 && (
        <section className="card card-accent">
          <h2 className="h2">Needs your attention</h2>
          <ul className="flags">
            {flags.map((f, i) => (
              <li key={`${f.id}-${i}`}>
                <Link href={`/coach/clients/${f.id}`}>{f.text}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="filters" aria-label="Filter by stage">
        <Link className="chip" aria-pressed={!filter} href="/coach">
          Current ({current.length})
        </Link>
        {STAGES.filter((s) => s.value !== "lead" || counts.lead > 0).map((s) => (
          <Link key={s.value} className="chip" aria-pressed={filter === s.value} href={`/coach?stage=${s.value}`}>
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
                  {c.last_seen_at ? `Last signed in ${timeAgo(c.last_seen_at)}` : c.invited_at ? "Not signed in yet" : "Not invited yet"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
