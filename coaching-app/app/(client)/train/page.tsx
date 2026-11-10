import { requireClient } from "@/lib/auth";
import ComingSoon from "../ComingSoon";

export const metadata = { title: "Train · Vital Fusion" };

export default async function TrainPage() {
  await requireClient("/train");
  return (
    <ComingSoon
      eyebrow="Train"
      title="Your training"
      intro="Your program arrives right after your kickoff call."
      items={["Today's workout with sets, reps and rest", "A demo video for every exercise", "Logging your weights and reps"]}
    />
  );
}
