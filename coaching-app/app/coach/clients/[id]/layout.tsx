import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { stageLabel } from "@/lib/client-input";
import { packageLabel, todayIn } from "@/lib/dates";
import { formatCallTime } from "@/lib/booking";
import { getOpenPlan, getPublishedPlan, hasContent } from "@/lib/plans";
import { partState } from "@/lib/plan";
import ClientTabs from "./ClientTabs";
import { db, q } from "@/lib/supabase";

/** Header + tabs shared by every page of one client in the coach portal. */
export default async function ClientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}`);
  const client = await getClient(id);
  if (!client) notFound();
  const [open, pub, unreplied] = await Promise.all([
    getOpenPlan(client.id),
    getPublishedPlan(client.id),
    db<{ id: string }[]>(`form_submissions?select=id&client_id=eq.${q(client.id)}&replied_at=is.null`),
  ]);
  const work = hasContent(open) ? open : null;
  const live = hasContent(pub) ? pub : null;
  const badge = (part: "nutrition" | "training") => {
    const s = partState(work, live, part);
    return s === "live" ? "✓" : s === "draft" || s === "changed" ? "•" : undefined;
  };

  return (
    <>
      <p className="small" style={{ margin: "0 0 8px" }}>
        <Link href="/coach/clients">← Clients</Link>
      </p>
      <div className="client-head">
        <div>
          <h1 className="h1" style={{ margin: 0 }}>{client.full_name}</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            {packageLabel(client.start_date, client.end_date, todayIn())}
            {client.kickoff_at && Date.parse(client.kickoff_at) > Date.now() ? ` · Kickoff ${formatCallTime(client.kickoff_at, client.timezone)}` : ""}
          </p>
        </div>
        <span className={`pill pill-${client.stage}`}>{stageLabel(client.stage)}</span>
      </div>
      {client.health_flag && <p className="health-chip">⚠️ Health questions need review</p>}
      <ClientTabs id={client.id} badges={{ Meals: badge("nutrition"), Training: badge("training"), "Check-ins": unreplied.length ? String(unreplied.length) : undefined }} />
      {children}
    </>
  );
}
