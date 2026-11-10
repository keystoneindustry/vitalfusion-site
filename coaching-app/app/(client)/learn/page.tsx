import { requireClient } from "@/lib/auth";
import ComingSoon from "../ComingSoon";

export const metadata = { title: "Learn · Vital Fusion" };

export default async function LearnPage() {
  await requireClient("/learn");
  return (
    <ComingSoon
      eyebrow="Learn"
      title="Your library"
      intro="Guides, videos and your nutrition plan, all in one place."
      items={["Your meal plan and sample meals", "Videos and guides from Tyler", "How your coaching weeks work", "A replay of the app tour"]}
    />
  );
}
