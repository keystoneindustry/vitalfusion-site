/**
 * Sends people to the right store for a calorie-tracking app: App Store on iPhone/iPad,
 * Google Play on Android, the app's website anywhere else.
 */
const APPS: Record<string, { ios: string; android: string; web: string }> = {
  cronometer: {
    ios: "https://apps.apple.com/app/id1145935738",
    android: "https://play.google.com/store/apps/details?id=com.cronometer.android.gold",
    web: "https://cronometer.com/",
  },
  myfitnesspal: {
    ios: "https://apps.apple.com/app/id341232718",
    android: "https://play.google.com/store/apps/details?id=com.myfitnesspal.android",
    web: "https://www.myfitnesspal.com/",
  },
};

export async function GET(request: Request, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  const links = APPS[app];
  if (!links) return new Response("Not found", { status: 404 });
  const ua = request.headers.get("user-agent") ?? "";
  const to = /android/i.test(ua) ? links.android : /iphone|ipad|ipod|macintosh.*mobile/i.test(ua) ? links.ios : links.web;
  return Response.redirect(to, 302);
}
