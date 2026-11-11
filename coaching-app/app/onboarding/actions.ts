"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { addEvent, type ClientRow } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { env } from "@/lib/env";
import {
  AGREEMENT_VERSION,
  agreementSections,
  CONTACT_FIELDS,
  PARQ_QUESTIONS,
  signatureMatches,
  validateContact,
  validateParq,
  type Contact,
} from "@/lib/agreement";
import { agreementPdf } from "@/lib/agreement-pdf";
import {
  agreementClientEmail,
  agreementCoachEmail,
  onboardingAnswersCoachEmail,
  sendEmail,
  type Attachment,
} from "@/lib/email";
import { completeStep, getResponse, insertAgreement, latestAgreement, saveResponse, setAgreementPdf } from "@/lib/onboarding-data";
import { stepIndex, stepPath, type StepId } from "@/lib/onboarding";
import { firstProblem, sanitizeAnswers, summarize } from "@/lib/onboarding-questions";
import { appOrigin } from "@/lib/origin";
import { uploadFile } from "@/lib/storage";
import { parseWeight, saveWeighIn } from "@/lib/progress";
import { todayIn } from "@/lib/dates";

/** The client, if they've reached `step`; otherwise sends them to where they are. */
async function clientAt(step: StepId, path: string): Promise<ClientRow> {
  const { client } = await requireClient(path);
  if (stepIndex(client.onboarding_step) < stepIndex(step)) redirect(stepPath(client.onboarding_step));
  return client;
}

/** Emails without letting a failure block the client; failures show on the coach's timeline. */
async function trySend(clientId: string, what: string, msg: Parameters<typeof sendEmail>[0]): Promise<void> {
  try {
    await sendEmail(msg);
  } catch (err) {
    console.error(`Email failed: ${what}`, err);
    await addEvent(clientId, "email_failed", { what }).catch(() => undefined);
  }
}

function coachAddress(): string | null {
  return env.coachEmails()[0] ?? null;
}

// ───────── Simple steps ─────────

const SIMPLE_STEPS = new Set<StepId>(["welcome", "install", "how_it_works"]);

export async function finishStep(form: FormData): Promise<void> {
  const step = String(form.get("step") || "") as StepId;
  if (!SIMPLE_STEPS.has(step)) redirect("/onboarding");
  const client = await clientAt(step, "/onboarding");
  const next = await completeStep(client, step);
  redirect(stepPath(next));
}

/** "I've booked my call" for when the booking hasn't come through from Cal.com yet. */
export async function kickoffSelfReport(): Promise<void> {
  const client = await clientAt("kickoff", "/onboarding/kickoff");
  if (client.onboarding_step === "kickoff") {
    await addEvent(client.id, "kickoff_self_reported");
    await completeStep(client, "kickoff");
  }
  redirect("/");
}

// ───────── Onboarding questions ─────────

export type SaveResult = { ok: boolean };

/** Autosave as the client moves through the questions. */
export async function saveQuestionProgress(rawAnswers: unknown, index: number): Promise<SaveResult> {
  const client = await clientAt("questions", "/onboarding/questions");
  const existing = await getResponse(client.id);
  if (existing?.submitted_at) return { ok: true };
  await saveResponse(client.id, {
    answers: sanitizeAnswers(rawAnswers),
    current_question: Math.max(0, Math.min(200, Math.floor(Number(index) || 0))),
  });
  return { ok: true };
}

export type SubmitResult = { error?: string; index?: number };

export async function submitQuestions(rawAnswers: unknown): Promise<SubmitResult> {
  const client = await clientAt("questions", "/onboarding/questions");
  const answers = sanitizeAnswers(rawAnswers);
  const problem = firstProblem(answers);
  if (problem) return { error: problem.message, index: problem.index };

  const existing = await getResponse(client.id);
  if (!existing?.submitted_at) {
    await saveResponse(client.id, { answers, submitted_at: new Date().toISOString() });
    await addEvent(client.id, "questions_submitted");
    // Their current weight becomes their first weigh-in, so Progress starts with a number.
    const weight = parseWeight(answers.weight);
    if (weight !== null) await saveWeighIn(client.id, todayIn(client.timezone), weight, "From onboarding").catch((err) => console.error("Starting weigh-in failed", err));
    const to = coachAddress();
    if (to) {
      const origin = await appOrigin();
      await trySend(client.id, "onboarding answers to coach", {
        to,
        replyTo: client.email,
        ...onboardingAnswersCoachEmail({
          clientName: client.full_name,
          link: `${origin}/coach/clients/${client.id}`,
          groups: summarize(answers),
        }),
      });
    }
  }
  const next = await completeStep(client, "questions");
  redirect(stepPath(next));
}

// ───────── Coaching agreement ─────────

export type AgreementInput = {
  contact: Partial<Contact>;
  parq: (boolean | null)[];
  explanation: string;
  agreed: string[];
  signature: string;
};

export type AgreementResult = { error?: string; screen?: string };

export async function signAgreement(input: AgreementInput): Promise<AgreementResult> {
  const client = await clientAt("agreement", "/onboarding/agreement");
  if (await latestAgreement(client.id)) {
    if (client.onboarding_step === "agreement") await completeStep(client, "agreement");
    redirect("/onboarding/questions");
  }

  // Check everything again on the server.
  const contact = {} as Contact;
  for (const f of CONTACT_FIELDS) contact[f.key] = String(input?.contact?.[f.key] ?? "").trim().slice(0, 300);
  contact.email = contact.email.toLowerCase();
  if (Object.keys(validateContact(contact)).length) return { error: "Please check your contact details.", screen: "contact" };

  const parq = Array.isArray(input?.parq) ? input.parq.slice(0, PARQ_QUESTIONS.length) : [];
  const explanation = String(input?.explanation ?? "").trim().slice(0, 2000);
  const parqError = validateParq(parq, explanation);
  if (parqError) return { error: parqError, screen: "parq" };
  const answers = parq as boolean[];

  const pkg = { coachingWeeks: client.coaching_weeks, startDate: client.start_date, endDate: client.end_date };
  const required = ["parq", ...agreementSections(pkg).map((s) => s.id)];
  const agreed = new Set(Array.isArray(input?.agreed) ? input.agreed.map(String) : []);
  const missing = required.find((id) => !agreed.has(id));
  if (missing) return { error: "Please agree to every section.", screen: missing };

  const signature = String(input?.signature ?? "").trim().slice(0, 200);
  if (!signatureMatches(signature, contact.fullName))
    return { error: "Type your full name exactly as you entered it above.", screen: "sign" };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
  const userAgent = (h.get("user-agent") || "").slice(0, 400) || null;
  const anyYes = answers.some(Boolean);

  const row = await insertAgreement({
    client_id: client.id,
    version: AGREEMENT_VERSION,
    coaching_weeks: client.coaching_weeks,
    start_date: client.start_date,
    end_date: client.end_date,
    contact,
    parq: answers,
    parq_any_yes: anyYes,
    parq_explanation: anyYes ? explanation : null,
    signed_name: signature,
    signed_at: new Date().toISOString(),
    signer_ip: ip,
    signer_user_agent: userAgent,
  });

  // The PDF copy. If storage hiccups, the signed record is still saved and the coach can re-create it later.
  let attachment: Attachment | null = null;
  try {
    const bytes = agreementPdf({
      contact,
      parq: answers,
      parqExplanation: explanation,
      signedName: signature,
      signedAt: row.signed_at,
      signerIp: ip,
      package: pkg,
      version: row.version,
    });
    const path = `${client.id}/${row.id}.pdf`;
    await uploadFile("agreements", path, bytes, "application/pdf");
    await setAgreementPdf(row.id, path);
    attachment = { filename: `Vital Fusion Coaching Agreement - ${contact.fullName}.pdf`, content: bytes };
  } catch (err) {
    console.error("Agreement PDF failed", err);
    await addEvent(client.id, "email_failed", { what: "agreement PDF" }).catch(() => undefined);
  }

  const parqYes = PARQ_QUESTIONS.filter((_, i) => answers[i]);
  await addEvent(client.id, "agreement_signed", { parqYes: anyYes, version: row.version });
  await completeStep(client, "agreement", {
    health_flag: anyYes,
    health_note: anyYes ? explanation : null,
    ...(client.phone ? {} : { phone: contact.phone }),
  });

  const attachments = attachment ? [attachment] : [];
  await trySend(client.id, "agreement copy to client", {
    to: client.email,
    ...agreementClientEmail(firstName(client.full_name)),
    attachments,
  });
  const to = coachAddress();
  if (to) {
    const origin = await appOrigin();
    await trySend(client.id, "agreement notice to coach", {
      to,
      replyTo: client.email,
      ...agreementCoachEmail({
        clientName: client.full_name,
        parqYes,
        explanation,
        link: `${origin}/coach/clients/${client.id}`,
      }),
      attachments,
    });
  }
  redirect("/onboarding/questions");
}
