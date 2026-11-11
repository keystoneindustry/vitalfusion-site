"use client";

import { useState } from "react";
import ExerciseForm from "./ExerciseForm";

/** "Edit" under one exercise: opens the same form, filled in. */
export default function EditExercise(props: { categories: string[]; initial: { id: string; name: string; category: string; cue: string | null; videoUrl: string | null; hasFile: boolean } }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn-link small" onClick={() => setOpen(true)}>
        Edit
      </button>
    );
  return (
    <div className="ex-edit">
      <ExerciseForm categories={props.categories} initial={props.initial} onDone={() => setOpen(false)} />
      <button type="button" className="btn-link small" onClick={() => setOpen(false)} style={{ marginTop: 8 }}>
        Cancel
      </button>
    </div>
  );
}
