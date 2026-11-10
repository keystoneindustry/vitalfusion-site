import { requireCoach } from "@/lib/auth";
import { byCategory, DEFAULT_CATEGORIES, formatSize, KIND_ICON, KIND_LABEL, listResources, MAX_UPLOAD_MB } from "@/lib/resources";
import SubmitButton from "@/app/components/SubmitButton";
import AddResource from "./AddResource";
import { deleteResourceAction, moveResourceAction, setPublishedAction, updateResourceAction } from "./actions";

export const metadata = { title: "Resources · Vital Fusion Coach" };

const MESSAGES: Record<string, string> = {
  saved: "Saved ✓",
  shown: "Clients can see it now ✓",
  hidden: "Hidden from clients.",
  deleted: "Deleted.",
};

export default async function CoachResourcesPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireCoach("/coach/resources");
  const { msg, error } = await searchParams;
  const all = await listResources(false);
  const groups = byCategory(all);
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...all.map((r) => r.category)])];

  return (
    <div className="detail-grid">
      <div>
        <h1 className="h1">Resources</h1>
        <p className="lead">Videos and PDFs your clients see under ☰ → Resources.</p>
        {msg && MESSAGES[msg] && <div className="notice notice-good">{MESSAGES[msg]}</div>}
        {error && <div className="notice notice-error">{error}</div>}

        {groups.length === 0 && (
          <div className="card empty">
            <p style={{ margin: 0 }}>Nothing here yet. Add your first video or PDF.</p>
          </div>
        )}
        {groups.map((g) => (
          <section key={g.category} className="card">
            <h2 className="h2">{g.category}</h2>
            {g.items.map((r, i) => (
              <div key={r.id} className={`res-row ${r.published ? "" : "hidden-res"}`}>
                <div className="res-head">
                  <span className="res-icon">{KIND_ICON[r.kind]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{r.title}</b>
                    <span className="muted small" style={{ display: "block" }}>
                      {KIND_LABEL[r.kind]}
                      {r.size_bytes ? ` · ${formatSize(r.size_bytes)}` : ""}
                      {r.kind === "video_link" ? " · link" : ""}
                      {r.unlock_week ? ` · unlocks week ${r.unlock_week}` : ""}
                      {r.published ? "" : " · hidden"}
                    </span>
                  </div>
                  <div className="icon-btns">
                    <form action={moveResourceAction.bind(null, r.id, -1)}>
                      <button type="submit" disabled={i === 0} aria-label="Move up">
                        ↑
                      </button>
                    </form>
                    <form action={moveResourceAction.bind(null, r.id, 1)}>
                      <button type="submit" disabled={i === g.items.length - 1} aria-label="Move down">
                        ↓
                      </button>
                    </form>
                  </div>
                </div>
                <details className="edit-box">
                  <summary className="summary-link small">Edit</summary>
                  <form action={updateResourceAction.bind(null, r.id)} style={{ marginTop: 10 }}>
                    <div className="field">
                      <label>Title</label>
                      <input name="title" defaultValue={r.title} maxLength={120} required />
                    </div>
                    <div className="grid-2">
                      <div className="field">
                        <label>Category</label>
                        <input name="category" defaultValue={r.category} maxLength={60} list="res-cats" />
                      </div>
                      <div className="field">
                        <label>Unlocks in week</label>
                        <input name="unlockWeek" type="number" min={1} max={104} defaultValue={r.unlock_week ?? ""} placeholder="Right away" />
                      </div>
                    </div>
                    <div className="field">
                      <label>Description</label>
                      <textarea name="description" rows={2} defaultValue={r.description ?? ""} maxLength={600} />
                    </div>
                    <SubmitButton className="btn btn-ghost btn-sm" label="Save" pendingLabel="Saving…" />
                  </form>
                  <div className="row" style={{ marginTop: 10, gap: 14 }}>
                    <form action={setPublishedAction.bind(null, r.id, !r.published)}>
                      <SubmitButton className="btn-link small" label={r.published ? "Hide from clients" : "Show to clients"} pendingLabel="…" />
                    </form>
                    <form action={deleteResourceAction.bind(null, r.id)}>
                      <SubmitButton className="btn-link small danger" label="Delete" pendingLabel="Deleting…" />
                    </form>
                  </div>
                </details>
              </div>
            ))}
          </section>
        ))}
        <datalist id="res-cats">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div>
        <section className="card card-accent">
          <h2 className="h2">+ Add a resource</h2>
          <AddResource categories={categories} maxMb={MAX_UPLOAD_MB} />
        </section>
      </div>
    </div>
  );
}
