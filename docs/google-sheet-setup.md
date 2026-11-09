# Connect the macro quiz to the Google Sheet

The quiz adds one row per lead to the "Vital Fusion – Macro Quiz Leads" sheet through a
small Apps Script attached to that sheet. Do this once, on a computer.

1. Open the sheet → **Extensions → Apps Script**.
2. Delete everything in the editor and paste the script below. Replace `PASTE_TOKEN_HERE`
   with the same random secret you put in Vercel as `SHEETS_WEBHOOK_TOKEN`.
3. Click **Save**, then **Deploy → New deployment** → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, approve the Google permission prompts, and copy the **Web app URL**.
5. In Vercel → Settings → Environment Variables add:
   - `SHEETS_WEBHOOK_URL` = the Web app URL
   - `SHEETS_WEBHOOK_TOKEN` = the secret
   Then redeploy.

```js
const TOKEN = 'PASTE_TOKEN_HERE';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.token !== TOKEN) return reply({ ok: false, error: 'bad token' });
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads')
      || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(headers.map(function (h) { return data.row[h] !== undefined ? data.row[h] : ''; }));
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```
