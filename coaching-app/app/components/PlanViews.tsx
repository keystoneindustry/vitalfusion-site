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

function Section({ icon, title, children, open = false }: { icon: string; title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="t-section" open={open}>
      <summary>
        <span aria-hidden="true">{icon}</span> {title}
      </summary>
      {children}
    </details>
  );
}

/** A training program, laid out to scan on a phone: workouts first, then short tip sections. */
export function TrainingProgram({ training }: { training: Training }) {
  return (
    <div className="program">
      {training.overview && <p className="program-intro">{toLines(training.overview).slice(0, 2).join(" ")}</p>}

      <div className="workouts">
        {training.days.map((d, k) => (
          <details key={k} className="workout" open={k === 0}>
            <summary>
              <span className="workout-num">{k + 1}</span>
              <span className="workout-title">
                <b>{d.name.replace(/^Day\s*\d+\s*[–—-]\s*/i, "") || d.name}</b>
                <span className="muted small">
                  {d.focus ? `${d.focus} · ` : ""}
                  {d.exercises.length} exercises · ~{estimateMinutes(d)} min
                </span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </summary>
            <ol className="ex-list">
              {d.exercises.map((e, j) => (
                <li key={j}>
                  <span className="ex-num">{j + 1}</span>
                  <div>
                    <b className="ex-name">{e.name}</b>
                    <div className="ex-tags">
                      {e.sets && <span>{/^\d+$/.test(e.sets) ? `${e.sets} sets` : e.sets}</span>}
                      {e.reps && <span>{/^[\d\s–—\-+/]+$/.test(e.reps) ? `${e.reps} reps` : e.reps}</span>}
                      {e.rest && <span className="ex-rest">⏱ {e.rest.replace(/^rest\s*/i, "")}</span>}
                    </div>
                    {e.notes && <p className="ex-cue">{e.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>

      {training.warmup && (
        <Section icon="🔥" title="Warm-up">
          <Bullets text={training.warmup} />
        </Section>
      )}
      {training.cardio && (
        <Section icon="🚶" title="Cardio & steps">
          <Bullets text={training.cardio} />
        </Section>
      )}
      {training.progression && (
        <Section icon="📈" title="How to progress">
          <Bullets text={training.progression} />
        </Section>
      )}
      {training.notes && (
        <Section icon={training.cardio ? "😴" : "💡"} title={training.cardio ? "Recovery tips" : "Tips"}>
          <Bullets text={training.notes} />
        </Section>
      )}
    </div>
  );
}
