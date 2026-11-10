import { groupByDay, hungerLabel, mealIcon, mealLabel, timeIn, type MealLog } from "@/lib/meals";
import { formatDate } from "@/lib/dates";
import SubmitButton from "./SubmitButton";

/** A food log, one card per day. Used by the client (with delete) and the coach (read-only). */
export default function MealDays({
  meals,
  urls,
  timeZone,
  onDelete,
}: {
  meals: MealLog[];
  urls: Record<string, string>;
  timeZone: string;
  onDelete?: (form: FormData) => Promise<void>;
}) {
  const days = groupByDay(meals, timeZone);
  return (
    <>
      {days.map((d) => (
        <section key={d.day} className="card">
          <h2 className="h2">
            {formatDate(d.day, false)} <span className="muted small">· {d.meals.length} logged</span>
          </h2>
          <ul className="meal-list">
            {d.meals.map((m) => {
              const url = m.photo_path ? urls[m.photo_path] : null;
              const hunger = hungerLabel(m.hunger);
              return (
                <li key={m.id}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="meal-thumb">
                      <img src={url} alt={`${mealLabel(m.meal)} photo`} loading="lazy" />
                    </a>
                  ) : (
                    <span className="meal-thumb meal-thumb-empty" aria-hidden="true">
                      {mealIcon(m.meal)}
                    </span>
                  )}
                  <div className="meal-info">
                    <b>
                      {mealLabel(m.meal)} · {timeIn(m.eaten_at, timeZone)}
                    </b>
                    {(m.place || hunger) && <span className="muted small">{[m.place, hunger && `Hunger: ${hunger}`].filter(Boolean).join(" · ")}</span>}
                    {m.note && <p>{m.note}</p>}
                    {onDelete && (
                      <form action={onDelete}>
                        <input type="hidden" name="id" value={m.id} />
                        <SubmitButton className="btn-link small" label="Delete" pendingLabel="Deleting…" />
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
