# Project notes for Claude Code

Vital Fusion Coaching (vitalfusioncoaching.com): online fitness coaching. The owner
is not a developer; explain changes plainly and keep the site simple.

- Stack: Next.js (App Router, TypeScript), plain CSS in `app/globals.css` (no Tailwind),
  hosted on Vercel. Email via Resend REST API (`lib/email.ts`), optional Supabase via
  REST (`lib/store.ts`). Avoid adding dependencies unless they clearly earn their place.
- The homepage is deliberately simple and only sells the coaching application (no free
  resources / blueprint / FAQ). Order: full-screen hero ("Start Now" + "See client results ↓")
  → client results → V.I.T.A.L. Method → your coach → closing Start Now. Every CTA goes to
  `/apply` (`/apply?age=…` pre-fills question 1). A phone-only sticky Start Now bar
  (`app/components/StickyApply.tsx`) appears after the hero scrolls away.
- All homepage copy lives in `content/site.ts`; layout in `app/page.tsx`; promo landing page in
  `app/vital-method/`. Images are in `public/images/`. Only add real client results and testimonials.
- CSS is phone-first: base rules are for phones, `@media (min-width: 860px)` for desktop.
  Keep the page lean (short copy, proof early, one repeated CTA).
- `/next-steps` is a hidden (noindex, not in nav) page linked only from the applicant
  confirmation email (`applicantEmail` in `lib/email.ts`). Copy in `content/site.ts` → `nextSteps`.
- `/macros` is a hidden (noindex) macro-calculator lead magnet for Instagram ("comment MACROS"
  via ManyChat → `/macros?source=macros`). Math + rules in `lib/macros.ts` (Mifflin-St Jeor;
  protein 0.8 g/lb max 180; fat 0.35 g/lb (0.42 for build muscle) max 80, up to 100 if carbs ≥100; carbs ≥100 g;
  fiber 14 g/1000 kcal; calorie floors; under-18 = maintenance for fat loss). Goal is the first
  question and branches the funnel: Lose fat → pace question + deficit; Build muscle → +200 kcal;
  Maintain → maintenance, no goal-weight question. Obstacles (`obstaclesFor`) and meal
  explanations (`content/site.ts` → `macroQuiz.meals[].why[goal]`) differ by goal. Emails in `lib/macro-email.ts`,
  API `app/api/macros/route.ts`, copy/meals in `content/site.ts` → `macroQuiz`. Leads go to the
  coach's email and a Google Sheet via an Apps Script webhook (`lib/sheets.ts`,
  `docs/google-sheet-setup.md`). Follow-up emails: Resend Automation "Macro quiz follow-up (day 2, 4, 7)" (currently disabled
  until the owner approves), triggered by the `macro_quiz.completed` event (`lib/resend-events.ts`);
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
