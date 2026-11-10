"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Nudges the client to add the app to their home screen, until they have. */
export default function InstallCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setShow(!standalone);
  }, []);

  if (!show) return null;
  return (
    <section className="card card-accent">
      <h2 className="h2">📲 Add the app to your home screen</h2>
      <p className="coming" style={{ marginTop: 0 }}>
        It takes 20 seconds, opens full-screen like a normal app, and lets reminders reach you.
      </p>
      <Link className="btn btn-wide" href="/install">
        Show me how
      </Link>
    </section>
  );
}
