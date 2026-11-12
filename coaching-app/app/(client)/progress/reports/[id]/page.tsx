import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { getReport, reportPhotos, updateReport } from "@/lib/reports";
import ReportView from "@/app/components/ReportView";

export const metadata = { title: "Progress report · Vital Fusion" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client } = await requireClient(`/progress/reports/${id}`);
  const report = await getReport(id);
  if (!report || report.client_id !== client.id || report.status !== "sent") notFound();
  if (!report.seen_at) await updateReport(report.id, { seen_at: new Date().toISOString() }).catch(() => {});
  const photos = await reportPhotos(report);
  return (
    <>
      <p className="small" style={{ margin: "0 0 8px" }}>
        <Link href="/progress/reports">‹ All reports</Link>
      </p>
      <h1 className="h1">Your monthly report</h1>
      <ReportView report={report} before={photos.before} after={photos.after} />
    </>
  );
}
