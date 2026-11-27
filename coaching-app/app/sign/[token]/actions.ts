"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
import { firstName } from "@/lib/client-input";
import { legalSignedClientEmail, legalSignedCoachEmail, sendEmail, type Attachment } from "@/lib/email";
import { env } from "@/lib/env";
import { getLegalByToken, markSigned, packageOf, updateLegalRequest } from "@/lib/legal";
import { appOrigin } from "@/lib/origin";
import { uploadFile } from "@/lib/storage";

type Input = { contact: Partial<Contact>; parq: (boolean | null)[]; explanation: string; agreed: string[]; signature: string };
type Result = { error?: string; screen?: string };

/**
 * Signs a standalone agreement. No sign-in: the unguessable token in the link is the key. Everything is checked again
 * here, then the record is saved, the PDF stored, and copies emailed to the signer and the coach.
 */
export async function signLegalAction(token: string, input: Input): Promise<Result> {
  const r = await getLegalByToken(String(token));
  if (!r) return { error: "This link isn't valid anymore. Ask Tyler to send a new one." };
  if (r.status === "signed") redirect(`/sign/${r.token}`);

  const contact = {} as Contact;
  for (const f of CONTACT_FIELDS) contact[f.key] = String(input?.contact?.[f.key] ?? "").trim().slice(0, 300);
  contact.email = contact.email.toLowerCase();
  if (Object.keys(validateContact(contact)).length) return { error: "Please check your contact details.", screen: "contact" };

  let answers: boolean[] = [];
  let explanation = "";
  if (r.include_parq) {
    const parq = Array.isArray(input?.parq) ? input.parq.slice(0, PARQ_QUESTIONS.length) : [];
    explanation = String(input?.explanation ?? "").trim().slice(0, 2000);
    const parqError = validateParq(parq, explanation);
    if (parqError) return { error: parqError, screen: "parq" };
    answers = parq as boolean[];
  }

  const pkg = packageOf(r);
  const required = [...(r.include_parq ? ["parq"] : []), ...agreementSections(pkg, { withParq: r.include_parq }).map((s) => s.id)];
  const agreed = new Set(Array.isArray(input?.agreed) ? input.agreed.map(String) : []);
  const missing = required.find((id) => !agreed.has(id));
  if (missing) return { error: "Please agree to every section.", screen: missing };

  const signature = String(input?.signature ?? "").trim().slice(0, 200);
  if (!signatureMatches(signature, contact.fullName)) return { error: "Type your full name exactly as you entered it above.", screen: "sign" };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
  const userAgent = (h.get("user-agent") || "").slice(0, 400) || null;
  const anyYes = answers.some(Boolean);
  const signedAt = new Date().toISOString();

  const won = await markSigned(r.id, {
    version: AGREEMENT_VERSION,
    contact,
    parq: r.include_parq ? answers : null,
    parq_any_yes: r.include_parq ? anyYes : null,
    parq_explanation: anyYes ? explanation : null,
    signed_name: signature,
    signed_at: signedAt,
    signer_ip: ip,
    signer_user_agent: userAgent,
  } as Parameters<typeof markSigned>[1]);
  if (!won) redirect(`/sign/${r.token}`);

  const origin = await appOrigin();
  let attachment: Attachment | null = null;
  try {
    const bytes = agreementPdf({
      contact,
      parq: answers,
      parqExplanation: explanation,
      signedName: signature,
      signedAt,
      signerIp: ip,
      package: pkg,
      version: AGREEMENT_VERSION,
      withParq: r.include_parq,
      signedWhere: `online at ${origin.replace(/^https?:\/\//, "")}`,
    });
    const path = `legal/${r.id}.pdf`;
    await uploadFile("agreements", path, bytes, "application/pdf");
    await updateLegalRequest(r.id, { pdf_path: path });
    attachment = { filename: `Vital Fusion Coaching Agreement - ${contact.fullName}.pdf`, content: bytes };
  } catch (err) {
    console.error("Legal PDF failed", err);
  }

  const attachments = attachment ? [attachment] : [];
  const coach = env.coachEmails()[0];
  await sendEmail({ to: contact.email, replyTo: coach, ...legalSignedClientEmail(firstName(contact.fullName)), attachments }).catch((err) =>
    console.error("Legal copy to signer failed", err),
  );
  if (contact.email !== r.email.toLowerCase()) {
    // They typed a different address than the one the link went to: send that inbox a copy too.
    await sendEmail({ to: r.email, replyTo: coach, ...legalSignedClientEmail(firstName(contact.fullName)), attachments }).catch(() => undefined);
  }
  if (coach) {
    await sendEmail({
      to: coach,
      replyTo: contact.email,
      ...legalSignedCoachEmail({
        clientName: contact.fullName,
        parqYes: PARQ_QUESTIONS.filter((_, i) => answers[i]),
        explanation,
        link: `${origin}/coach/legal`,
      }),
      attachments,
    }).catch((err) => console.error("Legal notice to coach failed", err));
  }
  redirect(`/sign/${r.token}`);
}
