-- The Brasshaven Files -- leaderboard schema.
--
-- Run this once in the Supabase SQL editor (or via the CLI) before setting
-- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the deployment.

create table if not exists ctf_players (
  id         uuid primary key default gen_random_uuid(),
  handle     text not null,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness: "Cordelia" and "cordelia" are the same detective.
-- A plain `unique` on handle would let both exist and confuse the board.
create unique index if not exists ctf_players_handle_lower_idx
  on ctf_players (lower(handle));

create table if not exists ctf_solves (
  player_id    uuid not null references ctf_players (id) on delete cascade,
  challenge_id text not null,
  points       integer not null check (points >= 0),
  hints_used   integer not null default 0 check (hints_used >= 0),
  solved_at    timestamptz not null default now(),
  -- One row per player per challenge, so a replayed submission cannot bank
  -- points twice even if the application layer were bypassed.
  primary key (player_id, challenge_id)
);

create table if not exists ctf_hints (
  player_id    uuid not null references ctf_players (id) on delete cascade,
  challenge_id text not null,
  hints_used   integer not null default 0 check (hints_used >= 0),
  primary key (player_id, challenge_id)
);

create index if not exists ctf_solves_player_idx on ctf_solves (player_id);

-- Row level security is enabled with no policies, which denies all access to
-- the anon and authenticated roles. The application reaches these tables only
-- through the service role key, which bypasses RLS and never leaves the server.
-- Without this, anyone holding the public anon key could write their own scores.
alter table ctf_players enable row level security;
alter table ctf_solves  enable row level security;
alter table ctf_hints   enable row level security;
