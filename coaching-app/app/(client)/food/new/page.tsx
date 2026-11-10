import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { HUNGER, MEAL_TYPES, PLACES } from "@/lib/meals";
import MealForm from "./MealForm";

export const metadata = { title: "Log a meal · Vital Fusion" };

export default async function NewMealPage() {
  await requireClient("/food/new");
  return (
    <>
      <p className="small">
        <Link href="/food">← Food log</Link>
      </p>
      <h1 className="h1">Log a meal</h1>
      <p className="lead">A quick photo is all Tyler needs. Snacks and drinks count too.</p>
      <section className="card">
        <MealForm
          meals={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label, icon: m.icon }))}
          places={[...PLACES]}
          hunger={HUNGER.map((h) => ({ value: String(h.value), label: h.label }))}
        />
      </section>
    </>
  );
}
