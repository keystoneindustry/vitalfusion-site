"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Tabs across the top of a client's pages in the coach portal. */
export default function ClientTabs({ id, badges }: { id: string; badges: Partial<Record<string, string>> }) {
  const pathname = usePathname();
  const base = `/coach/clients/${id}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/food`, label: "Food log" },
    { href: `${base}/meals`, label: "Meals" },
    { href: `${base}/training`, label: "Training" },
    { href: `${base}/habits`, label: "Habits" },
    { href: `${base}/progress`, label: "Progress" },
    { href: `${base}/details`, label: "Details" },
  ];
  return (
    <nav className="client-tabs" aria-label="Client sections">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        const badge = badges[t.label];
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}>
            {t.label}
            {badge && <span className="tab-badge">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
