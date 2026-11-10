import { onboardingPage } from "../guard";
import StepHeader from "../StepHeader";
import InstallSteps from "@/app/(client)/install/InstallSteps";
import { finishStep } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";

export const metadata = { title: "Add to home screen · Vital Fusion" };

export default async function InstallStepPage() {
  const { isCurrent } = await onboardingPage("install", "/onboarding/install");
  return (
    <>
      <StepHeader
        step="install"
        title="Add the app to your home screen"
        lead="It opens full-screen like any other app, and it's where your reminders will come from."
      />
      <InstallSteps />
      <div className="notice notice-warn">
        <b>After you add it:</b> open Vital Fusion from your home screen and sign in with your email. You'll get a 6-digit
        code to type in, and then you'll pick up right here.
      </div>
      {isCurrent && (
        <>
          <form action={finishStep}>
            <input type="hidden" name="step" value="install" />
            <SubmitButton label="I've added it, next →" pendingLabel="One moment…" />
          </form>
          <form action={finishStep} style={{ marginTop: 10 }}>
            <input type="hidden" name="step" value="install" />
            <SubmitButton className="btn btn-ghost btn-wide" label="I'll do it later" pendingLabel="One moment…" />
          </form>
        </>
      )}
    </>
  );
}
