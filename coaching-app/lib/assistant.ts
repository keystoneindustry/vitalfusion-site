/**
 * AI Nutrition Assistant (☰ More → AI Nutrition Assistant). Clients ask food questions
 * ("healthiest meals at Chick-fil-A that fit my macros") and get answers sized to their own targets.
 * Claude API over REST with the server-side web search tool, so restaurant numbers come from current
 * menus. Chats are NOT stored on the server (only kept on the client's phone); the server only counts
 * questions per day (`assistant_usage`, DAILY_LIMIT).
 */

import { AiError, aiModel } from "./ai";
import { db } from "./supabase";

export const DAILY_LIMIT = 20;
export const MAX_QUESTION_CHARS = 1000;
/** How many earlier messages go along with a question (keeps cost and speed down). */
export const HISTORY_MESSAGES = 10;

export type ChatMessage = { role: "user" | "assistant"; text: string };
export type Source = { title: string; url: string };

export type AssistantProfile = {
  firstName: string;
  goal: string;
  targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number } | null;
  allergies: string;
  dietStyle: string;
  foodsAvoid: string;
  foodsLove: string;
};

/** Cleans what the browser sent: right roles, trimmed, alternating, ending with the new question. */
export function cleanHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const text = (m as { text?: unknown }).text;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string" || !text.trim()) continue;
    const limit = role === "user" ? MAX_QUESTION_CHARS : 4000;
    const item = { role, text: text.trim().slice(0, limit) } as ChatMessage;
    // Two in a row from the same side: keep the later one.
    if (out.length && out[out.length - 1].role === role) out[out.length - 1] = item;
    else out.push(item);
  }
  const recent = out.slice(-HISTORY_MESSAGES);
  while (recent.length && recent[0].role !== "user") recent.shift();
  // The last message must be the new question.
  if (!recent.length || recent[recent.length - 1].role !== "user") return [];
  return recent;
}

export function systemPrompt(p: AssistantProfile, today: string): string {
  const t = p.targets;
  const lines = [
    "You are the AI Nutrition Assistant inside Vital Fusion Coaching, an online fitness coaching app run by coach Tyler.",
    "You help Tyler's clients make good food choices day to day: eating out (fast food, restaurants, coffee shops), grocery picks, snacks, swaps, and fitting meals into their daily targets.",
    "",
    "About this client:",
    `- Name: ${p.firstName || "the client"}`,
    `- Goal: ${p.goal || "not given"}`,
    t
      ? `- Daily targets: ${t.calories} kcal, ${t.protein} g protein, ${t.carbs} g carbs, ${t.fat} g fat, ${t.fiber} g fiber`
      : "- Daily targets: not set yet (their coach hasn't published their plan). Give sensible general guidance and say their exact numbers come with their plan.",
    `- Allergies / intolerances: ${p.allergies || "none given"}`,
    `- Way of eating: ${p.dietStyle || "no restrictions given"}`,
    `- Foods they won't eat: ${p.foodsAvoid || "none given"}`,
    `- Foods they love: ${p.foodsLove || "not given"}`,
    `- Today is ${today}.`,
    "",
    "How to answer:",
    "- When they ask about a restaurant or a packaged product, search the web for its current official nutrition information and use those numbers. Prefer the company's own nutrition page. If you can't confirm a number, say it's an estimate.",
    "- Give specific orders: exact item names, sizes, and simple tweaks (no sauce or sauce on the side, grilled not fried, swap the side, skip the bun). Show calories and protein / carbs / fat for each pick, and a total when you suggest a full meal.",
    "- Size answers to their targets. A single meal is usually about a quarter to a third of the day. Favor high-protein options. Point out the easy traps (sauces, dressings, drinks, fries, shakes).",
    "- Never suggest anything that conflicts with their allergies or way of eating.",
    "- Keep it short and easy to read on a phone: a one-line answer first, then a short list. Use '- ' bullets and **bold** for item names. No tables, no headings, no long intros.",
    "- Be encouraging and practical, never preachy. Eating out is normal and fits in a plan.",
    "- Stay on food, nutrition, and eating habits. For training questions, injuries, medical conditions, medications, supplements beyond the basics, or big changes to their plan, tell them to ask Tyler in their check-in. Don't change their targets yourself.",
    "- If they mention signs of disordered eating (extreme restriction, purging, bingeing, fear of eating), don't give numbers; respond with care and encourage them to talk to Tyler and a healthcare professional.",
  ];
  return lines.join("\n");
}

type Block = { type: string; text?: string; citations?: { url?: string; title?: string }[] };

/** The answer text and up to 4 distinct source links from a Messages API reply. */
export function readAnswer(content: Block[]): { text: string; sources: Source[] } {
  const text = content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const sources: Source[] = [];
  for (const b of content) {
    for (const c of b.citations ?? []) {
      if (!c.url || sources.some((s) => s.url === c.url)) continue;
      sources.push({ url: c.url, title: (c.title || new URL(c.url).hostname).slice(0, 90) });
    }
  }
  return { text, sources: sources.slice(0, 4) };
}

async function post(body: Record<string, unknown>, key: string): Promise<{ status: number; text: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(50_000),
    });
    return { status: res.status, text: await res.text() };
  } catch (err) {
    throw new AiError(err instanceof Error && err.name === "TimeoutError" ? "That took too long. Try asking again." : "Couldn't reach the assistant. Check your connection.");
  }
}

/** Asks Claude. Uses web search when the account allows it; falls back to answering without it. */
export async function askAssistant(profile: AssistantProfile, history: ChatMessage[], today: string): Promise<{ text: string; sources: Source[] }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("The assistant isn't set up yet.");
  let messages: { role: string; content: unknown }[] = history.map((m) => ({ role: m.role, content: m.text }));
  let tools: unknown[] | undefined = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];
  const collected: Block[] = [];

  for (let round = 0; round < 3; round++) {
    const body: Record<string, unknown> = { model: aiModel(), max_tokens: 2000, system: systemPrompt(profile, today), messages };
    if (tools) body.tools = tools;
    let res = await post(body, key);
    if (res.status === 400 && tools && /web_search|tool/i.test(res.text)) {
      // Web search not enabled for this API account: answer from what the model knows.
      tools = undefined;
      delete body.tools;
      res = await post(body, key);
    }
    if (res.status === 429 || res.status === 529 || res.status >= 500) throw new AiError("The assistant is busy right now. Try again in a minute.");
    if (res.status < 200 || res.status >= 300) {
      console.error("Assistant API error", res.status, res.text.slice(0, 300));
      throw new AiError("The assistant couldn't answer that. Try again.");
    }
    const data = JSON.parse(res.text) as { content?: Block[]; stop_reason?: string };
    const content = data.content ?? [];
    collected.push(...content);
    // A long web search can pause the turn: send it back so the model finishes.
    if (data.stop_reason === "pause_turn") {
      messages = [...messages, { role: "assistant", content }];
      continue;
    }
    break;
  }
  const answer = readAnswer(collected);
  if (!answer.text) throw new AiError("The assistant didn't come back with an answer. Try again.");
  return answer;
}

/** Counts one question. Returns how many are left today, or -1 if the limit is already used up. */
export async function countQuestion(clientId: string, day: string): Promise<number> {
  const n = await db<number>("rpc/use_assistant_question", { method: "POST", body: { p_client: clientId, p_day: day, p_limit: DAILY_LIMIT } });
  return n < 0 ? -1 : DAILY_LIMIT - n;
}

export async function refundQuestion(clientId: string, day: string): Promise<void> {
  await db("rpc/refund_assistant_question", { method: "POST", body: { p_client: clientId, p_day: day } }).catch(() => {});
}

export async function questionsLeft(clientId: string, day: string): Promise<number> {
  const rows = await db<{ count: number }[]>(`assistant_usage?client_id=eq.${clientId}&day=eq.${day}&select=count`);
  return Math.max(0, DAILY_LIMIT - (rows[0]?.count ?? 0));
}
