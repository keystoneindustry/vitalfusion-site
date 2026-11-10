"use client";

import { useEffect } from "react";

/** Registers the service worker so the app can be installed and shows an offline page. */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* Installing still works without it on most phones. */
    });
  }, []);
  return null;
}
