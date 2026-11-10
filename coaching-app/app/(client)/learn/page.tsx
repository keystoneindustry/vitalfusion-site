import { requireClient } from "@/lib/auth";
import ComingSoon from "../ComingSoon";

export const metadata = { title: "Library · Vital Fusion" };

export default async function LibraryPage() {
  await requireClient("/learn");
  return (
    <ComingSoon
      eyebrow="Library"
      title="Your library"
      intro="Guides and videos from Tyler, all in one place."
      items={["Videos and guides from Tyler", "How your coaching weeks work", "A replay of the app tour"]}
    />
  );
}
