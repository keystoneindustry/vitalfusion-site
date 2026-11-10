import {
  ingredientMacros,
  macroLine,
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
} from "@/lib/plan";
import type { Targets } from "@/lib/targets";

/** Read-only pieces of a plan, shared by the client screens and the coach's review screen. */

export function MealCard({ meal, open = false, children }: { meal: PlanMeal; open?: boolean; children?: React.ReactNode }) {
  return (
    <details className="meal-card" open={open}>
      <summary>
        <span className="meal-name">{meal.name}</span>
        <span className="muted small">
          {macroLine(mealMacros(meal))}
          {meal.prepMinutes ? ` · ${meal.prepMinutes} min` : ""}
        </span>
      </summary>
      {meal.why && <p className="meal-why">{meal.why}</p>}
      <ul className="ingredients">
        {meal.ingredients.map((i, k) => {
          const m = roundMacros(ingredientMacros(i));
          return (
            <li key={k}>
              <span>
                {i.household ? `${i.household} ` : ""}
                <b>{i.food}</b> <span className="muted">({i.grams} g)</span>
              </span>
              <span className="muted small">
                {m.calories} kcal · {m.protein}P
              </span>
            </li>
          );
        })}
      </ul>
      {meal.instructions && <p className="meal-steps">{meal.instructions}</p>}
      {children}
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
      {nutrition.perfectDay.note && <p className="coming" style={{ marginTop: 0 }}>{nutrition.perfectDay.note}</p>}
      {showTotals && (
        <div className="stat-row stat-row-4">
          <Diff label="kcal" actual={totals.calories} target={targets.calories} unit="kcal" />
          <Diff label="protein" actual={totals.protein} target={targets.protein} />
          <Diff label="carbs" actual={totals.carbs} target={targets.carbs} />
          <Diff label="fat" actual={totals.fat} target={targets.fat} />
        </div>
      )}
      <ol className="day-list">
        {lines.map(({ item, meal }, k) => (
          <li key={k}>
            <span className="day-time">{item.time}</span>
            <MealCard meal={meal}>
              {item.servings !== 1 && <p className="small muted">Have {servingsLabel(item.servings)} of this.</p>}
            </MealCard>
          </li>
        ))}
      </ol>
    </>
  );
}

export function MealLibrary({ meals }: { meals: PlanMeal[] }) {
  return (
    <>
      {MEAL_CATEGORIES.map((c) => {
        const list = meals.filter((m) => m.category === c.value);
        if (list.length === 0) return null;
        return (
          <div key={c.value} className="library-group">
            <h3>{c.label}</h3>
            {list.map((m) => (
              <MealCard key={m.id} meal={m} />
            ))}
          </div>
        );
      })}
    </>
  );
}

export function TrainingProgram({ training }: { training: Training }) {
  return (
    <>
      {training.overview && <p className="coming" style={{ marginTop: 0 }}>{training.overview}</p>}
      {training.warmup && (
        <p className="coming">
          <b>Warm-up:</b> {training.warmup}
        </p>
      )}
      {training.days.map((d, k) => (
        <details key={k} className="meal-card" open={k === 0}>
          <summary>
            <span className="meal-name">{d.name}</span>
            <span className="muted small">
              {d.focus ? `${d.focus} · ` : ""}
              {d.exercises.length} exercises
            </span>
          </summary>
          <ol className="exercises">
            {d.exercises.map((e, j) => (
              <li key={j}>
                <b>{e.name}</b>
                <span className="ex-sets">
                  {[e.sets && `${e.sets} sets`, e.reps && `${e.reps} reps`, e.rest && `rest ${e.rest}`].filter(Boolean).join(" · ")}
                </span>
                {e.notes && <span className="muted small">{e.notes}</span>}
              </li>
            ))}
          </ol>
        </details>
      ))}
      {training.progression && (
        <p className="coming">
          <b>How to progress:</b> {training.progression}
        </p>
      )}
      {training.notes && <p className="coming">{training.notes}</p>}
    </>
  );
}
