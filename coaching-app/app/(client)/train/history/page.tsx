import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { listSessions } from "@/lib/workouts";
import WorkoutHistory from "@/app/components/WorkoutHistory";

export const metadata = { title: "Workout history · Vital Fusion" };

export default async function WorkoutHistoryPage({ searchParams }: { searchParams: Promise<{ lift?: string }> }) {
  const { client } = await requireClient("/train/history");
  const { lift } = await searchParams;
  const sessions = await listSessions(client.id, 300);
  return (
    <>
      <p className="small" style={{ margin: "0 0 8px" }}>
        <Link href="/train">‹ Training</Link>
      </p>
      <h1 className="h1">Workout history</h1>
      <WorkoutHistory sessions={sessions} base="/train/history" lift={lift} limit={30} />
    </>
  );
}
