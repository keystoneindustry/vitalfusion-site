import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import AttributionCapture from "./components/Attribution";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vitalfusioncoaching.com"),
  title: "Vital Fusion Coaching | 1:1 Coaching for Busy Professionals",
  description:
    "Get back in shape and feel confident again, without extreme dieting or living in the gym. 1:1 online coaching for busy professionals.",
  openGraph: {
    title: "Vital Fusion Coaching",
    description: "One-on-one online fitness and nutrition coaching.",
    url: "https://vitalfusioncoaching.com",
    siteName: "Vital Fusion Coaching",
    type: "website",
  },
};

// Fonts are downloaded at build time and served from this site (no Google requests from visitors).
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-serif", display: "swap" });

export const viewport: Viewport = { themeColor: "#0b0d12" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <AttributionCapture />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
