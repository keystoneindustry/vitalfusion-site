"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "other";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/** Step-by-step install instructions for the phone the client is using. */
export default function InstallSteps() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    setPlatform(isIos ? "ios" : /Android/.test(ua) ? "android" : "other");
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) {
    return <div className="notice notice-good">✅ You're using the installed app. You're all set!</div>;
  }

  const ios = (
    <section className="card" key="ios">
      <h2 className="h2">iPhone</h2>
      <ol className="steps">
        <li>Make sure this page is open in <b>Safari</b>.</li>
        <li>
          Tap the <b>Share</b> button (the square with an arrow pointing up) at the bottom of the screen.
        </li>
        <li>
          Scroll down and tap <b>Add to Home Screen</b>.
        </li>
        <li>
          Tap <b>Add</b>. Then open <b>Vital Fusion</b> from your home screen from now on.
        </li>
        <li>
          The first time you open it there, sign in once: enter your email and type the code we send you.
        </li>
      </ol>
    </section>
  );

  const android = (
    <section className="card" key="android">
      <h2 className="h2">Android</h2>
      {prompt ? (
        <>
          <p className="coming" style={{ marginTop: 0 }}>Your phone can add it in one tap:</p>
          <button className="btn btn-wide" type="button" onClick={() => prompt.prompt().catch(() => undefined)}>
            Add Vital Fusion to my home screen
          </button>
          <div className="spacer" />
          <p className="muted small" style={{ margin: 0 }}>Or do it by hand:</p>
          <div className="spacer" />
        </>
      ) : null}
      <ol className="steps">
        <li>Make sure this page is open in <b>Chrome</b>.</li>
        <li>
          Tap the <b>⋮</b> menu in the top-right corner.
        </li>
        <li>
          Tap <b>Add to Home screen</b> (or <b>Install app</b>), then <b>Install</b>.
        </li>
        <li>
          Open <b>Vital Fusion</b> from your home screen from now on.
        </li>
      </ol>
    </section>
  );

  return platform === "android" ? (
    <>
      {android}
      {ios}
    </>
  ) : (
    <>
      {ios}
      {android}
    </>
  );
}
