import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { scheduleLabel } from "@/lib/calendar";
import { listPhotos, listSchedules, listWeighIns, PHOTO_BUCKET } from "@/lib/progress";
import { signedUrls } from "@/lib/storage";
import { PhotoCompare, WeightSummary } from "@/app/components/ProgressViews";
import WeighInForm from "../WeighInForm";

export const metadata = { title: "Progress · Vital Fusion" };

export default async function ProgressPage() {
  const { client } = await requireClient("/progress");
  const today = todayIn(client.timezone);
  const [weighIns, photos, schedules] = await Promise.all([listWeighIns(client.id), listPhotos(client.id), listSchedules(client.id)]);
  const urls = await signedUrls(PHOTO_BUCKET, photos.map((p) => p.path)).catch(() => ({}) as Record<string, string>);
  const weighSchedule = schedules.filter((s) => s.kind === "weigh_in").map(scheduleLabel);
  const photoSchedule = schedules.filter((s) => s.kind === "photos").map(scheduleLabel);
  const loggedToday = weighIns[0]?.date === today;

  return (
    <>
      <p className="eyebrow">Progress</p>
      <h1 className="h1">Your progress</h1>

      <section className="card">
        <h2 className="h2">⚖️ Weight</h2>
        {weighSchedule.length > 0 && <p className="small muted" style={{ marginTop: -6 }}>Weigh-ins: {weighSchedule.join(" · ")}</p>}
        <WeightSummary entries={weighIns} />
        <div className="spacer" />
        {loggedToday ? (
          <p className="small muted" style={{ margin: 0 }}>Today: {weighIns[0].weight_lb} lb ✓</p>
        ) : (
          <>
            <p className="small" style={{ margin: "0 0 6px" }}>
              <b>Log today's weight</b>
            </p>
            <WeighInForm date={today} last={weighIns[0]?.weight_lb ?? null} />
          </>
        )}
      </section>

      <section className="card">
        <div className="row-between">
          <h2 className="h2" style={{ margin: 0 }}>📸 Photos</h2>
          <Link className="btn btn-sm" href="/progress/photos">
            Take photos
          </Link>
        </div>
        {photoSchedule.length > 0 && <p className="small muted">Photo days: {photoSchedule.join(" · ")}</p>}
        <div className="spacer" />
        <PhotoCompare photos={photos} urls={urls} />
      </section>

      <p className="center small muted">
        <Link href="/settings">Account, agreement &amp; sign out are in Settings</Link>
      </p>
    </>
  );
}
