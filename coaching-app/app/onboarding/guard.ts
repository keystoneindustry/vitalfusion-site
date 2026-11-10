import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { stepIndex, stepPath, type StepId } from "@/lib/onboarding";

/** Loads the client for an onboarding page; a step they haven't reached sends them to their current one. */
export async function onboardingPage(step: StepId, path: string) {
  const viewer = await requireClient(path);
  const current = viewer.client.onboarding_step;
  if (stepIndex(current) < stepIndex(step)) redirect(stepPath(current));
  return { ...viewer, isCurrent: stepIndex(current) === stepIndex(step) };
}
