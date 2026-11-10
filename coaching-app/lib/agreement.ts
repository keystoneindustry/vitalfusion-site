import { formatDate } from "./dates";

/**
 * Vital Fusion Coaching LLC — Client Onboarding, Informed Consent & Personal Training Agreement.
 * Wording comes from Tyler's existing agreement (Nov 2026), with three approved changes:
 * Privacy and data (Section V), Coaching package and payment (Section V), and
 * Maryland governing law (Section VIII). Bump AGREEMENT_VERSION whenever the wording changes.
 * Have a lawyer review this wording before launch.
 */
export const AGREEMENT_VERSION = "2026-11-10";
export const AGREEMENT_TITLE = "Client Onboarding, Informed Consent & Personal Training Agreement";
export const COACH_SIGNATURE = { name: "Tyler Kendrick", title: "Owner", company: "Vital Fusion Coaching LLC" };

export const INTRO =
  "This Client Onboarding, Informed Consent, and Personal Training Agreement (“Agreement”) is entered into by and between Vital Fusion Coaching LLC, a limited liability company (“Coach”), and the undersigned individual (“Client”). This Agreement governs the Client’s participation in online personal training and fitness coaching services provided by the Coach. By signing this Agreement, the Client acknowledges that they have read, understood, and voluntarily agreed to all terms and conditions contained herein.";

/** Section I fields. */
export const CONTACT_FIELDS = [
  { key: "fullName", label: "Full name", type: "text", autoComplete: "name" },
  { key: "address", label: "Full address", type: "text", autoComplete: "street-address" },
  { key: "email", label: "Email", type: "email", autoComplete: "email" },
  { key: "phone", label: "Phone number", type: "tel", autoComplete: "tel" },
  { key: "dob", label: "Date of birth", type: "date", autoComplete: "bday" },
  { key: "emergencyName", label: "Emergency contact name", type: "text", autoComplete: "off" },
  { key: "emergencyPhone", label: "Emergency contact phone", type: "tel", autoComplete: "off" },
] as const;

export type ContactKey = (typeof CONTACT_FIELDS)[number]["key"];
export type Contact = Record<ContactKey, string>;

/** Section II: Physical Activity Readiness Questionnaire. */
export const PARQ_QUESTIONS = [
  "Has a doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?",
  "Do you feel pain in your chest when you perform physical activity?",
  "In the past month, have you experienced chest pain when not performing physical activity?",
  "Do you lose your balance because of dizziness or have you ever lost consciousness?",
  "Do you have a bone, joint, or musculoskeletal problem (for example, back, knee, hip, or shoulder) that could be made worse by a change in your physical activity?",
  "Are you currently taking any prescribed medications for blood pressure, heart conditions, or other medical issues that may affect exercise participation?",
  "Do you know of any other reason why you should not engage in physical activity or exercise?",
];

export const PARQ_STATEMENT =
  "A YES response to one or more questions may require medical clearance before beginning or continuing exercise participation. I confirm that the information provided above is accurate and complete to the best of my knowledge. I understand that it is my responsibility to inform my coach of any changes in my health status that may affect my ability to safely participate in exercise.";

export type AgreementSection = { id: string; number: string; title: string; paragraphs: string[] };

export type PackageTerms = { coachingWeeks: number | null; startDate: string | null; endDate: string | null };

function packageParagraph(p: PackageTerms): string {
  const length = p.coachingWeeks ? `${p.coachingWeeks} week${p.coachingWeeks === 1 ? "" : "s"}` : "the agreed length";
  const start = p.startDate ? formatDate(p.startDate) : "the agreed start date";
  const end = p.endDate ? formatDate(p.endDate) : "the agreed end date";
  return `The Client is purchasing ${length} of online coaching, beginning ${start} and ending ${end} (the “Term”). Payment for the Term is due in advance according to the agreed-upon schedule. Failure to maintain payment may result in suspension or termination of services. All payments are non-refundable once the Term has begun, unless otherwise stated in writing. Coaching services end on the end date unless the Client and Coach agree in writing to renew. Any pause, extension or change to the Term must be agreed in writing, including by email or in the coaching app, and will be recorded in an updated version of this Agreement.`;
}

/** Sections III–VIII, with the client's package filled in. */
export function agreementSections(p: PackageTerms): AgreementSection[] {
  return [
    {
      id: "consent",
      number: "III",
      title: "Informed Consent",
      paragraphs: [
        "The Client understands that the personal training program may include physical activities designed to improve cardiovascular fitness, muscular strength, muscular endurance, flexibility, mobility, and overall body composition. These activities may include aerobic exercise, resistance training using bodyweight or external resistance, and flexibility or mobility exercises.",
        "The Client acknowledges that all coaching services are provided remotely through online platforms and that the Coach is not physically present during training sessions. The Client understands that the Coach cannot observe all movement patterns, equipment usage, or environmental conditions and therefore cannot guarantee safety during exercise performance.",
        "The Client understands that physical activity carries inherent risks that cannot be eliminated regardless of care taken. These risks may include, but are not limited to, muscle strains, ligament or tendon injuries, joint injuries, dizziness, fainting, abnormal blood pressure responses, cardiovascular events, and other injuries. The Client understands that improper technique, inadequate warm-up, excessive exertion, fatigue, or unsafe equipment may increase the likelihood of injury.",
        "The Client voluntarily elects to participate in the fitness program with full knowledge of the risks involved and confirms that participation is entirely voluntary.",
        "The Client understands that participation in regular exercise may provide benefits such as improved cardiovascular health, increased muscular strength and endurance, improved flexibility, reduced body fat, improved blood pressure and cholesterol levels, and enhanced overall physical well-being. The Client acknowledges that results are not guaranteed and depend on individual effort, adherence, recovery, nutrition, and other personal factors.",
      ],
    },
    {
      id: "waiver",
      number: "IV",
      title: "Assumption of Risk and Liability Waiver",
      paragraphs: [
        "The Client expressly assumes all risks associated with participation in physical activity and fitness coaching, whether known or unknown, foreseeable or unforeseeable. The Client understands that injuries may occur despite proper instruction and adherence to safety guidelines.",
        "The Client hereby fully and forever releases, waives, discharges, and holds harmless Vital Fusion Coaching LLC, including its owners, officers, employees, contractors, and agents, from any and all claims, demands, damages, losses, injuries, or causes of action arising out of or related to participation in fitness coaching services, except in cases of gross negligence or willful misconduct.",
      ],
    },
    {
      id: "training",
      number: "V",
      title: "Personal Training Agreement",
      paragraphs: [
        "The Client understands and agrees that Vital Fusion Coaching LLC provides online fitness programming, coaching guidance, accountability support, and general nutrition education. The Coach does not provide medical advice, physical therapy, diagnosis, treatment of medical conditions, or medical nutrition therapy. The Client acknowledges that coaching services are not a substitute for professional medical care and agrees to consult a qualified healthcare professional when appropriate.",
        "The Client accepts full responsibility for their participation in exercise and agrees to exercise within their personal limits. The Client understands that they are solely responsible for selecting appropriate resistance, intensity, and exercise modifications during training sessions. The Client agrees to maintain a safe training environment and use equipment properly.",
        "The Client agrees to promptly notify the Coach of any pain, discomfort, injury, illness, dizziness, unusual symptoms, or changes in physical condition or medication that may affect safe participation. The Client acknowledges that failure to communicate such information may increase the risk of injury.",
        "The Client understands that Vital Fusion Coaching LLC reserves the right to modify exercise programming at any time based on progress, feedback, safety considerations, or limitations disclosed by the Client. The Client acknowledges that modifications are intended to reduce risk and improve effectiveness.",
        `Coaching package and payment. ${packageParagraph(p)}`,
        "Privacy and data. The Client’s personal information, health data, photos and progress information will be kept confidential and will not be sold. To provide coaching services, Vital Fusion Coaching LLC uses service providers that store or process this information on its behalf, including app hosting and data storage, email delivery, and artificial-intelligence tools that help prepare plans and check-in feedback for the Coach’s review. These providers may use the information only to provide their services to the Coach. Information may also be disclosed when required by law. When coaching ends, the Client may ask the Coach to delete their information, except records the Coach must keep for legal or business purposes, such as this signed Agreement.",
        "The Client acknowledges that Vital Fusion Coaching LLC may terminate coaching services if the Client fails to follow safety instructions, provides false or misleading information, or engages in conduct that places themselves or the Coach at unreasonable risk.",
      ],
    },
    {
      id: "nutrition",
      number: "VI",
      title: "Nutrition Disclaimer",
      paragraphs: [
        "The Client understands that any nutrition-related guidance provided by Vital Fusion Coaching LLC is educational in nature only and is not intended to diagnose, treat, cure, or prevent any disease. The Client acknowledges that the Coach is not a licensed dietitian or medical professional and that all dietary decisions remain the sole responsibility of the Client.",
      ],
    },
    {
      id: "health",
      number: "VII",
      title: "Health Representation",
      paragraphs: [
        "The Client represents that they are in good physical condition and capable of participating in exercise activities, except as disclosed in this Agreement. The Client acknowledges that they have either obtained medical clearance to participate in exercise or have chosen to participate without such clearance at their own risk.",
      ],
    },
    {
      id: "legal",
      number: "VIII",
      title: "Legal Provisions",
      paragraphs: [
        "This Agreement shall be governed by and construed in accordance with the laws of the State of Maryland. Any dispute arising out of or related to this Agreement shall be brought in the state or federal courts located in Maryland.",
        "If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.",
        "This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions, representations, or agreements, whether written or oral.",
      ],
    },
  ];
}

export const SIGNATURE_STATEMENT =
  "By signing below, the Client acknowledges that they have read this Agreement in its entirety, understand its contents, and voluntarily agree to all terms and conditions contained herein. The Client understands that electronic signatures are legally binding and that this document may not be altered after execution.";

export type ParqAnswers = boolean[];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks Section I. Returns field → message for anything missing or wrong. */
export function validateContact(c: Partial<Contact>): Partial<Record<ContactKey, string>> {
  const errors: Partial<Record<ContactKey, string>> = {};
  for (const f of CONTACT_FIELDS) {
    const v = (c[f.key] || "").trim();
    if (!v) errors[f.key] = `Enter your ${f.label.toLowerCase()}.`;
  }
  if (c.email && !EMAIL_RE.test(c.email.trim())) errors.email = "That email doesn't look right.";
  if (c.dob && !/^\d{4}-\d{2}-\d{2}$/.test(c.dob)) errors.dob = "Pick your date of birth.";
  for (const k of ["phone", "emergencyPhone"] as const) {
    if (c[k] && !/^[\d\s()+.-]{7,25}$/.test(c[k]!.trim())) errors[k] = "That phone number doesn't look right.";
  }
  return errors;
}

/** Age in whole years on a given day (both "YYYY-MM-DD"). */
export function ageOn(dob: string, today: string): number {
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  return age;
}

/** Checks Section II. Every question needs a yes or no; any yes needs an explanation. */
export function validateParq(answers: (boolean | null | undefined)[], explanation: string): string | null {
  if (answers.length !== PARQ_QUESTIONS.length || answers.some((a) => a !== true && a !== false))
    return "Answer yes or no to every question.";
  if (answers.some((a) => a) && !explanation.trim()) return "You answered yes to at least one question, so please explain below.";
  return null;
}

/** The signature must match the client's full name (ignoring case and extra spaces). */
export function signatureMatches(typed: string, fullName: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(typed).length > 1 && norm(typed) === norm(fullName);
}
