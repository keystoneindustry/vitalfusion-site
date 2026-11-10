"use client";

import { useState, useTransition } from "react";
import { addWaterAction } from "./daily-actions";

/** Tap to add water; shows progress toward the daily goal. */
export default function WaterTracker({ date, initialOz, goalOz }: { date: string; initialOz: number; goalOz: number }) {
  const [oz, setOz] = useState(initialOz);
  const [, start] = useTransition();
  function add(delta: number) {
    const next = Math.max(0, oz + delta);
    setOz(next);
    start(async () => {
      const res = await addWaterAction(date, delta);
      if (res.ok) setOz(res.oz);
    });
  }
  const pct = Math.min(100, Math.round((oz / Math.max(1, goalOz)) * 100));
  return (
    <div className="water">
      <div className="row-between">
        <b>💧 Water</b>
        <span className="small">
          <b>{oz}</b> / {goalOz} oz{oz >= goalOz ? " ✓" : ""}
        </span>
      </div>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="water-btns">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => add(-8)} disabled={oz === 0}>
          −8
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => add(8)}>
          +8 oz
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => add(16)}>
          +16 oz
        </button>
      </div>
    </div>
  );
}
