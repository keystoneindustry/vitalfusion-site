"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SignOutButton from "@/app/components/SignOutButton";
import { useTyping } from "@/app/components/useTyping";
import { useBottomBarFix } from "@/app/components/useBottomBarFix";
import { sectionOf } from "./sections";

const TABS = [
  { id: "home", href: "/coach", label: "Home", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { id: "business", href: "/coach/business", label: "Business", icon: "M4 20V10M10 20V4M16 20v-7M21 20H3" },
  { id: "crm", href: "/coach/crm", label: "CRM", icon: "M4 6h16M7 12h10M10 18h4" },
  { id: "social", href: "/coach/social", label: "Social", icon: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17.2 6.8h.01" },
];

/** The rest of the sections, behind the ☰ tab (same order as the desktop tabs). */
const MORE = [
  { id: "legal", href: "/coach/legal", label: "Legal", emoji: "📝" },
  { id: "magnets", href: "/coach/magnets", label: "Lead magnets", emoji: "🧲" },
  { id: "coaching", href: "/coach/app", label: "Coaching app", emoji: "🏋️" },
];

/** Bottom tab bar for the coach side on phones (desktop uses the top menu). */
export default function CoachTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Hide the bar while typing so it doesn't float above the phone keyboard.
  const typing = useTyping();
  useBottomBarFix();
  const section = sectionOf(pathname);
  const inMore = MORE.some((m) => m.id === section);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (id: string) => !inMore && section === id;

  return (
    <>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label="More" onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
            <ul>
              {MORE.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} aria-current={section === m.id ? "page" : undefined}>
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
              <Link href={tab.href} aria-current={isActive(tab.id) && !open ? "page" : undefined}>
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
