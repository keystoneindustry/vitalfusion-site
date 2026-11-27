import { after } from "next/server";
import { agreementSections, CONTACT_FIELDS, INTRO, PARQ_QUESTIONS, PARQ_STATEMENT, SIGNATURE_STATEMENT } from "@/lib/agreement";
import { formatDate } from "@/lib/dates";
import { getLegalByToken, packageOf, updateLegalRequest } from "@/lib/legal";
import AgreementFlow from "@/app/onboarding/agreement/AgreementFlow";
import { signLegalAction } from "./actions";

export const metadata = { title: "Coaching agreement · Vital Fusion", robots: { index: false, follow: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="onb">
      <header className="topbar">
        <span className="home-brand">
          <img src="/icons/logo.png" alt="" />
          <span className="brand">Vital Fusion Coaching</span>
        </span>
      </header>
      <main className="page" style={{ paddingTop: 8 }}>
        {children}
      </main>
    </div>
  );
}

/** Public signing page for a standalone agreement (link emailed from coach → Legal). */
export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await getLegalByToken(token);

  if (!r) {
    return (
      <Shell>
        <h1 className="h1">This link isn't valid</h1>
        <section className="card">
          <p style={{ margin: 0 }}>It may have been cancelled or replaced. Reply to Tyler's email and he'll send you a new one.</p>
        </section>
      </Shell>
    );
  }

  if (r.status === "signed") {
    return (
      <Shell>
        <h1 className="h1">Your agreement is signed ✅</h1>
        <section className="card">
          <p style={{ marginTop: 0 }}>
            Thanks, {(r.contact?.fullName || r.full_name).split(" ")[0]}! You signed on {formatDate((r.signed_at ?? "").slice(0, 10))}.
          </p>
          <p style={{ margin: 0 }}>A PDF copy was emailed to {r.contact?.email || r.email}. You can close this page.</p>
        </section>
      </Shell>
    );
  }

  if (!r.opened_at) after(() => updateLegalRequest(r.id, { opened_at: new Date().toISOString() }).catch(() => undefined));

  return (
    <Shell>
      <h1 className="h1">Coaching agreement</h1>
      <p className="lead" style={{ marginTop: -4 }}>
        Your contact details{r.include_parq ? ", a few health questions," : ""} then each part of the agreement on its own screen. About 5 minutes.
      </p>
      <AgreementFlow
        intro={INTRO}
        contactFields={CONTACT_FIELDS.map((f) => ({ ...f }))}
        prefill={{ fullName: r.full_name, email: r.email, phone: r.phone ?? "" }}
        parqQuestions={PARQ_QUESTIONS}
        parqStatement={PARQ_STATEMENT}
        sections={agreementSections(packageOf(r), { withParq: r.include_parq })}
        signatureStatement={SIGNATURE_STATEMENT}
        includeParq={r.include_parq}
        onSign={signLegalAction.bind(null, r.token)}
      />
    </Shell>
  );
}
