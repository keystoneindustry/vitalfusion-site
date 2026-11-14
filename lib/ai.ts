/**
 * Calls the Claude API (Anthropic) over REST — no SDK. Same approach as the coaching app
 * (coaching-app/lib/ai.ts): answers come back as JSON matching a schema (structured outputs).
 * Needs ANTHROPIC_API_KEY in Vercel; ANTHROPIC_MODEL can override the model.
 */

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export type JsonSpec = { name: string; schema: Record<string, unknown> };

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

/** Structured outputs need every object to list all properties as required and forbid extra ones. */
export function strictSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(strictSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    out[k] =
      k === "properties" && v && typeof v === "object"
        ? Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, strictSchema(pv)]))
        : strictSchema(v);
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
    throw new AiError(err instanceof Error && err.name === "TimeoutError" ? "AI timed out" : "Couldn't reach the Claude API");
  }
}

export async function askForJson(opts: {
  system: string;
  text: string;
  output: JsonSpec;
  maxTokens?: number;
  timeoutMs?: number;
  effort?: "low" | "medium" | "high";
}): Promise<unknown> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("ANTHROPIC_API_KEY is not set");
  const format = { type: "json_schema", schema: strictSchema(opts.output.schema) };
  const body: Record<string, unknown> = {
    model: aiModel(),
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: [{ role: "user", content: [{ type: "text", text: opts.text }] }],
    output_config: { format, effort: opts.effort ?? "low" },
  };
  const timeout = opts.timeoutMs ?? 45_000;
  let res = await call(body, key, timeout);
  if (res.status === 400 && /effort/i.test(res.text)) res = await call({ ...body, output_config: { format } }, key, timeout);
  if (res.status < 200 || res.status >= 300) throw new AiError(`Claude API error ${res.status}: ${res.text.slice(0, 200)}`);

  const data = JSON.parse(res.text) as { content?: { type: string; text?: string }[]; stop_reason?: string };
  if (data.stop_reason === "max_tokens") throw new AiError("AI answer was cut off");
  if (data.stop_reason === "refusal") throw new AiError("AI declined");
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new AiError("AI returned nothing");
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError("AI answer wasn't valid JSON");
  }
}
