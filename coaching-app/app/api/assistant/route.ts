import { getViewer } from "@/lib/auth";
import { AiError } from "@/lib/ai";
import { askAssistant, cleanHistory, refundQuestion, countQuestion, type AssistantProfile } from "@/lib/assistant";
import { todayIn } from "@/lib/dates";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import { getResponse } from "@/lib/onboarding-data";
import type { ClientRow } from "@/lib/clients";
import { otherKey } from "@/lib/onboarding-questions";

/** AI Nutrition Assistant: one question in, one answer out. Chats aren't saved; questions are counted per day. */

export const maxDuration = 60;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function answer(v: unknown): string {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && x !== "None" && x !== "Other").join(", ");
  return typeof v === "string" ? v.trim() : "";
}

async function profileFor(client: ClientRow): Promise<AssistantProfile> {
  const [plan, response] = await Promise.all([getPublishedPlan(client.id), getResponse(client.id)]);
  const a = (response?.answers ?? {}) as Record<string, unknown>;
  const withOther = (id: string) => [answer(a[id]), answer(a[otherKey(id)])].filter((x) => x && x !== "Other").join(", ");
  const t = plan && hasContent(plan) && plan.content.meals.length ? plan.targets : null;
  return {
    firstName: client.full_name.split(" ")[0] ?? "",
    goal: withOther("goal"),
    targets: t ? { calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat, fiber: t.fiber } : null,
    allergies: withOther("allergies"),
    dietStyle: withOther("dietStyle").replace(/^No$/, ""),
    foodsAvoid: answer(a.foodsAvoid),
    foodsLove: answer(a.foodsLove),
  };
}

export async function POST(request: Request): Promise<Response> {
  const result = await getViewer();
  if (result.status !== "ok") return json({ error: "Your session ended. Sign in again." }, 401);
  const client = result.viewer.client;
  if (result.viewer.role !== "client" || !client) return json({ error: "Only clients can use the assistant." }, 403);

  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "That didn't come through. Try again." }, 400);
  }
  const history = cleanHistory(body.messages);
  if (!history.length) return json({ error: "Type a question first." }, 400);

  const day = todayIn(client.timezone);
  const left = await countQuestion(client.id, day);
  if (left < 0) return json({ error: "You've used all 20 questions for today. They reset tomorrow.", left: 0 }, 429);

  try {
    const reply = await askAssistant(await profileFor(client), history, day);
    return json({ ...reply, left });
  } catch (err) {
    await refundQuestion(client.id, day);
    const msg = err instanceof AiError ? err.message : "Something went wrong. Try again.";
    if (!(err instanceof AiError)) console.error("Assistant failed", err);
    return json({ error: msg, left: left + 1 }, 502);
  }
}
