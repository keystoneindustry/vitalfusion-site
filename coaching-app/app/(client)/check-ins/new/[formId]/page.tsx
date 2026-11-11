import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { addDays, formatDate, isIsoDate, todayIn } from "@/lib/dates";
import { findSubmission, getForm } from "@/lib/forms";
import FormFiller from "../../FormFiller";

export const metadata = { title: "Check-in · Vital Fusion" };
// The AI review runs right after sending; give it time.
export const maxDuration = 300;

export default async function FillFormPage({ params, searchParams }: { params: Promise<{ formId: string }>; searchParams: Promise<{ date?: string }> }) {
  const { formId } = await params;
  const { date: rawDate } = await searchParams;
  const { client } = await requireClient(`/check-ins/new/${formId}`);
  const form = await getForm(formId);
  if (!form) notFound();
  const today = todayIn(client.timezone);
  const date = rawDate && isIsoDate(rawDate) && rawDate <= today && rawDate >= addDays(today, -3) ? rawDate : today;
  const existing = await findSubmission(client.id, form.id, date);
  if (existing?.replied_at) redirect(`/check-ins/${existing.id}`);

  return (
    <>
      <p className="small">
        <Link href="/">← Today</Link>
      </p>
      <p className="eyebrow">{date === today ? "Today" : formatDate(date, false)}</p>
      <h1 className="h1">{form.title}</h1>
      {form.intro && <p className="program-intro">{form.intro}</p>}
      {existing && <div className="notice notice-good">You already sent this one. Change anything below and send it again.</div>}
      <FormFiller formId={form.id} date={date} questions={form.questions} initial={existing?.answers ?? {}} />
    </>
  );
}
