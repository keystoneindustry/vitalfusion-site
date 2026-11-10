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
  and emails our own branded link through Resend (`lib/email.ts`). The link opens `/auth/confirm`, which
  needs a tap on "Sign in" (so email scanners can't use up the token) and then sets two httpOnly cookies
  (`lib/session.ts`). Expired access tokens are refreshed through `/auth/refresh?next=…`.
- Roles: emails in `COACH_EMAILS` are the coach (→ `/coach`); everyone else must have a row in
  `clients` (→ the client app at `/`). Unknown emails get the same "check your email" screen but no email.
- Coach CRM: `/coach` (client list, flags), `/coach/clients/new` (add + invite), `/coach/clients/[id]`
  (edit package dates, stage, notes, resend invite, timeline). Server actions in `app/coach/actions.ts`.
- Client app: five tabs in `app/(client)/` — Today, Calendar, Train, Learn, Progress — plus `/install`.
  Installable PWA: `app/manifest.ts`, icons in `public/icons/`, service worker `public/sw.js`.
- Dates: package math lives in `lib/dates.ts` (end date = start + weeks × 7 − 1 day). Dates are stored as
  plain `YYYY-MM-DD` and handled as UTC so they never shift a day.
- Run `npm test` after touching `lib/`. Design matches the site: dark theme, accent #6a9fc6, gold #ffe7ab,
  phone-first CSS with `@media (min-width: 860px)` for desktop.
