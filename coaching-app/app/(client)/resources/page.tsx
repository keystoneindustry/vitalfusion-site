import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { packageStatus, todayIn } from "@/lib/dates";
import { byCategory, KIND_ICON, KIND_LABEL, listResources, unlocked } from "@/lib/resources";

export const metadata = { title: "Resources · Vital Fusion" };

export default async function ResourcesPage() {
  const { client } = await requireClient("/resources");
  const today = todayIn(client.timezone);
  const status = packageStatus(client.start_date, client.end_date, today);
  const week = status.kind === "in_progress" ? status.week : status.kind === "ended" ? 999 : 1;
  const all = await listResources(true);
  const groups = byCategory(all);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;

  return (
    <>
      <p className="eyebrow">Resources</p>
      <h1 className="h1">Resources</h1>
      <p className="program-intro">Videos and guides from Tyler. New ones unlock as your coaching goes on.</p>
      {groups.length === 0 && (
        <div className="card empty">
          <p style={{ margin: 0 }}>Tyler's videos and guides will show up here.</p>
        </div>
      )}
      {groups.map((g) => (
        <section key={g.category} style={{ marginBottom: 18 }}>
          <h2 className="section-title" style={{ marginTop: 6 }}>
            {g.category}
          </h2>
          <div className="res-list">
            {g.items.map((r) => {
              const open = unlocked(r, week);
              const inner = (
                <>
                  <span className="res-icon">{open ? KIND_ICON[r.kind] : "🔒"}</span>
                  <span className="res-text">
                    <b>{r.title}</b>
                    <span className="muted small">
                      {open ? KIND_LABEL[r.kind] : `Unlocks in week ${r.unlock_week}`}
                      {open && Date.parse(r.created_at) > weekAgo ? <span className="new-badge">New</span> : null}
                    </span>
                  </span>
                  {open && (
                    <span className="chev" aria-hidden="true">
                      ›
                    </span>
                  )}
                </>
              );
              return open ? (
                <Link key={r.id} href={`/resources/${r.id}`} className="res-card">
                  {inner}
                </Link>
              ) : (
                <div key={r.id} className="res-card locked">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
