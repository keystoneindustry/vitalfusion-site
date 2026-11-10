import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { scheduleLabel } from "@/lib/calendar";
import { listPhotos, listSchedules, PHOTO_BUCKET } from "@/lib/progress";
import { signedUrls } from "@/lib/storage";
import { PhotoCompare } from "@/app/components/ProgressViews";
import ProgressTabs from "../ProgressTabs";

export const metadata = { title: "Progress photos · Vital Fusion" };

export default async function PhotosPage() {
  const { client } = await requireClient("/progress/photos");
  const [photos, schedules] = await Promise.all([listPhotos(client.id), listSchedules(client.id)]);
  const urls = await signedUrls(PHOTO_BUCKET, photos.map((p) => p.path)).catch(() => ({}) as Record<string, string>);
  const days = schedules.filter((s) => s.kind === "photos").map(scheduleLabel);

  return (
    <>
      <p className="eyebrow">Progress</p>
      <h1 className="h1">Your progress</h1>
      <ProgressTabs active="photos" />

      <Link className="btn btn-wide" href="/progress/photos/new" style={{ marginBottom: 10 }}>
        📸 Take today's photos
      </Link>
      {days.length > 0 && <p className="small muted center" style={{ margin: "0 0 14px" }}>Your photo days: {days.join(" · ")}</p>}

      <section className="card">
        <PhotoCompare photos={photos} urls={urls} />
      </section>
      <p className="center small muted">Only you and Tyler can see your photos.</p>
    </>
  );
}
