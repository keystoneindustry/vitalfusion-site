import type { Metadata } from "next";
import { sourceLabel } from "@/lib/application";
import MacroQuiz from "./MacroQuiz";

// Hidden page: only reachable by link (Instagram "comment MACROS" via ManyChat).
// Not in the menu, and search engines are told not to list it.
export const metadata: Metadata = {
  title: "Free Macro Calculator | Vital Fusion Coaching",
  description: "Get your daily calories, protein, carbs and fat in 60 seconds.",
  robots: { index: false, follow: false },
};

export default async function MacrosPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[] }>;
}) {
  const { source } = await searchParams;
  const tag = Array.isArray(source) ? source[0] : source;
  // ?source=macros → "Macros". No source → "Macro Quiz".
  return <MacroQuiz source={tag ? sourceLabel(tag) : "Macro Quiz"} />;
}
