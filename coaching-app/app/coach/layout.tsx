import Link from "next/link";
import CoachTabBar from "./CoachTabBar";
import { CoachingSubNav, SectionTabs } from "./CoachNav";

/**
 * Shell for Tyler's home base. Sections: Home, Coaching app (clients who use this app), CRM, Legal, Business, Social media.
 * Top tabs on desktop, bottom tab bar on phones; the Coaching app section has its own row of pages.
 */
export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-shell">
      <header className="coach-nav">
        <Link href="/coach" className="coach-brand">
          <img src="/icons/logo.png" alt="" />
          <span className="brand">Vital Fusion</span>
        </Link>
        <SectionTabs />
      </header>
      <CoachingSubNav />
      <main className="page page-wide">{children}</main>
      <CoachTabBar />
    </div>
  );
}
