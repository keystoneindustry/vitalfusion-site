import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { formatDate } from "@/lib/dates";
import { listPhotos, listWeighIns, PHOTO_BUCKET } from "@/lib/progress";
import { signedUrls } from "@/lib/storage";
import { PhotoCompare, WeightSummary } from "@/app/components/ProgressViews";

export const metadata = { title: "Progress · Vital Fusion Coach" };

/** Their weight trend and progress photos. Scheduling lives on the Calendar tab. */
export default async function ClientProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}/progress`);
  const client = await getClient(id);
  if (!client) notFound();
  const [weighIns, photos] = await Promise.all([listWeighIns(client.id), listPhotos(client.id)]);
  const urls = await signedUrls(PHOTO_BUCKET, photos.map((p) => p.path)).catch(() => ({}) as Record<string, string>);

  return (
    <div className="detail-grid">
      <section className="card">
        <h2 className="h2">⚖️ Weight</h2>
        <WeightSummary entries={weighIns} />
        {weighIns.length > 0 && (
          <details className="answers">
            <summary>All weigh-ins ({weighIns.length})</summary>
            <dl>
              {weighIns.map((w) => (
                <div key={w.date}>
                  <dt>{formatDate(w.date)}</dt>
                  <dd>
                    {w.weight_lb} lb{w.note ? ` · ${w.note}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </section>
      <section className="card">
        <h2 className="h2">📸 Progress photos</h2>
        <PhotoCompare photos={photos} urls={urls} />
        <p className="small muted" style={{ marginBottom: 0 }}>
          Weigh-in and photo days are set on the <Link href={`/coach/clients/${client.id}/calendar`}>Calendar</Link> tab.
        </p>
      </section>
    </div>
  );
}
