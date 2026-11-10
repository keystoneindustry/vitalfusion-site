import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { addClientAction } from "../../actions";
import ClientForm from "../../ClientForm";

export const metadata = { title: "Add client · Vital Fusion Coach" };

export default async function NewClientPage() {
  await requireCoach("/coach/clients/new");
  return (
    <div style={{ maxWidth: 560 }}>
      <p className="small">
        <Link href="/coach">← Clients</Link>
      </p>
      <h1 className="h1">Add a client</h1>
      <p className="lead">
        Enter what they paid for. They'll get a welcome email with a link that signs them straight into the app.
      </p>
      <section className="card">
        <ClientForm action={addClientAction} mode="new" today={todayIn()} />
      </section>
    </div>
  );
}
