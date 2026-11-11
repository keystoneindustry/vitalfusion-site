"use client";

import { useState, useTransition } from "react";
import { signAgreement } from "../actions";
import { signatureMatches, validateContact, validateParq, type AgreementSection, type Contact } from "@/lib/agreement";

type Field = { key: string; label: string; type: string; autoComplete: string };

/** Contact info → health questions → each agreement section → signature. Sent to the server at the end. */
export default function AgreementFlow({
  intro,
  contactFields,
  prefill,
  parqQuestions,
  parqStatement,
  sections,
  signatureStatement,
}: {
  intro: string;
  contactFields: Field[];
  prefill: Partial<Contact>;
  parqQuestions: string[];
  parqStatement: string;
  sections: AgreementSection[];
  signatureStatement: string;
}) {
  const screens = ["contact", "parq", ...sections.map((s) => s.id), "sign"];
  const [at, setAt] = useState(0);
  const [contact, setContact] = useState<Partial<Contact>>(prefill);
  const [parq, setParq] = useState<(boolean | null)[]>(parqQuestions.map(() => null));
  const [explanation, setExplanation] = useState("");
  const [agreed, setAgreed] = useState<string[]>([]);
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const screen = screens[at];
  const anyYes = parq.some((a) => a === true);

  function go(n: number) {
    setError(null);
    setAt(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    if (screen === "contact") {
      const errs = validateContact(contact) as Record<string, string>;
      setFieldErrors(errs);
      if (Object.keys(errs).length) return setError("Please fill in every field.");
    }
    if (screen === "parq") {
      const e = validateParq(parq, explanation);
      if (e) return setError(e);
      if (!agreed.includes("parq")) setAgreed([...agreed, "parq"]);
    }
    go(at + 1);
  }

  function agree(id: string) {
    if (!agreed.includes(id)) setAgreed([...agreed, id]);
    go(at + 1);
  }

  function submit() {
    if (!consent) return setError("Tick the box to confirm you're signing electronically.");
    if (!signatureMatches(signature, contact.fullName || ""))
      return setError("Type your full name exactly as you entered it in your contact details.");
    setError(null);
    startTransition(async () => {
      const result = await signAgreement({ contact, parq, explanation, agreed, signature });
      if (result?.error) {
        setError(result.error);
        const i = result.screen ? screens.indexOf(result.screen) : -1;
        if (i >= 0 && i !== at) setAt(i);
      }
    });
  }

  const section = sections.find((s) => s.id === screen);

  return (
    <section className="card">
      <div className="mini-progress" aria-hidden="true">
        {screens.map((s, i) => (
          <span key={s} className={i < at ? "done" : i === at ? "on" : ""} />
        ))}
      </div>

      {screen === "contact" && (
        <>
          <p className="legal" style={{ marginTop: 0, fontSize: 14.5 }}>{intro}</p>
          <h2 className="h2">Section I: Your contact information</h2>
          {contactFields.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`c-${f.key}`}>{f.label}</label>
              <input
                id={`c-${f.key}`}
                type={f.type}
                autoComplete={f.autoComplete}
                inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                value={(contact as Record<string, string>)[f.key] ?? ""}
                onChange={(e) => setContact({ ...contact, [f.key]: e.target.value })}
              />
              {fieldErrors[f.key] && <p className="err">{fieldErrors[f.key]}</p>}
            </div>
          ))}
        </>
      )}

      {screen === "parq" && (
        <>
          <h2 className="h2">Section II: Health questions (PAR-Q)</h2>
          <p className="muted small" style={{ marginTop: 0 }}>Answer yes or no to each question.</p>
          <ol className="parq">
            {parqQuestions.map((q, i) => (
              <li key={i}>
                <p>{q}</p>
                <div className="yesno" role="group" aria-label={`Question ${i + 1}`}>
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      className="chip"
                      aria-pressed={parq[i] === v}
                      onClick={() => setParq(parq.map((a, n) => (n === i ? v : a)))}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {anyYes && (
            <div className="field">
              <label htmlFor="parq-explain">You answered yes. Please explain:</label>
              <textarea id="parq-explain" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
            </div>
          )}
          <p className="muted small">{parqStatement}</p>
        </>
      )}

      {section && (
        <>
          <h2 className="h2">
            Section {section.number}: {section.title}
          </h2>
          <div className="legal">
            {section.paragraphs.map((p, i) => {
              const m = p.match(/^(Coaching package and payment\.|Privacy and data\.)\s*(.*)$/s);
              return m ? (
                <p key={i}>
                  <b>{m[1]}</b> {m[2]}
                </p>
              ) : (
                <p key={i}>{p}</p>
              );
            })}
          </div>
        </>
      )}

      {screen === "sign" && (
        <>
          <h2 className="h2">Acknowledgment and signature</h2>
          <p className="legal">{signatureStatement}</p>
          <div className="field">
            <label htmlFor="sig">Type your full name to sign</label>
            <input
              id="sig"
              className="signature"
              autoComplete="off"
              value={signature}
              placeholder={contact.fullName || "Your full name"}
              onChange={(e) => setSignature(e.target.value)}
            />
          </div>
          <label className="row" style={{ alignItems: "flex-start", fontSize: 15, color: "var(--text-2)", margin: "0 0 16px" }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ width: 22, height: 22, flex: "0 0 auto", appearance: "auto", marginTop: 2 }}
            />
            I agree that typing my name is my electronic signature on this agreement.
          </label>
        </>
      )}

      {error && <div className="notice notice-error">{error}</div>}

      <div className="row" style={{ gap: 10 }}>
        {at > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => go(at - 1)} disabled={pending}>
            Back
          </button>
        )}
        {screen === "contact" || screen === "parq" ? (
          <button type="button" className="btn" style={{ flex: 1 }} onClick={next}>
            Next
          </button>
        ) : section ? (
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => agree(section.id)}>
            I agree
          </button>
        ) : (
          <button type="button" className="btn" style={{ flex: 1 }} onClick={submit} disabled={pending}>
            {pending ? "Signing…" : "Sign agreement"}
          </button>
        )}
      </div>
    </section>
  );
}
