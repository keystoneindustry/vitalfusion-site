"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormQuestion } from "@/lib/form-schema";
import { submitFormAction } from "./actions";

type Ev = { target: { value: string } };

/** Fills in a form: all questions on one scrolling page, big tap targets. */
export default function FormFiller({ formId, date, questions, initial }: { formId: string; date: string; questions: FormQuestion[]; initial: Record<string, string> }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [error, setError] = useState<{ text: string; id?: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitFormAction(formId, date, JSON.stringify(answers));
      if (res.ok) {
        router.push(`/check-ins/${res.id}?sent=1`);
        router.refresh();
      } else {
        setError({ text: res.error, id: res.id });
        if (res.id) document.getElementById(`q-${res.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {questions.map((q, i) => (
        <section key={q.id} id={`q-${q.id}`} className={`card fq ${error?.id === q.id ? "fq-error" : ""}`}>
          <label className="fq-label" htmlFor={`in-${q.id}`}>
            <span className="fq-num">{i + 1}</span>
            {q.prompt}
            {!q.required && <span className="muted small"> (optional)</span>}
          </label>
          {q.help && <p className="hint" style={{ margin: "0 0 10px" }}>{q.help}</p>}
          {q.type === "scale" && (
            <div className="scale">
              {Array.from({ length: 10 }, (_, k) => String(k + 1)).map((v) => (
                <button key={v} type="button" aria-pressed={answers[q.id] === v} onClick={() => set(q.id, v)}>
                  {v}
                </button>
              ))}
            </div>
          )}
          {(q.type === "choice" || q.type === "yesno") && (
            <div className="chips">
              {(q.type === "yesno" ? ["Yes", "No"] : q.options ?? []).map((o) => (
                <button key={o} type="button" className="chip" aria-pressed={answers[q.id] === o} onClick={() => set(q.id, o)}>
                  {o}
                </button>
              ))}
            </div>
          )}
          {q.type === "number" && (
            <input
              id={`in-${q.id}`}
              type="number"
              inputMode="decimal"
              min={q.min}
              max={q.max}
              value={answers[q.id] ?? ""}
              onChange={(e: Ev) => set(q.id, e.target.value)}
              className="fq-number"
            />
          )}
          {q.type === "text" && <input id={`in-${q.id}`} value={answers[q.id] ?? ""} maxLength={300} onChange={(e: Ev) => set(q.id, e.target.value)} />}
          {q.type === "longtext" && <textarea id={`in-${q.id}`} rows={3} value={answers[q.id] ?? ""} maxLength={3000} onChange={(e: Ev) => set(q.id, e.target.value)} />}
        </section>
      ))}
      {error && <p className="notice notice-error">{error.text}</p>}
      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send to Tyler"}
      </button>
    </form>
  );
}
