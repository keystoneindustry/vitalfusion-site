"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QUESTION_TYPES, type FormQuestion, type QuestionType } from "@/lib/form-schema";

type Result = { ok: true } | { ok: false; error: string };
type Ev = { target: { value: string } };

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

/** Edit a form's name, intro and questions; saves everything at once. */
export default function FormBuilder({
  initial,
  save,
}: {
  initial: { title: string; intro: string; questions: FormQuestion[] };
  save: (payload: string) => Promise<Result>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [intro, setIntro] = useState(initial.intro);
  const [qs, setQs] = useState<FormQuestion[]>(initial.questions);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState("");
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
    setStatus("");
    setError("");
  };
  const setQ = (i: number, patch: Partial<FormQuestion>) => {
    setQs(qs.map((q, k) => (k === i ? { ...q, ...patch } : q)));
    touch();
  };

  function onSave() {
    start(async () => {
      const res = await save(JSON.stringify({ title, intro, questions: qs }));
      if (res.ok) {
        setDirty(false);
        setStatus("Saved ✓ Clients get the new version from their next check-in.");
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div className="builder">
      <div className="field">
        <label htmlFor="fb-title">Form name</label>
        <input id="fb-title" value={title} maxLength={100} onChange={(e: Ev) => (setTitle(e.target.value), touch())} />
      </div>
      <div className="field">
        <label htmlFor="fb-intro">Intro (shown at the top)</label>
        <textarea id="fb-intro" rows={2} value={intro} maxLength={500} onChange={(e: Ev) => (setIntro(e.target.value), touch())} />
      </div>

      <h3 className="builder-section">Questions</h3>
      {qs.map((q, i) => (
        <div key={i} className="builder-card">
          <div className="builder-head">
            <span className="builder-num">{i + 1}</span>
            <input aria-label="Question" className="builder-title" value={q.prompt} placeholder="Question" onChange={(e: Ev) => setQ(i, { prompt: e.target.value })} />
          </div>
          <div className="grid-2" style={{ marginTop: 8 }}>
            <select aria-label="Answer type" value={q.type} onChange={(e: Ev) => setQ(i, { type: e.target.value as QuestionType })}>
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="small row" style={{ gap: 6 }}>
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e: { target: HTMLInputElement }) => setQ(i, { required: e.target.checked })}
                style={{ width: "auto", appearance: "auto", WebkitAppearance: "checkbox" }}
              />
              Required
            </label>
          </div>
          {q.type === "choice" && (
            <textarea
              className="input-sm"
              rows={3}
              aria-label="Choices"
              placeholder={"One choice per line\nGreat\nOK\nNot great"}
              value={(q.options ?? []).join("\n")}
              onChange={(e: Ev) => setQ(i, { options: e.target.value.split("\n") })}
            />
          )}
          {q.type === "number" && (
            <div className="grid-2" style={{ marginTop: 6 }}>
              <input aria-label="Lowest" type="number" placeholder="Lowest (optional)" value={q.min ?? ""} onChange={(e: Ev) => setQ(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <input aria-label="Highest" type="number" placeholder="Highest (optional)" value={q.max ?? ""} onChange={(e: Ev) => setQ(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })} />
            </div>
          )}
          <input className="input-sm" aria-label="Hint" value={q.help ?? ""} placeholder="Hint under the question (optional)" onChange={(e: Ev) => setQ(i, { help: e.target.value })} />
          <div className="builder-foot">
            <span className="muted small">{q.type === "scale" ? "They tap 1–10" : ""}</span>
            <div className="icon-btns">
              <button type="button" onClick={() => (setQs(move(qs, i, i - 1)), touch())} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" onClick={() => (setQs(move(qs, i, i + 1)), touch())} disabled={i === qs.length - 1} aria-label="Move down">
                ↓
              </button>
              <button type="button" onClick={() => (setQs(qs.filter((_, k) => k !== i)), touch())} aria-label="Remove question">
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost btn-wide"
        onClick={() => (setQs([...qs, { id: `q${Date.now().toString(36)}`, type: "longtext", prompt: "", required: true }]), touch())}
      >
        + Add question
      </button>

      <div className="save-bar">
        <span className={error ? "err" : "muted small"}>{error || status || (dirty ? "Unsaved changes" : "All changes saved")}</span>
        <button type="button" className="btn btn-sm" onClick={onSave} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save form"}
        </button>
      </div>
    </div>
  );
}
