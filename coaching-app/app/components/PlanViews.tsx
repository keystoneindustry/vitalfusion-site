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
  toLines,
} from "@/lib/plan";
import { estimateMinutes } from "@/lib/training-brief";
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
                      {e.reps && <span>{/reps?|sec|min|s$/i.test(e.reps) ? e.reps : `${e.reps} reps`}</span>}
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
