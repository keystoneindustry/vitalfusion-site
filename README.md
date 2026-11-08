# Vital Fusion Coaching — website

Next.js site with the coaching application form. When someone applies, you get
an email (same layout as your current one), and optionally the application is
saved to a Supabase database.

## What's here
- `app/apply/` — the application form at `/apply` (same questions as the old site)
- `app/api/apply/route.ts` — validates the form, emails you, saves to Supabase
- `lib/application.ts` — the questions and answer options (edit questions here)
- `lib/email.ts` — the notification email design
- `supabase/schema.sql` — database table (optional)
- `content/site.ts` — ALL homepage text (headline, about you, client results). Edit words here.
- `app/page.tsx` — homepage layout
- `public/` — put your photo here as `coach.jpg`, then set `photo: "/coach.jpg"` in `content/site.ts`

## Go live (about 20 minutes)
1. **GitHub:** create a new private repo and upload this folder's contents.
2. **Resend:** sign up at resend.com with the email you want applications sent to,
   then create an API key.
3. **Vercel:** sign up at vercel.com with GitHub → "Add New Project" → pick the repo.
   Before deploying, add these Environment Variables (see `.env.example`):
   - `RESEND_API_KEY` — from step 2
   - `NOTIFY_EMAIL` — where applications go
   - `FROM_EMAIL` — leave as `Vital Fusion Coaching <onboarding@resend.dev>` for now
4. Deploy, open `your-project.vercel.app/apply`, and submit a test application.
5. **Domain:** Vercel → Project → Settings → Domains → add `vitalfusioncoaching.com`
   and follow the DNS instructions at your domain registrar. Do this last, once
   the full site is ready, since it replaces the Emergent site.

### Optional
- **Branded sender + applicant confirmation:** in Resend, verify
  `vitalfusioncoaching.com` (GoDaddy: use Resend's Auto Configure button), then set
  `FROM_EMAIL=Vital Fusion Coaching <coaching@vitalfusioncoaching.com>` in Vercel and redeploy.
  Applicants then get the "we got your application" email (text + video link in
  `content/site.ts` → `confirmationEmail`).
- **Save applications to a database:** create a Supabase project, run
  `supabase/schema.sql` in its SQL editor, and add `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` in Vercel.

## Track where applicants come from
Link to `/apply?source=instagram`, `/apply?source=tiktok`, etc. The email shows
"Source: Instagram". No `source` = "Main Website".

## Local development
```
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000/apply
npm test                     # form validation + email tests
```
