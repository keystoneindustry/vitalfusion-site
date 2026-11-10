"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveQuestionProgress, submitQuestions } from "../actions";
import { checkAnswer, OTHER_OPTION, otherKey, visibleQuestions, type Answers, type Question } from "@/lib/onboarding-questions";

/** One question per screen. Saves on every "Next" so the client can stop and come back. */
export default function QuestionFlow({ initialAnswers, initialIndex }: { initialAnswers: Answers; initialIndex: number }) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const qs = visibleQuestions(answers);
  const [i, setI] = useState(Math.min(Math.max(0, initialIndex), qs.length - 1));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  const q = qs[Math.min(i, qs.length - 1)];
  const last = i >= qs.length - 1;

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [i]);

  function set(key: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setError(null);
  }

  function next(override?: Answers) {
    const a = override ?? answers;
    const e = checkAnswer(q, a);
    if (e) return setError(e);
    setError(null);
    if (last) {
      startTransition(async () => {
        const result = await submitQuestions(a);
        if (result?.error) {
          setError(result.error);
          if (typeof result.index === "number") setI(result.index);
        }
      });
      return;
    }
    const n = i + 1;
    setI(n);
    saveQuestionProgress(a, n).catch(() => undefined);
  }

  function pick(option: string) {
    const a = { ...answers, [q.id]: option };
    setAnswers(a);
    setError(null);
    // Single choice moves on by itself unless "Other" needs typing.
    if (option !== OTHER_OPTION) setTimeout(() => next(a), 180);
  }

  const pct = Math.round(((i + 1) / qs.length) * 100);

  return (
    <section className="card" ref={topRef}>
      <div className="row-between small muted" style={{ marginBottom: 8 }}>
        <span>{q.section}</span>
        <span>
          {i + 1} / {qs.length}
        </span>
      </div>
      <div className="progress thin" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>

      <h2 className="h2" style={{ marginTop: 16 }}>
        {q.prompt}
        {q.optional && <span className="muted small"> (optional)</span>}
      </h2>
      {q.help && <p className="muted small" style={{ marginTop: -4 }}>{q.help}</p>}

      <QuestionInput q={q} answers={answers} set={set} pick={pick} onEnter={() => next()} />

      {error && <p className="err" style={{ margin: "0 0 12px" }}>{error}</p>}

      <div className="row" style={{ gap: 10, marginTop: 8 }}>
        {i > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setI(i - 1)} disabled={pending}>
            Back
          </button>
        )}
        <button type="button" className="btn" style={{ flex: 1 }} onClick={() => next()} disabled={pending}>
          {pending ? "Sending…" : last ? "Send my answers" : q.optional && !answers[q.id] ? "Skip" : "Next"}
        </button>
      </div>
    </section>
  );
}

function QuestionInput({
  q,
  answers,
  set,
  pick,
  onEnter,
}: {
  q: Question;
  answers: Answers;
  set: (key: string, value: string | string[]) => void;
  pick: (option: string) => void;
  onEnter: () => void;
}) {
  const v = answers[q.id];
  const s = typeof v === "string" ? v : "";
  const list = Array.isArray(v) ? v : [];
  const options = [...(q.options ?? []), ...(q.other ? [OTHER_OPTION] : [])];
  const enter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    }
  };

  const otherBox = (shown: boolean) =>
    shown ? (
      <div className="field" style={{ marginTop: 10 }}>
        <input
          aria-label="Tell us more"
          placeholder="Tell us more"
          autoFocus
          value={typeof answers[otherKey(q.id)] === "string" ? (answers[otherKey(q.id)] as string) : ""}
          onChange={(e) => set(otherKey(q.id), e.target.value)}
          onKeyDown={enter}
        />
      </div>
    ) : null;

  switch (q.kind) {
    case "choice":
      return (
        <>
          <div className="options">
            {options.map((o) => (
              <button key={o} type="button" className="option" aria-pressed={s === o} onClick={() => pick(o)}>
                {o}
              </button>
            ))}
          </div>
          {otherBox(s === OTHER_OPTION)}
        </>
      );
    case "multi": {
      const toggle = (o: string) => {
        let nextList = list.includes(o) ? list.filter((x) => x !== o) : [...list, o];
        // "None" and "Just bodyweight" can't be combined with other picks.
        const solo = ["None", "Just bodyweight"];
        if (solo.includes(o) && nextList.includes(o)) nextList = [o];
        else nextList = nextList.filter((x) => !solo.includes(x) || x === o);
        set(q.id, nextList);
      };
      return (
        <>
          <div className="options">
            {options.map((o) => (
              <button key={o} type="button" className="option" aria-pressed={list.includes(o)} onClick={() => toggle(o)}>
                <span className="check" aria-hidden="true">{list.includes(o) ? "✓" : ""}</span>
                {o}
              </button>
            ))}
          </div>
          {otherBox(list.includes(OTHER_OPTION))}
        </>
      );
    }
    case "longtext":
      return (
        <div className="field">
          <textarea autoFocus placeholder={q.placeholder} value={s} onChange={(e) => set(q.id, e.target.value)} />
        </div>
      );
    case "text":
      return (
        <div className="field">
          <input autoFocus placeholder={q.placeholder} value={s} onChange={(e) => set(q.id, e.target.value)} onKeyDown={enter} />
        </div>
      );
    case "number":
      return (
        <div className="field with-unit">
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min={q.min}
            max={q.max}
            value={s}
            onChange={(e) => set(q.id, e.target.value)}
            onKeyDown={enter}
          />
          {q.unit && <span className="unit">{q.unit}</span>}
        </div>
      );
    case "height": {
      const [ft = "", inch = ""] = s ? s.split(",") : [];
      const update = (f: string, n: string) => set(q.id, `${f},${n}`);
      return (
        <div className="grid-2">
          <div className="field with-unit">
            <input autoFocus type="number" inputMode="numeric" aria-label="Feet" min={3} max={8} value={ft} onChange={(e) => update(e.target.value, inch)} />
            <span className="unit">ft</span>
          </div>
          <div className="field with-unit">
            <input type="number" inputMode="numeric" aria-label="Inches" min={0} max={11} value={inch} onChange={(e) => update(ft, e.target.value)} onKeyDown={enter} />
            <span className="unit">in</span>
          </div>
        </div>
      );
    }
    case "time":
      return (
        <div className="field">
          <input type="time" value={s} onChange={(e) => set(q.id, e.target.value)} />
        </div>
      );
  }
}
