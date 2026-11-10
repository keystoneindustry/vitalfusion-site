# Database changes

Applied to the Supabase project "VFCoaching App" (`bcwytsuqudwghxctxoef`) through the Supabase
connector. Listed here so the history lives with the code.

- `phase1_coach_crm` (Nov 10, 2026): `client_stage` enum (lead, invited, onboarding, active, paused,
  finished); tables `profiles`, `clients`, `client_events`; `updated_at` trigger on `clients`; RLS on.
- `phase1_tidy_policies` (Nov 10, 2026): coach check moved to `private.is_coach()` (not exposed by the
  API). Rules: people read their own profile/client row, the coach reads and manages all.

The app itself uses the secret key on the server, and checks who is signed in in `lib/auth.ts`.
- `phase1_table_grants` (Nov 10, 2026): this project does NOT auto-grant new tables to the API roles. Grants for
  service_role/authenticated, plus default privileges for future tables in `public`.
- `phase2_onboarding` (Nov 10, 2026): `clients` gets onboarding_step, onboarding_completed_at, kickoff_at,
  kickoff_booking_uid, health_flag, health_note; tables `onboarding_responses`, `agreements`, `app_settings`
  (welcome_video_url, kickoff_link, checkin_link); private storage bucket `agreements` for signed PDFs.
