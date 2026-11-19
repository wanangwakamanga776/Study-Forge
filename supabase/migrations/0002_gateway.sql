-- Study Forge 2.0 — gateway support: usage log, credit grants, XP awards, FTS.

create table usage_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null,
  provider text not null,
  model text,
  tier text not null check (tier in ('A','B','C')),
  cache_hit boolean not null default false,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  day date not null default current_date,
  created_at timestamptz not null default now()
);
create index on usage_log(day);
create index on usage_log(user_id, day);
alter table usage_log enable row level security;
-- No policies: service role only.

-- Idempotent credit grant (daily allowance, quest bonus, guest grant).
create or replace function grant_credits(p_user uuid, p_amount int, p_reason text, p_idem text, p_day date default current_date)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into credit_ledger(user_id, delta, reason, idem_key, day)
  values (p_user, p_amount, p_reason, p_idem, p_day)
  on conflict (user_id, idem_key) do nothing;
end $$;
revoke all on function grant_credits(uuid, int, text, text, date) from public, anon, authenticated;

-- Idempotent XP award (server-written only).
create or replace function award_xp(p_user uuid, p_amount int, p_reason text, p_idem text, p_day date default current_date)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into xp_events(user_id, amount, reason, idem_key, day)
  values (p_user, greatest(0, least(500, p_amount)), p_reason, p_idem, p_day)
  on conflict (user_id, idem_key) do nothing;
end $$;
revoke all on function award_xp(uuid, int, text, text, date) from public, anon, authenticated;

-- Server-written streak upsert (client cannot write streaks).
create or replace function set_streak(p_user uuid, p_current int, p_best int, p_last_day date, p_freezes int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into streaks(user_id, current, best, last_day, freezes)
  values (p_user, greatest(0, p_current), greatest(0, p_best), p_last_day, greatest(0, least(2, p_freezes)))
  on conflict (user_id) do update set
    current = excluded.current,
    best = excluded.best,
    last_day = excluded.last_day,
    freezes = excluded.freezes;
end $$;
revoke all on function set_streak(uuid, int, int, date, int) from public, anon, authenticated;

-- Today's AI spend for the hard daily cap.\ncreate or replace function spend_today()\nreturns numeric language sql stable security definer set search_path = public as \n  select coalesce(sum(cost_usd), 0) from usage_log where day = current_date;\n;\nrevoke all on function spend_today() from public, anon, authenticated;\n\n-- Full FSRS card snapshot (library-specific fields) alongside the mirrored columns.\n\nalter table card_state add column if not exists fsrs jsonb;\n\n-- Full-text search over chunks (cheap retrieval before embeddings).
alter table source_chunks
  add column if not exists fts tsvector generated always as (to_tsvector('english', text)) stored;
create index if not exists source_chunks_fts_idx on source_chunks using gin (fts);

create or replace function search_chunks(p_forge uuid, p_query text, p_limit int default 6)
returns table (id uuid, source_id uuid, text text, rank real)
language sql stable security invoker set search_path = public as $$
  select c.id, c.source_id, c.text,
         ts_rank(c.fts, websearch_to_tsquery('english', p_query)) as rank
  from source_chunks c
  where c.forge_id = p_forge
    and c.fts @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit greatest(1, least(20, p_limit));
$$;
