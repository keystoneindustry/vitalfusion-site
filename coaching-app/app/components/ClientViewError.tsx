"use client";

import { useEffect, useState } from "react";

/** Error screen for the client app. In the coach's Client view, a blocked save lands here with a clear message. */
export default function ClientViewError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [viewing, setViewing] = useState(false);
  useEffect(() => {
    setViewing(document.cookie.split("; ").some((c) => c === "vf_view_as_on=1"));
  }, []);
  return (
    <section className="card" style={{ marginTop: 24 }}>
      <h1 className="h2" style={{ marginTop: 0 }}>{viewing ? "Client view is read-only" : "Something went wrong"}</h1>
      <p className="muted">
        {viewing
          ? "You're looking at the app as your client, so nothing was saved. Everything else works just like it does for them."
          : "Please try again. If it keeps happening, let Tyler know."}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          {viewing ? "Back" : "Try again"}
        </button>
        {viewing && (
          <a className="btn btn-ghost" href="/coach/view-exit">
            Exit client view
          </a>
        )}
      </div>
    </section>
  );
}
