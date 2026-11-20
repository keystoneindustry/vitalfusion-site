import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getResource, RESOURCE_BUCKET } from "@/lib/resources";
import { signedUrls } from "@/lib/storage";

/** Coach-only: opens a resource's file (or link) so Tyler can see exactly what clients see. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach("/coach/resources");
  const r = await getResource(id);
  if (!r) redirect("/coach/resources");
  if (r.url) redirect(r.url);
  const url = r.path ? (await signedUrls(RESOURCE_BUCKET, [r.path], 3600))[r.path] : null;
  redirect(url ?? "/coach/resources");
}
