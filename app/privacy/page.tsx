import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";
import { PRIVACY, PRIVACY_INTRO } from "@/content/legal";

// Linked from the footer, the application and the app's sign-in screen. Not in the menu or search results.
export const metadata: Metadata = {
  title: "Privacy Policy | Vital Fusion Coaching",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" intro={PRIVACY_INTRO} sections={PRIVACY} />;
}
