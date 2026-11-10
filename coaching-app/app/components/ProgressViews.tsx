import { addDays, formatDate } from "@/lib/dates";
import { POSES, photoSets, weeklyAverages, type ProgressPhoto, type WeighIn } from "@/lib/progress";
import WeightChart from "./WeightChart";

/** Weight summary + chart, shared by the client's and the coach's Progress pages. */
export function WeightSummary({ entries }: { entries: WeighIn[] }) {
  if (entries.length === 0) return <p className="muted" style={{ margin: 0 }}>No weigh-ins yet.</p>;
  const latest = entries[0];
  const first = entries[entries.length - 1];
  const change = Math.round((latest.weight_lb - first.weight_lb) * 10) / 10;
  const weeks = weeklyAverages(entries);
  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <b>{latest.weight_lb}</b>
          <span>latest (lb)</span>
        </div>
        <div className="stat">
          <b>
            {change > 0 ? "+" : ""}
            {change}
          </b>
          <span>since {formatDate(first.date, false)}</span>
        </div>
        <div className="stat">
          <b>{weeks[weeks.length - 1].avg}</b>
          <span>this week's avg</span>
        </div>
      </div>
      <WeightChart
        daily={[...entries].reverse().map((e) => ({ date: e.date, y: e.weight_lb }))}
        weekly={weeks.map((w) => ({ date: addDays(w.week, 3), y: w.avg }))}
      />
    </>
  );
}

/** First vs latest photo for each pose, then every set by date. */
export function PhotoCompare({ photos, urls }: { photos: ProgressPhoto[]; urls: Record<string, string> }) {
  const sets = photoSets(photos);
  if (sets.length === 0) return <p className="muted" style={{ margin: 0 }}>No progress photos yet.</p>;
  const first = sets[sets.length - 1];
  const latest = sets[0];
  return (
    <>
      {sets.length > 1 && (
        <div className="compare">
          {POSES.map((p) => {
            const a = first.poses[p.value];
            const b = latest.poses[p.value];
            if (!a && !b) return null;
            return (
              <div key={p.value} className="compare-row">
                <span className="compare-label">{p.label}</span>
                <figure>
                  {a && urls[a] ? <img src={urls[a]} alt={`${p.label}, ${first.date}`} loading="lazy" /> : <span className="ph-empty">—</span>}
                  <figcaption>{formatDate(first.date, false)}</figcaption>
                </figure>
                <figure>
                  {b && urls[b] ? <img src={urls[b]} alt={`${p.label}, ${latest.date}`} loading="lazy" /> : <span className="ph-empty">—</span>}
                  <figcaption>{formatDate(latest.date, false)}</figcaption>
                </figure>
              </div>
            );
          })}
        </div>
      )}
      <details className="answers" open={sets.length === 1}>
        <summary>All photos ({sets.length} date{sets.length === 1 ? "" : "s"})</summary>
        {sets.map((s) => (
          <div key={s.date} className="photo-set">
            <h3>{formatDate(s.date)}</h3>
            <div className="photo-row">
              {POSES.map((p) => {
                const path = s.poses[p.value];
                return (
                  <figure key={p.value}>
                    {path && urls[path] ? (
                      <a href={urls[path]} target="_blank" rel="noopener noreferrer">
                        <img src={urls[path]} alt={`${p.label}, ${s.date}`} loading="lazy" />
                      </a>
                    ) : (
                      <span className="ph-empty">—</span>
                    )}
                    <figcaption>{p.label}</figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        ))}
      </details>
    </>
  );
}
