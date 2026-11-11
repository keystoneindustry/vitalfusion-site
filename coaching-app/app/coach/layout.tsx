import Link from "next/link";
import CoachTabBar from "./CoachTabBar";

/** Shell for the coach's side of the app: top menu on desktop, bottom tab bar on phones. */
export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-shell">
      <header className="coach-nav">
        <Link href="/coach" className="coach-brand">
          <img src="/icons/logo.png" alt="" />
          <span className="brand">Coach</span>
        </Link>
        <nav aria-label="Coach menu" className="coach-desktop-nav">
          <Link href="/coach">Clients</Link>
          <Link href="/coach/check-ins">Check-ins</Link>
          <Link href="/coach/habits">Habits</Link>
          <Link href="/coach/forms">Forms</Link>
          <Link href="/coach/resources">Resources</Link>
          <Link href="/coach/clients/new">+ Add</Link>
          <Link href="/coach/settings">Settings</Link>
          <form action="/auth/logout" method="post">
            <button className="btn-link" type="submit" style={{ color: "var(--muted)" }}>
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="page page-wide">{children}</main>
      <CoachTabBar />
    </div>
  );
}
