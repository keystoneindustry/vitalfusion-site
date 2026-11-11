/** The coach's exercise library: names, demo videos (link or uploaded file) and a short cue. */

import { db, q } from "./supabase";
import { videoEmbedUrl } from "./settings";
import { signedUrls } from "./storage";
import { RESOURCE_BUCKET } from "./resources";
import { matchExercise } from "./exercise-match";

export type Exercise = {
  id: string;
  name: string;
  category: string;
  cue: string | null;
  video_url: string | null;
  video_path: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export const EXERCISE_CATEGORIES = ["Legs & glutes", "Chest & shoulders", "Back", "Arms", "Core", "Cardio & conditioning", "Mobility", "Other"];

export async function listExercises(includeArchived = false): Promise<Exercise[]> {
  return db<Exercise[]>(`exercises?select=*${includeArchived ? "" : "&archived=eq.false"}&order=category.asc,name.asc`);
}

export async function getExercise(id: string): Promise<Exercise | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await db<Exercise[]>(`exercises?select=*&id=eq.${q(id)}`))[0] ?? null;
}

export async function insertExercise(row: Pick<Exercise, "name" | "category" | "cue" | "video_url" | "video_path">): Promise<void> {
  await db("exercises", { method: "POST", prefer: "return=minimal", body: row });
}

export async function updateExercise(id: string, patch: Partial<Pick<Exercise, "name" | "category" | "cue" | "video_url" | "video_path" | "archived">>): Promise<void> {
  await db(`exercises?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: { ...patch, updated_at: new Date().toISOString() } });
}

export async function deleteExercise(id: string): Promise<void> {
  await db(`exercises?id=eq.${q(id)}`, { method: "DELETE", prefer: "return=minimal" });
}

export function hasVideo(x: Pick<Exercise, "video_url" | "video_path">): boolean {
  return !!(x.video_path || (x.video_url && videoEmbedUrl(x.video_url)));
}

/** What the client sees under "Watch demo": an embeddable link or a playable file, plus the cue. */
export type Demo = { embed?: string; file?: string; link?: string; cue?: string | null; name: string };

/** Demo videos for every exercise in a program, keyed by the program's exercise name. */
export async function demosFor(names: string[]): Promise<Record<string, Demo>> {
  const library = (await listExercises()).filter((x) => x.video_url || x.video_path);
  if (library.length === 0) return {};
  const picked = new Map<string, Exercise>();
  for (const n of names) {
    const m = matchExercise(n, library);
    if (m) picked.set(n, m);
  }
  const paths = [...new Set([...picked.values()].map((x) => x.video_path).filter((p): p is string => !!p))];
  const urls = paths.length ? await signedUrls(RESOURCE_BUCKET, paths, 6 * 3600).catch(() => ({}) as Record<string, string>) : {};
  const out: Record<string, Demo> = {};
  for (const [n, x] of picked) {
    const embed = x.video_url ? videoEmbedUrl(x.video_url) : null;
    const file = x.video_path ? urls[x.video_path] : undefined;
    if (!embed && !file && !x.video_url) continue;
    out[n] = { name: x.name, cue: x.cue, ...(embed ? { embed } : file ? { file } : { link: x.video_url! }) };
  }
  return out;
}
