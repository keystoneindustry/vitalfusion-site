"use client";

import { site } from "@/content/site";
import { mealName, type QuizInput } from "@/lib/macros";
import { foodsLine } from "@/lib/foods";
import { safeFallbackMeals } from "@/lib/fallback-meals";
import type { SampleDay } from "@/lib/sample-day";

const LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

// Results-page card: "Building your sample day…" while the AI works, then the day itself.
// If the AI isn't available, it shows the 3 favourite meals (minus any with foods they avoid).
export default function SampleDayCard({ day, input }: { day: SampleDay | "loading" | "fallback"; input: QuizInput }) {
  const q = site.macroQuiz;

  if (day === "loading") {
    const loves = foodsLine(input.likes.slice(0, 4), "");
    return (
      <section className="m-section">
        <h2 className="m-h2">Your sample day</h2>
        <div className="day-loading" role="status" aria-live="polite">
          <span className="day-spinner" aria-hidden />
          <div>
            <p className="day-loading-title">Building your meals…</p>
            <p className="day-loading-sub">
              {loves ? `Around ${loves}, ` : ""}portioned to your exact numbers. This takes about 15 seconds.
            </p>
          </div>
        </div>
        <div className="day-skeleton" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="day-skel-card" />
          ))}
        </div>
      </section>
    );
  }

  if (day === "fallback") {
    const meals = safeFallbackMeals(input);
    if (!meals.length) return null;
    return (
      <section className="m-section">
        <h2 className="m-h2">{q.mealsTitle[input.goal]}</h2>
        <p className="m-sub">{q.mealsSub}</p>
        <div className="m-meals">
          {meals.map((m, i) => (
            <article key={i} className="m-meal">
              <p className="m-meal-num">Meal {i + 1}</p>
              <h3>{mealName(m, input.goal)}</h3>
              {"detail" in m && m.detail && <p className="m-meal-detail">{m.detail}</p>}
              <ul>
                {m.why[input.goal].map((w) => (
                  <li key={w}>✓ {w}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const t = day.totals;
  return (
    <section className="m-section">
      <h2 className="m-h2">Your sample day</h2>
      <p className="m-sub">Built around the foods you love and portioned to your numbers.</p>
      <div className="day-totals">
        <span><strong>{t.calories.toLocaleString()}</strong> cal</span>
        <span><strong>{t.protein}g</strong> protein</span>
        <span><strong>{t.carbs}g</strong> carbs</span>
        <span><strong>{t.fat}g</strong> fat</span>
      </div>
      <div className="m-meals">
        {day.meals.map((m, i) => (
          <article key={i} className="m-meal day-meal">
            <p className="m-meal-num">
              {LABEL[m.category] ?? m.category}
              {m.time ? ` · ${m.time}` : ""}
            </p>
            <h3>{m.name}</h3>
            {m.why && <p className="m-meal-detail">{m.why}</p>}
            <ul className="day-items">
              {m.items.map((it, k) => (
                <li key={k}>
                  <span className="day-amt">{it.amount}</span> {it.food}
                </li>
              ))}
            </ul>
            {m.instructions.length > 0 && (
              <details className="day-how">
                <summary>How to make it</summary>
                <ol>
                  {m.instructions.map((s, k) => (
                    <li key={k}>{s}</li>
                  ))}
                </ol>
              </details>
            )}
            <p className="day-macros">
              {m.macros.calories} cal · {m.macros.protein}g P · {m.macros.carbs}g C · {m.macros.fat}g F
            </p>
          </article>
        ))}
      </div>
      <p className="m-fine day-note">A sample to show what your numbers look like as real food. Swap foods you like for similar ones.</p>
    </section>
  );
}
