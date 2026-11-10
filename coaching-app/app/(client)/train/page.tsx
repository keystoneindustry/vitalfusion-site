import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import { TrainingProgram } from "@/app/components/PlanViews";
import ComingSoon from "../ComingSoon";

export const metadata = { title: "Train · Vital Fusion" };

export default async function TrainPage() {
  const { client } = await requireClient("/train");
  const published = await getPublishedPlan(client.id);
  if (!hasContent(published) || published.content.training.days.length === 0) {
    return (
      <ComingSoon
        eyebrow="Train"
        title="Your training"
        intro="Your program arrives right after your kickoff call."
        items={["Your workouts with sets, reps and rest", "A demo video for every exercise", "Logging your weights and reps"]}
      />
    );
  }
  return (
    <>
      <p className="eyebrow">Train</p>
      <h1 className="h1">Your training program</h1>
      <p className="lead">
        {published.content.training.days.length} workouts a week. Do them in order, with at least one rest day between hard
        sessions when you can.
      </p>
      <section className="card">
        <TrainingProgram training={published.content.training} />
      </section>
      <p className="center small muted">Exercise demo videos and weight logging are coming soon.</p>
    </>
  );
}
