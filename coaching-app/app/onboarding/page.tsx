import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { stepPath } from "@/lib/onboarding";

/** Sends the client to the step they're on. */
export default async function OnboardingIndex() {
  const { client } = await requireClient("/onboarding");
  redirect(stepPath(client.onboarding_step));
}
