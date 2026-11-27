/** Instagram numbers for the Social tab. A scheduled Claude task writes one row a day to `social_snapshots`. */
import { db } from "./supabase";

export type SocialAccount = {
  username?: string;
  days?: number;
  followers?: number;
  reach?: number;
  views?: number;
  profile_views?: number;
  website_clicks?: number;
  accounts_engaged?: number;
  total_interactions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  follows?: number;
  unfollows?: number;
};
export type SocialPost = {
  id: string;
  kind?: string;
  is_reel?: boolean;
  posted_at: string;
  permalink?: string;
  caption?: string;
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  avg_watch_time_ms?: number | null;
};
export type Snapshot = { day: string; platform: string; account: SocialAccount; posts: SocialPost[]; fetched_at: string };

export async function latestSnapshot(): Promise<Snapshot | null> {
  const rows = await db<Snapshot[]>("social_snapshots?select=*&platform=eq.instagram&order=day.desc&limit=1");
  return rows[0] ?? null;
}

/** Follower count per day, oldest first (for the growth chart). */
export async function followerHistory(days = 90): Promise<{ day: string; followers: number }[]> {
  const rows = await db<{ day: string; account: SocialAccount }[]>(`social_snapshots?select=day,account&platform=eq.instagram&order=day.desc&limit=${days}`);
  return rows
    .filter((r) => typeof r.account?.followers === "number")
    .map((r) => ({ day: r.day, followers: r.account.followers! }))
    .reverse();
}
