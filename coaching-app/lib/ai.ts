/**
 * Calls the Claude API (Anthropic) over REST — no SDK. Answers come back as JSON that matches a
 * schema (structured outputs: `output_config.format`). Needs ANTHROPIC_API_KEY; ANTHROPIC_MODEL can
 * override the model.
 */

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

/** A JSON schema for the answer. */
export type JsonSpec = { name: string; schema: Record<string, unknown> };

export type AiUsage = { input_tokens?: number; output_tokens?: number };

export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function aiModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

/**
 * Structured outputs need every object to list all its properties as required and to forbid extra
 * ones. This adds both everywhere, so the schemas in the code can stay short.
 */
export function strictSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(strictSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    out[k] = k === "properties" && v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, strictSchema(pv)])) : strictSchema(v);
  }
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.required = Object.keys(out.properties as object);
    out.additionalProperties = false;
  }
  return out;
}

async function call(body: Record<string, unknown>, key: string, timeoutMs: number): Promise<{ status: number; text: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { status: res.status, text: await res.text() };
  } catch (err) {
    throw new AiError(err instanceof Error && err.name === "TimeoutError" ? "The AI took too long to answer. Try again." : "Couldn't reach the Claude API.");
  }
}

function errorMessage(status: number, text: string): string {
  let msg = text.slice(0, 300);
  try {
    msg = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? msg;
  } catch {}
  if (status === 401) return "The Claude API key was rejected. Check ANTHROPIC_API_KEY in Vercel.";
  if (status === 402 || /credit balance/i.test(msg)) return "The Claude API account is out of credit. Add credit at console.anthropic.com.";
  if (status === 429) return "The Claude API is busy (rate limit). Try again in a minute.";
  if (status === 529 || status >= 500) return "The Claude API is overloaded right now. Try again in a few minutes.";
  return `Claude API error (${status}): ${msg}`;
}

export async function askForJson(opts: {
  system: string;
  content: ContentBlock[];
  output: JsonSpec;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<{ data: unknown; usage: AiUsage; model: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("The Claude API key isn't set up yet (ANTHROPIC_API_KEY in Vercel).");
  const model = aiModel();
  const format = { type: "json_schema", schema: strictSchema(opts.output.schema) };
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 20000,
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
    // Medium effort keeps drafts to a couple of minutes; plans are reviewed by the coach anyway.
    output_config: { format, effort: "medium" },
  };
  const timeout = opts.timeoutMs ?? 270_000;
  let res = await call(body, key, timeout);
  if (res.status === 400 && /effort/i.test(res.text)) {
    // Some models don't take an effort level: retry without it.
    res = await call({ ...body, output_config: { format } }, key, timeout);
  }
  if (res.status < 200 || res.status >= 300) throw new AiError(errorMessage(res.status, res.text));

  const data = JSON.parse(res.text) as { content?: { type: string; text?: string }[]; usage?: AiUsage; stop_reason?: string };
  if (data.stop_reason === "max_tokens") throw new AiError("The AI's answer was cut off (too long). Try again.");
  if (data.stop_reason === "refusal") throw new AiError("The AI declined to write this plan. Check the client's answers, or build it yourself.");
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new AiError("The AI didn't return a plan. Try again.");
  try {
    return { data: JSON.parse(text), usage: data.usage ?? {}, model };
  } catch {
    throw new AiError("The AI's answer wasn't valid. Try again.");
  }
}
