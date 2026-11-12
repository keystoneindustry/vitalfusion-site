/**
 * Streaks and milestones ("wins"). Pure functions: the caller loads habits, ticks, check-ins and weigh-ins,
 * and these work out streaks and which milestones are reached. Reached milestones are stored in
 * `client_milestones` (lib/wins.ts) so each one is celebrated once and never taken away.
 */

import { addDays } from "./dates";
import { habitDueOn, type HabitAssignment } from "./calendar";

export type HabitStreaks = {
  /** Perfect days in a row (every habit due that day ticked), ending today or yesterday. */
  current: number;
  best: number;
  perfectDays: number;
  totalTicks: number;
  /** True when every habit due today is ticked. */
  todayDone: boolean;
};

/**
 * A "perfect day" has at least one habit due and all of them ticked. Days with nothing due are skipped
 * (they don't break a streak). Today only counts once it's perfect, so an unfinished today never breaks it.
 */
export function habitStreaks(habits: HabitAssignment[], checks: Set<string>, from: string, today: string): HabitStreaks {
  let run = 0;
  let best = 0;
  let perfectDays = 0;
  let todayDone = false;
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const due = habits.filter((h) => habitDueOn(h, d));
    if (due.length === 0) continue;
    const perfect = due.every((h) => checks.has(`${h.id}|${d}`));
    if (d === today) {
      todayDone = perfect;
      if (perfect) {
        run++;
        perfectDays++;
      }
    } else if (perfect) {
      run++;
      perfectDays++;
    } else {
      run = 0;
    }
    best = Math.max(best, run);
  }
  return { current: run, best, perfectDays, totalTicks: checks.size, todayDone };
}

/**
 * Weekly check-ins sent in a row. `dueDates` are every check-in due date so far (ascending). A check-in
 * still inside its 3-day late window doesn't break the streak.
 */
export function checkinStreak(dueDates: string[], sent: Set<string>, today: string): { current: number; total: number } {
  let current = 0;
  for (let i = dueDates.length - 1; i >= 0; i--) {
    const d = dueDates[i];
    if (d > today) continue;
    if (sent.has(d)) current++;
    else if (d >= addDays(today, -3)) continue;
    else break;
  }
  return { current, total: sent.size };
}

/** Change from the first weigh-in to the average of the latest three (smooths day-to-day swings). */
export function weightChange(weighIns: { date: string; weight: number }[]): number | null {
  const sorted = [...weighIns].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sorted.length < 2) return null;
  const recent = sorted.slice(-Math.min(3, sorted.length - 1));
  const avg = recent.reduce((s, w) => s + w.weight, 0) / recent.length;
  return Math.round((avg - sorted[0].weight) * 10) / 10;
}

export type WinsInput = {
  streaks: HabitStreaks;
  checkins: { current: number; total: number };
  weighInCount: number;
  /** Negative = lost weight. */
  weightChange: number | null;
  /** From the onboarding goal. */
  direction: "lose" | "gain" | null;
  hasPhotos: boolean;
  /** Coaching week number (1-based) and package length, when the package is running or done. */
  week: number | null;
  totalWeeks: number | null;
  finished: boolean;
};

export type Milestone = {
  key: string;
  emoji: string;
  title: string;
  /** Shown under the title on the Wins page. */
  detail: string;
  reached: boolean;
  /** Progress toward it, for the "next up" list. */
  progress?: { value: number; target: number; unit: string };
};

/** Each family is a ladder: its milestones in order, so the first unreached one is "next up". */
export function milestoneFamilies(x: WinsInput): Milestone[][] {
  const families: Milestone[][] = [];

  families.push(
    [3, 7, 14, 30, 60, 100].map((n) => ({
      key: `streak_${n}`,
      emoji: n >= 30 ? "🔥" : "⚡",
      title: `${n}-day habit streak`,
      detail: `Every habit done ${n} days in a row`,
      reached: x.streaks.best >= n,
      progress: { value: Math.min(x.streaks.current, n), target: n, unit: "days" },
    })),
  );

  families.push(
    [1, 25, 50, 100, 200].map((n) => ({
      key: n === 1 ? "perfect_day_1" : `perfect_days_${n}`,
      emoji: n === 1 ? "✅" : "🌟",
      title: n === 1 ? "First perfect day" : `${n} perfect days`,
      detail: n === 1 ? "Every habit done in one day" : `${n} days with every habit done`,
      reached: x.streaks.perfectDays >= n,
      progress: { value: Math.min(x.streaks.perfectDays, n), target: n, unit: "days" },
    })),
  );

  families.push(
    [1, 4, 8, 12, 24].map((n) => ({
      key: `checkins_${n}`,
      emoji: n === 1 ? "📝" : "📈",
      title: n === 1 ? "First check-in sent" : `${n} check-ins sent`,
      detail: n === 1 ? "Your first weekly check-in" : `${n} weekly check-ins`,
      reached: x.checkins.total >= n,
      progress: { value: Math.min(x.checkins.total, n), target: n, unit: "check-ins" },
    })),
  );

  families.push(
    [4, 8, 12].map((n) => ({
      key: `checkin_streak_${n}`,
      emoji: "🗓️",
      title: `${n} check-ins in a row`,
      detail: `${n} weeks without missing a check-in`,
      reached: x.checkins.current >= n,
      progress: { value: Math.min(x.checkins.current, n), target: n, unit: "weeks" },
    })),
  );

  families.push(
    [10, 25, 50].map((n) => ({
      key: `weighins_${n}`,
      emoji: "⚖️",
      title: `${n} weigh-ins`,
      detail: `${n} weigh-ins logged`,
      reached: x.weighInCount >= n,
      progress: { value: Math.min(x.weighInCount, n), target: n, unit: "weigh-ins" },
    })),
  );

  families.push([
    { key: "photos_1", emoji: "📸", title: "First progress photos", detail: "Your starting point, saved", reached: x.hasPhotos },
  ]);

  if (x.direction === "lose") {
    const lost = x.weightChange !== null ? -x.weightChange : 0;
    families.push(
      [5, 10, 15, 20, 25, 30, 40, 50].map((n) => ({
        key: `lost_${n}`,
        emoji: "📉",
        title: `Down ${n} lb`,
        detail: `${n} pounds down from your starting weight`,
        reached: lost >= n,
        progress: { value: Math.max(0, Math.min(Math.round(lost * 10) / 10, n)), target: n, unit: "lb" },
      })),
    );
  } else if (x.direction === "gain") {
    const gained = x.weightChange ?? 0;
    families.push(
      [2, 5, 10, 15].map((n) => ({
        key: `gained_${n}`,
        emoji: "💪",
        title: `Up ${n} lb`,
        detail: `${n} pounds up from your starting weight`,
        reached: gained >= n,
        progress: { value: Math.max(0, Math.min(Math.round(gained * 10) / 10, n)), target: n, unit: "lb" },
      })),
    );
  }

  if (x.totalWeeks) {
    const half = Math.ceil(x.totalWeeks / 2);
    const done = x.finished ? x.totalWeeks + 1 : (x.week ?? 0);
    const ladder: Milestone[] = [];
    if (x.totalWeeks > 6)
      ladder.push({ key: "month_1", emoji: "🗓️", title: "1 month of coaching", detail: "Four weeks in", reached: done >= 5, progress: { value: Math.min(Math.max(done - 1, 0), 4), target: 4, unit: "weeks" } });
    ladder.push({ key: "halfway", emoji: "⛰️", title: "Halfway there", detail: `Week ${half + 1} of ${x.totalWeeks}`, reached: done > half, progress: { value: Math.min(Math.max(done - 1, 0), half), target: half, unit: "weeks" } });
    ladder.push({ key: "program_done", emoji: "🏁", title: "Program complete", detail: `All ${x.totalWeeks} weeks done`, reached: x.finished, progress: { value: Math.min(Math.max(done - 1, 0), x.totalWeeks), target: x.totalWeeks, unit: "weeks" } });
    families.push(ladder);
  }

  return families;
}

export function goalDirection(goalAnswer: string): "lose" | "gain" | null {
  const g = goalAnswer.toLowerCase();
  if (g.includes("lose")) return "lose";
  if (g.includes("build") || g.includes("muscle") || g.includes("gain")) return "gain";
  return null;
}
