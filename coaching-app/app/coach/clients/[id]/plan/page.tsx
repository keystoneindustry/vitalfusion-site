import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { getResponse } from "@/lib/onboarding-data";
import { listMeals, logStats } from "@/lib/meals";
import { todayIn, timeAgo } from "@/lib/dates";
import { formatCallTime } from "@/lib/booking";
import { aiConfigured } from "@/lib/ai";
import { getOpenPlan, getPublishedPlan, hasContent, isStale, type PlanRow, type ReadyPlan } from "@/lib/plans";
import { ACTIVITY_LEVELS, GOALS, PACES } from "@/lib/macros";
import { activityLabel, paceLabel } from "@/lib/targets";
import { hasEstimates } from "@/lib/plan";
import { trainingFacts } from "@/lib/training-brief";
import SubmitButton from "@/app/components/SubmitButton";
import AutoRefresh from "@/app/components/AutoRefresh";
import TargetsCard from "@/app/components/TargetsCard";
import { MealLibrary, PerfectDay, TrainingProgram } from "@/app/components/PlanViews";
import TrainingBuilder from "./TrainingBuilder";
import MealBuilder from "./MealBuilder";
import {
  aiPartAction,
  buildManuallyAction,
  discardDraftAction,
  draftPlanAction,
  makeChangesAction,
  publishAction,
  resetTargetsAction,
  reviseAction,
  saveCallNotesAction,
  saveNutritionAction,
  saveTrainingAction,
  targetsAction,
} from "./actions";

export const metadata = { title: "Plan · Vital Fusion Coach" };
// The AI keeps working after the page answers; give it up to 5 minutes.
export const maxDuration = 300;

const MESSAGES: Record<string, string> = {
  drafting: "The AI is drafting the plan. It usually takes 1–3 minutes; this page updates by itself.",
  revising: "The AI is updating the draft. This page updates by itself.",
  saved: "Saved ✓",
  targets: "Targets updated ✓ Meals don't change by themselves: ask the AI to resize them below if needed.",
  published: "Published ✓ They've been emailed, and their app now shows the plan.",
  updated: "Changes published ✓ Their app shows the new version.",
  discarded: "Draft discarded. They still see the published plan.",
  editing: "Editing a copy. They keep seeing the published plan until you publish again.",
  manual: "Empty plan started. Build the workouts and meals below, or let the AI draft either one.",
};

export default async function CoachPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id } = await params;
  const { msg, error } = await searchParams;
  await requireCoach(`/coach/clients/${id}/plan`);
  const client = await getClient(id);
  if (!client) notFound();

  const [open, published, response, meals] = await Promise.all([
    getOpenPlan(client.id),
    getPublishedPlan(client.id),
    getResponse(client.id),
    listMeals(client.id),
  ]);
  const stats = logStats(meals, client.timezone, todayIn(client.timezone));
  const drafting = !!open && open.status === "drafting" && !isStale(open);
  const stale = !!open && isStale(open);
  const shown: PlanRow | null = open && (hasContent(open) || !published) ? open : published;
  const ready = hasContent(shown) ? (shown as ReadyPlan) : null;
  const isDraft = !!ready && ready.status !== "published";
  const editable = isDraft && !drafting;
  const bind = <A extends unknown[]>(fn: (clientId: string, ...a: A) => Promise<void>) => fn.bind(null, client.id);
  const name = firstName(client.full_name);
  const answers = response?.answers ?? {};
  const facts = trainingFacts(answers);

  /** "Let the AI draft the workouts/meals" — replaces only that part of the plan. */
  const AiPart = ({ part, label, has }: { part: "training" | "nutrition"; label: string; has: boolean }) => (
    <details className="ai-part">
      <summary className="summary-link small">✨ {has ? `Redo the ${label} with AI` : `Let the AI draft the ${label}`}</summary>
      <form action={bind(aiPartAction)}>
        <input type="hidden" name="part" value={part} />
        <p className="small muted">
          {has ? `Replaces the ${label} above (unsaved edits are lost). ` : ""}
          {part === "training"
            ? "Built from their goal, days a week, session length, equipment, experience and injuries."
            : "Built from their food log, food answers and targets."}
          {" "}Takes 1–3 minutes.
        </p>
        {client.health_flag && (
          <label className="confirm">
            <input type="checkbox" name="health" value="yes" required />
            <span>I've reviewed their YES on the health questions.</span>
          </label>
        )}
        <SubmitButton className="btn btn-ghost btn-wide" label={`✨ Draft the ${label}`} pendingLabel="Starting…" />
      </form>
    </details>
  );

  return (
    <>
      <p className="small">
        <Link href={`/coach/clients/${client.id}`}>← {client.full_name}</Link>
      </p>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div>
          <h1 className="h1">{name}'s plan</h1>
          <p className="muted" style={{ margin: "0 0 16px" }}>
            {ready
              ? ready.status === "published"
                ? `Published ${ready.published_at ? timeAgo(ready.published_at) : ""} · this is what ${name} sees`
                : `Draft · ${name} can't see this yet`
              : "No plan yet"}
            {client.kickoff_at && ` · Kickoff ${formatCallTime(client.kickoff_at, client.timezone)}`}
          </p>
        </div>
        {isDraft && (
          <form action={bind(publishAction)}>
            <SubmitButton className="btn btn-sm" label={published ? "Publish changes" : `Publish to ${name}`} pendingLabel="Publishing…" />
          </form>
        )}
      </div>

      {msg && MESSAGES[msg] && !(msg === "drafting" || msg === "revising") && <div className="notice notice-good">{MESSAGES[msg]}</div>}
      {error && <div className="notice notice-error">{error}</div>}
      {open?.error && !drafting && <div className="notice notice-error">The last AI run didn't finish: {open.error}</div>}
      {drafting && (
        <div className="notice notice-warn">
          <AutoRefresh />⏳ {ready ? MESSAGES.revising : MESSAGES.drafting}
        </div>
      )}
      {stale && <div className="notice notice-error">The AI run stopped without finishing. Try again below.</div>}

      {!ready && !drafting && (
        <section className="card card-accent">
          <h2 className="h2">Draft {name}'s plan</h2>
          <ul className="checklist">
            <li className={response?.submitted_at ? "done" : "current"}>
              <span className="tick">{response?.submitted_at ? "✓" : ""}</span>
              <span>Onboarding answers {response?.submitted_at ? "submitted" : "not submitted yet"}</span>
            </li>
            <li className={stats.total ? "done" : "current"}>
              <span className="tick">{stats.total ? "✓" : ""}</span>
              <span>
                Food log: {stats.total} entr{stats.total === 1 ? "y" : "ies"} over {stats.days} day{stats.days === 1 ? "" : "s"}{" "}
                {stats.total > 0 && <Link href={`/coach/clients/${client.id}/food`}>(see photos)</Link>}
              </span>
            </li>
            <li className={aiConfigured() ? "done" : "current"}>
              <span className="tick">{aiConfigured() ? "✓" : ""}</span>
              <span>{aiConfigured() ? "Claude API connected" : "Claude API key not set up yet (see Settings)"}</span>
            </li>
          </ul>
          <p className="coming" style={{ marginTop: 0 }}>
            The plan drafts by itself the day before their kickoff call, and you get an email. You can also draft it now. The
            AI uses their answers and food log; calories and macros come from your calculator.
          </p>
          <form action={bind(draftPlanAction)}>
            {client.health_flag && (
              <label className="confirm">
                <input type="checkbox" name="health" value="yes" required />
                <span>
                  {name} answered YES on the health questions. I've reviewed it and want to draft the plan anyway.
                </span>
              </label>
            )}
            <SubmitButton label="✨ Draft the plan with AI" pendingLabel="Starting…" />
          </form>
          <form action={bind(buildManuallyAction)} style={{ marginTop: 10 }}>
            <SubmitButton className="btn btn-ghost btn-wide" label="🛠 Build it myself" pendingLabel="Starting…" />
          </form>
          <p className="small muted center" style={{ marginBottom: 0 }}>
            Either way you can edit everything afterwards, and let the AI draft just the meals or just the workouts.
          </p>
        </section>
      )}

      {ready && (
        <div className="detail-grid">
          <div>
            <div id="targets">
              <TargetsCard targets={ready.targets} title="Daily targets" />
            </div>
            {editable && (
              <section className="card">
                <details>
                  <summary className="summary-link">Change targets</summary>
                  <p className="small muted">
                    {ready.targets.manual
                      ? "You typed these numbers in."
                      : `From your calculator: ${activityLabel(ready.targets.inputs.activity)}${
                          ready.targets.inputs.goal === "lose" ? `, ${paceLabel(ready.targets.inputs.pace)}` : ""
                        }. Maintenance ≈ ${ready.targets.maintenance.toLocaleString("en-US")} kcal, about ${
                          ready.targets.weeklyChangeLb > 0 ? "+" : ""
                        }${ready.targets.weeklyChangeLb} lb/week.`}
                  </p>
                  {ready.targets.notes.map((n) => (
                    <p key={n} className="small" style={{ color: "var(--warn)" }}>
                      {n}
                    </p>
                  ))}
                  <form action={bind(targetsAction)}>
                    <input type="hidden" name="mode" value="calc" />
                    <div className="field">
                      <label htmlFor="goal">Goal</label>
                      <select id="goal" name="goal" defaultValue={ready.targets.inputs.goal}>
                        {GOALS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="activity">Activity level</label>
                      <select id="activity" name="activity" defaultValue={ready.targets.inputs.activity}>
                        {ACTIVITY_LEVELS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}: {a.detail}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="pace">Fat-loss pace</label>
                      <select id="pace" name="pace" defaultValue={ready.targets.inputs.pace || "balanced"}>
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
                        <input id="weightLb" name="weightLb" type="number" inputMode="decimal" defaultValue={ready.targets.inputs.weightLb} />
                      </div>
                      <div className="field">
                        <label htmlFor="goalWeightLb">Goal weight (lb)</label>
                        <input id="goalWeightLb" name="goalWeightLb" type="number" inputMode="decimal" defaultValue={ready.targets.inputs.goalWeightLb} />
                      </div>
                    </div>
                    <SubmitButton className="btn btn-ghost btn-wide" label="Recalculate" pendingLabel="Saving…" />
                  </form>
                  <div className="spacer" />
                  <form action={bind(targetsAction)}>
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
                          <input id={`t-${k}`} name={k} type="number" inputMode="numeric" defaultValue={ready.targets[k]} />
                        </div>
                      ))}
                    </div>
                    <SubmitButton className="btn btn-ghost btn-wide" label="Save my numbers" pendingLabel="Saving…" />
                  </form>
                  <form action={bind(resetTargetsAction)} style={{ marginTop: 10 }}>
                    <SubmitButton className="btn-link small" label="Reset to the calculator's numbers" pendingLabel="Resetting…" />
                  </form>
                </details>
              </section>
            )}

            <section className="card" id="training">
              <div className="row-between">
                <h2 className="h2" style={{ margin: 0 }}>🏋️ Workouts</h2>
                <span className="muted small">{ready.content.training.days.length} days</span>
              </div>
              <details className="facts" open={ready.content.training.days.length === 0}>
                <summary className="summary-link small">Their training answers</summary>
                <dl className="kv kv-wide">
                  {facts.map((f) => (
                    <div key={f.label} style={{ display: "contents" }}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              {editable ? (
                <>
                  <TrainingBuilder
                    key={`t-${ready.id}-${ready.usage?.runs ?? 0}`}
                    initial={ready.content.training}
                    answers={answers}
                    save={saveTrainingAction.bind(null, client.id)}
                  />
                  <AiPart part="training" label="workouts" has={ready.content.training.days.length > 0} />
                </>
              ) : (
                <TrainingProgram training={ready.content.training} />
              )}
            </section>

            <section className="card" id="meals">
              <div className="row-between">
                <h2 className="h2" style={{ margin: 0 }}>🍽️ Meals</h2>
                <span className="muted small">{ready.content.meals.length} meals</span>
              </div>
              <div className="spacer" />
              {editable ? (
                <>
                  <MealBuilder
                    key={`m-${ready.id}-${ready.usage?.runs ?? 0}`}
                    initial={{
                      meals: ready.content.meals,
                      perfectDay: ready.content.perfectDay,
                      welcome: ready.content.welcome,
                      easingIn: ready.content.insights.easingIn,
                    }}
                    targets={ready.targets}
                    save={saveNutritionAction.bind(null, client.id)}
                  />
                  <AiPart part="nutrition" label="meals" has={ready.content.meals.length > 0} />
                </>
              ) : (
                <>
                  <PerfectDay nutrition={ready.content} targets={ready.targets} />
                  <MealLibrary meals={ready.content.meals} />
                </>
              )}
              {hasEstimates(ready.content.meals) && (
                <p className="small muted" style={{ marginBottom: 0 }}>
                  “(est.)” = no USDA match, so the AI's estimate is used for that ingredient.
                </p>
              )}
            </section>

            {isDraft && !drafting && (
              <form action={bind(publishAction)} style={{ marginBottom: 14 }}>
                <SubmitButton label={published ? "Publish changes" : `Publish to ${name}`} pendingLabel="Publishing…" />
                <p className="center small muted">
                  Save your workouts and meals first.{" "}
                  {published ? `${name} sees the new version right away.` : `${name} gets an email and their app fills with the plan.`}
                </p>
              </form>
            )}
          </div>

          <div>
            {ready.content.insights.summary && (
              <section className="card">
                <h2 className="h2">What their food log shows</h2>
                <p className="coming" style={{ marginTop: 0 }}>{ready.content.insights.summary}</p>
                <dl className="kv kv-wide">
                  {ready.content.insights.usualFoods.length > 0 && (
                    <>
                      <dt>Usual foods</dt>
                      <dd>{ready.content.insights.usualFoods.join(", ")}</dd>
                    </>
                  )}
                  {ready.content.insights.mealTiming && (
                    <>
                      <dt>Timing</dt>
                      <dd>{ready.content.insights.mealTiming}</dd>
                    </>
                  )}
                  {ready.content.insights.portions && (
                    <>
                      <dt>Portions</dt>
                      <dd>{ready.content.insights.portions}</dd>
                    </>
                  )}
                  {ready.content.insights.patterns && (
                    <>
                      <dt>Patterns</dt>
                      <dd>{ready.content.insights.patterns}</dd>
                    </>
                  )}
                  {(ready.content.insights.estimatedCalories || ready.content.insights.intakeNote) && (
                    <>
                      <dt>Eating now</dt>
                      <dd>
                        {ready.content.insights.estimatedCalories
                          ? `≈ ${Math.round(ready.content.insights.estimatedCalories).toLocaleString("en-US")} kcal${
                              ready.content.insights.estimatedProtein ? `, ${Math.round(ready.content.insights.estimatedProtein)} g protein` : ""
                            } a day. `
                          : ""}
                        {ready.content.insights.intakeNote}
                      </dd>
                    </>
                  )}
                </dl>
              </section>
            )}
            <p className="small">
              <Link href={`/coach/clients/${client.id}/food`}>📷 See all {stats.total} food photos →</Link>
            </p>

            {ready.content.coachNotes.length > 0 && (
              <section className="card">
                <h2 className="h2">⚠️ Double-check before publishing</h2>
                <ul className="coming" style={{ margin: 0, paddingLeft: 20 }}>
                  {ready.content.coachNotes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            )}

            {ready.content.callAgenda.length > 0 && (
              <section className="card">
                <h2 className="h2">📞 For the kickoff call</h2>
                <ul className="coming" style={{ margin: 0, paddingLeft: 20 }}>
                  {ready.content.callAgenda.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            )}

            {editable && (
              <section className="card card-accent" id="call">
                <h2 className="h2">Change it with the AI</h2>
                <p className="coming" style={{ marginTop: 0 }}>
                  Add your call notes and/or tell the AI what to change, e.g. “swap salmon for chicken”, “make lunches
                  quicker”, “resize the meals to the new targets”, “no deadlifts until her back is better”. Save any edits
                  you made in the builders first.
                </p>
                <form action={bind(reviseAction)}>
                  <div className="field">
                    <label htmlFor="callNotes">Kickoff call notes</label>
                    <textarea id="callNotes" name="callNotes" rows={5} defaultValue={ready.call_notes ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor="instruction">What should change?</label>
                    <textarea id="instruction" name="instruction" rows={3} />
                  </div>
                  <div className="field">
                    <label htmlFor="part">Update</label>
                    <select id="part" name="part" defaultValue="both">
                      <option value="both">Meals and workouts</option>
                      <option value="nutrition">Meals only</option>
                      <option value="training">Workouts only</option>
                    </select>
                  </div>
                  <SubmitButton label="✨ Update with AI" pendingLabel="Starting…" />
                  <button className="btn-link small" type="submit" formAction={bind(saveCallNotesAction)} style={{ marginTop: 10 }}>
                    Just save my call notes (no AI)
                  </button>
                </form>
                <details style={{ marginTop: 14 }}>
                  <summary className="summary-link small">Start over with a brand-new AI draft</summary>
                  <form action={bind(draftPlanAction)} style={{ marginTop: 10 }}>
                    {client.health_flag && <input type="hidden" name="health" value="yes" />}
                    <p className="small muted">Replaces the meals AND workouts (and your edits) with a fresh draft.</p>
                    <SubmitButton className="btn btn-ghost btn-wide" label="Redraft everything" pendingLabel="Starting…" />
                  </form>
                </details>
              </section>
            )}

            {ready.status === "published" && !open && (
              <section className="card">
                <h2 className="h2">Make changes</h2>
                <p className="coming" style={{ marginTop: 0 }}>
                  Edit a copy in the builders. {name} keeps seeing this version until you publish the changes.
                </p>
                <form action={bind(makeChangesAction)}>
                  <SubmitButton className="btn btn-ghost btn-wide" label="Edit the plan" pendingLabel="Opening…" />
                </form>
              </section>
            )}
            {isDraft && published && !drafting && (
              <form action={bind(discardDraftAction)} className="center" style={{ marginBottom: 14 }}>
                <SubmitButton className="btn-link small" label="Discard this draft (keep the published plan)" pendingLabel="Discarding…" />
              </form>
            )}
            {ready.usage?.runs ? (
              <p className="center small muted">
                AI runs: {ready.usage.runs} · {Math.round(((ready.usage.input_tokens ?? 0) + (ready.usage.output_tokens ?? 0)) / 1000)}k tokens
              </p>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
