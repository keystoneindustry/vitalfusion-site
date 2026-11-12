"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient } from "@/lib/clients";
import { todayIn, addDays } from "@/lib/dates";
import { firstName } from "@/lib/client-input";
import { appOrigin } from "@/lib/origin";
import { progressReportClientEmail, sendEmail } from "@/lib/email";
import { pushToClient } from "@/lib/reminders";
import { createReport, deleteReport, fillReport, getReport, updateReport, buildStats } from "@/lib/reports";

const lines = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "")
    .split("\n")
    .map((x) => x.replace(/^[-•✅🎯\s]+/u, "").trim())
    .filter(Boolean)
    .slice(0, max);

export async function createReportAction(clientId: string): Promise<void> {
  await requireCoach("/coach");
  const client = await getClient(clientId);
  if (!client) redirect("/coach");
  // Ends yesterday, so today's half-finished habits don't count against them.
  const report = await createReport(client, addDays(todayIn(client.timezone), -1));
  await addEvent(client.id, "report_created", {});
  after(() => fillReport(client, report));
  redirect(`/coach/clients/${client.id}/reports/${report.id}`);
}

export async function saveReportAction(reportId: string, form: FormData): Promise<void> {
  await requireCoach("/coach");
  const r = await getReport(reportId);
  if (!r) redirect("/coach");
  await updateReport(r.id, {
    headline: String(form.get("headline") ?? "").trim().slice(0, 120),
    message: String(form.get("message") ?? "").trim().slice(0, 3000),
    highlights: lines(form.get("highlights"), 5),
    focus: lines(form.get("focus"), 3),
    photo_before: form.get("noPhotos") === "on" ? null : r.photo_before,
    photo_after: form.get("noPhotos") === "on" ? null : r.photo_after,
  });
  const intent = String(form.get("intent") ?? "save");
  if (intent === "send") return sendReport(r.id);
  redirect(`/coach/clients/${r.client_id}/reports/${r.id}?msg=saved`);
}

async function sendReport(reportId: string): Promise<void> {
  const r = await getReport(reportId);
  if (!r) redirect("/coach");
  const client = await getClient(r.client_id);
  if (!client) redirect("/coach");
  if (!r.message.trim()) redirect(`/coach/clients/${r.client_id}/reports/${r.id}?error=${encodeURIComponent("Write a message first.")}`);
  const first = r.status !== "sent";
  await updateReport(r.id, { status: "sent", sent_at: r.sent_at ?? new Date().toISOString(), seen_at: first ? null : r.seen_at });
  if (first) {
    await addEvent(client.id, "report_sent", {});
    const link = `${await appOrigin()}/progress/reports/${r.id}`;
    try {
      await sendEmail({ to: client.email, ...progressReportClientEmail(firstName(client.full_name), r.headline, link) });
    } catch (err) {
      console.error("Report email failed", err);
    }
    await pushToClient(client.id, { title: "📊 Your monthly progress report is ready", body: r.headline || "Tap to see your month.", url: link, tag: `report-${r.id}` }).catch((err) =>
      console.error("Report push failed", err),
    );
  }
  redirect(`/coach/clients/${r.client_id}/reports/${r.id}?msg=${first ? "sent" : "updated"}`);
}

export async function redraftReportAction(reportId: string): Promise<void> {
  await requireCoach("/coach");
  const r = await getReport(reportId);
  if (!r || r.status !== "draft") redirect("/coach");
  const client = await getClient(r.client_id);
  if (!client) redirect("/coach");
  const { stats, photoBefore, photoAfter } = await buildStats(client, r.period_start, r.period_end);
  await updateReport(r.id, { stats, photo_before: photoBefore, photo_after: photoAfter, message: "", headline: "", highlights: [], focus: [], ai_error: null });
  const fresh = await getReport(r.id);
  if (fresh) after(() => fillReport(client, fresh));
  redirect(`/coach/clients/${r.client_id}/reports/${r.id}`);
}

export async function deleteReportAction(reportId: string): Promise<void> {
  await requireCoach("/coach");
  const r = await getReport(reportId);
  if (!r) redirect("/coach");
  await deleteReport(r.id);
  redirect(`/coach/clients/${r.client_id}/reports`);
}
