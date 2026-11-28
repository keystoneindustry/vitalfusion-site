/**
 * Upcoming calls from Cal.com for the coach Home and Business pages. Read-only, straight from Cal.com's API with an API
 * key (env CAL_API_KEY). Without the key the pages just link to Cal.com's own bookings page.
 */
export const CAL_BOOKINGS_URL = "https://app.cal.com/bookings/upcoming";

export type Call = { uid: string; title: string; start: string; end: string | null; who: string; email: string | null; link: string | null };
export type CallsResult = { connected: boolean; calls: Call[]; error: string | null };

export function calConfigured(): boolean {
  return Boolean(process.env.CAL_API_KEY);
}

type ApiBooking = {
  uid?: string;
  id?: number;
  title?: string;
  status?: string;
  start?: string;
  startTime?: string;
  end?: string;
  endTime?: string;
  meetingUrl?: string;
  location?: string;
  eventType?: { slug?: string; title?: string } | null;
  attendees?: { name?: string; email?: string }[];
};

function isUrl(v: unknown): v is string {
  return typeof v === "string" && /^https:\/\//i.test(v);
}

/** Pure: turns Cal.com bookings into the calls we show (not cancelled, starting from now, soonest first). */
export function toCalls(bookings: ApiBooking[], now: Date): Call[] {
  return bookings
    .flatMap((b): Call[] => {
      const start = b.start ?? b.startTime;
      if (!start || Number.isNaN(Date.parse(start))) return [];
      const status = (b.status ?? "").toLowerCase();
      if (status === "cancelled" || status === "rejected") return [];
      const end = b.end ?? b.endTime ?? null;
      if (Date.parse(end ?? start) < now.getTime()) return [];
      const guest = (b.attendees ?? [])[0];
      const who = guest?.name?.trim() || guest?.email || "Someone";
      // Cal.com titles look like "Check In Call between Tyler Kendrick and John Doe": keep the call type.
      const title = (b.eventType?.title || b.title || "Call").split(/\s+between\s+/i)[0].trim() || "Call";
      return [{ uid: String(b.uid ?? b.id ?? start), title, start: new Date(start).toISOString(), end, who, email: guest?.email ?? null, link: isUrl(b.meetingUrl) ? b.meetingUrl : isUrl(b.location) ? b.location : null }];
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Upcoming calls (up to 50). Never throws: a failed read comes back as `error` so the page can still show the link. */
export async function loadUpcomingCalls(now: Date = new Date()): Promise<CallsResult> {
  const key = process.env.CAL_API_KEY;
  if (!key) return { connected: false, calls: [], error: null };
  try {
    const res = await fetch("https://api.cal.com/v2/bookings?status=upcoming&take=50&sortStart=asc", {
      headers: { Authorization: `Bearer ${key}`, "cal-api-version": "2024-08-13" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Cal.com answered ${res.status}`);
    const body = (await res.json()) as { data?: ApiBooking[] | { bookings?: ApiBooking[] } };
    const list = Array.isArray(body.data) ? body.data : (body.data?.bookings ?? []);
    return { connected: true, calls: toCalls(list, now), error: null };
  } catch (err) {
    console.error("Cal.com read failed", err);
    return { connected: true, calls: [], error: err instanceof Error ? err.message.slice(0, 120) : "Couldn't read Cal.com" };
  }
}

/** Groups calls by Eastern calendar day for the schedule list. */
export function byDay(calls: Call[], timeZone = "America/New_York"): { day: string; label: string; calls: (Call & { time: string })[] }[] {
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "short", day: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  const out: { day: string; label: string; calls: (Call & { time: string })[] }[] = [];
  for (const c of calls) {
    const d = new Date(c.start);
    const key = dayKey.format(d);
    const group = out.find((g) => g.day === key) ?? out[out.push({ day: key, label: label.format(d), calls: [] }) - 1];
    group.calls.push({ ...c, time: time.format(d) });
  }
  return out;
}
