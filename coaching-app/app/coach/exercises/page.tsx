import { requireCoach } from "@/lib/auth";
import { EXERCISE_CATEGORIES, hasVideo, listExercises } from "@/lib/exercises";
import SubmitButton from "@/app/components/SubmitButton";
import ExerciseForm from "./ExerciseForm";
import EditExercise from "./EditExercise";
import { deleteExerciseAction } from "./actions";

export const metadata = { title: "Exercise library · Vital Fusion Coach" };

/** Every exercise with its demo video. Workouts link to these by name, so clients get a "Watch demo" button. */
export default async function ExercisesPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; msg?: string }> }) {
  await requireCoach("/coach/exercises");
  const { q = "", f = "", msg } = await searchParams;
  const all = await listExercises();
  const categories = [...new Set([...EXERCISE_CATEGORIES, ...all.map((x) => x.category)])];
  const withVideo = all.filter(hasVideo).length;
  const needle = q.trim().toLowerCase();
  const shown = all.filter((x) => (!needle || x.name.toLowerCase().includes(needle)) && (f !== "missing" || !hasVideo(x)) && (f !== "video" || hasVideo(x)));
  const groups = categories.map((c) => ({ c, items: shown.filter((x) => x.category === c) })).filter((g) => g.items.length);

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className="h1">Exercise library</h1>
      <p className="lead">
        {all.length} exercises · {withVideo} with a demo video. When a workout uses one of these, the client gets a “▶ Watch demo” button.
      </p>
      {msg === "deleted" && <div className="notice notice-good">Deleted ✓</div>}

      <details className="card card-accent" open={all.length === 0}>
        <summary className="summary-link">
          <b>+ Add an exercise</b>
        </summary>
        <div style={{ marginTop: 12 }}>
          <ExerciseForm categories={categories} />
        </div>
      </details>

      <form className="ex-search" method="get">
        <input name="q" defaultValue={q} placeholder="Search exercises" />
        <select name="f" defaultValue={f}>
          <option value="">All</option>
          <option value="missing">Needs a video</option>
          <option value="video">Has a video</option>
        </select>
        <button className="btn btn-sm" type="submit">
          Go
        </button>
      </form>

      {groups.length === 0 && <p className="muted">No exercises match.</p>}
      {groups.map((g) => (
        <section key={g.c} className="card">
          <h2 className="h2">{g.c}</h2>
          <ul className="ex-lib">
            {g.items.map((x) => (
              <li key={x.id}>
                <div className="row-between">
                  <span>
                    <b>{x.name}</b> {hasVideo(x) ? <span className="ex-has">🎬 Demo</span> : <span className="muted small">No video</span>}
                  </span>
                  <span className="row" style={{ gap: 14 }}>
                    <EditExercise categories={categories} initial={{ id: x.id, name: x.name, category: x.category, cue: x.cue, videoUrl: x.video_url, hasFile: !!x.video_path }} />
                    <details className="ex-del">
                      <summary>Delete</summary>
                      <form action={deleteExerciseAction.bind(null, x.id)}>
                        <SubmitButton className="btn-link small danger" label="Yes, delete" pendingLabel="…" />
                      </form>
                    </details>
                  </span>
                </div>
                {x.cue && <p className="small muted" style={{ margin: "4px 0 0" }}>{x.cue}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
