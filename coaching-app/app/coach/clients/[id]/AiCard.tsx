import type { PlanPart } from "@/lib/plan";
import SubmitButton from "@/app/components/SubmitButton";
import { draftPartAction, reviseAction, saveCallNotesAction } from "./plan-actions";

/** The AI controls for one part: draft from scratch, or update with call notes / instructions. */
export default function AiCard({
  clientId,
  part,
  has,
  healthFlag,
  callNotes,
  disabled,
}: {
  clientId: string;
  part: PlanPart;
  has: boolean;
  healthFlag: boolean;
  callNotes: string;
  disabled: boolean;
}) {
  const label = part === "nutrition" ? "meals" : "workouts";
  const source =
    part === "nutrition"
      ? "Uses their food log, their food answers and the targets."
      : "Uses their goal, days a week, session length, equipment, experience and injuries.";
  const health = healthFlag && (
    <label className="confirm">
      <input type="checkbox" name="health" value="yes" required />
      <span>They answered YES on the health questions. I've reviewed it.</span>
    </label>
  );
  const draft = draftPartAction.bind(null, clientId, part);

  if (!has) {
    return (
      <section className="card card-accent" id="ai">
        <h2 className="h2">✨ Draft the {label} with AI</h2>
        <p className="coming" style={{ marginTop: 0 }}>
          {source} Takes 1–3 minutes, and you can edit everything afterwards. Or build it yourself in the builder.
        </p>
        <form action={draft}>
          {health}
          <SubmitButton label={`✨ Draft the ${label}`} pendingLabel="Starting…" />
        </form>
      </section>
    );
  }

  return (
    <section className="card card-accent" id="ai">
      <h2 className="h2">✨ Change the {label} with AI</h2>
      <p className="coming" style={{ marginTop: 0 }}>
        Add your call notes and/or say what to change, e.g.{" "}
        {part === "nutrition" ? "“swap salmon for chicken”, “quicker lunches”, “resize the meals to the new targets”." : "“no deadlifts until her back is better”, “make day 3 legs”, “add a 20-minute walk after each workout”."}{" "}
        Save your builder edits first.
      </p>
      <form action={reviseAction.bind(null, clientId, part)}>
        <div className="field">
          <label htmlFor={`notes-${part}`}>Kickoff call notes (shared by meals and training)</label>
          <textarea id={`notes-${part}`} name="callNotes" rows={4} defaultValue={callNotes} />
        </div>
        <div className="field">
          <label htmlFor={`instr-${part}`}>What should change?</label>
          <textarea id={`instr-${part}`} name="instruction" rows={3} />
        </div>
        <SubmitButton label={`✨ Update the ${label}`} pendingLabel="Starting…" />
        <button className="btn-link small" type="submit" formAction={saveCallNotesAction.bind(null, clientId, part)} style={{ marginTop: 10 }} disabled={disabled}>
          Just save my call notes (no AI)
        </button>
      </form>
      <details style={{ marginTop: 14 }}>
        <summary className="summary-link small">Redo the {label} from scratch</summary>
        <form action={draft} style={{ marginTop: 10 }}>
          <p className="small muted">Replaces the {label} (not the {part === "nutrition" ? "workouts" : "meals"}) with a fresh AI draft. {source}</p>
          {health}
          <SubmitButton className="btn btn-ghost btn-wide" label={`Redo the ${label}`} pendingLabel="Starting…" />
        </form>
      </details>
    </section>
  );
}
