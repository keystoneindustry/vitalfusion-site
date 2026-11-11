"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SignOutButton from "@/app/components/SignOutButton";
import { useTyping } from "@/app/components/useTyping";

const TABS = [
  { href: "/coach", label: "Home", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  {
    href: "/coach/clients",
    label: "Clients",
    icon: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  },
  { href: "/coach/check-ins", label: "Check-ins", icon: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 10h8M8 13h5" },
  { href: "/coach/forms", label: "Forms", icon: "M8 4h8M9 2.5h6v3H9zM6 4H5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-1M8 11h8M8 15h5" },
];

/** Extra screens behind the ☰ tab. */
const MORE = [
  { href: "/coach/habits", label: "Habit library", emoji: "✅" },
  { href: "/coach/resources", label: "Resources", emoji: "📚" },
  { href: "/coach/clients/new", label: "Add a client", emoji: "➕" },
  { href: "/coach/settings", label: "Settings", emoji: "⚙️" },
];

/** Bottom tab bar for the coach side on phones (desktop uses the top menu). */
export default function CoachTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Hide the bar while typing so it doesn't float above the phone keyboard.
  const typing = useTyping();
  const inMore = MORE.some((m) => pathname.startsWith(m.href));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => {
    if (inMore) return false;
    if (href === "/coach") return pathname === "/coach";
    return pathname.startsWith(href);
  };

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
      <nav className={`tabbar coach-tabbar${typing ? " tabbar-hidden" : ""}`} aria-label="Coach">
        <ul>
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={isActive(tab.href) && !open ? "page" : undefined}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </Link>
            </li>
          ))}
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
