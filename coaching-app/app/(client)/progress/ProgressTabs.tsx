import Link from "next/link";

/** Switch between the two Progress sections. */
export default function ProgressTabs({ active }: { active: "weight" | "photos" | "reports" }) {
  return (
    <nav className="seg" aria-label="Progress sections">
      <Link href="/progress/weight" aria-current={active === "weight" ? "page" : undefined}>
        ⚖️ Weight
      </Link>
      <Link href="/progress/photos" aria-current={active === "photos" ? "page" : undefined}>
        📸 Photos
      </Link>
      <Link href="/progress/reports" aria-current={active === "reports" ? "page" : undefined}>
        📊 Reports
      </Link>
    </nav>
  );
}
