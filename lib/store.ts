import type { Application } from "./application";

/** True when Supabase env vars are set; saving is skipped otherwise. */
export function storageEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Saves an application to the `applications` table (see supabase/schema.sql)
 * through Supabase's REST API. Server-only: uses the service role key.
 */
export async function saveApplication(a: Application): Promise<void> {
  if (!storageEnabled()) return;
  const url = `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/applications`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      age_range: a.ageRange,
      fitness_level: a.fitnessLevel,
      help_areas: a.helpAreas,
      goal: a.goal,
      why_now: a.whyNow,
      full_name: a.fullName,
      email: a.email,
      phone: a.phone,
      instagram: a.instagram || null,
      source: a.source,
    }),
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
}
