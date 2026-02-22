-- =============================================================
-- demobase-app — Supabase schema
-- Run in: Supabase Dashboard > SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- EXTENSIONS
-- -------------------------------------------------------------
-- (uuid-ossp is enabled by default in Supabase)
-- create extension if not exists "uuid-ossp";


-- =============================================================
-- CREATE
-- =============================================================

-- -------------------------------------------------------------
-- watchlist — saved eBay searches / items per user
-- -------------------------------------------------------------
create table if not exists public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text not null,                       -- display name
  keyword     text,                                -- sold-items keyword
  item_id     text,                                -- eBay item ID (single item lookup)
  grade       smallint check (grade between 0 and 10),  -- null = any, 0 = ungraded
  exclude_jp  boolean not null default false,
  only_us     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- index for fast per-user queries
create index if not exists watchlist_user_id_idx on public.watchlist (user_id);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger watchlist_updated_at
  before update on public.watchlist
  for each row execute procedure public.set_updated_at();

-- Row Level Security: users can only see / modify their own rows
alter table public.watchlist enable row level security;

create policy "watchlist: select own"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "watchlist: insert own"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "watchlist: update own"
  on public.watchlist for update
  using (auth.uid() = user_id);

create policy "watchlist: delete own"
  on public.watchlist for delete
  using (auth.uid() = user_id);


-- =============================================================
-- DROP  (run section manually — order matters for FK deps)
-- =============================================================

-- drop trigger  if exists watchlist_updated_at  on public.watchlist;
-- drop function if exists public.set_updated_at();
-- drop table    if exists public.watchlist;
