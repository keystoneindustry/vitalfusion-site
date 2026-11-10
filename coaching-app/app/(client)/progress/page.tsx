import { redirect } from "next/navigation";

/** Progress opens on the Weight section. */
export default function ProgressPage() {
  redirect("/progress/weight");
}
