"use client";

import { useEffect } from "react";

/**
 * Stops pinch-to-zoom so the app feels like an app. iPhone Safari ignores the viewport's
 * "user-scalable=no", so its pinch gesture events are cancelled here too. Double-tap zoom is
 * turned off in CSS (touch-action: manipulation).
 */
export default function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const pinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("touchmove", pinch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", pinch);
    };
  }, []);
  return null;
}
