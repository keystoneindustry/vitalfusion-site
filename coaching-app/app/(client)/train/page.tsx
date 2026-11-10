import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import { TrainingProgram } from "@/app/components/PlanViews";
import ComingSoon from "../ComingSoon";
import { estimateMinutes } from "@/lib/training-brief";

const GOAL_LABEL: Record<string, string> = { lose: "Fat loss", muscle: "Build muscle", maintain: "Get fitter" };

export const metadata = { title: "Training · Vital Fusion" };

export default async function TrainPage() {
  const { client } = await requireClient("/train");
  const published = await getPublishedPlan(client.id);
  if (!hasContent(published) || published.content.training.days.length === 0) {
    return (
      <ComingSoon
        eyebrow="Training"
        title="Your training"
        intro="Your program arrives right after your kickoff call."
        items={["Your workouts with sets, reps and rest", "A demo video for every exercise", "Logging your weights and reps"]}
      />
    );
  }
  return (
    <>
      <p className="eyebrow">Training</p>
      <h1 className="h1">Your training</h1>
      <div className="chips-row">
        <span className="info-chip">🗓 {published.content.training.days.length}× a week</span>
        <span className="info-chip">
          ⏱ ~{Math.round(published.content.training.days.reduce((a, d) => a + estimateMinutes(d), 0) / published.content.training.days.length)} min
        </span>
        <span className="info-chip">🎯 {GOAL_LABEL[published.targets.inputs.goal] ?? "Your goal"}</span>
      </div>
      <TrainingProgram training={published.content.training} />
      <p className="small muted" style={{ marginTop: 14 }}>Do the workouts in order. Rest a day between them when you can.</p>
      <p className="center small muted">Exercise demo videos and weight logging are coming soon.</p>
    </>
  );
}
