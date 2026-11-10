import {
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  COACH_SIGNATURE,
  CONTACT_FIELDS,
  INTRO,
  PARQ_QUESTIONS,
  PARQ_STATEMENT,
  SIGNATURE_STATEMENT,
  agreementSections,
  type Contact,
  type PackageTerms,
} from "./agreement";
import { formatDate } from "./dates";
import { buildPdf, type PdfBlock } from "./pdf";

export type SignedAgreement = {
  contact: Contact;
  parq: boolean[];
  parqExplanation: string;
  signedName: string;
  signedAt: string; // ISO timestamp
  signerIp: string | null;
  package: PackageTerms;
  version?: string;
};

function stamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

/** The signed agreement as PDF bytes. */
export function agreementPdf(a: SignedAgreement): Uint8Array {
  const blocks: PdfBlock[] = [
    { kind: "title", text: "VITAL FUSION COACHING LLC" },
    { kind: "heading", text: AGREEMENT_TITLE.toUpperCase() },
    { kind: "text", text: INTRO, gap: 10 },
    { kind: "rule" },
    { kind: "heading", text: "SECTION I: CLIENT CONTACT INFORMATION" },
  ];
  for (const f of CONTACT_FIELDS) {
    const v = a.contact[f.key] || "";
    blocks.push({ kind: "pair", label: f.label, value: f.key === "dob" ? formatDate(v) : v });
  }

  blocks.push({ kind: "space", size: 6 }, { kind: "heading", text: "SECTION II: PHYSICAL ACTIVITY READINESS QUESTIONNAIRE (PAR-Q)" });
  PARQ_QUESTIONS.forEach((q, i) => {
    blocks.push({ kind: "text", text: `${i + 1}. ${q}`, gap: 2 });
    blocks.push({ kind: "text", text: `Answer: ${a.parq[i] ? "YES" : "NO"}`, bold: true, gap: 8 });
  });
  if (a.parq.some(Boolean)) {
    blocks.push({ kind: "pair", label: "Explanation", value: a.parqExplanation || "-" });
  }
  blocks.push({ kind: "text", text: PARQ_STATEMENT, size: 9, gap: 10 });

  for (const s of agreementSections(a.package)) {
    blocks.push({ kind: "space", size: 4 }, { kind: "heading", text: `SECTION ${s.number}: ${s.title.toUpperCase()}` });
    for (const p of s.paragraphs) blocks.push({ kind: "text", text: p, gap: 8 });
    blocks.push({ kind: "text", text: "Agreed by the Client.", bold: true, size: 9, gap: 8 });
  }

  blocks.push(
    { kind: "rule" },
    { kind: "heading", text: "ACKNOWLEDGMENT AND SIGNATURES" },
    { kind: "text", text: SIGNATURE_STATEMENT, gap: 12 },
    { kind: "text", text: COACH_SIGNATURE.company.toUpperCase(), bold: true, gap: 4 },
    { kind: "pair", label: "By", value: `${COACH_SIGNATURE.name} (signed electronically)` },
    { kind: "pair", label: "Name", value: COACH_SIGNATURE.name },
    { kind: "pair", label: "Title", value: COACH_SIGNATURE.title },
    { kind: "pair", label: "Date", value: stamp(a.signedAt) },
    { kind: "space", size: 8 },
    { kind: "text", text: "CLIENT", bold: true, gap: 4 },
    { kind: "pair", label: "Name", value: a.contact.fullName },
    { kind: "pair", label: "Signature", value: `${a.signedName} (typed electronic signature)` },
    { kind: "pair", label: "Date", value: stamp(a.signedAt) },
    { kind: "space", size: 8 },
    {
      kind: "text",
      size: 8,
      text: `Electronic record: signed in the Vital Fusion coaching app on ${stamp(a.signedAt)}${
        a.signerIp ? ` from IP address ${a.signerIp}` : ""
      }. Agreement version ${a.version ?? AGREEMENT_VERSION}. Each section was agreed to individually before signing.`,
    },
  );

  return buildPdf(blocks, `Vital Fusion Coaching LLC - ${AGREEMENT_TITLE} - ${a.contact.fullName}`);
}
