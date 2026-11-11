/** The onboarding steps, in order. Stored on the client row as `onboarding_step`. */
export const ONBOARDING_STEPS = [
  { id: "welcome", label: "Welcome from Tyler", path: "/onboarding/welcome" },
  { id: "install", label: "Add the app to your home screen", path: "/onboarding/install" },
  { id: "agreement", label: "Coaching agreement & health questions", path: "/onboarding/agreement" },
  { id: "questions", label: "Your onboarding questions", path: "/onboarding/questions" },
  { id: "how_it_works", label: "How your coaching works", path: "/onboarding/how-it-works" },
  { id: "kickoff", label: "Book your kickoff call", path: "/onboarding/kickoff" },
] as const;

export type StepId = (typeof ONBOARDING_STEPS)[number]["id"] | "done";

export function isStepId(v: string): v is StepId {
  return v === "done" || ONBOARDING_STEPS.some((s) => s.id === v);
}

/** Position of a step (done = after the last step). Unknown values count as the first step. */
export function stepIndex(step: string): number {
  if (step === "done") return ONBOARDING_STEPS.length;
  const i = ONBOARDING_STEPS.findIndex((s) => s.id === step);
  return i < 0 ? 0 : i;
}

export function nextStep(step: string): StepId {
  const i = stepIndex(step);
  return i + 1 >= ONBOARDING_STEPS.length ? "done" : ONBOARDING_STEPS[i + 1].id;
}

/** Where the client should be sent to continue onboarding. */
export function stepPath(step: string): string {
  if (step === "done") return "/";
  return ONBOARDING_STEPS[stepIndex(step)].path;
}

/** Status of each step for a checklist. */
export function checklist(current: string): { id: string; label: string; path: string; state: "done" | "current" | "locked" }[] {
  const at = stepIndex(current);
  return ONBOARDING_STEPS.map((s, i) => ({
    id: s.id,
    label: s.label,
    path: s.path,
    state: i < at ? "done" : i === at ? "current" : "locked",
  }));
}
