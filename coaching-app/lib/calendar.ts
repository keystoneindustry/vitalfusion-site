/**
 * What's due on which day: habits (on chosen weekdays) and weigh-in / progress-photo schedules
 * (weekly on chosen weekdays, every N weeks, or one-off dates). Pure functions on "YYYY-MM-DD" dates.
 */

import { addDays, daysBetween } from "./dates";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type HabitAssignment = {
  id: string;
  habit_id: string;
  title: string | null;
  days: number[];
  start_date: string;
  end_date: string | null;
  active: boolean;
};

export type Schedule = {
  id: string;
  kind: "weigh_in" | "photos";
  days: number[];
  every_weeks: number;
  start_date: string;
  end_date: string | null;
  one_date: string | null;
  active: boolean;
};

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** The Sunday that starts the week of `date`. */
export function weekStart(date: string): string {
  return addDays(date, -weekday(date));
}

export function weekDates(date: string): string[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function inRange(date: string, start: string, end: string | null): boolean {
  return date >= start && (!end || date <= end);
}

export function habitDueOn(h: HabitAssignment, date: string): boolean {
  return h.active && inRange(date, h.start_date, h.end_date) && h.days.includes(weekday(date));
}

export function scheduleDueOn(s: Schedule, date: string): boolean {
  if (!s.active) return false;
  if (s.one_date) return s.one_date === date;
  if (!inRange(date, s.start_date, s.end_date) || !s.days.includes(weekday(date))) return false;
  const weeks = Math.floor(daysBetween(weekStart(s.start_date), weekStart(date)) / 7);
  return weeks % Math.max(1, s.every_weeks) === 0;
}

export function dueKinds(schedules: Schedule[], date: string): Set<"weigh_in" | "photos"> {
  return new Set(schedules.filter((s) => scheduleDueOn(s, date)).map((s) => s.kind));
}

/** "Mon, Wed, Fri" / "Every day" / "Weekdays". */
export function daysLabel(days: number[]): string {
  const d = [...new Set(days)].sort();
  if (d.length === 7) return "Every day";
  if (d.join(",") === "1,2,3,4,5") return "Weekdays";
  if (d.join(",") === "0,6") return "Weekends";
  if (d.length === 0) return "No days";
  return d.map((x) => WEEKDAYS[x]).join(", ");
}

export function scheduleLabel(s: Schedule): string {
  if (s.one_date) return `Once, on ${s.one_date}`;
  const every = s.every_weeks === 1 ? "every week" : `every ${s.every_weeks} weeks`;
  return `${daysLabel(s.days)}, ${every}`;
}

/** Parses "1,3,5" or form values into weekday numbers. */
export function parseDays(values: (string | null | undefined)[] | string): number[] {
  const list = Array.isArray(values) ? values : values.split(",");
  return [...new Set(list.map((v) => parseInt(String(v ?? ""), 10)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
}

/** Weekday number for an onboarding answer like "Sunday". */
export function weekdayFromName(name: string): number | null {
  const i = WEEKDAYS_LONG.findIndex((d) => d.toLowerCase() === name.trim().toLowerCase());
  return i >= 0 ? i : null;
}

/** Step goal for a new client, from their onboarding answer about daily steps. */
export function stepGoalFor(stepsAnswer: string): number {
  switch (stepsAnswer) {
    case "Under 4,000":
      return 6000;
    case "4,000–7,000":
      return 8000;
    case "7,000–10,000":
      return 10000;
    case "10,000+":
      return 12000;
    default:
      return 8000;
  }
}

/** Share of due habit-days that were ticked, over the given dates. */
export function adherence(habits: HabitAssignment[], checks: Set<string>, dates: string[]): { done: number; due: number } {
  let done = 0;
  let due = 0;
  for (const date of dates) {
    for (const h of habits) {
      if (!habitDueOn(h, date)) continue;
      due++;
      if (checks.has(`${h.id}|${date}`)) done++;
    }
  }
  return { done, due };
}
