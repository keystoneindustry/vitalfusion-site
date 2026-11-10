# Vital Fusion coaching app — notes for Claude

Separate Next.js app (App Router, TypeScript, plain CSS, no extra dependencies) that lives in
`coaching-app/` of the website repo and deploys as its OWN Vercel project (root directory
`coaching-app`). It never touches the marketing site in the repo root. The full product plan is the
"Vital Fusion Coaching App — Full Plan" doc; phase-by-phase status is in the Claude project note
`claude/coaching-app-plan.md`.

- Data: Supabase project "VFCoaching App" (`bcwytsuqudwghxctxoef`). Tables: `profiles` (coach/client,
  linked to auth users), `clients` (the CRM: package length, start/end dates, stage), `client_events`
  (timeline). RLS is on everywhere. The app talks to Supabase over REST with `fetch` (`lib/supabase.ts`):
  database reads/writes run on the server with the secret key, and every page checks who is signed in
  first (`lib/auth.ts`). Never expose the secret key to the browser.
- Sign-in: no passwords. `lib/signin.ts` asks Supabase Auth (admin generate_link) for a one-time token
  and emails our own branded link AND 6-digit code through Resend (`lib/email.ts`). The link opens
  `/auth/confirm`, which needs a tap on "Sign in" (so email scanners can't use up the token). The code is
  typed on `/login` (`signInWithCode`) — needed on iPhone, where a home-screen app has its own cookies and
  email links open in Safari instead. Both set two httpOnly cookies (`lib/session.ts`); the refresh cookie
  lasts 60 days and renews on use. Expired access tokens are refreshed through `/auth/refresh?next=…`.
- Roles: emails in `COACH_EMAILS` are the coach (→ `/coach`); everyone else must have a row in
  `clients` (→ the client app at `/`). Unknown emails get the same "check your email" screen but no email.
- Coach CRM: `/coach` (client list, flags), `/coach/clients/new` (add + invite), `/coach/clients/[id]`
  (edit package dates, stage, notes, resend invite, timeline). Server actions in `app/coach/actions.ts`.
- Onboarding (Phase 2): `app/onboarding/` (own layout, no tab bar). Steps in `lib/onboarding.ts`, stored in
  `clients.onboarding_step` (welcome → install → agreement → questions → how_it_works → kickoff → done); pages guard
  with `onboarding/guard.ts` and server actions live in `onboarding/actions.ts`. Agreement wording + validation:
  `lib/agreement.ts` (Tyler's agreement + approved Privacy / Package / Maryland changes; bump AGREEMENT_VERSION when
  wording changes). Signing saves an `agreements` row, builds a PDF (`lib/agreement-pdf.ts` on the tiny writer
  `lib/pdf.ts`), stores it in the private `agreements` storage bucket (`lib/storage.ts`) and emails it to client and
  coach. Any PAR-Q "yes" sets `clients.health_flag` + `health_note`. Questions: `lib/onboarding-questions.ts`
  (answers autosave to `onboarding_responses`). Kickoff booking: Cal.com link with name/email/`metadata[clientId]`
  (`lib/booking.ts`); `app/api/cal/webhook` (HMAC with CAL_WEBHOOK_SECRET, shown on /coach/settings) records
  bookings, reschedules and cancellations. Coach settings (`app_settings`): welcome video link, booking links.
- Food log + AI plan (Phase 3): after onboarding, clients log meals at `/food` (photo shrunk in the browser to
  ≤1280 px JPEG, posted to `app/api/meals`, stored in the private `meal-photos` bucket; table `meal_logs`, helpers in
  `lib/meals.ts`; photos shown through short-lived signed URLs). Plans live in `plans` (one open draft/drafting/failed
  row per client, plus published/archived). Targets come from `lib/targets.ts`, which uses `lib/macros.ts` — a COPY of
  the website's `lib/macros.ts` (keep in sync). The AI (`lib/ai.ts`, Claude API over REST, forced tool → JSON;
  ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL) drafts nutrition and training in two parallel calls
  (`lib/plan-draft.ts`); the shapes and cleaning live in `lib/plan.ts`. Meal macros are recomputed from USDA
  FoodData Central (`lib/food-data.ts`, USDA_API_KEY, cached in `food_cache`) unless the match looks implausible next
  to the AI's estimate. Coach review/edit/revise/publish: `/coach/clients/[id]/plan` (server actions in `actions.ts`,
  AI work runs after the response via `after()`, page `maxDuration = 300`). Daily cron `app/api/cron/plans`
  (`vercel.json`, CRON_SECRET) drafts plans for kickoffs in the next 40 h and emails the coach; health-flagged clients
  are skipped. Publishing moves the client to Active and emails them; the client sees targets on Today, meals at
  `/plan` (linked from Learn) and the program on Train.
- Client app: five tabs in `app/(client)/` — Today, Calendar, Train, Learn, Progress — plus `/install`.
  Installable PWA: `app/manifest.ts`, icons in `public/icons/`, service worker `public/sw.js`.
- Dates: package math lives in `lib/dates.ts` (end date = start + weeks × 7 − 1 day). Dates are stored as
  plain `YYYY-MM-DD` and handled as UTC so they never shift a day.
- Run `npm test` after touching `lib/`. Design matches the site: dark theme, accent #6a9fc6, gold #ffe7ab,
  phone-first CSS with `@media (min-width: 860px)` for desktop.
