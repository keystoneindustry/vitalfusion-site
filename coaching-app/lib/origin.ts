import { headers } from "next/headers";
import { env } from "./env";

/** The address this app is being used on, for links in emails. */
export async function appOrigin(): Promise<string> {
  const fixed = env.appUrl();
  if (fixed) return fixed;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
