import Link from "next/link";
import { agreementSections, CONTACT_FIELDS, INTRO, PARQ_QUESTIONS, PARQ_STATEMENT, SIGNATURE_STATEMENT } from "@/lib/agreement";
import { latestAgreement } from "@/lib/onboarding-data";
import { formatDate } from "@/lib/dates";
import { onboardingPage } from "../guard";
import StepHeader from "../StepHeader";
import AgreementFlow from "./AgreementFlow";

export const metadata = { title: "Coaching agreement · Vital Fusion" };

export default async function AgreementPage() {
  const { client, email } = await onboardingPage("agreement", "/onboarding/agreement");
  const signed = await latestAgreement(client.id);

  if (signed) {
    return (
      <>
        <StepHeader step="agreement" title="Your agreement is signed ✅" />
        <section className="card">
          <p className="coming" style={{ marginTop: 0 }}>
            You signed on {formatDate(signed.signed_at.slice(0, 10))}. A copy was emailed to you.
          </p>
          <a className="btn btn-ghost btn-wide" href="/agreement" target="_blank" rel="noopener noreferrer">
            View my signed agreement (PDF)
          </a>
          <div className="spacer" />
          <Link className="btn btn-wide" href="/onboarding">
            Continue →
          </Link>
        </section>
      </>
    );
  }

  const pkg = { coachingWeeks: client.coaching_weeks, startDate: client.start_date, endDate: client.end_date };
  return (
    <>
      <StepHeader
        step="agreement"
        title="Coaching agreement"
        lead="Your contact details, a few health questions, then each part of the agreement on its own screen. About 5 minutes."
      />
      <AgreementFlow
        intro={INTRO}
        contactFields={CONTACT_FIELDS.map((f) => ({ ...f }))}
        prefill={{ fullName: client.full_name, email: client.email || email, phone: client.phone ?? "" }}
        parqQuestions={PARQ_QUESTIONS}
        parqStatement={PARQ_STATEMENT}
        sections={agreementSections(pkg)}
        signatureStatement={SIGNATURE_STATEMENT}
      />
    </>
  );
}
