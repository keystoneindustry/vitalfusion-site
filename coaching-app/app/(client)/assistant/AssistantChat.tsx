"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

type Source = { title: string; url: string };
type Msg = { role: "user" | "assistant"; text: string; sources?: Source[] };

const EXAMPLES = [
  "What should I order at Chick-fil-A?",
  "High-protein options at Starbucks",
  "I'm going to Chipotle. Build me a bowl that fits my macros",
  "Healthy snacks I can grab at a gas station",
];

/** **bold** inside a line. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** Plain text with "- " bullets, numbered lines and **bold**. No HTML from the model is ever rendered. */
function Formatted({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`l${blocks.length}`}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim().replace(/^#+\s*/, "");
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) list.push(bullet[1]);
    else {
      flush();
      if (line) blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

export default function AssistantChat({ storageKey, initialLeft, limit }: { storageKey: string; initialLeft: number; limit: number }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(initialLeft);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved)) setMessages(saved.slice(-40));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, storageKey, busy]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    if (left <= 0) {
      setError(`You've used all ${limit} questions for today. They reset tomorrow.`);
      return;
    }
    const next: Msg[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, text }) => ({ role, text })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; sources?: Source[]; error?: string; left?: number };
      if (typeof data.left === "number") setLeft(data.left);
      if (!res.ok || !data.text) {
        setError(data.error || "Something went wrong. Try again.");
        setMessages(messages); // take the question back out so they can resend it
        setDraft(q);
        return;
      }
      setMessages([...next, { role: "assistant", text: data.text, sources: data.sources ?? [] }]);
    } catch {
      setError("Couldn't reach the assistant. Check your connection and try again.");
      setMessages(messages);
      setDraft(q);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setMessages([]);
    setError("");
  }

  return (
    <div className="chat">
      {messages.length === 0 && (
        <div className="card">
          <p className="small muted" style={{ marginTop: 0 }}>Try one of these:</p>
          <div className="chat-examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="chip" onClick={() => send(ex)} disabled={busy}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "bubble bubble-me" : "bubble bubble-ai"}>
            {m.role === "user" ? <p>{m.text}</p> : <Formatted text={m.text} />}
            {m.sources && m.sources.length > 0 && (
              <p className="bubble-sources">
                Sources:{" "}
                {m.sources.map((s, j) => (
                  <Fragment key={s.url}>
                    {j > 0 && " · "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title}
                    </a>
                  </Fragment>
                ))}
              </p>
            )}
          </div>
        ))}
        {busy && (
          <div className="bubble bubble-ai bubble-typing">
            <p>Looking it up…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="notice notice-warn">{error}</p>}

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about any restaurant, food or meal…"
          rows={2}
          maxLength={1000}
          aria-label="Your question"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 860px)").matches) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        <button className="btn" type="submit" disabled={busy || !draft.trim()}>
          {busy ? "…" : "Ask"}
        </button>
      </form>
      <div className="row-between small muted chat-foot">
        <span>
          {left} of {limit} questions left today
        </span>
        {messages.length > 0 && (
          <button type="button" className="btn-link" onClick={clear}>
            Clear chat
          </button>
        )}
      </div>
      <p className="small muted chat-note">AI answers can be off. Restaurant numbers are looked up online. For anything medical or about your plan, ask Tyler in your check-in.</p>
    </div>
  );
}
