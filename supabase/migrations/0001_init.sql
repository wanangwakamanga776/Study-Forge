-- Study Forge 2.0 core schema (Supabase/Postgres 15+). Validated on PG16 with an auth stub.
create extension if not exists pgcrypto;

create type source_kind as enum ('pdf','text','url','image','youtube','topic');
create type card_kind   as enum ('concept','fact','application');
create type quest_kind  as enum ('review','lesson','practice','source');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  curriculum text check (curriculum in ('AP','SAT','COLLEGE','GCSE','ALEVEL','IB')),
  daily_goal_xp int not null default 30 check (daily_goal_xp between 10 and 200),
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table forges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  curriculum text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index on forges(owner_id) where archived_at is null;

create table sources (
  id uuid primary key default gen_random_uuid(),
  forge_id uuid not null references forges(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind source_kind not null,
  title text not null,
  content_hash text,
  storage_path text,
  token_estimate int,
  created_at timestamptz not null default now()
);
create index on sources(forge_id);

create table source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  forge_id uuid not null references forges(id) on delete cascade,
  idx int not null,
  text text not null,
  unique (source_id, idx)
);

create table units (
  id uuid primary key default gen_random_uuid(),
  forge_id uuid not null references forges(id) on delete cascade,
  position int not null,
  title text not null,
  unique (forge_id, position)
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  forge_id uuid not null references forges(id) on delete cascade,
  position int not null,
  title text not null,
  body jsonb not null,
  gen_cache_key text,
  unique (unit_id, position)
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  forge_id uuid not null references forges(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  kind card_kind not null default 'concept',
  front text not null,
  explanation text,
  application text,
  source_chunk_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on cards(forge_id);

-- One row per (user, card): FSRS state lives here. Mastery is derived, XP is separate.
create table card_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  due timestamptz not null default now(),
  stability real not null default 0,
  difficulty real not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state smallint not null default 0 check (state between 0 and 3),
  last_review timestamptz,
  primary key (user_id, card_id)
);
create index on card_state(user_id, due);

create table review_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  ms_taken int,
  reviewed_at timestamptz not null default now()
);
create index on review_log(user_id, reviewed_at desc);

create table xp_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null check (amount between 0 and 500),
  reason text not null,
  idem_key text not null,
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, idem_key)
);
create index on xp_events(user_id, day);

create table streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current int not null default 0,
  best int not null default 0,
  last_day date,
  freezes int not null default 0 check (freezes between 0 and 2)
);

-- AI credits: ledger is append-only; balance is a view. Cache hits cost 0.
create table credit_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  idem_key text not null,
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, idem_key)
);
create index on credit_ledger(user_id, day);

create table gen_cache (
  cache_key text primary key,          -- sha256(task|model-version|prompt-version|input hash)
  task text not null,
  payload jsonb not null,
  tokens_in int, tokens_out int,
  created_at timestamptz not null default now()
);

create view credit_balance with (security_invoker = true) as
  select user_id, coalesce(sum(delta),0)::int as balance from credit_ledger group by user_id;

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table forges enable row level security;
alter table sources enable row level security;
alter table source_chunks enable row level security;
alter table units enable row level security;
alter table lessons enable row level security;
alter table cards enable row level security;
alter table card_state enable row level security;
alter table review_log enable row level security;
alter table xp_events enable row level security;
alter table streaks enable row level security;
alter table credit_ledger enable row level security;
alter table gen_cache enable row level security;

create policy own_profile on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_forge on forges for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_sources on sources for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_chunks on source_chunks for all
  using (exists (select 1 from forges f where f.id = forge_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from forges f where f.id = forge_id and f.owner_id = auth.uid()));
create policy own_units on units for all
  using (exists (select 1 from forges f where f.id = forge_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from forges f where f.id = forge_id and f.owner_id = auth.uid()));
create policy own_lessons on lessons for all
  using (exists (select 1 from forges f where f.id = forge_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from forges f where f.id = forge_id and f.owner_id = auth.uid()));
create policy own_cards on cards for all
  using (exists (select 1 from forges f where f.id = forge_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from forges f where f.id = forge_id and f.owner_id = auth.uid()));
create policy own_state on card_state for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_reviews on review_log for select using (user_id = auth.uid());
create policy add_reviews on review_log for insert with check (user_id = auth.uid());
-- XP, streaks and credits are written ONLY by server functions (service role). Users can read.
create policy read_xp on xp_events for select using (user_id = auth.uid());
create policy read_streak on streaks for select using (user_id = auth.uid());
create policy read_credits on credit_ledger for select using (user_id = auth.uid());
-- gen_cache: no policies = no client access (service role only).

-- Anonymous users may not create credit-costly sources beyond a small cap (restrictive policy).
create policy anon_source_cap on sources as restrictive for insert
  with check (
    not coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
    or (select count(*) from sources s where s.owner_id = auth.uid()) < 3
  );

-- Atomic credit spend: returns false if insufficient. Called by the gateway with service role.
create or replace function spend_credits(p_user uuid, p_cost int, p_reason text, p_idem text)
returns boolean language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  if exists (select 1 from credit_ledger where user_id = p_user and idem_key = p_idem) then
    return true; -- retry of an already-charged request
  end if;
  select coalesce(sum(delta),0) into bal from credit_ledger where user_id = p_user;
  if bal < p_cost then return false; end if;
  insert into credit_ledger(user_id, delta, reason, idem_key) values (p_user, -p_cost, p_reason, p_idem);
  return true;
end $$;
revoke all on function spend_credits(uuid,int,text,text) from public, anon, authenticated;
