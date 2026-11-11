"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closeness,
  ingredientMacros,
  macroLine,
  mealMacros,
  MEAL_CATEGORIES,
  newId,
  perfectDayMacros,
  roundMacros,
  type Ingredient,
  type MealCategory,
  type PerfectDayItem,
  type PlanMeal,
} from "@/lib/plan";
import { FOODS } from "@/lib/suggestions";

type Result = { ok: true; message: string; meals?: PlanMeal[] } | { ok: false; error: string };
type Targets = { calories: number; protein: number; carbs: number; fat: number };
type Ev = { target: { value: string } };

const SERVINGS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const BLANK_ING: Ingredient = { food: "", grams: 100, household: "", per100: null, source: "none" };

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function Diff({ label, actual, target }: { label: string; actual: number; target: number }) {
  return (
    <div className={`stat stat-${closeness(actual, target)}`}>
      <b>{Math.round(actual).toLocaleString("en-US")}</b>
      <span>
        {label} / {target.toLocaleString("en-US")}
      </span>
    </div>
  );
}

/** The coach's meal builder: perfect day, meal library (ingredient by ingredient) and the client-facing messages. */
export default function MealBuilder({
  initial,
  targets,
  save,
}: {
  initial: { meals: PlanMeal[]; perfectDay: { note: string; items: PerfectDayItem[] }; welcome: string; easingIn: string };
  targets: Targets;
  save: (payload: string) => Promise<Result>;
}) {
  const router = useRouter();
  const [meals, setMealsState] = useState<PlanMeal[]>(initial.meals);
  const [items, setItemsState] = useState<PerfectDayItem[]>(initial.perfectDay.items);
  const [note, setNote] = useState(initial.perfectDay.note);
  const [welcome, setWelcome] = useState(initial.welcome);
  const [easingIn, setEasingIn] = useState(initial.easingIn);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setStatus(null);
  };
  const setMeals = (m: PlanMeal[]) => {
    setMealsState(m);
    touch();
  };
  const setItems = (i: PerfectDayItem[]) => {
    setItemsState(i);
    touch();
  };
  const setMeal = (id: string, patch: Partial<PlanMeal>) => setMeals(meals.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const setIng = (meal: PlanMeal, j: number, patch: Partial<Ingredient>) =>
    setMeal(meal.id, { ingredients: meal.ingredients.map((x, k) => (k === j ? { ...x, ...patch } : x)) });

  function addMeal(category: MealCategory) {
    const m: PlanMeal = { id: newId(), category, name: "", time: "", prepMinutes: null, ingredients: [{ ...BLANK_ING }], instructions: "", why: "" };
    setMeals([...meals, m]);
    setOpenId(m.id);
  }

  function removeMeal(m: PlanMeal) {
    const used = items.some((i) => i.mealId === m.id);
    if (!window.confirm(`Remove “${m.name || "this meal"}”?${used ? " It's also taken out of the perfect day." : ""}`)) return;
    setMealsState(meals.filter((x) => x.id !== m.id));
    setItems(items.filter((i) => i.mealId !== m.id));
  }

  function onSave() {
    for (const m of meals) {
      if (!m.name.trim()) return setStatus({ ok: false, error: "Every meal needs a name." });
      if (!m.ingredients.some((i) => i.food.trim())) return setStatus({ ok: false, error: `“${m.name}” needs at least one ingredient.` });
    }
    const payload = {
      meals: meals.map((m) => ({ ...m, ingredients: m.ingredients.filter((i) => i.food.trim()) })),
      perfectDay: { note, items },
      welcome,
      easingIn,
    };
    start(async () => {
      const res = await save(JSON.stringify(payload));
      setStatus(res);
      if (res.ok) {
        if (res.meals) setMealsState(res.meals);
        setDirty(false);
        router.refresh();
      }
    });
  }

  const foodNames = [...new Set([...meals.flatMap((m) => m.ingredients.map((i) => i.food)).filter(Boolean), ...FOODS])];
  const totals = perfectDayMacros({ meals, perfectDay: { note, items } });

  return (
    <div className="builder">
      <datalist id="food-names">
        {foodNames.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      {/* ───── Perfect day ───── */}
      <h3 className="builder-section">Perfect day</h3>
      <div className="stat-row stat-row-4">
        <Diff label="kcal" actual={totals.calories} target={targets.calories} />
        <Diff label="protein" actual={totals.protein} target={targets.protein} />
        <Diff label="carbs" actual={totals.carbs} target={targets.carbs} />
        <Diff label="fat" actual={totals.fat} target={targets.fat} />
      </div>
      {items.map((it, i) => (
        <div key={i} className="pd-row">
          <input aria-label="Time" value={it.time} placeholder="7:00 AM" onChange={(e: Ev) => setItems(items.map((x, k) => (k === i ? { ...x, time: e.target.value } : x)))} />
          <select aria-label="Meal" className="pd-meal" value={it.mealId} onChange={(e: Ev) => setItems(items.map((x, k) => (k === i ? { ...x, mealId: e.target.value } : x)))}>
            {MEAL_CATEGORIES.map((c) => (
              <optgroup key={c.value} label={c.label}>
                {meals
                  .filter((m) => m.category === c.value)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || "(unnamed meal)"}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <select aria-label="Servings" value={String(it.servings)} onChange={(e: Ev) => setItems(items.map((x, k) => (k === i ? { ...x, servings: Number(e.target.value) } : x)))}>
            {SERVINGS.map((s) => (
              <option key={s} value={String(s)}>
                ×{s}
              </option>
            ))}
          </select>
          <div className="icon-btns">
            <button type="button" aria-label="Move up" onClick={() => setItems(move(items, i, i - 1))} disabled={i === 0}>
              ↑
            </button>
            <button type="button" aria-label="Remove" onClick={() => setItems(items.filter((_, k) => k !== i))}>
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={meals.length === 0}
        onClick={() => setItems([...items, { time: "", mealId: meals[0].id, servings: 1 }])}
      >
        + Add a meal to the day
      </button>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="mb-note">Note under the perfect day</label>
        <textarea id="mb-note" rows={2} value={note} onChange={(e: Ev) => (setNote(e.target.value), touch())} />
      </div>

      {/* ───── Library ───── */}
      <h3 className="builder-section">Meal library</h3>
      {MEAL_CATEGORIES.map((c) => {
        const list = meals.filter((m) => m.category === c.value);
        return (
          <div key={c.value} className="library-group">
            <h3>
              {c.label} <span className="muted">({list.length})</span>
            </h3>
            {list.map((m) => {
              const open = openId === m.id;
              const macros = mealMacros(m);
              return (
                <div key={m.id} className={`builder-card ${open ? "open" : ""}`} id={m.id}>
                  <button type="button" className="meal-toggle" onClick={() => setOpenId(open ? null : m.id)} aria-expanded={open}>
                    <span className="meal-name">{m.name || "(unnamed meal)"}</span>
                    <span className="muted small">
                      {macroLine(macros)}
                      {m.ingredients.some((i) => !i.per100 && i.food) ? " · some foods looked up on save" : ""}
                    </span>
                  </button>
                  {open && (
                    <div className="meal-edit">
                      <div className="field">
                        <label>Name</label>
                        <input value={m.name} onChange={(e: Ev) => setMeal(m.id, { name: e.target.value })} />
                      </div>
                      <div className="grid-3">
                        <div className="field">
                          <label>Group</label>
                          <select value={m.category} onChange={(e: Ev) => setMeal(m.id, { category: e.target.value as MealCategory })}>
                            {MEAL_CATEGORIES.map((x) => (
                              <option key={x.value} value={x.value}>
                                {x.label.replace(/s$/, "")}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label>Usual time</label>
                          <input value={m.time} placeholder="7:00 AM" onChange={(e: Ev) => setMeal(m.id, { time: e.target.value })} />
                        </div>
                        <div className="field">
                          <label>Prep (min)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={m.prepMinutes ?? ""}
                            onChange={(e: Ev) => setMeal(m.id, { prepMinutes: e.target.value ? Number(e.target.value) : null })}
                          />
                        </div>
                      </div>

                      <label className="field-label">Ingredients</label>
                      <div className="ing-rows">
                        {m.ingredients.map((ing, j) => {
                          const mm = roundMacros(ingredientMacros(ing));
                          return (
                            <div key={j} className="ing-row">
                              <div className="ing-top">
                                <input
                                  aria-label="Grams"
                                  className="ing-grams"
                                  type="number"
                                  inputMode="decimal"
                                  value={ing.grams || ""}
                                  onChange={(e: Ev) => setIng(m, j, { grams: Number(e.target.value) || 0 })}
                                />
                                <span className="muted">g</span>
                                <input
                                  aria-label="Food"
                                  list="food-names"
                                  value={ing.food}
                                  placeholder="e.g. chicken breast, cooked"
                                  onChange={(e: Ev) => setIng(m, j, { food: e.target.value, per100: null, source: "none", usdaName: undefined })}
                                />
                                <button type="button" className="icon-x" aria-label="Remove ingredient" onClick={() => setMeal(m.id, { ingredients: m.ingredients.filter((_, k) => k !== j) })}>
                                  ✕
                                </button>
                              </div>
                              <div className="ing-bottom">
                                <input
                                  aria-label="Household measure"
                                  className="input-sm"
                                  value={ing.household}
                                  placeholder="Household measure, e.g. 1 cup"
                                  onChange={(e: Ev) => setIng(m, j, { household: e.target.value })}
                                />
                                <span className="small muted ing-macros">
                                  {ing.per100 ? `${mm.calories} kcal · ${mm.protein}P · ${mm.carbs}C · ${mm.fat}F${ing.source === "usda" ? "" : " (est.)"}` : ing.food ? "looked up on save" : ""}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMeal(m.id, { ingredients: [...m.ingredients, { ...BLANK_ING }] })}>
                        + Add ingredient
                      </button>

                      <div className="field" style={{ marginTop: 12 }}>
                        <label>How to make it</label>
                        <textarea rows={3} value={m.instructions} onChange={(e: Ev) => setMeal(m.id, { instructions: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Why it's in their plan</label>
                        <input value={m.why} onChange={(e: Ev) => setMeal(m.id, { why: e.target.value })} />
                      </div>
                      <div className="builder-foot">
                        <span className="small">{macroLine(macros)}</span>
                        <div className="icon-btns">
                          <button
                            type="button"
                            onClick={() => {
                              const copy = { ...m, id: newId(), name: `${m.name} (copy)`, ingredients: m.ingredients.map((x) => ({ ...x })) };
                              setMeals([...meals, copy]);
                              setOpenId(copy.id);
                            }}
                          >
                            Copy
                          </button>
                          <button type="button" onClick={() => removeMeal(m)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addMeal(c.value)}>
              + Add {({ breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "snack" } as Record<string, string>)[c.value] ?? "meal"}
            </button>
          </div>
        );
      })}

      {/* ───── Messages ───── */}
      <h3 className="builder-section">What they read</h3>
      <div className="field">
        <label htmlFor="mb-welcome">Welcome message at the top of their nutrition plan</label>
        <textarea id="mb-welcome" rows={3} value={welcome} onChange={(e: Ev) => (setWelcome(e.target.value), touch())} />
      </div>
      <div className="field">
        <label htmlFor="mb-easing">Easing in (leave empty to hide)</label>
        <textarea id="mb-easing" rows={3} value={easingIn} onChange={(e: Ev) => (setEasingIn(e.target.value), touch())} />
      </div>

      <div className="save-bar">
        <span className={status && !status.ok ? "err" : "muted small"}>
          {status ? (status.ok ? status.message : status.error) : dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button type="button" className="btn btn-sm" onClick={onSave} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save meals"}
        </button>
      </div>
    </div>
  );
}
