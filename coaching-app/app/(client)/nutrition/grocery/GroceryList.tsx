"use client";

import { useEffect, useMemo, useState } from "react";
import { AISLES, groceryList } from "@/lib/grocery";
import type { Nutrition } from "@/lib/plan";

const DAY_OPTIONS = [3, 5, 7];

export default function GroceryList({ nutrition, storageKey }: { nutrition: Pick<Nutrition, "meals" | "perfectDay">; storageKey: string }) {
  const [days, setDays] = useState(7);
  const [got, setGot] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (saved && typeof saved === "object") {
        if (DAY_OPTIONS.includes(saved.days)) setDays(saved.days);
        if (saved.got && typeof saved.got === "object") setGot(saved.got);
      }
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ days, got }));
    } catch {}
  }, [days, got, loaded, storageKey]);

  const items = useMemo(() => groceryList(nutrition, days), [nutrition, days]);
  const left = items.filter((i) => !got[i.key]).length;

  return (
    <>
      <div className="grocery-days" role="group" aria-label="How many days to shop for">
        <span className="small muted">Shopping for</span>
        {DAY_OPTIONS.map((d) => (
          <button key={d} type="button" className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>
            {d} days
          </button>
        ))}
      </div>
      <p className="small muted" style={{ margin: "0 0 12px" }}>
        {left === 0 ? "All done ✓" : `${left} of ${items.length} items left`}
        {Object.values(got).some(Boolean) && (
          <>
            {" · "}
            <button type="button" className="btn-link small" onClick={() => setGot({})}>
              Clear ticks
            </button>
          </>
        )}
      </p>
      {AISLES.map((aisle) => {
        const list = items.filter((i) => i.aisle === aisle);
        if (!list.length) return null;
        return (
          <section key={aisle} className="card grocery-aisle">
            <h2 className="h2">{aisle}</h2>
            <ul className="grocery-items">
              {list.map((i) => (
                <li key={i.key}>
                  <button type="button" className={`grocery-item ${got[i.key] ? "on" : ""}`} aria-pressed={!!got[i.key]} onClick={() => setGot({ ...got, [i.key]: !got[i.key] })}>
                    <span className="tick-box" aria-hidden="true">{got[i.key] ? "✓" : ""}</span>
                    <span className="grocery-text">
                      <b>{i.name}</b>
                      {i.note && <span className="muted small">{i.note}</span>}
                    </span>
                    <span className="grocery-amount">{i.amount}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="muted small">Amounts are rounded up from your plan. Cooked foods like rice and chicken are shown as what to buy (dry or raw).</p>
    </>
  );
}
