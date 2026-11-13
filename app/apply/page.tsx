import type { Metadata } from "next";
import { AGE_RANGES, sourceLabel } from "@/lib/application";
import ApplyForm from "./ApplyForm";

export const metadata: Metadata = {
  title: "Apply for Coaching | Vital Fusion Coaching",
  description:
    "Apply for one-on-one fitness and nutrition coaching with Vital Fusion Coaching. Take the first step towards your transformation.",
};

// Track where applicants come from: share links like
//   vitalfusioncoaching.com/apply?source=instagram
// and the email will say "Source: Instagram". No param = "Main Website".
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[]; age?: string | string[] }>;
}) {
  const { source, age } = await searchParams;
  const tag = Array.isArray(source) ? source[0] : source;
  // ?age=23-29 comes from tapping an age on the homepage: skip to question 2.
  const ageParam = Array.isArray(age) ? age[0] : age;
  const initialAge = (AGE_RANGES as readonly string[]).includes(ageParam ?? "") ? ageParam! : "";
  return <ApplyForm source={sourceLabel(tag)} initialAge={initialAge} />;
}
