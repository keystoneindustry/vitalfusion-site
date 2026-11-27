/** The coach portal's sections (top tabs) and the pages inside the Coaching app section. Shared by the top menu and the phone tab bar. */
export const COACHING_PATHS = ["/coach/app", "/coach/clients", "/coach/check-ins", "/coach/habits", "/coach/exercises", "/coach/forms", "/coach/resources", "/coach/settings"];

export const SECTIONS = [
  { id: "home", href: "/coach", label: "Home" },
  { id: "coaching", href: "/coach/app", label: "Coaching app" },
  { id: "crm", href: "/coach/crm", label: "CRM" },
  { id: "magnets", href: "/coach/magnets", label: "Lead magnets" },
  { id: "legal", href: "/coach/legal", label: "Legal" },
  { id: "business", href: "/coach/business", label: "Business" },
  { id: "social", href: "/coach/social", label: "Social media" },
] as const;

export const COACHING_PAGES = [
  { href: "/coach/app", label: "Overview" },
  { href: "/coach/clients", label: "Clients" },
  { href: "/coach/check-ins", label: "Check-ins" },
  { href: "/coach/habits", label: "Habits" },
  { href: "/coach/exercises", label: "Exercises" },
  { href: "/coach/forms", label: "Forms" },
  { href: "/coach/resources", label: "Resources" },
  { href: "/coach/settings", label: "Settings" },
];

export function sectionOf(pathname: string): string {
  if (pathname === "/coach") return "home";
  if (COACHING_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "coaching";
  const s = SECTIONS.find((x) => x.href !== "/coach" && (pathname === x.href || pathname.startsWith(`${x.href}/`)));
  return s?.id ?? "home";
}
