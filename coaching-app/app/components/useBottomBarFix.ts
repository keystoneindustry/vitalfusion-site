"use client";

import { useEffect } from "react";

/**
 * iPhone home-screen app quirk: on a cold launch iOS sometimes places `position: fixed; bottom: 0`
 * bars a little too high (a gap shows under the tab bar) until something makes the page lay out again
 * (e.g. tapping a tab). This forces that re-layout right after launch and whenever the app comes back
 * to the front, so the bar sits flush with the bottom of the screen from the start.
 */
export function useBottomBarFix() {
  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    const nudge = () => {
      document.querySelectorAll<HTMLElement>(".tabbar").forEach((el) => {
        el.style.bottom = "1px";
        void el.offsetHeight; // force the browser to lay out with the change
        el.style.bottom = "";
      });
      window.scrollTo(window.scrollX, window.scrollY);
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const burst = () => {
      requestAnimationFrame(nudge);
      for (const ms of [120, 400, 1000]) timers.push(setTimeout(nudge, ms));
    };
    const onVisible = () => { if (document.visibilityState === "visible") burst(); };

    burst();
    window.addEventListener("pageshow", burst);
    window.addEventListener("orientationchange", burst);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("pageshow", burst);
      window.removeEventListener("orientationchange", burst);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
