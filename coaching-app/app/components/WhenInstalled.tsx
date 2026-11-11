"use client";

import { useEffect, useState } from "react";

/** Shows its children only in the installed home-screen app (installed) or only in the browser (!installed). */
export default function WhenInstalled({ installed, children }: { installed: boolean; children: React.ReactNode }) {
  const [standalone, setStandalone] = useState<boolean | null>(null);
  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  }, []);
  if (standalone === null) return installed ? null : <>{children}</>;
  return standalone === installed ? <>{children}</> : null;
}
