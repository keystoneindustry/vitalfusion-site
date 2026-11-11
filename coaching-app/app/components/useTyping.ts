"use client";

import { useEffect, useState } from "react";

/** True while the phone keyboard is likely open (a text box has focus). Used to hide the bottom tab bar. */
export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (tag !== "INPUT") return false;
  const type = ((el as HTMLInputElement).type || "text").toLowerCase();
  return !["checkbox", "radio", "button", "submit", "reset", "range", "file", "color", "image"].includes(type);
}

export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const check = () => setTyping(isTypingTarget(document.activeElement));
    // focusout fires before the next element gets focus, so look again on the next tick.
    const onOut = () => setTimeout(check, 0);
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return typing;
}
