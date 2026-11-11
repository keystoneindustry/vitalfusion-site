"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type State = "loading" | "unsupported" | "install-first" | "blocked" | "off" | "on";

function keyBytes(base64url: string): Uint8Array {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js").catch(() => null);
}

/**
 * Turns phone notifications on or off for this device.
 * `compact` is the Today-screen prompt: it only shows while notifications are off and can be dismissed.
 */
export default function Notifications({ vapidKey, compact = false, remindersOn = true }: { vapidKey: string | null; compact?: boolean; remindersOn?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [reminders, setReminders] = useState(remindersOn);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (compact && localStorage.getItem("vf-notify-dismissed") === "1") setDismissed(true);
      } catch {}
      if (!vapidKey || !("Notification" in window) || !("serviceWorker" in navigator)) {
        setState(isIos() && !isInstalled() ? "install-first" : "unsupported");
        return;
      }
      if (!("PushManager" in window)) {
        setState(isIos() && !isInstalled() ? "install-first" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await registration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    })();
  }, [vapidKey, compact]);

  async function turnOn() {
    setBusy(true);
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await registration();
      if (!reg) throw new Error("no service worker");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey!) as BufferSource }));
      const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error("save failed");
      setState("on");
      setReminders(true);
      setMsg("Notifications are on ✓");
    } catch {
      setMsg("That didn't work. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/push", { method: "PATCH" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg(res.ok ? "Sent. It should pop up in a few seconds." : data.error || "That didn't work.");
    setBusy(false);
  }

  async function setRemindersOn(on: boolean) {
    setReminders(on);
    await fetch("/api/push", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: on }) });
  }

  if (compact) {
    if (dismissed || state !== "off") return null;
    return (
      <section className="card card-accent">
        <h2 className="h2">🔔 Get reminders on your phone</h2>
        <p className="coming" style={{ marginTop: 0 }}>Your plan at 8am, and a nudge at 7pm if anything's still open.</p>
        <button type="button" className="btn btn-wide" onClick={turnOn} disabled={busy}>
          {busy ? "One moment…" : "Turn on notifications"}
        </button>
        {msg && <p className="small" style={{ margin: "8px 0 0" }}>{msg}</p>}
        <button
          type="button"
          className="btn-link small"
          style={{ display: "block", margin: "10px auto 0" }}
          onClick={() => {
            try {
              localStorage.setItem("vf-notify-dismissed", "1");
            } catch {}
            setDismissed(true);
          }}
        >
          Not now
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="h2">🔔 Reminders</h2>
      <p className="coming" style={{ marginTop: 0 }}>Your plan for the day at 8am, and a nudge at 7pm if something's still open. Your own time zone.</p>
      {state === "loading" && <p className="muted small">Checking…</p>}
      {state === "install-first" && (
        <p className="small" style={{ margin: 0 }}>
          On iPhone, notifications work once the app is on your home screen. <Link href="/install">Show me how</Link>. Until then, important reminders come by
          email.
        </p>
      )}
      {state === "unsupported" && <p className="small muted" style={{ margin: 0 }}>This browser can't show notifications, so important reminders come by email.</p>}
      {state === "blocked" && (
        <p className="small" style={{ margin: 0 }}>
          Notifications are blocked for this app. Turn them on in your phone's Settings → Notifications → Vital Fusion, then come back here.
        </p>
      )}
      {state === "off" && (
        <button type="button" className="btn btn-wide" onClick={turnOn} disabled={busy}>
          {busy ? "One moment…" : "Turn on notifications"}
        </button>
      )}
      {state === "on" && (
        <>
          <p style={{ margin: "0 0 10px" }}>
            <b>Notifications are on</b> for this phone ✓
          </p>
          <div className="grid-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={test} disabled={busy}>
              Send a test
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={turnOff} disabled={busy}>
              Turn off
            </button>
          </div>
        </>
      )}
      {msg && <p className="small" style={{ margin: "8px 0 0" }}>{msg}</p>}
      <label className="row small" style={{ gap: 8, marginTop: 14 }}>
        <input
          type="checkbox"
          checked={reminders}
          onChange={(e: { target: HTMLInputElement }) => setRemindersOn(e.target.checked)}
          style={{ width: "auto", appearance: "auto", WebkitAppearance: "checkbox" }}
        />
        Send me daily reminders
      </label>
    </section>
  );
}
