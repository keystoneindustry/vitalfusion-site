/**
 * Revenue from Stripe for the Business tab. Read-only: uses a RESTRICTED key (STRIPE_READ_KEY in Vercel) that can
 * only read charges. Without the key the Business tab shows setup steps instead.
 */
export type Payment = { id: string; amount: number; created: number; who: string; what: string };
export type Revenue = {
  /** Net of refunds, in dollars, per calendar month (Eastern), oldest first. */
  months: { month: string; label: string; total: number; count: number }[];
  thisMonth: number;
  lastMonth: number;
  last30: number;
  recent: Payment[];
};

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_READ_KEY);
}

type Charge = {
  id: string;
  amount: number;
  amount_refunded: number;
  created: number;
  currency: string;
  paid: boolean;
  status: string;
  description: string | null;
  billing_details?: { name?: string | null; email?: string | null };
  calculated_statement_descriptor?: string | null;
};

function monthKey(ts: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit" }).formatToParts(new Date(ts * 1000));
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/** Pure: sums successful USD charges (minus refunds) by month. Exported for tests. */
export function summarize(charges: Charge[], now: Date, monthsBack = 6): Revenue {
  const keys: string[] = [];
  const cur = monthKey(now.getTime() / 1000);
  let [y, m] = cur.split("-").map(Number);
  for (let i = 0; i < monthsBack; i++) {
    keys.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }
  const months = keys.map((k) => ({
    month: k,
    label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${k}-15T00:00:00Z`)),
    total: 0,
    count: 0,
  }));
  const ok = charges.filter((c) => c.paid && c.status === "succeeded" && c.currency === "usd");
  let last30 = 0;
  const cutoff = now.getTime() / 1000 - 30 * 86400;
  for (const c of ok) {
    const net = (c.amount - (c.amount_refunded || 0)) / 100;
    const row = months.find((x) => x.month === monthKey(c.created));
    if (row) {
      row.total += net;
      if (net > 0) row.count++;
    }
    if (c.created >= cutoff) last30 += net;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  for (const r of months) r.total = round(r.total);
  return {
    months,
    thisMonth: months[months.length - 1]?.total ?? 0,
    lastMonth: months[months.length - 2]?.total ?? 0,
    last30: round(last30),
    recent: [...ok]
      .sort((a, b) => b.created - a.created)
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        amount: round((c.amount - (c.amount_refunded || 0)) / 100),
        created: c.created,
        who: c.billing_details?.name || c.billing_details?.email || "Customer",
        what: c.description || c.calculated_statement_descriptor || "Payment",
      })),
  };
}

/** Last 6 months of revenue, or null when Stripe isn't connected. Throws if Stripe rejects the key. */
export async function loadRevenue(now: Date = new Date()): Promise<Revenue | null> {
  const key = process.env.STRIPE_READ_KEY;
  if (!key) return null;
  const since = Math.floor(now.getTime() / 1000) - 190 * 86400;
  const charges: Charge[] = [];
  let after = "";
  for (let page = 0; page < 20; page++) {
    const url = `https://api.stripe.com/v1/charges?limit=100&created[gte]=${since}${after ? `&starting_after=${after}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!res.ok) throw new Error(`Stripe ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { data: Charge[]; has_more: boolean };
    charges.push(...data.data);
    if (!data.has_more || data.data.length === 0) break;
    after = data.data[data.data.length - 1].id;
  }
  return summarize(charges, now);
}

export function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
}
