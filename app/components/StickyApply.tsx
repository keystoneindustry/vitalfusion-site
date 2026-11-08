"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Phone-only "Apply" bar pinned to the bottom of the screen. It appears once
// the hero question has scrolled out of view, so there's always a way to apply.
export default function StickyApply({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById("hero-form");
    if (!target || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`sticky-apply ${show ? "show" : ""}`} aria-hidden={!show}>
      <Link href="/apply" className="btn" tabIndex={show ? 0 : -1}>
        {label} →
      </Link>
    </div>
  );
}
