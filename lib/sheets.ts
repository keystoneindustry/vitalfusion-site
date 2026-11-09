// Appends a row to the coach's Google Sheet through a small Google Apps Script
// "web app" attached to the sheet (see docs/google-sheet-setup.md). No Google
// API keys needed: the site POSTs JSON with a shared secret token.

export function sheetsEnabled(): boolean {
  return Boolean(process.env.SHEETS_WEBHOOK_URL && process.env.SHEETS_WEBHOOK_TOKEN);
}

export async function appendLeadRow(row: Record<string, string | number>): Promise<void> {
  if (!sheetsEnabled()) return;
  const res = await fetch(process.env.SHEETS_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script reads the raw body
    body: JSON.stringify({ token: process.env.SHEETS_WEBHOOK_TOKEN, row }),
    redirect: "follow",
  });
  const body = await res.text();
  if (!res.ok || !body.includes('"ok":true')) {
    throw new Error(`Google Sheet error ${res.status}: ${body.slice(0, 200)}`);
  }
}
