import { cookies } from "next/headers";
import { getViewer, VIEW_AS_COOKIE } from "@/lib/auth";
import { getClient } from "@/lib/clients";

/** Shown across the client app while the coach is in Client view. */
export default async function ViewAsBanner() {
  const id = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const v = await getViewer();
  if (v.status !== "ok" || v.viewer.role !== "coach") return null;
  const client = await getClient(id);
  if (!client) return null;
  return (
    <div className="viewas-banner" role="status">
      <span>
        👁 Viewing as <b>{client.full_name}</b> · read-only
      </span>
      <a href="/coach/view-exit" className="viewas-exit">
        Exit client view
      </a>
    </div>
  );
}
