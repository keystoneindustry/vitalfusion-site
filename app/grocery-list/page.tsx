import type { Metadata } from "next";
import { sourceLabel } from "@/lib/application";
import GroceryListForm from "./GroceryListForm";

// Hidden page: only reachable by link (Instagram "comment LIST" via ManyChat → /grocery-list?source=instagram).
// Not in the menu, and search engines are told not to list it.
export const metadata: Metadata = {
  title: "Free Fat Loss Grocery List | Vital Fusion Coaching",
  description: "What to buy each week, what to pick in the aisle, and 12 sample meals with calories and macros.",
  robots: { index: false, follow: false },
};

export default async function GroceryListPage({ searchParams }: { searchParams: Promise<{ source?: string | string[] }> }) {
  const { source } = await searchParams;
  const tag = Array.isArray(source) ? source[0] : source;
  // ?source=instagram → "Instagram". No source → "Grocery List".
  return <GroceryListForm source={tag ? sourceLabel(tag) : "Grocery List"} />;
}
