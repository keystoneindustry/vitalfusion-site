# Database changes

Applied to the Supabase project "VFCoaching App" (`bcwytsuqudwghxctxoef`) through the Supabase
connector. Listed here so the history lives with the code.

- `phase1_coach_crm` (Nov 10, 2026): `client_stage` enum (lead, invited, onboarding, active, paused,
  finished); tables `profiles`, `clients`, `client_events`; `updated_at` trigger on `clients`; RLS on.
- `phase1_tidy_policies` (Nov 10, 2026): coach check moved to `private.is_coach()` (not exposed by the
  API). Rules: people read their own profile/client row, the coach reads and manages all.

The app itself uses the secret key on the server, and checks who is signed in in `lib/auth.ts`.
