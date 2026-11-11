"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { setSetting, SETTING_KEYS } from "@/lib/settings";
import { parseDays } from "@/lib/calendar";

export type SettingsState = { saved?: boolean; error?: string };

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function saveSettingsAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireCoach("/coach/settings");
  const values: Record<string, string> = {};
  for (const key of SETTING_KEYS) values[key] = String(form.get(key) || "").trim().slice(0, 500);
  values.default_weighin_days = parseDays(form.getAll("default_weighin_days").map(String)).join(",");
  const every = parseInt(values.default_photo_every_weeks, 10);
  values.default_photo_every_weeks = String(Number.isFinite(every) && every >= 1 && every <= 8 ? every : 1);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.checkin_email)) return { error: "The check-in email address doesn't look right." };

  if (values.welcome_video_url && !isHttpUrl(values.welcome_video_url)) return { error: "The welcome video link isn't a web address." };
  if (!isHttpUrl(values.kickoff_link) || !isHttpUrl(values.checkin_link)) return { error: "Both booking links need to be web addresses." };

  for (const key of SETTING_KEYS) await setSetting(key, values[key]);
  revalidatePath("/coach/settings");
  return { saved: true };
}
