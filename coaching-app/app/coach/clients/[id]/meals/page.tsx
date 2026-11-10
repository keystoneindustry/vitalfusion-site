import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { listMeals, logStats } from "@/lib/meals";
import { todayIn } from "@/lib/dates";
import { defaultTargets, loadContext } from "@/lib/plan-draft";
import { getOpenPlan, getPublishedPlan, hasContent, isDrafting, isStale } from "@/lib/plans";
import { emptyContent, hasEstimates, partState } from "@/lib/plan";
import TargetsCard from "@/app/components/TargetsCard";
import { MealLibrary, PerfectDay } from "@/app/components/PlanViews";
import MealBuilder from "../MealBuilder";
import PartBar from "../PartBar";
import AiCard from "../AiCard";
import TargetsEditor from "../TargetsEditor";
import { saveNutritionAction } from "../plan-actions";

export const metadata = { title: "Meals · Vital Fusion Coach" };
// The AI keeps working after the page answers; give it up to 5 minutes.
export const maxDuration = 300;

export default async function MealsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id } = await params;
  const { msg, error } = await searchParams;
  await requireCoach(`/coach/clients/${id}/meals`);
  const client = await getClient(id);
  if (!client) notFound();

  const [open, pub, logs] = await Promise.all([getOpenPlan(client.id), getPublishedPlan(client.id), listMeals(client.id)]);
  const work = hasContent(open) ? open : null;
  const live = hasContent(pub) ? pub : null;
  const shown = work ?? live;
  const targets = shown?.targets ?? defaultTargets(await loadContext(client));
  const content = shown?.content ?? emptyContent();
  const state = partState(work, live, "nutrition");
  const drafting = isDrafting(open, "nutrition");
  const food = logStats(logs, client.timezone, todayIn(client.timezone));
  const name = firstName(client.full_name);
  const has = content.meals.length > 0;
  const notes = content.coachNotes.filter((n) => !n.startsWith("Training: "));

  return (
    <>
      <PartBar
        clientId={client.id}
        part="nutrition"
        state={state}
        drafting={drafting}
        stale={!!open && isStale(open)}
        error={open?.error ?? null}
        msg={msg}
        urlError={error}
        name={name}
      />

      <div className="detail-grid">
        <div>
          {!has && !drafting && (
            <AiCard clientId={client.id} part="nutrition" has={false} healthFlag={client.health_flag} callNotes={open?.call_notes ?? ""} disabled={false} />
          )}
          <section className="card" id="meals">
            <h2 className="h2">🍽️ Meal plan</h2>
            {drafting ? (
              has ? (
                <>
                  <PerfectDay nutrition={content} targets={targets} />
                  <MealLibrary meals={content.meals} />
                </>
              ) : (
                <p className="muted">The AI is drafting the meals…</p>
              )
            ) : (
              <MealBuilder
                key={`m-${shown?.id ?? "new"}-${shown?.usage?.runs ?? 0}-${shown?.status ?? ""}`}
                initial={{ meals: content.meals, perfectDay: content.perfectDay, welcome: content.welcome, easingIn: content.insights.easingIn }}
                targets={targets}
                save={saveNutritionAction.bind(null, client.id)}
              />
            )}
            {hasEstimates(content.meals) && (
              <p className="small muted" style={{ marginBottom: 0 }}>
                “(est.)” = no USDA match, so the AI's estimate is used for that ingredient.
              </p>
            )}
          </section>
        </div>

        <div>
          <div id="targets">
            <TargetsCard targets={targets} title="Daily targets" />
          </div>
          {!drafting && <TargetsEditor clientId={client.id} targets={targets} />}

          {has && !drafting && (
            <AiCard clientId={client.id} part="nutrition" has healthFlag={client.health_flag} callNotes={open?.call_notes ?? ""} disabled={false} />
          )}

          {content.insights.summary && (
            <section className="card">
              <h2 className="h2">What their food log shows</h2>
              <p className="coming" style={{ marginTop: 0 }}>{content.insights.summary}</p>
              <dl className="kv kv-wide">
                {content.insights.usualFoods.length > 0 && (
                  <>
                    <dt>Usual foods</dt>
                    <dd>{content.insights.usualFoods.join(", ")}</dd>
                  </>
                )}
                {content.insights.mealTiming && (
                  <>
                    <dt>Timing</dt>
                    <dd>{content.insights.mealTiming}</dd>
                  </>
                )}
                {content.insights.portions && (
                  <>
                    <dt>Portions</dt>
                    <dd>{content.insights.portions}</dd>
                  </>
                )}
                {content.insights.patterns && (
                  <>
                    <dt>Patterns</dt>
                    <dd>{content.insights.patterns}</dd>
                  </>
                )}
                {(content.insights.estimatedCalories || content.insights.intakeNote) && (
                  <>
                    <dt>Eating now</dt>
                    <dd>
                      {content.insights.estimatedCalories
                        ? `≈ ${Math.round(content.insights.estimatedCalories).toLocaleString("en-US")} kcal${
                            content.insights.estimatedProtein ? `, ${Math.round(content.insights.estimatedProtein)} g protein` : ""
                          } a day. `
                        : ""}
                      {content.insights.intakeNote}
                    </dd>
                  </>
                )}
              </dl>
            </section>
          )}
          <p className="small">
            <Link href={`/coach/clients/${client.id}/food`}>
              📷 Food log: {food.total} entr{food.total === 1 ? "y" : "ies"} over {food.days} day{food.days === 1 ? "" : "s"} →
            </Link>
          </p>

          {notes.length > 0 && (
            <section className="card">
              <h2 className="h2">⚠️ Double-check before publishing</h2>
              <ul className="coming" style={{ margin: 0, paddingLeft: 20 }}>
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
          )}
          {content.callAgenda.length > 0 && (
            <section className="card">
              <h2 className="h2">📞 For the kickoff call</h2>
              <ul className="coming" style={{ margin: 0, paddingLeft: 20 }}>
                {content.callAgenda.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
