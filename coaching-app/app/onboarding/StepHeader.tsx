import { ONBOARDING_STEPS, stepIndex } from "@/lib/onboarding";

/** "Step 3 of 6" with a progress bar. */
export default function StepHeader({ step, title, lead }: { step: string; title: string; lead?: string }) {
  const i = stepIndex(step);
  const total = ONBOARDING_STEPS.length;
  return (
    <>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${((i + 1) / total) * 100}%` }} />
      </div>
      <p className="eyebrow">
        Step {i + 1} of {total}
      </p>
      <h1 className="h1">{title}</h1>
      {lead && <p className="lead">{lead}</p>}
    </>
  );
}
