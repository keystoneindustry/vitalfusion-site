"use client";

import { useEffect } from "react";
import { attributionFromSearch, cleanAttribution, type Attribution } from "@/lib/attribution";

const KEY = "vf-ad";
const KEEP_DAYS = 90;

/** Remembers the last ad a visitor clicked (on this device) so a later signup or application is credited to it. */
export default function AttributionCapture() {
  useEffect(() => {
    try {
      const a = attributionFromSearch(window.location.search, window.location.pathname);
      if (a) localStorage.setItem(KEY, JSON.stringify({ a, at: Date.now() }));
    } catch {}
  }, []);
  return null;
}

/** The remembered ad click, for a form to send with its signup. Null if there isn't one (or it's older than 90 days). */
export function readAttribution(): Attribution | null {
  try {
    // The page they're on right now wins (the effect above may not have run yet).
    const now = attributionFromSearch(window.location.search, window.location.pathname);
    if (now) return now;
    const saved = JSON.parse(localStorage.getItem(KEY) || "null") as { a?: unknown; at?: number } | null;
    if (!saved || typeof saved.at !== "number" || Date.now() - saved.at > KEEP_DAYS * 86400000) return null;
    return cleanAttribution(saved.a);
  } catch {
    return null;
  }
}
