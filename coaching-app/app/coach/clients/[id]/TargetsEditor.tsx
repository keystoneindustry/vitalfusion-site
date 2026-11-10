import { ACTIVITY_LEVELS, GOALS, PACES } from "@/lib/macros";
import { activityLabel, paceLabel, type Targets } from "@/lib/targets";
import SubmitButton from "@/app/components/SubmitButton";
import { resetTargetsAction, targetsAction } from "./plan-actions";

/** "Change targets": recalculate with the calculator, or type your own numbers. */
export default function TargetsEditor({ clientId, targets }: { clientId: string; targets: Targets }) {
  return (
    <section className="card">
      <details>
        <summary className="summary-link">Change targets</summary>
        <p className="small muted">
          {targets.manual
            ? "You typed these numbers in."
            : `From your calculator: ${activityLabel(targets.inputs.activity)}${
                targets.inputs.goal === "lose" ? `, ${paceLabel(targets.inputs.pace)}` : ""
              }. Maintenance ≈ ${targets.maintenance.toLocaleString("en-US")} kcal, about ${
                targets.weeklyChangeLb > 0 ? "+" : ""
              }${targets.weeklyChangeLb} lb/week.`}
        </p>
        {targets.notes.map((n) => (
          <p key={n} className="small" style={{ color: "var(--warn)" }}>
            {n}
          </p>
        ))}
        <form action={targetsAction.bind(null, clientId)}>
          <input type="hidden" name="mode" value="calc" />
          <div className="field">
            <label htmlFor="goal">Goal</label>
            <select id="goal" name="goal" defaultValue={targets.inputs.goal}>
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="activity">Activity level</label>
            <select id="activity" name="activity" defaultValue={targets.inputs.activity}>
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}: {a.detail}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pace">Fat-loss pace</label>
            <select id="pace" name="pace" defaultValue={targets.inputs.pace || "balanced"}>
              {PACES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="hint">Only used when the goal is fat loss.</span>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="weightLb">Weight (lb)</label>
              <input id="weightLb" name="weightLb" type="number" inputMode="decimal" defaultValue={targets.inputs.weightLb} />
            </div>
            <div className="field">
              <label htmlFor="goalWeightLb">Goal weight (lb)</label>
              <input id="goalWeightLb" name="goalWeightLb" type="number" inputMode="decimal" defaultValue={targets.inputs.goalWeightLb} />
            </div>
          </div>
          <SubmitButton className="btn btn-ghost btn-wide" label="Recalculate" pendingLabel="Saving…" />
        </form>
        <div className="spacer" />
        <form action={targetsAction.bind(null, clientId)}>
          <input type="hidden" name="mode" value="manual" />
          <p className="small muted">Or type your own numbers:</p>
          <div className="grid-3">
            {(
              [
                ["calories", "Calories"],
                ["protein", "Protein g"],
                ["carbs", "Carbs g"],
                ["fat", "Fat g"],
                ["fiber", "Fiber g"],
                ["waterOz", "Water oz"],
              ] as const
            ).map(([k, label]) => (
              <div className="field" key={k}>
                <label htmlFor={`t-${k}`}>{label}</label>
                <input id={`t-${k}`} name={k} type="number" inputMode="numeric" defaultValue={targets[k]} />
              </div>
            ))}
          </div>
          <SubmitButton className="btn btn-ghost btn-wide" label="Save my numbers" pendingLabel="Saving…" />
        </form>
        <form action={resetTargetsAction.bind(null, clientId)} style={{ marginTop: 10 }}>
          <SubmitButton className="btn-link small" label="Reset to the calculator's numbers" pendingLabel="Resetting…" />
        </form>
      </details>
    </section>
  );
}
