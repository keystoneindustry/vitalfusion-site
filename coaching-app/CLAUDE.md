# Vital Fusion coaching app — notes for Claude

Production deploys automatically from the `coaching-app` branch (Vercel production branch). Separate Next.js app (App Router, TypeScript, plain CSS, no extra dependencies) that lives in
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
- Coach CRM: `/coach` (client list, flags), `/coach/clients/new` (add + invite). Each client has tabs
  (`app/coach/clients/[id]/layout.tsx` + `ClientTabs.tsx`): Overview (onboarding, meals/training status, timeline),
  Food log, Meals, Training, Details (edit package/stage/notes, resend invite). Server actions in `app/coach/actions.ts`
  (CRM) and `app/coach/clients/[id]/plan-actions.ts` (plans).
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
  the website's `lib/macros.ts` (keep in sync). The AI (`lib/ai.ts`, Claude API over REST, structured outputs via
  `output_config.format` json_schema — forced tool_choice is NOT supported by the model — schemas made strict by
  `strictSchema`, effort "medium"; ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL) drafts nutrition and training in two parallel calls
  (`lib/plan-draft.ts`); the shapes and cleaning live in `lib/plan.ts`. Meal macros are recomputed from USDA
  FoodData Central (`lib/food-data.ts`, USDA_API_KEY, cached in `food_cache`) unless the match looks implausible next
  to the AI's estimate. Meals and training are separate for the coach: `/coach/clients/[id]/meals` and `/training`
  (`/plan` redirects). The coach always edits a working copy (`workingPlan()` in `lib/plans.ts`: the open draft, or a copy of
  the published plan, or a new empty plan) and publishes each part on its own (`publishPart`: a new published row that
  merges this part with the other part as it was published; targets go with the meals). `partState` (lib/plan.ts) says
  empty / draft / live / changed per part; `revertPartAction` throws away unpublished changes to one part. AI runs:
  `startDraft(client, part)` claims the plan (`status = drafting`, `drafting_part`), then `runDraft` runs via `after()`
  (pages `maxDuration = 300`) and merges its result into the latest saved plan, so the other part's edits survive.
  Builders: `TrainingBuilder.tsx` (live checks from `lib/training-brief.ts`) and `MealBuilder.tsx` (perfect day with
  live totals; new/renamed foods looked up in USDA on save via `fillMissing`), saved by `saveTrainingAction` /
  `saveNutritionAction`. Training drafts get a must-follow brief from the onboarding answers (`trainingBrief`) and one
  automatic fix-up pass if `trainingWarnings` finds problems; leftovers become "Training: …" coach notes. Daily cron
  `app/api/cron/plans` (`vercel.json`, CRON_SECRET) drafts both parts for kickoffs in the next 40 h and emails the
  coach; health-flagged clients are skipped. Publishing moves the client to Active and emails them (per part, first
  time). The client sees targets on Today and meals on Nutrition (`/nutrition`) once meals are live, and the program
  on Training (`/train`) once training is live.
- Calendar, habits & progress (Phase 4): coach habit library at `/coach/habits` (`habits` table; the built-in `kind =
  steps` habit can't be archived) → assigned per client with weekdays (`client_habits`, ticks in `habit_checks`). Weigh-in
  and progress-photo days are `schedules` (weekdays every N weeks, or one date). Due-date logic is pure in `lib/calendar.ts`;
  DB helpers in `lib/habits.ts` and `lib/progress.ts`; `lib/client-days.ts` builds each day's tasks. Coach client tabs
  Habits (assign, 14-day tick grid) and Progress (schedule, weight chart, photo compare). `applyDefaultSchedule()` runs on
  the first publish of a plan (step-goal habit sized from the onboarding steps answer, weigh-ins on Settings' default
  days, photos on the client's `photoDay` answer every N weeks from Settings) and from "Add the starting setup". Client:
  Today shows weigh-in / photos due, habit ticks and water (`daily-actions.ts`); Calendar is a week list; Progress has
  the weight chart + weigh-in form and `/progress/photos` (front/side/back, posted to `app/api/progress-photos`, private
  `progress-photos` bucket). Tables `weigh_ins`, `progress_photos`, `water_logs`.
- Client app (`app/(client)/`): tabs Today, Calendar, Training (`/train`), Nutrition (`/nutrition`) and a ☰ More
  sheet (`TabBar.tsx`) with Progress, Food log, Resources (`/resources`, Tyler's videos and documents; `/learn`
  redirects), Settings (`/settings`: account, agreement PDF, sign out), Add to home screen (`/install`) and Sign out.
  Sign out always asks first (`app/components/SignOutButton.tsx`).
  Installable PWA: `app/manifest.ts`, icons in `public/icons/`, service worker `public/sw.js`.
- Dates: package math lives in `lib/dates.ts` (end date = start + weeks × 7 − 1 day). Dates are stored as
  plain `YYYY-MM-DD` and handled as UTC so they never shift a day.
- Run `npm test` after touching `lib/`. Design matches the site: dark theme, accent #6a9fc6, gold #ffe7ab,
  phone-first CSS with `@media (min-width: 860px)` for desktop.
