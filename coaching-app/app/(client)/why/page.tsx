import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getResponse } from "@/lib/onboarding-data";
import WhyForm from "./WhyForm";

export const metadata = { title: "Your why · Vital Fusion" };

/** Edit the "why" shown at the top of Today. Starts from their onboarding answer. */
export default async function WhyPage() {
  const { client } = await requireClient("/why");
  const answer = client.why ?? String((await getResponse(client.id))?.answers?.why ?? "");
  return (
    <>
      <p className="small" style={{ margin: "0 0 8px" }}>
        <Link href="/">‹ Today</Link>
      </p>
      <h1 className="h1">Your why</h1>
      <p className="lead">Why do you want this? Write it for yourself. It shows at the top of your Today screen every time you open the app, so it's there on the hard days.</p>
      <WhyForm initial={answer} />
    </>
  );
}
