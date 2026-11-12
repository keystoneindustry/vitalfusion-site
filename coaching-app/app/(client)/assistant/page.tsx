import { requireClient } from "@/lib/auth";
import { DAILY_LIMIT, questionsLeft } from "@/lib/assistant";
import { todayIn } from "@/lib/dates";
import AssistantChat from "./AssistantChat";

export const metadata = { title: "AI Nutrition Assistant · Vital Fusion" };

/** ☰ More → AI Nutrition Assistant. Chats stay on the client's phone; only the daily count is saved. */
export default async function AssistantPage() {
  const { client } = await requireClient("/assistant");
  const left = await questionsLeft(client.id, todayIn(client.timezone)).catch(() => DAILY_LIMIT);
  return (
    <>
      <h1 className="h1">AI Nutrition Assistant</h1>
      <p className="lead" style={{ marginBottom: 14 }}>
        Eating out or stuck on what to eat? Ask me. I know your targets.
      </p>
      <AssistantChat storageKey={`vf-assistant-${client.id}`} initialLeft={left} limit={DAILY_LIMIT} />
    </>
  );
}
