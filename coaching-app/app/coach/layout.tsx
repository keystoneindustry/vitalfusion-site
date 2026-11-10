import Link from "next/link";

/** Shell for the coach's side of the app. */
export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="coach-nav">
        <img src="/icons/logo.png" alt="" />
        <span className="brand">Coach</span>
        <nav aria-label="Coach">
          <Link href="/coach">Clients</Link>
          <Link href="/coach/clients/new">+ Add</Link>
          <form action="/auth/logout" method="post">
            <button className="btn-link" type="submit" style={{ color: "var(--muted)" }}>
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="page page-wide">{children}</main>
    </>
  );
}
