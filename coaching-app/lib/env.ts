/** Environment variables, read lazily so a missing one fails with a clear message. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See coaching-app/.env.example.`);
  return value;
}

export const env = {
  supabaseUrl: () => required("SUPABASE_URL").replace(/\/$/, ""),
  supabasePublishableKey: () => required("SUPABASE_PUBLISHABLE_KEY"),
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY"),
  resendApiKey: () => required("RESEND_API_KEY"),
  fromEmail: () => process.env.FROM_EMAIL || "Vital Fusion Coaching <coaching@vitalfusioncoaching.com>",
  replyTo: () => process.env.REPLY_TO_EMAIL || undefined,
  appUrl: () => (process.env.APP_URL || "").replace(/\/$/, "") || undefined,
  coachEmails: (): string[] =>
    (process.env.COACH_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
};

export function isCoachEmail(email: string): boolean {
  return env.coachEmails().includes(email.trim().toLowerCase());
}
