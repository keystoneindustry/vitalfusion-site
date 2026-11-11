"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { splitMulti, type FormQuestion } from "@/lib/form-schema";
import { submitFormAction } from "./actions";

type Ev = { target: { value: string } };

/** Fills in a form: all questions on one scrolling page, big tap targets. */
export default function FormFiller({ formId, date, questions, initial }: { formId: string; date: string; questions: FormQuestion[]; initial: Record<string, string> }) {
  const router = useRouter();
  // "Pick any" answers are kept one option per line while filling in.
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const out = { ...initial };
    for (const q of questions) if (q.type === "multi" && out[q.id]) out[q.id] = splitMulti(q, out[q.id]).join("\n");
    return out;
  });
  const [error, setError] = useState<{ text: string; id?: string } | null>(null);
  // Unsent answers are kept on this device, so leaving halfway through doesn't lose them.
  const draftKey = `vf-form-${formId}-${date}`;
  const loaded = useRef(false);
  useEffect(() => {
    if (Object.keys(initial).length === 0) {
      try {
        const saved = JSON.parse(localStorage.getItem(draftKey) || "null") as Record<string, string> | null;
        if (saved && typeof saved === "object") setAnswers((a) => ({ ...saved, ...a }));
      } catch {}
    }
    loaded.current = true;
  }, [draftKey, initial]);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {}
  }, [answers, draftKey]);
  const [pending, start] = useTransition();
  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const toggle = (q: FormQuestion, o: string) =>
    setAnswers((a) => {
      const now = (a[q.id] ?? "").split("\n").filter(Boolean);
      const next = now.includes(o) ? now.filter((x) => x !== o) : [...now, o];
      return { ...a, [q.id]: (q.options ?? []).filter((x) => next.includes(x)).join("\n") };
    });

  function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitFormAction(formId, date, JSON.stringify(answers));
      if (res.ok) {
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        router.push(`/check-ins/${res.id}?sent=1`);
        router.refresh();
      } else {
        setError({ text: res.error, id: res.id });
        if (res.id) document.getElementById(`q-${res.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  const isAnswered = (q: FormQuestion) => (answers[q.id] ?? "").trim() !== "";
  const answered = questions.filter(isAnswered).length;
  const missing = questions.filter((q) => q.required && !isAnswered(q)).length;

  return (
    <form onSubmit={onSubmit} noValidate>
      {questions.map((q, i) => (
        <div key={q.id}>
        {q.section && <h2 className="fq-section">{q.section}</h2>}
        <section id={`q-${q.id}`} className={`card fq ${error?.id === q.id ? "fq-error" : ""}`}>
          <label className="fq-label" htmlFor={`in-${q.id}`}>
            <span className="fq-num">{i + 1}</span>
            <span>
              {q.prompt}
              {!q.required && <span className="fq-optional">Optional</span>}
            </span>
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
          {q.type === "multi" && (
            <>
              <p className="hint" style={{ margin: "0 0 8px" }}>Pick all that apply</p>
              <div className="chips">
                {(q.options ?? []).map((o) => (
                  <button key={o} type="button" className="chip" aria-pressed={(answers[q.id] ?? "").split("\n").includes(o)} onClick={() => toggle(q, o)}>
                    {o}
                  </button>
                ))}
              </div>
            </>
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
        </div>
      ))}
      {error && <p className="notice notice-error">{error.text}</p>}
      <p className="small muted center" style={{ margin: "0 0 10px" }}>
        {answered} of {questions.length} answered
        {missing > 0 ? ` · ${missing} required still to go` : " ✓"}
      </p>
      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send to Tyler"}
      </button>
    </form>
  );
}
