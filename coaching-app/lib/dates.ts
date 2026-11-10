/**
 * Coaching-package date math. Dates are plain "YYYY-MM-DD" strings handled as UTC,
 * so a date never shifts by a day because of time zones.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** A 12-week package starting Dec 1 ends Feb 22: start + weeks × 7 − 1 day. */
export function endDateFromWeeks(start: string, weeks: number): string {
  return addDays(start, weeks * 7 - 1);
}

/** Today's date in a time zone, e.g. "America/New_York". */
export function todayIn(timeZone = "America/New_York", now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** "Dec 1, 2026" (or "Dec 1" when withYear is false). */
export function formatDate(iso: string | null | undefined, withYear = true): string {
  if (!iso || !isIsoDate(iso)) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return withYear ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${d}`;
}

export type PackageStatus =
  | { kind: "no_dates" }
  | { kind: "not_started"; daysUntilStart: number; totalWeeks: number }
  | { kind: "in_progress"; week: number; totalWeeks: number; daysLeft: number }
  | { kind: "ended"; daysSinceEnd: number; totalWeeks: number };

/** Where a client is in their package on a given day. */
export function packageStatus(start: string | null, end: string | null, today: string): PackageStatus {
  if (!start || !end || !isIsoDate(start) || !isIsoDate(end)) return { kind: "no_dates" };
  const totalWeeks = Math.max(1, Math.ceil((daysBetween(start, end) + 1) / 7));
  if (today < start) return { kind: "not_started", daysUntilStart: daysBetween(today, start), totalWeeks };
  if (today > end) return { kind: "ended", daysSinceEnd: daysBetween(end, today), totalWeeks };
  const week = Math.min(totalWeeks, Math.floor(daysBetween(start, today) / 7) + 1);
  return { kind: "in_progress", week, totalWeeks, daysLeft: daysBetween(today, end) };
}

/** Short label for lists: "Week 3 of 12", "Starts in 5 days", "Ended Feb 22". */
export function packageLabel(start: string | null, end: string | null, today: string): string {
  const s = packageStatus(start, end, today);
  switch (s.kind) {
    case "no_dates":
      return "No dates set";
    case "not_started":
      return s.daysUntilStart === 1 ? "Starts tomorrow" : `Starts in ${s.daysUntilStart} days`;
    case "in_progress":
      return `Week ${s.week} of ${s.totalWeeks}`;
    case "ended":
      return `Ended ${formatDate(end, false)}`;
  }
}

/** True when the package ends within `days` days (and hasn't ended yet). */
export function renewalDue(end: string | null, today: string, days = 14): boolean {
  if (!end || !isIsoDate(end)) return false;
  const left = daysBetween(today, end);
  return left >= 0 && left <= days;
}

/** "2 hours ago", "3 days ago", "just now". */
export function timeAgo(timestamp: string | null | undefined, now: Date = new Date()): string {
  if (!timestamp) return "never";
  const diff = Math.max(0, now.getTime() - Date.parse(timestamp));
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
