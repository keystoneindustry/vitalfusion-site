/** Cal.com booking links and times. */

/** Booking page with the client's name and email filled in, tagged with their id for the webhook. */
export function bookingUrl(base: string, who: { name: string; email: string; clientId: string }): string {
  let u: URL;
  try {
    u = new URL(base);
  } catch {
    return base;
  }
  u.searchParams.set("name", who.name);
  u.searchParams.set("email", who.email);
  u.searchParams.set("metadata[clientId]", who.clientId);
  return u.toString();
}

/** "Mon, Dec 7 at 2:30 PM EST" in the client's time zone. */
export function formatCallTime(iso: string, timeZone = "America/New_York"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })
      .format(d)
      .replace(/, (\d{1,2}:\d{2})/, " at $1");
  } catch {
    return d.toISOString();
  }
}

/** Which of Tyler's events a Cal.com booking is for, from its event slug or title. */
export function callKind(slugOrTitle: string): "kickoff" | "checkin" | "other" {
  const s = slugOrTitle.toLowerCase();
  if (s.includes("kick")) return "kickoff";
  if (s.includes("check")) return "checkin";
  return "other";
}

/**
 * "2026-11-24T14:30" typed as a clock time in `timeZone` → the real moment (ISO, UTC).
 * Null if it isn't a valid date and time.
 */
export function zonedTimeToIso(local: string, timeZone = "America/New_York"): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(asUtc) || new Date(asUtc).getUTCDate() !== d) return null;
  const offsetAt = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(t))
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - t;
  };
  let t = asUtc - offsetAt(asUtc);
  t = asUtc - offsetAt(t);
  return new Date(t).toISOString();
}

/** The reverse, for a datetime-local box: an ISO moment as "YYYY-MM-DDTHH:mm" in `timeZone`. */
export function isoToZonedInput(iso: string, timeZone = "America/New_York"): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`;
}
