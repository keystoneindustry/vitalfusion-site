import { redirect } from "next/navigation";

/** Old address: meals and training now have their own tabs. */
export default async function OldPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/coach/clients/${id}/meals`);
}
