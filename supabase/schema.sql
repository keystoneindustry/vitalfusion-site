-- Run once in Supabase → SQL Editor. Stores every coaching application so you
-- have a searchable list (and a starting point for a client dashboard later).

create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text not null default 'new'
                check (status in ('new', 'contacted', 'call_booked', 'client', 'declined')),
  source        text not null default 'Main Website',
  age_range     text not null,
  fitness_level text not null,
  help_areas    text[] not null,
  goal          text not null,
  why_now       text not null,
  full_name     text not null,
  email         text not null,
  phone         text not null,
  instagram     text
);

create index if not exists applications_created_at_idx on public.applications (created_at desc);

-- Lock the table down: only the server (service role key) can read or write.
alter table public.applications enable row level security;
