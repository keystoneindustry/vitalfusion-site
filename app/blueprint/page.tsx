import type { Metadata } from "next";
import { sourceLabel } from "@/lib/application";
import BlueprintForm from "./BlueprintForm";

// Hidden page: only reachable by link (for example /blueprint?source=instagram).
// Not in the menu, and search engines are told not to list it.
export const metadata: Metadata = {
  title: "The Busy Professional Blueprint | Vital Fusion Coaching",
  description: "Training, nutrition, cardio and recovery for men working a full-time job.",
  robots: { index: false, follow: false },
};

export default async function BlueprintPage({ searchParams }: { searchParams: Promise<{ source?: string | string[] }> }) {
  const { source } = await searchParams;
  const tag = Array.isArray(source) ? source[0] : source;
  // ?source=instagram → "Instagram". No source → "Blueprint".
  return <BlueprintForm source={tag ? sourceLabel(tag) : "Blueprint"} />;
}
