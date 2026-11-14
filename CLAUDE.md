# Project notes for Claude Code

Vital Fusion Coaching (vitalfusioncoaching.com): online fitness coaching. The owner
is not a developer; explain changes plainly and keep the site simple.

- Stack: Next.js (App Router, TypeScript), plain CSS in `app/globals.css` (no Tailwind),
  hosted on Vercel. Email via Resend REST API (`lib/email.ts`), optional Supabase via
  REST (`lib/store.ts`). Avoid adding dependencies unless they clearly earn their place.
- The homepage is a video landing page (styled after a reference VSL page, in Vital Fusion colors) that only
  sells the coaching application. Order: hero (eyebrow, "Lose your first 15+ lbs in 90 days without extreme
  diets.", no sub-paragraph, self-hosted video (`public/video/vsl.mp4`, native <video>) autoplaying muted on a loop; tapping anywhere on it / the "Tap to watch with sound" button restarts it with sound and shows native controls, Start Now, holiday line)
  → 3 pillars → how it works (4 steps) → client results (Charlie featured with his family quote, 2 other
  quote cards) → what you get (+ swipeable phone `AppTour.tsx` with 8 app screenshots, caption per screen,
  from `whatYouGet.appScreens`) → your coach → for you / not for you → closing
  ("90 days will pass either way"). Every CTA goes to `/apply`. No price, no guarantee on the page.
  "90 days" is the hook only (clients sign up for different lengths). Video path + poster live in
  `content/site.ts` → `video` (swap the file, keep the name). Source edit: Tyler's VSL, also on Vimeo. Words in *stars* in headings render in the italic accent font (Instrument
  Serif via next/font; body font Inter). Pieces: `app/components/VideoHero.tsx`, `Reveal.tsx` (scroll fade-in),
  `Icon.tsx`, `Rich.tsx`. No sticky Start Now bar on the homepage (Tyler's call: Start Now already repeats). The holiday line (`hero.holiday`) can be set to "" after New Year's.
- All homepage copy lives in `content/site.ts`; layout in `app/page.tsx`; promo landing page in
  `app/vital-method/`. Images are in `public/images/`. Only add real client results and testimonials.
- CSS is phone-first: base rules are for phones, `@media (min-width: 860px)` for desktop.
  Keep the page lean (short copy, proof early, one repeated CTA).
- `/next-steps` is a hidden (noindex, not in nav) page linked only from the applicant
  confirmation email (`applicantEmail` in `lib/email.ts`). Copy in `content/site.ts` → `nextSteps`.
- `/macros` is a hidden (noindex) macro-calculator lead magnet for Instagram ("comment MACROS"
  via ManyChat → `/macros?source=macros`). Math + rules in `lib/macros.ts` (Mifflin-St Jeor;
  protein 0.9 g/lb max 180; fat 0.35 g/lb (0.42 for build muscle) max 80, up to 100 if carbs ≥100, NEVER below 40 g; carbs ≥100 g;
  fiber 14 g/1000 kcal; calorie floors; under-18 = maintenance for fat loss). Goal is the first
  question and branches the funnel: Lose fat → pace question + deficit; Build muscle → +200 kcal;
  Maintain → maintenance, no goal-weight question. After obstacles come two optional food screens
  ("Which foods do you love?" chips + text, "Anything you don't eat?" chips + text; options in `lib/foods.ts`).
  Results show an AI "Your sample day" (breakfast, lunch, dinner, snack) built like the coaching app's perfect
  day: Claude writes meals around their likes (`lib/sample-day.ts`, `lib/ai.ts`, needs ANTHROPIC_API_KEY), USDA
  numbers (`lib/usda.ts`, needs USDA_API_KEY), then portion fitting (`lib/portion-fit.ts`: each meal fitted to
  its share 25/30/30/15 %, then a small whole-day pass) so the day hits their calories/macros. A word check
  (`avoidClashes`) rejects meals with foods they avoid (one retry, then fallback). `/api/macros/meals` builds it
  and sends the results email (with the sample day, or the 3 favourite meals minus avoided foods as fallback);
  the browser calls it with keepalive while `/api/macros` (mealsPending) does sheet/coach/sequence. Limits:
  4 builds per IP per hour, MEAL_AI_DAILY_CAP (default 300) per server per day. Sheet has "Favorite Foods" and
  "Foods Avoided" columns. Obstacles (`obstaclesFor`) and meal
  explanations (`content/site.ts` → `macroQuiz.meals[].why[goal]`) differ by goal. Emails in `lib/macro-email.ts`,
  API `app/api/macros/route.ts`, copy/meals in `content/site.ts` → `macroQuiz`. Leads go to the
  coach's email and a Google Sheet via an Apps Script webhook (`lib/sheets.ts`,
  `docs/google-sheet-setup.md`). Follow-up emails: Resend Automation "Macro quiz follow-up (day 2, 4, 7)" (ENABLED
  Nov 9, 2026), triggered by the `macro_quiz.completed` event (`lib/resend-events.ts`);
  `/api/apply` sends `coaching.applied`, which stops it. Day 2 = their obstacles + steps, payoff
  (goal date), reality, soft CTA; day 4 = biggest mistake for their goal; day 7 = check-in.
  Personalized pieces are built in `lib/sequence.ts` and sent in the event payload; templates
  macro-seq-1/2/3 live in Resend (copies in `docs/email-templates/`). Subjects: "👀 I found the problem in
  your quiz answers" / "❌ Stop doing this (it's why you're stuck)" / "🤔 Be honest with me…". Duplicate guard: the automation
  sets contact property `macro_sequence = started` and skips anyone who already has it. Footer address:
  1802 Charolais Court, Bel Air, MD 21015.
- Old Emergent URLs (/application, /vital-method-application) redirect in `next.config.mjs`.
- The application (`app/apply/ApplyForm.tsx`) is multi-step, one question per screen; step order
  is `STEPS` in `lib/application.ts`. Picking "Other" reveals a required text box (`otherArea`).
- Application questions live only in `lib/application.ts`; the form, validation and
  email all read from it.
- Run `npm test` after touching `lib/`. Run `npm run build` before pushing.
- Planned next: Instagram handle, then later a programs/shop page, Stripe Checkout for meal
  plans and training programs (one-time) and monthly coaching (subscription), with
  Supabase auth + storage so purchased PDFs are only downloadable by buyers.
- Design: dark theme, accent #6a9fc6 with gold #ffe7ab, large mobile-friendly tap targets. Most visitors
  are on phones.
