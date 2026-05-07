-- ============================================================
-- 팀 예산관리 시스템 - Supabase Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1. teams
-- ------------------------------------------------------------
create table public.teams (
  id    uuid primary key default uuid_generate_v4(),
  name  text not null,
  color text not null default '#0064FF',
  created_at timestamptz default now() not null
);

-- ------------------------------------------------------------
-- 2. profiles (extends auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  email    text not null,
  name     text not null,
  role     text not null default 'viewer'
             constraint profiles_role_check check (role in ('admin','manager','viewer')),
  team_id  uuid references public.teams(id) on delete set null,
  created_at timestamptz default now() not null
);

-- ------------------------------------------------------------
-- 3. monthly_headcounts
-- ------------------------------------------------------------
create table public.monthly_headcounts (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  fiscal_year integer not null,
  month       integer not null check (month between 1 and 12),
  headcount   integer not null default 0 check (headcount >= 0),
  note        text,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz default now() not null,
  constraint monthly_headcounts_unique unique (team_id, fiscal_year, month)
);

-- ------------------------------------------------------------
-- 4. expense_items  (실집행 항목)
-- ------------------------------------------------------------
create table public.expense_items (
  id           uuid primary key default uuid_generate_v4(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  fiscal_year  integer not null,
  month        integer not null check (month between 1 and 12),
  seq          integer not null,              -- 팀+연도+월 기준 자동 SEQ
  expense_date date not null,
  user_name    text not null,
  category     text not null,                -- 항목
  description  text not null default '',     -- 내용
  amount       bigint not null default 0 check (amount >= 0),
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now() not null,
  constraint expense_items_seq_unique unique (team_id, fiscal_year, month, seq)
);

-- ------------------------------------------------------------
-- 5. traffic_light_config (신호등 기준)
-- ------------------------------------------------------------
create table public.traffic_light_config (
  id              integer primary key default 1,
  green_min       integer not null default 80,
  green_max       integer not null default 100,
  yellow_low_min  integer not null default 60,
  yellow_high_max integer not null default 120,
  updated_at      timestamptz default now() not null,
  constraint single_row check (id = 1)
);
insert into public.traffic_light_config values (1, 80, 100, 60, 120, now())
  on conflict (id) do nothing;

-- ============================================================
-- Trigger: 회원가입 시 profiles 자동 생성
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'viewer'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.teams               enable row level security;
alter table public.profiles            enable row level security;
alter table public.monthly_headcounts  enable row level security;
alter table public.expense_items       enable row level security;
alter table public.traffic_light_config enable row level security;

-- teams
create policy "auth read teams"   on public.teams for select using (auth.role() = 'authenticated');
create policy "admin write teams" on public.teams for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admin update teams" on public.teams for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admin delete teams" on public.teams for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- profiles
create policy "auth read profiles"       on public.profiles for select using (auth.role() = 'authenticated');
create policy "admin update any profile" on public.profiles for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "self update profile"      on public.profiles for update using (id = auth.uid());

-- headcounts
create policy "auth read headcounts" on public.monthly_headcounts for select using (auth.role() = 'authenticated');
create policy "admin or manager upsert headcounts" on public.monthly_headcounts
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or (
      (select role from public.profiles where id = auth.uid()) = 'manager'
      and (select team_id from public.profiles where id = auth.uid()) = team_id
    )
  );

-- expense_items
create policy "auth read expenses" on public.expense_items for select using (auth.role() = 'authenticated');
create policy "admin or manager write expenses" on public.expense_items
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or (
      (select role from public.profiles where id = auth.uid()) = 'manager'
      and (select team_id from public.profiles where id = auth.uid()) = team_id
    )
  );

-- traffic_light_config
create policy "auth read config"   on public.traffic_light_config for select using (auth.role() = 'authenticated');
create policy "admin update config" on public.traffic_light_config for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
