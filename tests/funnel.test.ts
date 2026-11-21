import assert from "node:assert/strict";
import { recordFunnelLead } from "../lib/funnel";

(async () => {
  const calls: { url: string; body: string }[] = [];
  let reply = "true";
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body) });
    return new Response(reply, { status: 200 });
  }) as typeof fetch;

  process.env.FUNNEL_TOKEN = "t";
  process.env.VERCEL_ENV = "preview";
  await recordFunnelLead("calculator", { email: "a@b.com", name: "A", source: "Instagram" });
  assert.equal(calls.length, 0); // preview: nothing saved

  process.env.VERCEL_ENV = "production";
  await recordFunnelLead("application", { email: "a@b.com", name: "A", source: "Youtube" });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith("/rest/v1/rpc/record_funnel_lead"));
  assert.deepEqual(JSON.parse(calls[0].body), { p_token: "t", p_kind: "application", p_email: "a@b.com", p_name: "A", p_source: "Youtube", p_details: {} });

  reply = "false"; // wrong token on the server → error (logged by the route, never shown to the person)
  await assert.rejects(recordFunnelLead("calculator", { email: "a@b.com", name: "A", source: "x" }));
  console.log("Funnel tests passed");
})();
