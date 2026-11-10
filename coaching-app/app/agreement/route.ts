import { requireClient } from "@/lib/auth";
import { agreementResponse } from "@/lib/agreement-file";

/** The signed-in client's own signed agreement (PDF). */
export async function GET() {
  const { client } = await requireClient("/agreement");
  return agreementResponse(client.id, client.full_name);
}
