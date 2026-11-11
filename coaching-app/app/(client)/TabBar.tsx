"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SignOutButton from "@/app/components/SignOutButton";
import { useTyping } from "@/app/components/useTyping";

const TABS = [
  { href: "/", label: "Today", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/calendar", label: "Calendar", icon: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" },
  { href: "/train", label: "Training", icon: "M2 12h3M19 12h3M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" },
  {
    href: "/nutrition",
    label: "Nutrition",
    icon: "M12 21c-4.4 0-7-3.4-7-7.5C5 9 8 6.5 12 7.5c4-1 7 1.5 7 6 0 4.1-2.6 7.5-7 7.5zM12 7.5C12 5 13.5 3 16 3",
  },
];

/** Extra screens behind the ☰ tab. */
const MORE = [
  { href: "/progress/weight", label: "Progress", emoji: "📈" },
  { href: "/meals", label: "Meal library", emoji: "🍽️" },
  { href: "/check-ins", label: "Check-ins", emoji: "📝" },
  { href: "/food", label: "Food log", emoji: "📷" },
  { href: "/resources", label: "Resources", emoji: "📚" },
  { href: "/settings", label: "Settings", emoji: "⚙️" },
  { href: "/install", label: "Add to home screen", emoji: "📲" },
];

/** The bottom tab bar of the client app: four tabs plus a ☰ menu that slides up. */
export default function TabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Hide the bar while typing so it doesn't float above the phone keyboard.
  const typing = useTyping();
  const inMore = MORE.some((m) => pathname.startsWith(m.href)) || pathname.startsWith("/progress") || pathname.startsWith("/agreement");

  // Close the menu when the page changes or Escape is pressed.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label="More" onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
            <ul>
              {MORE.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} aria-current={pathname.startsWith(m.href) ? "page" : undefined}>
                    <span aria-hidden="true">{m.emoji}</span>
                    {m.label}
                  </Link>
                </li>
              ))}
              <li>
                <SignOutButton className="" icon="👋" />
              </li>
            </ul>
          </div>
        </div>
      )}
      <nav className={`tabbar${typing ? " tabbar-hidden" : ""}`} aria-label="Main">
        <ul>
          {TABS.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <li key={tab.href}>
                <Link href={tab.href} aria-current={active && !open ? "page" : undefined}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={tab.icon} />
                  </svg>
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className="tab-more"
              aria-expanded={open}
              aria-current={inMore || open ? "page" : undefined}
              onClick={() => setOpen(!open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
