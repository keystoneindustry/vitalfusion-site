import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { formatDate, todayIn } from "@/lib/dates";
import { scheduleLabel } from "@/lib/calendar";
import { listPhotos, listSchedules, listWeighIns, PHOTO_BUCKET } from "@/lib/progress";
import { signedUrls } from "@/lib/storage";
import SubmitButton from "@/app/components/SubmitButton";
import DayChips from "@/app/components/DayChips";
import { PhotoCompare, WeightSummary } from "@/app/components/ProgressViews";
import { addScheduleAction, applyDefaultsAction, endScheduleAction } from "../progress-actions";

export const metadata = { title: "Progress · Vital Fusion Coach" };

const MESSAGES: Record<string, string> = {
  scheduled: "Added to their calendar ✓",
  removed: "Removed from their calendar.",
  defaults: "Starting setup added ✓",
  nothing: "They already have weigh-ins, photos and a step goal.",
};

export default async function ClientProgressPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  const { id } = await params;
  const { msg, error } = await searchParams;
  await requireCoach(`/coach/clients/${id}/progress`);
  const client = await getClient(id);
  if (!client) notFound();
  const [schedules, weighIns, photos] = await Promise.all([listSchedules(client.id), listWeighIns(client.id), listPhotos(client.id)]);
  const urls = await signedUrls(PHOTO_BUCKET, photos.map((p) => p.path)).catch(() => ({}) as Record<string, string>);
  const name = firstName(client.full_name);
  const today = todayIn(client.timezone);

  return (
    <>
      {msg && MESSAGES[msg] && <div className="notice notice-good">{MESSAGES[msg]}</div>}
      {error && <div className="notice notice-error">{error}</div>}
      <div className="detail-grid">
        <div>
          <section className="card">
            <h2 className="h2">⚖️ Weight</h2>
            <WeightSummary entries={weighIns} />
            {weighIns.length > 0 && (
              <details className="answers">
                <summary>All weigh-ins ({weighIns.length})</summary>
                <dl>
                  {weighIns.map((w) => (
                    <div key={w.date}>
                      <dt>{formatDate(w.date)}</dt>
                      <dd>
                        {w.weight_lb} lb{w.note ? ` · ${w.note}` : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </section>
          <section className="card">
            <h2 className="h2">📸 Progress photos</h2>
            <PhotoCompare photos={photos} urls={urls} />
          </section>
        </div>

        <div>
          <section className="card card-accent">
            <h2 className="h2">📅 On {name}'s calendar</h2>
            {schedules.length === 0 ? (
              <>
                <p className="muted">Nothing scheduled yet.</p>
                <form action={applyDefaultsAction.bind(null, client.id, "progress")} style={{ marginBottom: 12 }}>
                  <SubmitButton className="btn btn-sm" label="Add the starting setup" pendingLabel="Adding…" />
                </form>
              </>
            ) : (
              <ul className="flags">
                {schedules.map((s) => (
                  <li key={s.id} className="row-between">
                    <span>
                      {s.kind === "weigh_in" ? "⚖️ Weigh-in" : "📸 Progress photos"} · {scheduleLabel(s)}
                    </span>
                    <form action={endScheduleAction.bind(null, client.id, s.id)}>
                      <SubmitButton className="btn-link small" label="Remove" pendingLabel="…" />
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <details className="edit-box" open={schedules.length === 0}>
              <summary className="summary-link small">+ Schedule weigh-ins or photos</summary>
              <form action={addScheduleAction.bind(null, client.id)} style={{ marginTop: 10 }}>
                <div className="field">
                  <label>What</label>
                  <select name="kind" defaultValue="weigh_in">
                    <option value="weigh_in">⚖️ Weigh-in</option>
                    <option value="photos">📸 Progress photos</option>
                  </select>
                </div>
                <div className="field">
                  <label>
                    <input type="radio" name="mode" value="repeat" defaultChecked style={{ width: "auto", display: "inline", appearance: "auto", WebkitAppearance: "radio" }} /> Repeat on these days
                  </label>
                  <DayChips selected={[1]} />
                  <select name="every" defaultValue="1" style={{ marginTop: 8 }}>
                    <option value="1">Every week</option>
                    <option value="2">Every 2 weeks</option>
                    <option value="4">Every 4 weeks</option>
                  </select>
                </div>
                <div className="field">
                  <label>
                    <input type="radio" name="mode" value="once" style={{ width: "auto", display: "inline", appearance: "auto", WebkitAppearance: "radio" }} /> Just once, on
                  </label>
                  <input type="date" name="once" min={today} />
                </div>
                <SubmitButton className="btn btn-sm" label="Add to calendar" pendingLabel="Adding…" />
              </form>
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
