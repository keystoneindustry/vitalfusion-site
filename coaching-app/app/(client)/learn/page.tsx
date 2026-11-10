import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import ComingSoon from "../ComingSoon";

export const metadata = { title: "Learn · Vital Fusion" };

export default async function LearnPage() {
  const { client } = await requireClient("/learn");
  const published = await getPublishedPlan(client.id);
  return (
    <>
      {hasContent(published) && (
        <section className="card card-accent">
          <h2 className="h2">🍽️ Your nutrition plan</h2>
          <p className="coming" style={{ marginTop: 0 }}>
            Your daily targets, your perfect day and {published.content.meals.length} meals built around the foods you like.
          </p>
          <Link className="btn btn-wide" href="/plan">
            Open my meal plan
          </Link>
        </section>
      )}
      <ComingSoon
        eyebrow="Learn"
        title="Your library"
        intro="Guides, videos and your nutrition plan, all in one place."
        items={["Videos and guides from Tyler", "How your coaching weeks work", "A replay of the app tour"]}
      />
    </>
  );
}
