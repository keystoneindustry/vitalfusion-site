"use client";

import { useEffect } from "react";
import { saveTimezoneAction } from "./timezone-action";

/** Tells the server which time zone this phone is in (once per device, and again if it changes). */
export default function TimezoneSync() {
  useEffect(() => {
    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!tz) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("vf-tz");
    } catch {}
    if (saved === tz) return;
    saveTimezoneAction(tz)
      .then((ok) => {
        if (ok) {
          try {
            localStorage.setItem("vf-tz", tz);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);
  return null;
}
