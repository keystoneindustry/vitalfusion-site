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
- Coach CRM: `/coach` (client list, flags), `/coach/clients/new` (add + invite). On phones the coach side uses a bottom tab bar (`app/coach/CoachTabBar.tsx`: Clients, Check-ins, Habits,
  Forms, ☰ with Resources / Add a client / Settings / Sign out). `/coach/check-ins` lists every client's check-ins (needs reply first); the top menu only shows on desktop. Client tabs are a 4 × 2 button grid on phones. Each client has tabs
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
  Today shows weigh-in / photos / check-in due and habit ticks (`daily-actions.ts`); no water tracker: water is the built-in
  `kind = water` habit ("Drink N oz of water", added by the starting setup from the plan's water target); Calendar is a week list; Progress has two
  sections (`ProgressTabs`): `/progress/weight` (graph of every weigh-in + weekly average, history; logging at
  `/progress/weigh-in`) and `/progress/photos` (compare + gallery; taking them at `/progress/photos/new`, front/side/back,
  posted to `app/api/progress-photos`, private `progress-photos` bucket). `/progress` redirects to Weight. Tables `weigh_ins`, `progress_photos`, `water_logs`.
- Check-ins & forms (Phase 5): `forms` table (one `kind = checkin` weekly check-in with Tyler's 30 questions in 4 sections, set Nov 11, 2026;
  plus custom forms; question types incl. "Pick any" (`multi`, saved as "A, B") and an optional `section` heading) edited in the coach form builder `/coach/forms` (shapes/validation in `lib/form-schema.ts`,
  safe for the browser; DB in `lib/forms.ts`). Forms go on a client's calendar as `schedules` with `kind = form` +
  `form_id`; the starting setup adds the weekly check-in on the client's `photoDay` ("check-in and progress photos" day).
  Client: Today/Calendar cards → `/check-ins/new/[formId]?date=` (up to 3 days late), list `/check-ins`, view + Tyler's
  reply `/check-ins/[id]`. Submitting (`app/(client)/check-ins/actions.ts`) saves `form_submissions` (with a questions
  snapshot) and runs `processSubmission` (`lib/checkins.ts`) via `after()`: week numbers (weigh-in averages, habit
  adherence, photos), AI review for check-ins (summary, wins, concerns, suggested changes, draft reply in Tyler's voice;
  placeholder coaching rules in the prompt), then emails the `checkin_email` setting with subject "[Check-in] Name · date".
  Coach client tab Check-ins → review page with numbers, AI summary and reply box (prefilled with the draft); sending
  emails the client. Dashboard flags check-ins awaiting a reply.
- Resources: coach manages them at `/coach/resources` (top menu): PDFs and video files (≤50 MB, uploaded straight from the
  browser to the private `resources` bucket through a one-time signed upload URL — `signedUploadUrl` in `lib/storage.ts` —
  because Vercel functions can't take big bodies) or YouTube/Vimeo/Loom links; categories, order, hide/show, unlock by
  coaching week. Table `resources`, helpers `lib/resources.ts`. Clients see `/resources` (locked items show "Unlocks in
  week N") and `/resources/[id]` (embedded video, video player, or "Open the PDF" via signed URL).
- Client app (`app/(client)/`): tabs Today, Calendar, Training (`/train`), Nutrition (`/nutrition`) and a ☰ More
  sheet (`TabBar.tsx`) with Progress, Check-ins, Food log, Resources (`/resources`, Tyler's videos and documents; `/learn`
  redirects), Settings (`/settings`: account, agreement PDF, sign out), Add to home screen (`/install`) and Sign out.
  Sign out always asks first (`app/components/SignOutButton.tsx`).
  Installable PWA: `app/manifest.ts`, icons in `public/icons/`, service worker `public/sw.js`.
- Dates: package math lives in `lib/dates.ts` (end date = start + weeks × 7 − 1 day). Dates are stored as
  plain `YYYY-MM-DD` and handled as UTC so they never shift a day.
- Run `npm test` after touching `lib/`. Design matches the site: dark theme, accent #6a9fc6, gold #ffe7ab,
  phone-first CSS with `@media (min-width: 860px)` for desktop.
- Phones: `useBottomBarFix` re-lays out the tab bars on launch/return in the installed iPhone app (iOS otherwise leaves a gap under them until a tap). Bottom tab bars hide while a text box has focus (`app/components/useTyping.ts`) so they don't float over the
  keyboard; `body::before` paints a strip behind the iPhone status bar. Check-in answers autosave on the device
  (localStorage `vf-form-<formId>-<date>`) until sent.
- Workout days + calendar (Nov 11): `schedules.kind = workout` with `workout_day` (index into the program's training days);
  coach client tab **Calendar** (`/coach/clients/[id]/calendar`: month grid, day details, add/remove workout days;
  `addWorkoutAction` in progress-actions). Clients see workouts on Today / Calendar → `/train?day=N` opens that workout.
  `workoutName()` in `lib/client-days.ts`.
- Optional weekly 1-on-1 call: after sending a weekly check-in, `/check-ins/[id]` offers "Book a call" (Settings →
  check-in call booking link, prefilled via `bookingUrl`). The Cal.com webhook stores `clients.next_call_at` /
  `next_call_uid` for check-in calls (event title must contain "check"); shown on Today, both calendars.
- Coach Home (Nov 11): `/coach` is Home (flags from `lib/coach-flags.ts`, calls today, each client's today via `loadDays`,
  recent activity); the client list moved to `/coach/clients`. Coach tabs: Home, Clients, Check-ins, Forms, ☰ (Habit
  library, Resources, Add a client, Settings). Each client's **Calendar** tab is where everything is scheduled
  (`AddToCalendar.tsx` → `addToCalendarAction`: workouts, weigh-ins, photos, forms, habits; weekly or once) and listed
  with Remove; the Progress tab only shows weight and photos. Training builder: one collapsible card per workout.
- Nutrition tab (Nov 11): targets + perfect day + "Track your calories" (`TrackingApps.tsx`: Cronometer / MyFitnessPal via
  `/go/[app]`, which redirects to the App Store, Google Play or the website by device). The meal library moved to
  `/meals` (☰ More → Meal library), with "Easing in". The app tour and "How your coaching works" mention both.
- READ FIRST guide (Nov 11): `startHere()` in `lib/resources.ts` picks the published resource with "read first"/"start here"
  in its title (else the first "Getting started" item). It's linked from the onboarding "How your coaching works" step,
  the app tour (Resources slide), Today (first 2 weeks), and the top of Resources. `findGuide()` links "How to Track
  Calories" from the Nutrition tab. Client ☰ More is grouped: Your coaching (Check-ins, Progress, Resources, Meal
  library, Food log) and Account (Settings, Add to home screen — hidden once installed), then Sign out.
- Reminders (Phase 5b, Nov 11): `lib/push.ts` (Web Push without packages: VAPID ES256 JWT + aes128gcm; env VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY, optional VAPID_SUBJECT), `app/api/push` (subscribe / unsubscribe / reminders on-off / test),
  `public/sw.js` push + notificationclick, `app/components/Notifications.tsx` (Settings card; compact prompt on Today).
  `lib/reminders.ts` + `GET /api/cron/reminders` (Bearer REMINDERS_SECRET or CRON_SECRET), meant to run hourly: 8am
  summary and 7pm "still open" nudge in each client's time zone (2-hour catch-up window), deduped by `reminder_log`.
  No notifications → email only for important items (workout/weigh-in/photos/check-in; evening: unsent check-in).
  Coach reply also pushes. Tables `push_subscriptions`, `reminder_log`; `clients.reminders_enabled`.
- Client Training tab: meta line, this-week strip (from workout schedules), today's workout opens by default,
  exercises as "3 × 8–12 reps · rest 90 s", one "Program notes" card.
- The hourly trigger is a Supabase pg_cron job `vf-hourly-reminders` ('0 * * * *') that calls
  https://vitalfusion-app.vercel.app/api/cron/reminders through pg_net with the REMINDERS_SECRET bearer token.
  **When the app moves to app.vitalfusioncoaching.com, update that URL** (cron.alter_job / reschedule).
- Exercise library (Nov 11): table `exercises` (name unique, category, cue, video_url or uploaded video_path in the private
  `resources` bucket under `exercises/`), coach page `/coach/exercises` (☰ / top menu). Seeded with the builder's
  suggestion names, no videos. `matchExercise()` (`lib/exercise-match.ts`) links a program's exercise to the library
  (exact name, else all library words present, most specific wins); `demosFor()` gives the client Training tab a
  "▶ Watch demo" per exercise. The builder shows "🎬 Demo: …" per exercise; AI drafts are told which names have videos.
  No client workout logging (Tyler's call).
- Nov 11: the app tour moved out of onboarding. Welcome step = note/video + "What's next" list. After onboarding,
  Today shows a live tour once (`app/(client)/AppTour.tsx`: dims the screen and highlights each tab via `data-tour`
  attributes on the tab bar, then "Open the guide" → the READ FIRST resource); `clients.tour_seen_at` via
  `markTourSeenAction`; Settings → "Take the app tour again" (`/?tour=1`). The onboarding weight answer becomes the
  first weigh-in. Coach Details tab → "Delete client" (type "delete"): `lib/delete-client.ts` removes storage files
  (meal photos, progress photos, agreement PDFs), the clients row (everything else cascades) and the auth user.
- Portion fitting (Nov 11): `lib/fit.ts` `fitNutrition(content, targets)` resizes ingredient grams (same foods,
  0.35×–3×, least squares with a pull toward the original amounts, rounded to 5 g; household measures rescaled or
  dropped) so the perfect day lands on the targets, then sizes every other library meal like the perfect-day meals of
  its group. Runs automatically after every AI nutrition draft and revision; the coach's Meals tab has "Fit portions
  to targets" (`fitMealsAction`) for existing or hand-edited plans.
- AI Nutrition Assistant (Nov 12): ☰ More → `/assistant` (`app/(client)/assistant/`: page + `AssistantChat.tsx`). Clients ask food
  questions (restaurants, swaps, snacks); `POST /api/assistant` → `lib/assistant.ts` (Claude API with the server-side
  `web_search_20250305` tool, max 3 searches; falls back to no search if web search isn't enabled for the API org; handles
  `pause_turn`). The system prompt carries the client's published targets, goal, allergies, diet style and foods to avoid.
  Chats are NOT stored on the server (only in the phone's localStorage `vf-assistant-<clientId>`; Tyler can't see them, by his
  choice). Limit 20 questions/day per client in the client's time zone: table `assistant_usage` + RPC
  `use_assistant_question` (atomic, returns -1 at the limit) and `refund_assistant_question` (on failure).
