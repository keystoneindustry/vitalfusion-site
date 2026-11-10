import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { getResponse } from "@/lib/onboarding-data";
import { getOpenPlan, getPublishedPlan, hasContent, isDrafting, isStale } from "@/lib/plans";
import { emptyContent, partState } from "@/lib/plan";
import { trainingFacts } from "@/lib/training-brief";
import { TrainingProgram } from "@/app/components/PlanViews";
import TrainingBuilder from "../TrainingBuilder";
import PartBar from "../PartBar";
import AiCard from "../AiCard";
import { saveTrainingAction } from "../plan-actions";

export const metadata = { title: "Training · Vital Fusion Coach" };
// The AI keeps working after the page answers; give it up to 5 minutes.
export const maxDuration = 300;

export default async function TrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id } = await params;
  const { msg, error } = await searchParams;
  await requireCoach(`/coach/clients/${id}/training`);
  const client = await getClient(id);
  if (!client) notFound();

  const [open, pub, response] = await Promise.all([getOpenPlan(client.id), getPublishedPlan(client.id), getResponse(client.id)]);
  const work = hasContent(open) ? open : null;
  const live = hasContent(pub) ? pub : null;
  const shown = work ?? live;
  const training = (shown?.content ?? emptyContent()).training;
  const state = partState(work, live, "training");
  const drafting = isDrafting(open, "training");
  const answers = response?.answers ?? {};
  const facts = trainingFacts(answers);
  const name = firstName(client.full_name);
  const has = training.days.length > 0;

  return (
    <>
      <PartBar
        clientId={client.id}
        part="training"
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
            <AiCard clientId={client.id} part="training" has={false} healthFlag={client.health_flag} callNotes={open?.call_notes ?? ""} disabled={false} />
          )}
          <section className="card" id="training">
            <h2 className="h2">🏋️ Training program</h2>
            {drafting ? (
              has ? <TrainingProgram training={training} /> : <p className="muted">The AI is drafting the workouts…</p>
            ) : (
              <TrainingBuilder
                key={`t-${shown?.id ?? "new"}-${shown?.usage?.runs ?? 0}-${shown?.status ?? ""}`}
                initial={training}
                answers={answers}
                save={saveTrainingAction.bind(null, client.id)}
              />
            )}
          </section>
        </div>

        <div>
          <section className="card">
            <h2 className="h2">Their training answers</h2>
            {facts.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>They haven't answered the onboarding questions yet.</p>
            ) : (
              <dl className="kv kv-wide">
                {facts.map((f) => (
                  <div key={f.label} style={{ display: "contents" }}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
          {has && !drafting && (
            <AiCard clientId={client.id} part="training" has healthFlag={client.health_flag} callNotes={open?.call_notes ?? ""} disabled={false} />
          )}
        </div>
      </div>
    </>
  );
}
