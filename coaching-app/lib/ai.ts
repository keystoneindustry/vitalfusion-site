/**
 * Calls the Claude API (Anthropic) over REST — no SDK. Answers come back through a forced "tool"
 * so they're always structured JSON. Needs ANTHROPIC_API_KEY; ANTHROPIC_MODEL can override the model.
 */

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export type ToolSpec = { name: string; description: string; input_schema: Record<string, unknown> };

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

export async function askForJson(opts: {
  system: string;
  content: ContentBlock[];
  tool: ToolSpec;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<{ input: unknown; usage: AiUsage; model: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("The Claude API key isn't set up yet (ANTHROPIC_API_KEY in Vercel).");
  const model = aiModel();
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 16000,
        system: opts.system,
        tools: [opts.tool],
        tool_choice: { type: "tool", name: opts.tool.name },
        messages: [{ role: "user", content: opts.content }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 270_000),
    });
  } catch (err) {
    throw new AiError(err instanceof Error && err.name === "TimeoutError" ? "The AI took too long to answer. Try again." : "Couldn't reach the Claude API.");
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      msg = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? msg;
    } catch {}
    if (res.status === 401) msg = "The Claude API key was rejected. Check ANTHROPIC_API_KEY in Vercel.";
    if (res.status === 402 || /credit balance/i.test(msg)) msg = "The Claude API account is out of credit. Add credit at console.anthropic.com.";
    throw new AiError(`Claude API error (${res.status}): ${msg}`);
  }
  const data = JSON.parse(text) as {
    content?: { type: string; name?: string; input?: unknown }[];
    usage?: AiUsage;
    stop_reason?: string;
  };
  const block = data.content?.find((c) => c.type === "tool_use" && c.name === opts.tool.name);
  if (!block) throw new AiError("The AI didn't return a plan. Try again.");
  if (data.stop_reason === "max_tokens") throw new AiError("The AI's answer was cut off (too long). Try again.");
  return { input: block.input, usage: data.usage ?? {}, model };
}
