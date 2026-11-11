import type { Targets } from "@/lib/targets";

/** The client's daily numbers: calories big, then protein / carbs / fat / fiber. */
export default function TargetsCard({ targets, title = "Your daily targets" }: { targets: Targets; title?: string }) {
  const stats: [string, string][] = [
    [`${targets.protein}g`, "protein"],
    [`${targets.carbs}g`, "carbs"],
    [`${targets.fat}g`, "fat"],
    [`${targets.fiber}g`, "fiber"],
  ];
  return (
    <section className="card card-accent">
      <h2 className="h2">{title}</h2>
      <p className="big-number">
        {targets.calories.toLocaleString("en-US")} <span>calories</span>
      </p>
      <div className="stat-row stat-row-4" style={{ marginBottom: 0 }}>
        {stats.map(([v, l]) => (
          <div key={l} className="stat">
            <b>{v}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
