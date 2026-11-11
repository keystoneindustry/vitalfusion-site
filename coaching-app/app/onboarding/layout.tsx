/** Focused layout for onboarding: no tab bar, just the logo and the step. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="onb">
      <header className="topbar">
        <a href="/" className="home-brand" aria-label="Home">
          <img src="/icons/logo.png" alt="" />
          <span className="brand">Getting started</span>
        </a>
        <a href="/" className="small" style={{ marginLeft: "auto", color: "var(--muted)", textDecoration: "none" }}>
          Home
        </a>
      </header>
      <main className="page" style={{ paddingTop: 8 }}>
        {children}
      </main>
    </div>
  );
}
