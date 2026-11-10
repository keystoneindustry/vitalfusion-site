import { requireClient } from "@/lib/auth";
import InstallSteps from "./InstallSteps";

export const metadata = { title: "Add to home screen · Vital Fusion" };

export default async function InstallPage() {
  await requireClient("/install");
  return (
    <>
      <p className="eyebrow">Set up</p>
      <h1 className="h1">Add the app to your home screen</h1>
      <p className="lead">Then it opens full-screen with its own icon, like any other app, and reminders can reach you.</p>
      <InstallSteps />
    </>
  );
}
