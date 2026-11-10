import type { Metadata, Viewport } from "next";
import RegisterServiceWorker from "./components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vital Fusion Coaching",
  description: "Your Vital Fusion coaching app.",
  applicationName: "Vital Fusion",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Vital Fusion", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
