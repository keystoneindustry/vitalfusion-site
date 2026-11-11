import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getForm } from "@/lib/forms";
import SubmitButton from "@/app/components/SubmitButton";
import FormBuilder from "./FormBuilder";
import { archiveFormAction, saveFormAction } from "../actions";

export const metadata = { title: "Edit form · Vital Fusion Coach" };

export default async function EditFormPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const { msg } = await searchParams;
  await requireCoach(`/coach/forms/${id}`);
  const form = await getForm(id);
  if (!form) notFound();
  return (
    <div style={{ maxWidth: 760 }}>
      <p className="small">
        <Link href="/coach/forms">← Forms</Link>
      </p>
      <h1 className="h1">{form.title}</h1>
      {form.kind === "checkin" && (
        <p className="lead">
          The weekly check-in. Every client gets it on their check-in day; the AI reads the answers next to their weigh-ins and
          habits and emails you a summary.
        </p>
      )}
      {msg === "created" && <div className="notice notice-good">Form created ✓ Add your questions below.</div>}
      <section className="card">
        <FormBuilder
          key={form.updated_at}
          initial={{ title: form.title, intro: form.intro ?? "", questions: form.questions }}
          save={saveFormAction.bind(null, form.id)}
        />
      </section>
      {form.kind !== "checkin" && (
        <form action={archiveFormAction.bind(null, form.id, true)} className="center">
          <SubmitButton className="btn-link small" label="Archive this form" pendingLabel="Archiving…" />
        </form>
      )}
    </div>
  );
}
