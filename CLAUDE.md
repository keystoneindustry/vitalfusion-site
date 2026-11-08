# Project notes for Claude Code

Vital Fusion Coaching (vitalfusioncoaching.com): online fitness coaching. The owner
is not a developer; explain changes plainly and keep the site simple.

- Stack: Next.js (App Router, TypeScript), plain CSS in `app/globals.css` (no Tailwind),
  hosted on Vercel. Email via Resend REST API (`lib/email.ts`), optional Supabase via
  REST (`lib/store.ts`). Avoid adding dependencies unless they clearly earn their place.
- All homepage copy lives in `content/site.ts`; layout in `app/page.tsx`. The results
  section is hidden while `results` is empty. Only add real client results.
- Application questions live only in `lib/application.ts`; the form, validation and
  email all read from it.
- Run `npm test` after touching `lib/`. Run `npm run build` before pushing.
- Planned next: fill in About + real results + coach photo, then later a programs/shop page, Stripe Checkout for meal
  plans and training programs (one-time) and monthly coaching (subscription), with
  Supabase auth + storage so purchased PDFs are only downloadable by buyers.
- Design: dark theme, accent #6a9fc6, large mobile-friendly tap targets. Most visitors
  are on phones.
