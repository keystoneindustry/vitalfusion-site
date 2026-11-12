import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import { TrainingProgram } from "@/app/components/PlanViews";
import { formatCallTime } from "@/lib/booking";
import { estimateMinutes } from "@/lib/training-brief";
import { todayIn } from "@/lib/dates";
import { weekDates } from "@/lib/calendar";
import { loadDays } from "@/lib/client-days";
import { demosFor } from "@/lib/exercises";
import FeatureTour from "../FeatureTour";
import { TRAINING_TOUR } from "../tour-steps";

const GOAL_LABEL: Record<string, string> = { lose: "Fat loss", muscle: "Build muscle", maintain: "Get fitter" };

export const metadata = { title: "Training · Vital Fusion" };

export default async function TrainPage({ searchParams }: { searchParams: Promise<{ day?: string; tour?: string }> }) {
  const { client } = await requireClient("/train");
  const { day, tour } = await searchParams;
  const published = await getPublishedPlan(client.id);
  if (!hasContent(published) || published.content.training.days.length === 0) {
    return (
      <>
        <h1 className="h1">Your training</h1>
        <div className="card empty">
          <p style={{ margin: 0 }}>
            {client.onboarding_step !== "done"
              ? "Finish setting up first. Your checklist is on the Today tab."
              : `Your program arrives right after your kickoff call${client.kickoff_at ? ` (${formatCallTime(client.kickoff_at, client.timezone)})` : ""}.`}
          </p>
        </div>
      </>
    );
  }
  const training = published.content.training;
  const today = todayIn(client.timezone);
  const [{ days: week }, demos] = await Promise.all([
    loadDays(client.id, weekDates(today)),
    demosFor(training.days.flatMap((d) => d.exercises.map((e) => e.name))).catch(() => ({})),
  ]);
  const todays = week.find((d) => d.date === today)?.workouts[0] ?? null;
  const scheduled = week.some((d) => d.workouts.length > 0);
  const openDay = day !== undefined ? Math.max(0, parseInt(day, 10) || 0) : (todays?.day ?? 0);
  const minutes = Math.round(training.days.reduce((a, d) => a + estimateMinutes(d), 0) / training.days.length);
  const perWeek = scheduled ? week.reduce((n, d) => n + d.workouts.length, 0) : training.days.length;

  return (
    <>
      <h1 className="h1">Your training</h1>
      <p className="lead" style={{ marginTop: -4 }} data-tour="t-meta">
        {perWeek}× a week · ~{minutes} min · {GOAL_LABEL[published.targets.inputs.goal] ?? "Your goal"}
      </p>

      {todays && (
        <p className="today-workout">
          🏋️ Today: <b>{todays.name}</b>
        </p>
      )}

      {training.overview && <p className="program-intro">{training.overview.split(/(?<=\.)\s+/).slice(0, 2).join(" ")}</p>}
      <TrainingProgram training={training} openDay={openDay} demos={demos} />
      {(!client.training_tour_seen_at || tour === "1") && (
        <FeatureTour
          tour="training"
          label="Training tour"
          steps={TRAINING_TOUR}
          finish={{ title: "💪 Let's get to work", text: "Open today's workout (or your first one), warm up, and follow it top to bottom. You can take this tour again in ☰ More → Settings." }}
        />
      )}
      {!scheduled && <p className="small muted" style={{ marginTop: 14 }}>Do the workouts in order. Rest a day between them when you can.</p>}
    </>
  );
}
