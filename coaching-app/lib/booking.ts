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
