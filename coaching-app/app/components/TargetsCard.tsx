import type { Targets } from "@/lib/targets";

/** The client's daily numbers: calories big, then protein / carbs / fat, then fiber and water. */
export default function TargetsCard({ targets, title = "Your daily targets" }: { targets: Targets; title?: string }) {
  return (
    <section className="card card-accent">
      <h2 className="h2">{title}</h2>
      <p className="big-number">
        {targets.calories.toLocaleString("en-US")} <span>calories</span>
      </p>
      <div className="stat-row">
        <div className="stat">
          <b>{targets.protein}g</b>
          <span>protein</span>
        </div>
        <div className="stat">
          <b>{targets.carbs}g</b>
          <span>carbs</span>
        </div>
        <div className="stat">
          <b>{targets.fat}g</b>
          <span>fat</span>
        </div>
      </div>
      <div className="stat-row stat-row-2">
        <div className="stat">
          <b>{targets.fiber}g</b>
          <span>fiber</span>
        </div>
        <div className="stat">
          <b>{targets.waterOz} oz</b>
          <span>water</span>
        </div>
      </div>
    </section>
  );
}
