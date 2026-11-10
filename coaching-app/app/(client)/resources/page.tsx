import { requireClient } from "@/lib/auth";
import ComingSoon from "../ComingSoon";

export const metadata = { title: "Resources · Vital Fusion" };

export default async function ResourcesPage() {
  await requireClient("/resources");
  return (
    <ComingSoon
      eyebrow="Resources"
      title="Your resources"
      intro="Helpful videos and documents from Tyler, all in one place."
      items={["Videos from Tyler", "Guides and documents to download", "How your coaching weeks work", "A replay of the app tour"]}
    />
  );
}
