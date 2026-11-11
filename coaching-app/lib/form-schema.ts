/** Form shapes and checks (pure; safe to use in the browser). The database side is lib/forms.ts. */

export const QUESTION_TYPES = [
  { value: "scale", label: "1–10 scale" },
  { value: "number", label: "Number" },
  { value: "choice", label: "Pick one" },
  { value: "yesno", label: "Yes / No" },
  { value: "text", label: "Short answer" },
  { value: "longtext", label: "Long answer" },
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

export type FormQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  help?: string;
  options?: string[];
  min?: number;
  max?: number;
  required: boolean;
};

export type Form = {
  id: string;
  title: string;
  intro: string | null;
  kind: "checkin" | "custom";
  questions: FormQuestion[];
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type CheckinSummary = {
  summary: string[];
  wins: string[];
  concerns: string[];
  suggestions: { change: string; reason: string }[];
  draftReply: string;
};

export type Submission = {
  id: string;
  client_id: string;
  form_id: string;
  due_date: string;
  answers: Record<string, string>;
  questions: FormQuestion[];
  submitted_at: string;
  ai_status: "none" | "pending" | "done" | "failed";
  ai_summary: CheckinSummary | null;
  ai_error: string | null;
  coach_reply: string | null;
  replied_at: string | null;
  reply_seen_at: string | null;
};

function isType(v: string): v is QuestionType {
  return QUESTION_TYPES.some((t) => t.value === v);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "q";
}

/** Cleans questions sent from the form builder. */
export function sanitizeQuestions(raw: unknown): { ok: true; questions: FormQuestion[] } | { ok: false; error: string } {
  const list = Array.isArray(raw) ? raw : [];
  const out: FormQuestion[] = [];
  const ids = new Set<string>();
  for (const [i, item] of list.slice(0, 40).entries()) {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const prompt = typeof o.prompt === "string" ? o.prompt.trim().slice(0, 200) : "";
    if (!prompt) return { ok: false, error: `Question ${i + 1} needs wording.` };
    const type = typeof o.type === "string" && isType(o.type) ? o.type : "text";
    let id = typeof o.id === "string" && /^[a-zA-Z0-9_]{1,40}$/.test(o.id) ? o.id : slug(prompt);
    while (ids.has(id)) id = `${id}${i}`;
    ids.add(id);
    const q: FormQuestion = { id, type, prompt, required: o.required !== false };
    const help = typeof o.help === "string" ? o.help.trim().slice(0, 200) : "";
    if (help) q.help = help;
    if (type === "choice") {
      const options = (Array.isArray(o.options) ? o.options : [])
        .map((x) => String(x).trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 12);
      if (options.length < 2) return { ok: false, error: `“${prompt}” needs at least two choices.` };
      q.options = [...new Set(options)];
    }
    if (type === "number") {
      const min = Number(o.min);
      const max = Number(o.max);
      if (Number.isFinite(min)) q.min = min;
      if (Number.isFinite(max)) q.max = max;
    }
    out.push(q);
  }
  if (out.length === 0) return { ok: false, error: "Add at least one question." };
  return { ok: true, questions: out };
}

/** Checks a client's answers. Returns cleaned answers (all strings) or the first problem. */
export function checkAnswers(questions: FormQuestion[], raw: Record<string, unknown>): { ok: true; answers: Record<string, string> } | { ok: false; error: string; id: string } {
  const answers: Record<string, string> = {};
  for (const q of questions) {
    const v = typeof raw[q.id] === "string" ? (raw[q.id] as string).trim() : typeof raw[q.id] === "number" ? String(raw[q.id]) : "";
    if (!v) {
      if (q.required) return { ok: false, error: `Please answer: ${q.prompt}`, id: q.id };
      continue;
    }
    if (q.type === "scale") {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 10) return { ok: false, error: `Pick 1 to 10 for: ${q.prompt}`, id: q.id };
    }
    if (q.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) return { ok: false, error: `Enter a number for: ${q.prompt}`, id: q.id };
      if ((q.min !== undefined && n < q.min) || (q.max !== undefined && n > q.max)) {
        return { ok: false, error: `${q.prompt}: enter ${q.min ?? ""}${q.min !== undefined && q.max !== undefined ? " to " : ""}${q.max ?? ""}`, id: q.id };
      }
    }
    if (q.type === "choice" && !(q.options ?? []).includes(v)) return { ok: false, error: `Pick an option for: ${q.prompt}`, id: q.id };
    if (q.type === "yesno" && v !== "Yes" && v !== "No") return { ok: false, error: `Pick Yes or No for: ${q.prompt}`, id: q.id };
    answers[q.id] = v.slice(0, q.type === "longtext" ? 3000 : 300);
  }
  return { ok: true, answers };
}

/** "Energy this week: 7/10" lines for emails and the AI. */
export function answerLines(questions: FormQuestion[], answers: Record<string, string>): { prompt: string; answer: string }[] {
  return questions.map((q) => {
    const a = answers[q.id];
    return { prompt: q.prompt, answer: !a ? "—" : q.type === "scale" ? `${a}/10` : a };
  });
}

export function cleanSummary(raw: unknown): CheckinSummary {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = (v: unknown, n: number) =>
    (Array.isArray(v) ? v : [])
      .map((x) => String(x ?? "").trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, n);
  return {
    summary: list(o.summary, 6),
    wins: list(o.wins, 5),
    concerns: list(o.concerns, 5),
    suggestions: (Array.isArray(o.suggestions) ? o.suggestions : [])
      .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
      .map((x) => ({ change: String(x.change ?? "").trim().slice(0, 300), reason: String(x.reason ?? "").trim().slice(0, 300) }))
      .filter((x) => x.change)
      .slice(0, 5),
    draftReply: String(o.draftReply ?? "").trim().slice(0, 3000),
  };
}

