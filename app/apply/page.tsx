import type { Metadata } from "next";
import { sourceLabel } from "@/lib/application";
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
  searchParams: Promise<{ source?: string | string[] }>;
}) {
  const { source } = await searchParams;
  const tag = Array.isArray(source) ? source[0] : source;
  return <ApplyForm source={sourceLabel(tag)} />;
}
