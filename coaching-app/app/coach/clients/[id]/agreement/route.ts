import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { agreementResponse } from "@/lib/agreement-file";

/** A client's signed agreement (PDF), for the coach. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}`);
  const client = await getClient(id);
  if (!client) return new Response("Client not found.", { status: 404 });
  return agreementResponse(client.id, client.full_name);
}
