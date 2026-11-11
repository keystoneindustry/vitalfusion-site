import { createHmac, timingSafeEqual } from "node:crypto";
import { addEvent, getClient, getClientByEmail, updateClient, type ClientRow } from "@/lib/clients";
import { completeStep } from "@/lib/onboarding-data";
import { callKind, formatCallTime } from "@/lib/booking";
import { env } from "@/lib/env";
import { kickoffBookedCoachEmail, sendEmail } from "@/lib/email";

/**
 * Cal.com calls this when a call is booked, rescheduled or cancelled
 * (Cal.com → Settings → Developer → Webhooks, with the same secret as CAL_WEBHOOK_SECRET).
 */

type CalPayload = {
  triggerEvent?: string;
  payload?: {
    uid?: string;
    type?: string;
    title?: string;
    eventTitle?: string;
    startTime?: string;
    attendees?: { email?: string; name?: string }[];
    metadata?: Record<string, unknown>;
    rescheduleUid?: string;
  };
};

function validSignature(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

async function findClient(p: NonNullable<CalPayload["payload"]>): Promise<ClientRow | null> {
  const id = typeof p.metadata?.clientId === "string" ? p.metadata.clientId : null;
  if (id) {
    const c = await getClient(id);
    if (c) return c;
  }
  for (const a of p.attendees ?? []) {
    if (a.email) {
      const c = await getClientByEmail(a.email);
      if (c) return c;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not set up", { status: 503 });

  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-cal-signature-256"), secret)) {
    return new Response("Bad signature", { status: 401 });
  }

  let body: CalPayload;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const trigger = body.triggerEvent ?? "";
  const p = body.payload;
  if (!p || trigger === "PING") return Response.json({ ok: true });

  const client = await findClient(p);
  if (!client) return Response.json({ ok: true, matched: false });

  const kind = callKind(`${p.type ?? ""} ${p.eventTitle ?? ""} ${p.title ?? ""}`);
  const when = p.startTime ? formatCallTime(p.startTime, client.timezone) : undefined;

  if (trigger === "BOOKING_CREATED" || trigger === "BOOKING_RESCHEDULED") {
    if (kind === "kickoff") {
      const extra = { kickoff_at: p.startTime ?? null, kickoff_booking_uid: p.uid ?? null };
      if (client.onboarding_step === "kickoff") await completeStep(client, "kickoff", extra);
      else await updateClient(client.id, extra);
      await addEvent(client.id, "kickoff_booked", { when, rescheduled: trigger === "BOOKING_RESCHEDULED" });
      const to = env.coachEmails()[0];
      if (to && when) {
        const origin = new URL(request.url).origin;
        await sendEmail({
          to,
          replyTo: client.email,
          ...kickoffBookedCoachEmail({ clientName: client.full_name, when, link: `${origin}/coach/clients/${client.id}` }),
        }).catch((err) => console.error("Kickoff email failed", err));
      }
    } else if (kind === "checkin") {
      await updateClient(client.id, { next_call_at: p.startTime ?? null, next_call_uid: p.uid ?? null });
      await addEvent(client.id, "checkin_call_booked", { when });
    }
  } else if (trigger === "BOOKING_CANCELLED") {
    if (kind === "kickoff" && (!client.kickoff_booking_uid || client.kickoff_booking_uid === p.uid)) {
      await updateClient(client.id, {
        kickoff_at: null,
        kickoff_booking_uid: null,
        // Send them back to the booking step if onboarding had finished because of this call.
        ...(client.onboarding_step === "done" && client.stage === "onboarding"
          ? { onboarding_step: "kickoff", onboarding_completed_at: null }
          : {}),
      });
      await addEvent(client.id, "kickoff_cancelled");
    } else if (kind === "checkin") {
      if (!client.next_call_uid || client.next_call_uid === p.uid) await updateClient(client.id, { next_call_at: null, next_call_uid: null });
      await addEvent(client.id, "checkin_call_cancelled", { when });
    }
  }
  return Response.json({ ok: true, matched: true });
}
