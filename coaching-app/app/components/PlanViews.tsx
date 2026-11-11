import {
  mealMacros,
  MEAL_CATEGORIES,
  perfectDayLines,
  perfectDayMacros,
  roundMacros,
  servingsLabel,
  closeness,
  type Nutrition,
  type PlanMeal,
  type Training,
  toLines,
} from "@/lib/plan";
import { estimateMinutes } from "@/lib/training-brief";
import type { Targets } from "@/lib/targets";

/** Read-only pieces of a plan, shared by the client screens and the coach's review screen. */

function pretty(food: string): string {
  return food ? food[0].toUpperCase() + food.slice(1) : food;
}

const CATEGORY_ICON: Record<string, string> = { breakfast: "🍳", lunch: "🥗", dinner: "🍽️", snack: "🍎" };

/** One meal: name + quick tags; opens to ingredients and numbered steps. */
export function MealCard({
  meal,
  open = false,
  time,
  servings = 1,
  children,
}: {
  meal: PlanMeal;
  open?: boolean;
  time?: string;
  servings?: number;
  children?: React.ReactNode;
}) {
  const m = roundMacros(mealMacros(meal));
  const f = servings;
  const steps = toLines(meal.instructions);
  return (
    <details className="meal" open={open}>
      <summary>
        {time !== undefined && <span className="meal-time">{time || "—"}</span>}
        <span className="meal-title">
          <b>{meal.name}</b>
          <span className="meal-tags">
            <span>🔥 {Math.round(m.calories * f)} kcal</span>
            <span>{Math.round(m.protein * f)}g protein</span>
            {meal.prepMinutes ? <span className="tag-muted">⏱ {meal.prepMinutes} min</span> : null}
          </span>
        </span>
        <span className="chev" aria-hidden="true">›</span>
      </summary>
      <div className="meal-body">
        {meal.why && <p className="meal-why">{meal.why}</p>}
        {servings !== 1 && <p className="serving-note">Have {servingsLabel(servings)} of this.</p>}
        <h4>Ingredients</h4>
        <ul className="ing-list">
          {meal.ingredients.map((i, k) => (
            <li key={k}>
              <span className="amt">{i.household || `${i.grams} g`}</span>
              <span>
                {pretty(i.food)}
                {i.household && <span className="muted"> · {i.grams} g</span>}
              </span>
            </li>
          ))}
        </ul>
        {steps.length > 0 && (
          <>
            <h4>How to make it</h4>
            <ol className="steps-list">
              {steps.map((st, k) => (
                <li key={k}>{st}</li>
              ))}
            </ol>
          </>
        )}
        <p className="meal-macros">
          Protein {m.protein}g · Carbs {m.carbs}g · Fat {m.fat}g{m.fiber ? ` · Fiber ${m.fiber}g` : ""}
          {servings !== 1 ? " (one serving)" : ""}
        </p>
        {children}
      </div>
    </details>
  );
}

function Diff({ label, actual, target, unit = "g" }: { label: string; actual: number; target: number; unit?: string }) {
  return (
    <div className={`stat stat-${closeness(actual, target)}`}>
      <b>
        {Math.round(actual).toLocaleString("en-US")}
        {unit === "kcal" ? "" : unit}
      </b>
      <span>
        {label} / {target.toLocaleString("en-US")}
      </span>
    </div>
  );
}

export function PerfectDay({ nutrition, targets, showTotals = true }: { nutrition: Nutrition; targets: Targets; showTotals?: boolean }) {
  const lines = perfectDayLines(nutrition);
  const totals = perfectDayMacros(nutrition);
  return (
    <>
      {nutrition.perfectDay.note && <p className="program-intro">{toLines(nutrition.perfectDay.note).slice(0, 2).join(" ")}</p>}
      {showTotals && (
        <div className="stat-row stat-row-4">
          <Diff label="kcal" actual={totals.calories} target={targets.calories} unit="kcal" />
          <Diff label="protein" actual={totals.protein} target={targets.protein} />
          <Diff label="carbs" actual={totals.carbs} target={targets.carbs} />
          <Diff label="fat" actual={totals.fat} target={targets.fat} />
        </div>
      )}
      <div className="meals-stack">
        {lines.map(({ item, meal }, k) => (
          <MealCard key={k} meal={meal} time={item.time} servings={item.servings} />
        ))}
      </div>
    </>
  );
}

export function MealLibrary({ meals }: { meals: PlanMeal[] }) {
  return (
    <>
      {MEAL_CATEGORIES.map((c, i) => {
        const list = meals.filter((m) => m.category === c.value);
        if (list.length === 0) return null;
        return (
          <details key={c.value} className="t-section" open={i === 0}>
            <summary>
              <span aria-hidden="true">{CATEGORY_ICON[c.value]}</span> {c.label} <span className="muted small">({list.length})</span>
            </summary>
            <div className="meals-stack inset">
              {list.map((m) => (
                <MealCard key={m.id} meal={m} />
              ))}
            </div>
          </details>
        );
      })}
    </>
  );
}

function Bullets({ text }: { text: string }) {
  const lines = toLines(text);
  if (lines.length === 0) return null;
  return (
    <ul className="tips">
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}


/** "Full body A" from "Day 1 – Full body A"; "Day 1" stays when that's all there is. */
export function workoutTitle(name: string, index: number): string {
  return name.replace(/^Day\s*\d+\s*[–—:-]\s*/i, "").trim() || `Workout ${index + 1}`;
}

/** "3 × 8–12" / "3 × 30–45 s" / "3 sets · As many as you can". */
function setsReps(e: { sets: string; reps: string }): string {
  const sets = e.sets.trim();
  const reps = e.reps.trim();
  if (!reps) return /^\d+$/.test(sets) ? `${sets} sets` : sets;
  if (/^\d+$/.test(sets)) return /^[\d\s–—\-+/]+$/.test(reps) ? `${sets} × ${reps} reps` : `${sets} × ${reps}`;
  return [sets, reps].filter(Boolean).join(" · ");
}

/** A training program, laid out to scan on a phone: workouts first, then one card of program notes. */
export function TrainingProgram({ training, openDay = 0 }: { training: Training; openDay?: number }) {
  const warmup = toLines(training.warmup);
  const notes: { icon: string; title: string; text: string }[] = [
    { icon: "🔥", title: "Warm-up", text: training.warmup },
    { icon: "🚶", title: "Cardio & steps", text: training.cardio },
    { icon: "📈", title: "How to progress", text: training.progression },
    { icon: training.cardio ? "😴" : "💡", title: training.cardio ? "Recovery" : "Tips", text: training.notes },
  ].filter((n) => toLines(n.text).length > 0);

  return (
    <div className="program">
      <div className="workouts">
        {training.days.map((d, k) => (
          <details key={k} id={`workout-${k + 1}`} className="workout" open={k === openDay}>
            <summary>
              <span className="workout-title">
                <b>{workoutTitle(d.name, k)}</b>
                <span className="muted small">
                  {d.focus && !workoutTitle(d.name, k).toLowerCase().includes(d.focus.toLowerCase()) ? `${d.focus} · ` : ""}
                  {d.exercises.length} exercises · ~{estimateMinutes(d)} min
                </span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </summary>
            {warmup.length > 0 && (
              <p className="warmup-line">
                <b>🔥 Warm up first</b>
                {warmup[0].replace(/\.$/, "").replace(/^\d+\s*minutes?:\s*/i, "")}
              </p>
            )}
            <ol className="ex-list">
              {d.exercises.map((e, j) => (
                <li key={j}>
                  <span className="ex-num">{j + 1}</span>
                  <div className="ex-body">
                    <b className="ex-name">{e.name}</b>
                    <span className="ex-plan">
                      <span className="ex-sets">{setsReps(e)}</span>
                      {e.rest && <span className="ex-rest">⏱ {e.rest.replace(/^rest\s*/i, "")} rest</span>}
                    </span>
                    {e.notes && <p className="ex-cue">💡 {e.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>

      {notes.length > 0 && (
        <section className="card notes-card">
          <h2 className="h2">Program notes</h2>
          {notes.map((n) => (
            <details key={n.title} className="note-row">
              <summary>
                <span aria-hidden="true">{n.icon}</span> {n.title}
              </summary>
              <Bullets text={n.text} />
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
