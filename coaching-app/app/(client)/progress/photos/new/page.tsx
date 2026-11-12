import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { listPhotos, PHOTO_BUCKET, POSES } from "@/lib/progress";
import { signedUrls } from "@/lib/storage";
import PhotoUploader from "./PhotoUploader";

export const metadata = { title: "Progress photos · Vital Fusion" };

export default async function PhotosPage() {
  const { client } = await requireClient("/progress/photos/new");
  const today = todayIn(client.timezone);
  const todays = (await listPhotos(client.id)).filter((p) => p.date === today);
  const urls = await signedUrls(PHOTO_BUCKET, todays.map((p) => p.path)).catch(() => ({}) as Record<string, string>);
  const existing = Object.fromEntries(todays.filter((p) => urls[p.path]).map((p) => [p.pose, urls[p.path]]));
  return (
    <>
      <p className="small">
        <Link href="/progress/photos">← Photos</Link>
      </p>
      <h1 className="h1">Today's photos</h1>
      <ul className="tips" style={{ padding: "0 0 0 20px", marginBottom: 16 }}>
        <li>First thing in the morning, fasted (before you eat or drink), after the bathroom.</li>
        <li>Same spot and lighting each time.</li>
        <li>Fitted clothes or swimwear so changes are visible.</li>
        <li>Phone at chest height, or ask someone to take them.</li>
      </ul>
      <PhotoUploader date={today} poses={POSES.map((p) => ({ ...p }))} existing={existing} />
    </>
  );
}
