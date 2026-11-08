import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vitalfusioncoaching.com"),
  title: "Vital Fusion Coaching | Online Fitness & Nutrition Coaching",
  description:
    "One-on-one online coaching that fuses training, nutrition and accountability into a plan built around your goals.",
  openGraph: {
    title: "Vital Fusion Coaching",
    description: "One-on-one online fitness and nutrition coaching.",
    url: "https://vitalfusioncoaching.com",
    siteName: "Vital Fusion Coaching",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0b0d12" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
