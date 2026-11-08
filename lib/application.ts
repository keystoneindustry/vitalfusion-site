// Single source of truth for the coaching application: the questions, the
// allowed answers, and server-side validation. The form, the API route and the
// email all read from here, so a question only needs editing in one place.

export const AGE_RANGES = ["16-21", "22-25", "26-29", "30+"] as const;

export const FITNESS_LEVELS = [
  {
    value: "beginner",
    label: "I am brand new to working out, but eager to learn.",
  },
  {
    value: "intermediate",
    label:
      "I understand the basics, and I've been working out for some time. I just need some extra guidance along my journey to accomplish my goals.",
  },
  {
    value: "advanced",
    label: "I am experienced in the gym, but want to maximize my potential.",
  },
] as const;

export const HELP_AREAS = [
  { value: "diet", label: "Diet/Nutrition" },
  { value: "training", label: "Training" },
  { value: "accountability", label: "Accountability" },
  { value: "other", label: "Other" },
] as const;

export type AgeRange = (typeof AGE_RANGES)[number];
export type FitnessLevel = (typeof FITNESS_LEVELS)[number]["value"];
export type HelpArea = (typeof HELP_AREAS)[number]["value"];

export interface Application {
  ageRange: AgeRange;
  fitnessLevel: FitnessLevel;
  helpAreas: HelpArea[];
  /** What they typed when "Other" is selected ("" otherwise). */
  otherArea: string;
  goal: string;
  whyNow: string;
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
  source: string;
}

export type FieldErrors = Partial<Record<keyof Application, string>>;

export type ValidationResult =
  | { ok: true; data: Application }
  | { ok: false; errors: FieldErrors };

const LIMITS = { short: 120, long: 2000 };

/** Which fields belong to each step of the multi-step form, in order. */
export const STEPS: (keyof Application)[][] = [
  ["ageRange"],
  ["fitnessLevel"],
  ["helpAreas", "otherArea"],
  ["goal"],
  ["whyNow"],
  ["fullName", "email", "phone", "instagram"],
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function labelFor(
  list: readonly { value: string; label: string }[],
  value: string,
): string {
  return list.find((o) => o.value === value)?.label ?? value;
}

/** Validates untrusted input (from the browser) into a clean Application. */
export function validateApplication(input: unknown): ValidationResult {
  const raw = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const errors: FieldErrors = {};

  const ageRange = str(raw.ageRange);
  if (!(AGE_RANGES as readonly string[]).includes(ageRange))
    errors.ageRange = "Please choose your age range.";

  const fitnessLevel = str(raw.fitnessLevel);
  if (!FITNESS_LEVELS.some((l) => l.value === fitnessLevel))
    errors.fitnessLevel = "Please choose your current fitness level.";

  const helpAreas = Array.isArray(raw.helpAreas)
    ? [...new Set(raw.helpAreas.map(str))].filter((a) =>
        HELP_AREAS.some((h) => h.value === a),
      )
    : [];
  if (helpAreas.length === 0)
    errors.helpAreas = "Please select at least one area.";

  let otherArea = str(raw.otherArea);
  if (helpAreas.includes("other")) {
    if (otherArea.length < 2) errors.otherArea = "Tell us what else you need help with.";
    else if (otherArea.length > 300) errors.otherArea = "Please keep this shorter.";
  } else {
    otherArea = "";
  }

  const goal = str(raw.goal);
  if (goal.length < 3) errors.goal = "Tell us a bit about your goal.";
  else if (goal.length > LIMITS.long) errors.goal = "Please keep this shorter.";

  const whyNow = str(raw.whyNow);
  if (whyNow.length < 3) errors.whyNow = "Tell us what's motivating you now.";
  else if (whyNow.length > LIMITS.long)
    errors.whyNow = "Please keep this shorter.";

  const fullName = str(raw.fullName);
  if (fullName.length < 2 || fullName.length > LIMITS.short)
    errors.fullName = "Please enter your full name.";

  const email = str(raw.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254)
    errors.email = "Please enter a valid email address.";

  const phone = str(raw.phone);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15)
    errors.phone = "Please enter a valid phone number.";

  let instagram = str(raw.instagram).replace(/^@+/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram))
    errors.instagram = "That doesn't look like an Instagram handle.";
  instagram = instagram ? `@${instagram}` : "";

  const source = str(raw.source).slice(0, 60) || "Main Website";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      ageRange: ageRange as AgeRange,
      fitnessLevel: fitnessLevel as FitnessLevel,
      helpAreas: helpAreas as HelpArea[],
      otherArea,
      goal,
      whyNow,
      fullName,
      email,
      phone,
      instagram,
      source,
    },
  };
}

/** Turns a ?source=instagram style tag into a readable label. */
export function sourceLabel(param: string | null | undefined): string {
  const clean = (param ?? "").replace(/[^a-z0-9 _-]/gi, "").trim();
  if (!clean) return "Main Website";
  return clean
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 60);
}
