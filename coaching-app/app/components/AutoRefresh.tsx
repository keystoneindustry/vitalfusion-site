"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-loads the page's data every few seconds (while the AI is drafting). */
export default function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
