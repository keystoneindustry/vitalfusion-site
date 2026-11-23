import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";
import { TERMS, TERMS_INTRO } from "@/content/legal";

// Linked from the footer, the application and the app's sign-in screen. Not in the menu or search results.
export const metadata: Metadata = {
  title: "Terms of Service | Vital Fusion Coaching",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <LegalPage title="Terms of Service" intro={TERMS_INTRO} sections={TERMS} />;
}
