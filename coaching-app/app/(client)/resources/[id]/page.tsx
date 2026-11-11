import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { packageStatus, todayIn } from "@/lib/dates";
import { formatSize, getResource, RESOURCE_BUCKET, unlocked } from "@/lib/resources";
import { videoEmbedUrl } from "@/lib/settings";
import { signedUrls } from "@/lib/storage";

export const metadata = { title: "Resource · Vital Fusion" };

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client } = await requireClient(`/resources/${id}`);
  const r = await getResource(id);
  const status = packageStatus(client.start_date, client.end_date, todayIn(client.timezone));
  const week = status.kind === "in_progress" ? status.week : status.kind === "ended" ? 999 : 1;
  if (!r || !unlocked(r, week)) notFound();
  const fileUrl = r.path ? (await signedUrls(RESOURCE_BUCKET, [r.path], r.kind === "video_file" ? 6 * 3600 : 3600).catch(() => ({}) as Record<string, string>))[r.path] : null;
  const embed = r.kind === "video_link" && r.url ? videoEmbedUrl(r.url) : null;

  return (
    <>
      <p className="small">
        <Link href="/resources">← Resources</Link>
      </p>
      <p className="eyebrow">{r.category}</p>
      <h1 className="h1">{r.title}</h1>
      {r.description && <p className="program-intro">{r.description}</p>}

      {embed && (
        <div className="video-frame">
          <iframe src={embed} title={r.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        </div>
      )}
      {r.kind === "video_file" && fileUrl && (
        <video className="video-file" src={fileUrl} controls playsInline preload="metadata" />
      )}
      {r.kind === "pdf" && fileUrl && (
        <section className="card center">
          <p style={{ fontSize: 44, margin: "4px 0 6px" }}>📄</p>
          <p className="muted small" style={{ marginTop: 0 }}>
            PDF{r.size_bytes ? ` · ${formatSize(r.size_bytes)}` : ""}
          </p>
          <a className="btn btn-wide" href={fileUrl} target="_blank" rel="noopener noreferrer">
            Open the PDF
          </a>
          <p className="small muted" style={{ marginBottom: 0 }}>Opens in a new window, where you can save or share it.</p>
        </section>
      )}
      {r.kind === "video_link" && !embed && r.url && (
        <a className="btn btn-wide" href={r.url} target="_blank" rel="noopener noreferrer">
          ▶️ Watch the video
        </a>
      )}
      {!embed && !fileUrl && !(r.kind === "video_link" && r.url) && <div className="notice notice-error">This file isn't available right now. Try again later.</div>}
    </>
  );
}
