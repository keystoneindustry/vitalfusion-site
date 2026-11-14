"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "Start Now" link to the application. When someone lands on the homepage from the nutrition plan
// calculator, its emails or the PDF (e.g. /?source=macro-email), the source is passed on to /apply
// so the application still shows where they came from.
export default function ApplyLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const [href, setHref] = useState("/apply");
  useEffect(() => {
    const src = new URLSearchParams(window.location.search).get("source");
    if (src && /^[\w-]{1,60}$/.test(src)) setHref(`/apply?source=${encodeURIComponent(src)}`);
  }, []);
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
