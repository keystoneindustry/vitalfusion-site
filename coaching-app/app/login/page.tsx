import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Vital Fusion" };

const MESSAGES: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Enter your email and we'll send a fresh one.",
  session: "You were signed out. Enter your email to sign back in.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; next?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (viewer.status === "ok") redirect(viewer.viewer.role === "coach" ? "/coach" : "/");

  const message = params.error ? MESSAGES[params.error] : undefined;
  return (
    <main className="auth">
      <img className="auth-logo" src="/icons/logo.png" alt="Vital Fusion" />
      <p className="eyebrow center">Vital Fusion Coaching</p>
      <h1 className="h1 center">Sign in to your app</h1>
      <p className="lead center">Enter the email you gave your coach.</p>
      {message && <div className="notice notice-warn">{message}</div>}
      <LoginForm defaultEmail={params.email} />
    </main>
  );
}
