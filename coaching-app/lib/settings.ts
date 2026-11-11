import { db } from "./supabase";

export const SETTING_KEYS = ["welcome_video_url", "kickoff_link", "checkin_link", "default_weighin_days", "default_photo_every_weeks", "checkin_email"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = {
  welcome_video_url: "",
  kickoff_link: "https://cal.com/tyler-kendrick-rb0c8a/kick-off-call",
  checkin_link: "https://cal.com/tyler-kendrick-rb0c8a/check-in-call",
  default_weighin_days: "1,3,5",
  default_photo_every_weeks: "1",
  checkin_email: "tyler@vitalfusioncoaching.com",
};

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await db<{ key: string; value: string }[]>("app_settings?select=key,value");
  const out = { ...DEFAULTS };
  for (const r of rows) if ((SETTING_KEYS as readonly string[]).includes(r.key)) out[r.key as SettingKey] = r.value ?? "";
  return out;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db(`app_settings?on_conflict=key`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { key, value, updated_at: new Date().toISOString() },
  });
}


/**
 * Turns a YouTube, Vimeo or Loom link into an embeddable player address.
 * Returns null for anything else (the app then shows a plain link).
 */
export function videoEmbedUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&playsinline=1` : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = u.searchParams.get("v") || u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&playsinline=1` : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.match(/^\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "loom.com") {
    const id = u.pathname.match(/^\/(?:share|embed)\/([a-zA-Z0-9]+)/)?.[1];
    return id ? `https://www.loom.com/embed/${id}` : null;
  }
  return null;
}
