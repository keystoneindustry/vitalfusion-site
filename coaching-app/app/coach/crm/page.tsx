import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { loadPeople } from "@/lib/crm";
import { followUps, STATUSES, type Person } from "@/lib/crm-logic";
import { addDays, todayIn } from "@/lib/dates";
import AddLead from "./AddLead";
import LeadCard from "./LeadCard";

export const metadata = { title: "CRM · Vital Fusion" };

const FILTERS = [{ value: "followup", label: "Follow up today" }, { value: "all", label: "Everyone" }, ...STATUSES.map((s) => ({ value: s.value as string, label: s.label as string }))];

/** Every lead from the website (applications, calculator, meal plan, grocery list, blueprint) plus ones added by hand. */
export default async function CrmPage({ searchParams }: { searchParams: Promise<{ show?: string; q?: string }> }) {
  await requireCoach("/coach/crm");
  const sp = await searchParams;
  const today = todayIn();
  const { people } = await loadPeople();
  const due = followUps(people, today);
  const reasons = new Map(due.map((d) => [d.person.key, d.reason]));
  const show = FILTERS.some((f) => f.value === sp.show) ? sp.show! : due.length ? "followup" : "all";
  const query = (sp.q ?? "").trim().toLowerCase().slice(0, 80);

  let list: Person[] = show === "followup" ? due.map((d) => d.person) : show === "all" ? people : people.filter((p) => p.status === show);
  if (query) list = people.filter((p) => `${p.name} ${p.email ?? ""} ${p.instagram ?? ""}`.toLowerCase().includes(query));

  const weekAgo = addDays(today, -7);
  const leads = people.filter((p) => p.status !== "client" && p.status !== "not_fit");
  const count = (v: string) => (v === "followup" ? due.length : v === "all" ? people.length : people.filter((p) => p.status === v).length);

  return (
    <>
      <h1 className="h1">CRM</h1>
      <p className="lead" style={{ marginTop: -4 }}>
        Everyone who applied or grabbed a freebie on your website, plus anyone you add yourself.
      </p>

      <div className="stat-row stat-row-4">
        <div className={`stat${due.length ? " stat-warn" : ""}`}>
          <b>{due.length}</b>
          <span>to follow up</span>
        </div>
        <div className="stat">
          <b>{people.filter((p) => p.firstSeen.slice(0, 10) >= weekAgo).length}</b>
          <span>new this week</span>
        </div>
        <div className="stat">
          <b>{leads.length}</b>
          <span>open leads</span>
        </div>
        <div className="stat">
          <b>{people.filter((p) => p.status === "client").length}</b>
          <span>became clients</span>
        </div>
      </div>

      <form className="crm-search" action="/coach/crm">
        <input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Search by name, email or Instagram" aria-label="Search leads" />
        <button className="btn btn-ghost btn-sm" type="submit">
          Search
        </button>
      </form>

      {!query && (
        <nav className="lift-chips" aria-label="Filter leads">
          {FILTERS.map((f) => (
            <Link key={f.value} href={`/coach/crm?show=${f.value}`} aria-current={show === f.value ? "true" : undefined} scroll={false}>
              {f.label} ({count(f.value)})
            </Link>
          ))}
        </nav>
      )}
      {query && (
        <p className="small muted">
          {list.length} match{list.length === 1 ? "" : "es"} for “{sp.q}”. <Link href="/coach/crm">Clear search</Link>
        </p>
      )}

      {list.length === 0 ? (
        <section className="card">
          <p style={{ margin: 0 }}>{show === "followup" ? "Nobody to follow up with today ✓" : "Nobody here yet."}</p>
        </section>
      ) : (
        <div className="lead-list">
          {list.slice(0, 150).map((p) => (
            <LeadCard key={`${p.key}-${p.status}-${p.followUpOn ?? ""}-${p.lastContactedAt ?? ""}`} p={p} reason={show === "followup" && !query ? reasons.get(p.key) : undefined} />
          ))}
        </div>
      )}
      {list.length > 150 && <p className="small muted">Showing the newest 150. Search to find someone older.</p>}

      <div style={{ marginTop: 16 }}>
        <AddLead />
      </div>
    </>
  );
}
