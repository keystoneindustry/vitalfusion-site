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
- `/macros` is a hidden (noindex) lead magnet called the **Nutrition Plan Calculator** (never "macro calculator" in anything people see; the URL stays /macros, event name stays macro_quiz.completed) for Instagram ("comment MACROS"
  via ManyChat → `/macros?source=macros`). Math + rules in `lib/macros.ts` (Mifflin-St Jeor;
  protein 0.9 g/lb (1.0 for build muscle) max 180; fat 0.35 g/lb (0.42 for build muscle) max 80, up to 100 if carbs ≥100, NEVER below 40 g; carbs ≥100 g;
  fiber 14 g/1000 kcal; calorie floors; fat loss: under 16 = maintenance, 16–17 = normal deficit at their chosen pace plus an under-18 note). Goal is the first
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
  "Foods Avoided" columns. Under the sample day: "Download my meal plan (PDF)" (`lib/nutrition-pdf.ts`, browser-only):
  pages drawn on canvas in Inter, styled like Tyler's coaching guides (dark cover + gold title line, white pages
  with logo header, blue labels, dark callouts with gold labels), embedded as JPEGs in a hand-built PDF with a
  clickable Apply link. Worded as a free sample plan, not a client document. Obstacles (`obstaclesFor`) and meal
  explanations (`content/site.ts` → `macroQuiz.meals[].why[goal]`) differ by goal. Emails in `lib/macro-email.ts`,
  API `app/api/macros/route.ts`, copy/meals in `content/site.ts` → `macroQuiz`. Leads go to the
  coach's email and a Google Sheet via an Apps Script webhook (`lib/sheets.ts`,
  `docs/google-sheet-setup.md`). Follow-up emails: Resend Automation "Macro quiz follow-up (day 2, 4, 7)" (ENABLED
  Nov 9, 2026), triggered by the `macro_quiz.completed` event (`lib/resend-events.ts`);
  `/api/apply` sends `coaching.applied`, which stops it. Day 2 = their obstacles + steps, payoff
  (goal date), reality, their favourite foods (`foods_line` → template var FOODS_LINE), soft CTA; day 4 = biggest mistake for their goal; day 7 = check-in.
  Every live-site signup is also added to the Resend segment "Nutrition Plan Calculator" (`addToCalculatorSegment` in `lib/resend-events.ts`, production only) for manual Broadcasts. Personalized pieces are built in `lib/sequence.ts` and sent in the event payload; templates
  macro-seq-1/2/3 live in Resend (copies in `docs/email-templates/`). Subjects: "👀 I found the problem in
  your quiz answers" / "❌ Stop doing this (it's why you're stuck)" / "🤔 Be honest with me…". Duplicate guard: the automation
  sets contact property `macro_sequence = started` and skips anyone who already has it. Footer address:
  1802 Charolais Court, Bel Air, MD 21015.
- Free 60-day meal plans (reel #024, Instagram "comment PLAN" via ManyChat): hidden (noindex) pages `/plan/workday`
  ("The 9-to-5 Plan") and `/plan/everyday` ("The Everyday Plan"), links `/plan/<slug>?source=instagram`. Config + validation in
  `lib/meal-plans.ts`; page `app/plan/[slug]/` (name + email → thank-you screen with the PDF download right away). PDFs are
  static files in `public/plans/` (built outside the repo from the amounts in the Claude project note
  `claude/meal-plan-guides-024.md`). `/api/meal-plan` emails the PDF link at once (`lib/meal-plan-email.ts`), sends
  `meal_plan_workday.requested` / `meal_plan_everyday.requested` (Resend Automations "Meal plan follow-up – 9-to-5 / Everyday
  (day 2, 5, 8)", stopped by `coaching.applied`, duplicate guard contact property `meal_plan_<slug>_sequence = started`,
  sets `meal_plan`), adds them to the one Resend segment "60-Day Meal Plan (both plans)" (`addToSegment`, production only;
  the Resend plan allows only 3 segments), saves a `meal_plan` funnel lead (details.plan) and emails the coach. Templates
  "Meal plan <Plan> 1/2/3" live in Resend (copies + generator in `docs/email-templates/meal-plan/`). Their coaching buttons
  go to `/?source=meal-plan-<slug>-email`; the PDF's to `/?source=meal-plan-<slug>-pdf`. Charlie's graph for emails:
  `public/images/email/charlie-graph.jpg`.
- Free Fat Loss Grocery List (Instagram "comment LIST" via ManyChat): hidden (noindex) page `/grocery-list`
  (`/grocery-list?source=instagram`), form `app/grocery-list/GroceryListForm.tsx` (same look as the meal plan pages), config,
  validation and emails in `lib/grocery-list.ts`, PDF `public/plans/fat-loss-grocery-list.pdf` (built outside the repo; its
  coaching button goes to `/?source=grocery-list`). `/api/grocery-list` emails the PDF link, sends `grocery_list.signed_up`
  (Resend Automation "Grocery list follow-up (day 2, 4, 7)", stopped by `coaching.applied`, duplicate guard contact
  property `grocery_list_sequence = started`; templates "Grocery list 1/2/3", copies + generator in
  `docs/email-templates/grocery-list/`, buttons go to `/?source=grocery-list-email`), saves a `grocery_list` funnel lead
  and emails the coach. No Resend segment (all 3 used). Subjects are set on each automation step (they override the
  template's subject), so change both.
- The Blueprint (free guide, drafted Nov 26, 2026; NOT live until Tyler approves): hidden page `/blueprint`
  (`/blueprint?source=instagram`), form `app/blueprint/BlueprintForm.tsx`, config, validation and emails in
  `lib/blueprint.ts`, PDF `public/plans/the-blueprint.pdf` (source `docs/pdf-source/blueprint/build.py`, run with Python +
  Playwright; drop Tyler's photo in as `straight-arm-pulldown.jpg` next to it; its coaching button goes to
  `/?source=blueprint`). For men with full-time jobs: 3-day split, cardio, the 9-to-5 plan's 1,800-calorie meals + grocery
  list, recovery, supplements. Tyler wants this PDF plain (no cards, tiles or pills) and no "results vary" line next to the
  meal plan. `/api/blueprint` emails the PDF link, sends `blueprint.signed_up` (Resend Automation "Blueprint follow-up
  (day 2, 4, 7, 10, 14)", stopped by `coaching.applied`, duplicate guard contact property `blueprint_sequence = started`;
  templates "Blueprint 1–5", copies + generator in `docs/email-templates/blueprint/`, buttons go to
  `/?source=blueprint-email`), saves a `blueprint` funnel lead (Supabase `record_funnel_lead` + `funnel_leads_kind_check`
  must allow 'blueprint') and emails the coach ("New blueprint lead: Name"). No Resend segment.
- Conversion tracking: every live calculator signup, meal plan request, grocery list request and application is also saved to the coaching app's Supabase
  (project bcwytsuqudwghxctxoef) table `funnel_leads` via the insert-only RPC `record_funnel_lead` (`lib/funnel.ts`,
  publishable key + FUNNEL_TOKEN env, production only). The business dashboard joins it with `clients` by email.
  Tracking links: `/macros?source=<platform>` and `/?source=<platform>` (instagram, youtube, facebook, tiktok).
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
- Example foods in tips (results page + day 2 email) use tokens like `{protein:4}` filled by `fillFoods()`
  in `lib/foods.ts`, so nobody is shown a food they said they don't eat.
- Legal (Nov 23, 2026, approved by Tyler): hidden (noindex, not in the menu) pages `/terms` and `/privacy`, text in
  `content/legal.ts`, rendered by `app/components/LegalPage.tsx`. Footer (`SiteChrome.tsx`) links both + a one-line
  "not medical advice" disclaimer; the application's last step says "By applying, you agree to our Terms of Service and
  Privacy Policy." The coaching app's sign-in screen links them too. Keep them in sync with the app's coaching agreement
  (coaching-app/lib/agreement.ts): no refunds once paid, monthly cancel by email, Maryland law. No "last updated" line is shown (Tyler's call); LEGAL_UPDATED is kept for reference only.
