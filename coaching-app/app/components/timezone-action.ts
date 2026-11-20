"use server";

import { getViewer } from "@/lib/auth";
import { updateClient } from "@/lib/clients";

/** Saves the phone's time zone on the client's record, so reminders and "today" follow where they live. */
export async function saveTimezoneAction(tz: string): Promise<boolean> {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return false;
  }
  const result = await getViewer();
  if (result.status !== "ok" || !result.viewer.client) return false;
  if (result.viewer.client.timezone !== tz) await updateClient(result.viewer.client.id, { timezone: tz });
  return true;
}
