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
import { exercisesToText, hasEstimates, ingredientsToText, perfectDayLines } from "@/lib/plan";
import SubmitButton from "@/app/components/SubmitButton";
import AutoRefresh from "@/app/components/AutoRefresh";
import TargetsCard from "@/app/components/TargetsCard";
import { MealCard, PerfectDay, TrainingProgram } from "@/app/components/PlanViews";
import { MEAL_CATEGORIES } from "@/lib/plan";
import {
  deleteMealAction,
  discardDraftAction,
  draftPlanAction,
  editMealAction,
  makeChangesAction,
  perfectDayAction,
  publishAction,
  resetTargetsAction,
  reviseAction,
  saveCallNotesAction,
  targetsAction,
  textsAction,
  trainingDayAction,
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
            <SubmitButton label="✨ Draft the plan now" pendingLabel="Starting…" />
          </form>
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

            <section className="card">
              <h2 className="h2">What their food log shows</h2>
              <p className="coming" style={{ marginTop: 0 }}>{ready.content.insights.summary || "—"}</p>
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
                {ready.content.insights.easingIn && (
                  <>
                    <dt>Easing in</dt>
                    <dd>{ready.content.insights.easingIn}</dd>
                  </>
                )}
              </dl>
              <p className="small" style={{ marginBottom: 0 }}>
                <Link href={`/coach/clients/${client.id}/food`}>See all {stats.total} food photos →</Link>
              </p>
            </section>

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
                <h2 className="h2">Update the draft with the AI</h2>
                <p className="coming" style={{ marginTop: 0 }}>
                  Add your call notes and/or tell the AI what to change, e.g. “swap salmon for chicken”, “make lunches
                  quicker”, “resize the meals to the new targets”, “no deadlifts until her back is better”.
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
                      <option value="both">Nutrition and training</option>
                      <option value="nutrition">Nutrition only</option>
                      <option value="training">Training only</option>
                    </select>
                  </div>
                  <SubmitButton label="✨ Update the draft" pendingLabel="Starting…" />
                  <button className="btn-link small" type="submit" formAction={bind(saveCallNotesAction)} style={{ marginTop: 10 }}>
                    Just save my call notes (no AI)
                  </button>
                </form>
                <details style={{ marginTop: 14 }}>
                  <summary className="summary-link small">Start over with a brand-new draft</summary>
                  <form action={bind(draftPlanAction)} style={{ marginTop: 10 }}>
                    {client.health_flag && <input type="hidden" name="health" value="yes" />}
                    <p className="small muted">Throws away this draft and your edits, and drafts again from scratch.</p>
                    <SubmitButton className="btn btn-ghost btn-wide" label="Redraft from scratch" pendingLabel="Starting…" />
                  </form>
                </details>
              </section>
            )}

            {ready.status === "published" && !open && (
              <section className="card">
                <h2 className="h2">Make changes</h2>
                <p className="coming" style={{ marginTop: 0 }}>
                  Edit a copy. {name} keeps seeing this version until you publish the changes.
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
          </div>

          <div>
            <section className="card" id="perfect-day">
              <h2 className="h2">Perfect day</h2>
              <PerfectDay nutrition={ready.content} targets={ready.targets} />
              {hasEstimates(ready.content.meals) && (
                <p className="small muted">
                  Some ingredients use the AI's estimate instead of USDA data. They're listed when you edit a meal.
                </p>
              )}
              {editable && (
                <details>
                  <summary className="summary-link">Edit the perfect day</summary>
                  <form action={bind(perfectDayAction)} style={{ marginTop: 10 }}>
                    <div className="field">
                      <label htmlFor="pd-lines">One line per meal: time | meal name | servings</label>
                      <textarea
                        id="pd-lines"
                        name="lines"
                        rows={6}
                        className="mono"
                        defaultValue={perfectDayLines(ready.content)
                          .map(({ item, meal }) => `${item.time} | ${meal.name} | ${item.servings}`)
                          .join("\n")}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="pd-note">Note to {name}</label>
                      <textarea id="pd-note" name="note" rows={2} defaultValue={ready.content.perfectDay.note} />
                    </div>
                    <SubmitButton className="btn btn-ghost btn-wide" label="Save perfect day" pendingLabel="Saving…" />
                  </form>
                </details>
              )}
            </section>

            <section className="card" id="library">
              <h2 className="h2">Meal library</h2>
              {MEAL_CATEGORIES.map((c) => {
                const list = ready.content.meals.filter((m) => m.category === c.value);
                if (!list.length) return null;
                return (
                  <div key={c.value} className="library-group">
                    <h3>{c.label}</h3>
                    {list.map((m) => (
                      <div key={m.id} id={m.id}>
                        <MealCard meal={m}>
                          {editable && (
                            <details className="edit-box">
                              <summary className="summary-link small">Edit this meal</summary>
                              <form action={bind(editMealAction)}>
                                <input type="hidden" name="mealId" value={m.id} />
                                <div className="field">
                                  <label>Name</label>
                                  <input name="name" defaultValue={m.name} />
                                </div>
                                <div className="grid-2">
                                  <div className="field">
                                    <label>Usual time</label>
                                    <input name="time" defaultValue={m.time} />
                                  </div>
                                  <div className="field">
                                    <label>Prep minutes</label>
                                    <input name="prepMinutes" type="number" inputMode="numeric" defaultValue={m.prepMinutes ?? ""} />
                                  </div>
                                </div>
                                <div className="field">
                                  <label>Ingredients: grams | food | household measure</label>
                                  <textarea name="ingredients" rows={Math.max(3, m.ingredients.length + 1)} className="mono" defaultValue={ingredientsToText(m.ingredients)} />
                                  <span className="hint">
                                    {m.ingredients.some((i) => i.source !== "usda")
                                      ? `Estimated (not USDA): ${m.ingredients
                                          .filter((i) => i.source !== "usda")
                                          .map((i) => i.food)
                                          .join(", ")}. `
                                      : ""}
                                    New foods are looked up in the USDA database.
                                  </span>
                                </div>
                                <div className="field">
                                  <label>How to make it</label>
                                  <textarea name="instructions" rows={3} defaultValue={m.instructions} />
                                </div>
                                <div className="field">
                                  <label>Why it's in their plan</label>
                                  <input name="why" defaultValue={m.why} />
                                </div>
                                <SubmitButton className="btn btn-ghost btn-wide" label="Save meal" pendingLabel="Saving…" />
                              </form>
                              <form action={bind(deleteMealAction)} style={{ marginTop: 8 }}>
                                <input type="hidden" name="mealId" value={m.id} />
                                <SubmitButton className="btn-link small" label="Remove this meal" pendingLabel="Removing…" />
                              </form>
                            </details>
                          )}
                        </MealCard>
                      </div>
                    ))}
                  </div>
                );
              })}
            </section>

            <section className="card" id="training">
              <h2 className="h2">Training program</h2>
              <TrainingProgram training={ready.content.training} />
              {editable && (
                <details>
                  <summary className="summary-link">Edit workouts</summary>
                  {[...ready.content.training.days, null].map((d, i) => (
                    <form key={i} action={bind(trainingDayAction)} className="edit-box" id={`day-${i}`}>
                      <input type="hidden" name="index" value={i} />
                      <div className="grid-2">
                        <div className="field">
                          <label>{d ? "Day name" : "Add a day"}</label>
                          <input name="name" defaultValue={d?.name ?? `Day ${i + 1}`} />
                        </div>
                        <div className="field">
                          <label>Focus</label>
                          <input name="focus" defaultValue={d?.focus ?? ""} />
                        </div>
                      </div>
                      <div className="field">
                        <label>Exercises: name | sets | reps | rest | notes</label>
                        <textarea name="exercises" rows={d ? d.exercises.length + 1 : 4} className="mono" defaultValue={d ? exercisesToText(d.exercises) : ""} />
                      </div>
                      <div className="row">
                        <SubmitButton className="btn btn-ghost btn-sm" label={d ? "Save day" : "Add day"} pendingLabel="Saving…" />
                        {d && (
                          <label className="small muted row" style={{ gap: 6 }}>
                            <input type="checkbox" name="remove" value="yes" style={{ width: "auto", appearance: "auto", WebkitAppearance: "checkbox" }} /> remove this day
                          </label>
                        )}
                      </div>
                    </form>
                  ))}
                </details>
              )}
            </section>

            {editable && (
              <section className="card" id="texts">
                <details>
                  <summary className="summary-link">Edit what {name} reads (welcome, easing in, training notes)</summary>
                  <form action={bind(textsAction)} style={{ marginTop: 10 }}>
                    <div className="field">
                      <label>Welcome message at the top of their meal plan</label>
                      <textarea name="welcome" rows={3} defaultValue={ready.content.welcome} />
                    </div>
                    <div className="field">
                      <label>Easing in (leave empty to hide)</label>
                      <textarea name="easingIn" rows={3} defaultValue={ready.content.insights.easingIn} />
                    </div>
                    <div className="field">
                      <label>Program overview</label>
                      <textarea name="overview" rows={3} defaultValue={ready.content.training.overview} />
                    </div>
                    <div className="field">
                      <label>Warm-up</label>
                      <textarea name="warmup" rows={2} defaultValue={ready.content.training.warmup} />
                    </div>
                    <div className="field">
                      <label>How to progress</label>
                      <textarea name="progression" rows={2} defaultValue={ready.content.training.progression} />
                    </div>
                    <div className="field">
                      <label>Other training notes (steps, cardio, recovery)</label>
                      <textarea name="trainingNotes" rows={2} defaultValue={ready.content.training.notes} />
                    </div>
                    <SubmitButton className="btn btn-ghost btn-wide" label="Save" pendingLabel="Saving…" />
                  </form>
                </details>
              </section>
            )}

            {isDraft && !drafting && (
              <form action={bind(publishAction)} style={{ marginBottom: 14 }}>
                <SubmitButton label={published ? "Publish changes" : `Publish to ${name}`} pendingLabel="Publishing…" />
                <p className="center small muted">
                  {published ? `${name} sees the new version right away.` : `${name} gets an email and their app fills with the plan.`}
                </p>
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
