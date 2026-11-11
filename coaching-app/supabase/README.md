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
- `phase3_food_log_and_plans` (Nov 10, 2026): tables `meal_logs`, `plans` (one open plan per client via a partial
  unique index; `updated_at` trigger), `food_cache` (USDA lookups); private storage bucket `meal-photos` (5 MB, images).
- `phase3_plan_parts` (Nov 10, 2026): `plans.drafting_part` (nutrition / training / both); old `failed` rows → `draft`.
- `phase4_habits_progress_calendar` (Nov 10, 2026): `habits` (seeded: Daily steps [kind steps], 10-minute walk after
  dinner, In bed by 10:30), `client_habits`, `habit_checks`, `schedules`, `weigh_ins`, `progress_photos`, `water_logs`;
  private bucket `progress-photos`; settings `default_weighin_days` (1,3,5) and `default_photo_every_weeks` (1).
- `phase4_resources` (Nov 10, 2026): `resources` table (pdf / video_file / video_link, category, unlock_week, published,
  sort); private bucket `resources` (50 MB, PDF + MP4/MOV/WebM).
- `phase5_checkins_forms` (Nov 10, 2026): `forms` (seeded "Weekly check-in", kind checkin, placeholder questions),
  `form_submissions` (answers + questions snapshot, AI summary, coach reply); `schedules.kind` now includes `form` with
  `form_id`; setting `checkin_email`.
- `water_habit` (Nov 11, 2026): habits.kind may be `water`; seeds the built-in "Drink your water" habit (💧). The starting
  setup assigns it as "Drink N oz of water" from the plan's water target. Tyler's 30 check-in questions were written into
  the seeded "Weekly check-in" form the same day (data update, not a migration).
