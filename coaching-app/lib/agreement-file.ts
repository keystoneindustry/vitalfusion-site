import { latestAgreement } from "./onboarding-data";
import { downloadFile } from "./storage";

/** The client's most recent signed agreement as a PDF response, or a plain message if there isn't one. */
export async function agreementResponse(clientId: string, clientName: string): Promise<Response> {
  const a = await latestAgreement(clientId);
  if (!a?.pdf_path) return new Response("No signed agreement yet.", { status: 404 });
  const bytes = await downloadFile("agreements", a.pdf_path);
  if (!bytes) return new Response("The agreement file is missing.", { status: 404 });
  const filename = `Vital Fusion Coaching Agreement - ${clientName}.pdf`.replace(/[^\w .-]/g, "");
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
