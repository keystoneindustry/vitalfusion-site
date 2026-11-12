import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { listPhotos, listWeighIns } from "@/lib/progress";
import { getResponse } from "@/lib/onboarding-data";
import { goalDirection } from "@/lib/milestones";
import ShareCardMaker from "./ShareCardMaker";

export const metadata = { title: "Share card · Vital Fusion Coach" };

/** Make a branded before/after image of a client for Instagram. Coach only; nothing is shown to the client. */
export default async function ShareCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}/share`);
  const client = await getClient(id);
  if (!client) notFound();
  const [photos, weighIns, response] = await Promise.all([listPhotos(client.id), listWeighIns(client.id, 500), getResponse(client.id)]);
  const base = `/coach/clients/${client.id}`;
  const sets = new Map<string, Record<string, string>>();
  for (const p of photos) {
    if (!sets.has(p.date)) sets.set(p.date, {});
    sets.get(p.date)![p.pose] = `${base}/share/photo?path=${encodeURIComponent(p.path)}`;
  }
  const days = [...sets.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, poses]) => ({ date, poses }));

  return (
    <>
      <p className="small">
        <Link href={`${base}/progress`}>← Progress</Link>
      </p>
      <h2 className="h2" style={{ fontSize: 22 }}>📸 Before/after share card</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Pick two photo days and download an Instagram-ready image. Only post it with {firstName(client.full_name)}'s permission.
      </p>
      {days.length < 2 ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>{firstName(client.full_name)} needs progress photos on at least two different days first.</p>
        </div>
      ) : (
        <ShareCardMaker
          days={days}
          weighIns={weighIns.map((w) => ({ date: w.date, weight: w.weight_lb }))}
          firstName={firstName(client.full_name)}
          direction={goalDirection(String(response?.answers?.goal ?? ""))}
        />
      )}
    </>
  );
}
