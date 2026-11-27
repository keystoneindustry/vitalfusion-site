"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COACHING_PAGES, SECTIONS, sectionOf } from "./sections";

/** Desktop: the section tabs across the top. */
export function SectionTabs() {
  const section = sectionOf(usePathname());
  return (
    <nav aria-label="Coach menu" className="coach-desktop-nav">
      {SECTIONS.map((s) => (
        <Link key={s.id} href={s.href} aria-current={section === s.id ? "page" : undefined}>
          {s.label}
        </Link>
      ))}
      <form action="/auth/logout" method="post">
        <button className="btn-link" type="submit" style={{ color: "var(--muted)" }}>
          Sign out
        </button>
      </form>
    </nav>
  );
}

/** Inside the Coaching app section: its own row of pages (phones and desktop). */
export function CoachingSubNav() {
  const pathname = usePathname();
  if (sectionOf(pathname) !== "coaching") return null;
  const active = [...COACHING_PAGES].reverse().find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`))?.href;
  return (
    <nav aria-label="Coaching app" className="coach-sub">
      <span className="coach-sub-label">Coaching app</span>
      <div className="coach-sub-links">
        {COACHING_PAGES.map((p) => (
          <Link key={p.href} href={p.href} aria-current={active === p.href ? "page" : undefined}>
            {p.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
