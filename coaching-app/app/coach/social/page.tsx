import { requireCoach } from "@/lib/auth";
import { formatDate, timeAgo } from "@/lib/dates";
import { followerHistory, latestSnapshot, type SocialPost } from "@/lib/social";

export const metadata = { title: "Social media · Vital Fusion" };

const n = (v: number | undefined | null) => (typeof v === "number" ? v.toLocaleString("en-US") : "–");

function postName(p: SocialPost): string {
  const c = (p.caption ?? "").trim().split("\n")[0];
  return c ? (c.length > 70 ? `${c.slice(0, 68)}…` : c) : p.is_reel ? "Reel (no caption)" : "Post (no caption)";
}
function postDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }).format(new Date(iso));
}

/** Instagram numbers, refreshed once a day by a scheduled Claude task. */
export default async function SocialPage() {
  await requireCoach("/coach/social");
  const [snap, history] = await Promise.all([latestSnapshot(), followerHistory(90)]);

  if (!snap) {
    return (
      <>
        <h1 className="h1">Social media</h1>
        <section className="card">
          <p style={{ margin: 0 }}>No Instagram numbers yet. They're filled in once a day, so check back tomorrow morning.</p>
        </section>
      </>
    );
  }

  const a = snap.account;
  const days = a.days ?? 28;
  const posts = snap.posts ?? [];
  const top = [...posts].sort((x, y) => (y.views ?? 0) - (x.views ?? 0)).slice(0, 5);
  const net = (a.follows ?? 0) - (a.unfollows ?? 0);
  const first = history[0];
  const grew = first && history.length > 1 && typeof a.followers === "number" ? a.followers - first.followers : null;
  const avgViews = posts.length ? Math.round(posts.reduce((s, p) => s + (p.views ?? 0), 0) / posts.length) : 0;

  // Follower chart (needs at least two days of history).
  const W = 380;
  const H = 150;
  const pad = { l: 44, r: 10, t: 12, b: 22 };
  const vals = history.map((h) => h.followers);
  const lo = Math.min(...vals) - 5;
  const hi = Math.max(...vals) + 5;
  const x = (i: number) => pad.l + (history.length <= 1 ? 0 : (i / (history.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - pad.t - pad.b);

  return (
    <>
      <h1 className="h1">Social media</h1>
      <p className="lead" style={{ marginTop: -4 }}>
        Instagram @{a.username ?? "tkennyfitness"} · updated {timeAgo(snap.fetched_at)} (refreshes every morning)
      </p>

      <div className="kpi-grid">
        <div className="kpi">
          <b>{n(a.followers)}</b>
          <span>followers</span>
          {grew !== null && <em className={grew >= 0 ? "up" : "down"}>{grew >= 0 ? "+" : ""}{grew} since {formatDate(first.day, false)}</em>}
        </div>
        <div className="kpi">
          <b>{n(a.views)}</b>
          <span>views, last {days} days</span>
        </div>
        <div className="kpi">
          <b>{n(a.reach)}</b>
          <span>accounts reached</span>
        </div>
        <div className="kpi">
          <b>{n(a.profile_views)}</b>
          <span>profile visits</span>
          <em>{n(a.website_clicks)} link taps</em>
        </div>
        <div className="kpi">
          <b>{net >= 0 ? "+" : ""}{net}</b>
          <span>net followers, last {days} days</span>
          <em className={net >= 0 ? "up" : "down"}>{n(a.follows)} followed · {n(a.unfollows)} unfollowed</em>
        </div>
        <div className="kpi">
          <b>{n(a.total_interactions)}</b>
          <span>interactions</span>
          <em>{n(a.likes)} likes · {n(a.comments)} comments</em>
        </div>
        <div className="kpi">
          <b>{n(a.saves)}</b>
          <span>saves</span>
          <em>{n(a.shares)} shares</em>
        </div>
        <div className="kpi">
          <b>{n(avgViews)}</b>
          <span>average views per post</span>
          <em>last {posts.length} posts</em>
        </div>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0 }}>📈 Followers</h2>
        {history.length < 2 ? (
          <p className="muted" style={{ margin: 0 }}>The growth chart starts filling in tomorrow: one point is added each day.</p>
        ) : (
          <figure className="chart" aria-label="Followers over time">
            <svg viewBox={`0 0 ${W} ${H}`} role="img">
              {[hi, Math.round((hi + lo) / 2), lo].map((t) => (
                <g key={t}>
                  <line className="chart-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
                  <text className="chart-label" x={pad.l - 6} y={y(t) + 4} textAnchor="end">{t.toLocaleString("en-US")}</text>
                </g>
              ))}
              <path className="chart-line" d={history.map((h, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(h.followers).toFixed(1)}`).join(" ")} />
              <text className="chart-label" x={pad.l} y={H - 4}>{formatDate(history[0].day, false)}</text>
              <text className="chart-label" x={W - pad.r} y={H - 4} textAnchor="end">{formatDate(history[history.length - 1].day, false)}</text>
            </svg>
          </figure>
        )}
      </section>

      {top.length > 0 && (
        <section className="card">
          <h2 className="h2" style={{ marginTop: 0 }}>🏆 Best recent posts</h2>
          <ol className="top-posts">
            {top.map((p) => (
              <li key={p.id}>
                <a href={p.permalink} target="_blank" rel="noopener noreferrer">
                  <b>{postName(p)}</b>
                  <span className="small muted">
                    {postDay(p.posted_at)} · {n(p.views)} views · {n(p.likes)} likes · {n(p.saves)} saves · {n(p.shares)} shares
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>All recent posts</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Post</th>
                <th className="num">Views</th>
                <th className="num">Reach</th>
                <th className="num">Likes</th>
                <th className="num">Comments</th>
                <th className="num">Shares</th>
                <th className="num">Saves</th>
                <th className="num">Avg watch</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td style={{ minWidth: 190 }}>
                    <a href={p.permalink} target="_blank" rel="noopener noreferrer">{postName(p)}</a>
                    <br />
                    <span className="small muted">{postDay(p.posted_at)} · {p.is_reel ? "Reel" : p.kind === "carousel" ? "Carousel" : "Post"}</span>
                  </td>
                  <td className="num">{n(p.views)}</td>
                  <td className="num">{n(p.reach)}</td>
                  <td className="num">{n(p.likes)}</td>
                  <td className="num">{n(p.comments)}</td>
                  <td className="num">{n(p.shares)}</td>
                  <td className="num">{n(p.saves)}</td>
                  <td className="num">{p.avg_watch_time_ms ? `${Math.round(p.avg_watch_time_ms / 1000)}s` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
