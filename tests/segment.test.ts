import assert from "node:assert/strict";
import { addToCalculatorSegment, CALCULATOR_SEGMENT_ID } from "../lib/resend-events";

type Call = { url: string; method: string; body?: string };
function mock(responses: number[]) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: String(init.method), body: init.body as string | undefined });
    const status = responses.shift() ?? 200;
    return new Response("{}", { status });
  }) as typeof fetch;
  return calls;
}

(async () => {
  process.env.RESEND_API_KEY = "test";

  // Preview / local: does nothing
  process.env.VERCEL_ENV = "preview";
  let calls = mock([]);
  await addToCalculatorSegment("a@b.com", "A");
  assert.equal(calls.length, 0);

  process.env.VERCEL_ENV = "production";

  // Existing contact: one add call
  calls = mock([200]);
  await addToCalculatorSegment("a@b.com", "A");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.resend.com/contacts/a%40b.com/segments/${CALCULATOR_SEGMENT_ID}`);

  // New contact: add 404 → create with segment, no "unsubscribed" field
  calls = mock([404, 200]);
  await addToCalculatorSegment("new@b.com", "Kilo");
  assert.equal(calls.length, 2);
  const body = JSON.parse(calls[1].body!);
  assert.deepEqual(body, { email: "new@b.com", first_name: "Kilo", segments: [{ id: CALCULATOR_SEGMENT_ID }] });

  // Created by the sequence event in between: add 404, create 409, add again 200
  calls = mock([404, 409, 200]);
  await addToCalculatorSegment("race@b.com", "R");
  assert.equal(calls.length, 3);

  // Real failure throws (route logs it; nothing else is affected)
  mock([500]);
  await assert.rejects(addToCalculatorSegment("x@b.com", "X"));

  console.log("Segment tests passed");
})();
