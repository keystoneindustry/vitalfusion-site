import { requireCoach } from "@/lib/auth";
import { getLegalRequest } from "@/lib/legal";
import { downloadFile } from "@/lib/storage";

/** Coach only: a signed standalone agreement as a PDF. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCoach("/coach/legal");
  const { id } = await params;
  const r = await getLegalRequest(id);
  if (!r?.pdf_path) return new Response("No signed agreement.", { status: 404 });
  const bytes = await downloadFile("agreements", r.pdf_path);
  if (!bytes) return new Response("The agreement file is missing.", { status: 404 });
  const filename = `Vital Fusion Coaching Agreement - ${r.full_name}.pdf`.replace(/[^\w .-]/g, "");
  return new Response(bytes as BodyInit, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}
