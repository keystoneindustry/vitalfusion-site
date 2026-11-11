import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import { TrainingProgram } from "@/app/components/PlanViews";
import { formatCallTime } from "@/lib/booking";
import { estimateMinutes } from "@/lib/training-brief";

const GOAL_LABEL: Record<string, string> = { lose: "Fat loss", muscle: "Build muscle", maintain: "Get fitter" };

export const metadata = { title: "Training · Vital Fusion" };

export default async function TrainPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { client } = await requireClient("/train");
  const { day } = await searchParams;
  const openDay = Math.max(0, parseInt(day ?? "0", 10) || 0);
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
  return (
    <>
      <h1 className="h1">Your training</h1>
      <div className="chips-row">
        <span className="info-chip">🗓 {published.content.training.days.length}× a week</span>
        <span className="info-chip">
          ⏱ ~{Math.round(published.content.training.days.reduce((a, d) => a + estimateMinutes(d), 0) / published.content.training.days.length)} min
        </span>
        <span className="info-chip">🎯 {GOAL_LABEL[published.targets.inputs.goal] ?? "Your goal"}</span>
      </div>
      <TrainingProgram training={published.content.training} openDay={openDay} />
      <p className="small muted" style={{ marginTop: 14 }}>Do the workouts in order. Rest a day between them when you can.</p>
    </>
  );
}
