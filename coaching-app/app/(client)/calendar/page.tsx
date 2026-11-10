import { requireClient } from "@/lib/auth";
import ComingSoon from "../ComingSoon";

export const metadata = { title: "Calendar · Vital Fusion" };

export default async function CalendarPage() {
  await requireClient("/calendar");
  return (
    <ComingSoon
      eyebrow="Calendar"
      title="Your calendar"
      intro="Everything Tyler schedules for you will live here, so you always know what's next."
      items={[
        "Weekly check-ins and other forms",
        "Weigh-ins and progress pictures",
        "Your daily habits",
        "Workouts and 1:1 calls",
      ]}
    />
  );
}
