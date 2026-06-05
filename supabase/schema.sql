-- =====================================================
-- EARNIZI Supabase Schema
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- =====================================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  username text unique,
  email text unique not null,
  phone text,
  country text default 'NG',
  currency text default 'NGN',
  balance numeric default 0,
  total_earnings numeric default 0,
  is_admin boolean default false,
  is_paid boolean default false,
  referral_code text unique,
  level1_count int default 0,
  level2_count int default 0,
  level3_count int default 0,
  referral_clicks int default 0,
  referred_by uuid references profiles on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create trigger to auto-set admin for honestansah@gmail.com
create or replace function set_admin_on_signup()
returns trigger as $$
begin
  if new.email = 'honestansah@gmail.com' then
    new.is_admin := true;
    new.is_paid := true;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_set_admin
before insert on profiles
for each row
execute function set_admin_on_signup();

-- Automatically create a profile whenever a Supabase Auth user is created.
-- This is required for Google OAuth, normal signup, and manually-created auth users.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  generated_username text;
  generated_country text;
  generated_currency text;
begin
  generated_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  generated_country := coalesce(new.raw_user_meta_data->>'country', 'NG');
  generated_currency := coalesce(new.raw_user_meta_data->>'currency', 'NGN');

  insert into public.profiles (
    id,
    name,
    username,
    email,
    phone,
    country,
    currency,
    is_admin,
    is_paid,
    referral_code
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', generated_username),
    generated_username || '-' || substr(new.id::text, 1, 6),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    generated_country,
    generated_currency,
    new.email = 'honestansah@gmail.com',
    new.email = 'honestansah@gmail.com',
    coalesce(new.raw_user_meta_data->>'referral_code', 'EAR-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)))
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- =====================================================
-- PRODUCTS TABLE (ALL FREE)
-- =====================================================
create table products (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text,
  icon text,
  is_free boolean default true,
  link text,
  platform text,
  created_by uuid references profiles on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  icon text,
  created_at timestamptz default now()
);

-- Seed categories
insert into categories (name, icon) values
  ('Finance', '💰'),
  ('Marketing', '📈'),
  ('Social Media', '📱'),
  ('Education', '🎓'),
  ('Technology', '💻'),
  ('Other', '📦')
on conflict do nothing;

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles on delete set null,
  type text check (type in ('deposit', 'withdraw', 'earn', 'payment')),
  amount numeric,
  status text default 'pending' check (status in ('pending', 'completed', 'rejected')),
  method text,
  reference text,
  proof_url text,
  created_at timestamptz default now()
);

-- =====================================================
-- ADMIN CONFIGS TABLE
-- =====================================================
create table admin_configs (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value jsonb,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed admin configs
insert into admin_configs (key, value, description) values
  ('rewards_api_endpoint', '{\"url\": \"\"}', 'Rewards API endpoint'),
  ('rewards_api_key', '{\"key\": \"\"}', 'Rewards API key'),
  ('chariow_merchant_id', '{\"merchant_id\": \"\"}', 'Chariow merchant ID'),
  ('ai_endpoint', '{\"url\": \"\"}', 'AI verification endpoint'),
  ('ai_api_key', '{\"key\": \"\"}', 'AI API key'),
  ('rewards_enabled', '{\"enabled\": true}', 'Enable/disable all rewards'),
  ('payment_references', '{"mtn": "", "orange": "", "paypal": "", "bank": ""}', 'Payment method reference tokens')
on conflict do nothing;

-- =====================================================
-- PENDING PAYMENTS TABLE
-- =====================================================
create table pending_payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles on delete set null,
  user_name text,
  user_email text,
  amount numeric,
  method text,
  proof_url text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  ai_confidence numeric,
  ai_verified boolean default false,
  reviewed_by uuid references profiles on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- =====================================================
-- ACCOUNT CREDENTIALS TABLE (for account-type products)
-- =====================================================
create table account_credentials (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products on delete cascade,
  platform text,
  credential1_label text default 'Email',
  credential1_value text,
  credential2_label text default 'Password',
  credential2_value text,
  created_at timestamptz default now()
);

-- =====================================================
-- REWARD CONFIGS TABLE
-- =====================================================
create table reward_configs (
  id uuid default gen_random_uuid() primary key,
  name text,
  type text check (type in ('video', 'game', 'task')),
  api_endpoint text,
  api_key text,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- Seed reward configs (ready for Rapido or similar)
insert into reward_configs (name, type, api_endpoint, api_key, enabled) values
  ('Video Rewards API', 'video', 'https://api.rapido.com/v1/rewards/video', '', false),
  ('Game Rewards API', 'game', 'https://api.rapido.com/v1/rewards/game', '', false)
on conflict do nothing;

-- =====================================================
-- CHATS AND MESSAGES TABLES
-- =====================================================
create table chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles on delete set null,
  admin_id uuid references profiles on delete set null,
  status text default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now()
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats on delete cascade,
  sender_id uuid references profiles on delete set null,
  text text,
  time timestamptz default now(),
  priority text check (priority in ('high', 'medium', 'low'))
);

-- =====================================================
-- REFERRALS TABLE
-- =====================================================
create table referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references profiles on delete set null,
  referred_id uuid references profiles on delete set null,
  level int check (level in (1, 2, 3)),
  status text default 'active',
  created_at timestamptz default now()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
alter table profiles enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;
alter table admin_configs enable row level security;
alter table pending_payments enable row level security;
alter table account_credentials enable row level security;
alter table reward_configs enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;
alter table referrals enable row level security;

-- =====================================================
-- POLICIES
-- =====================================================

-- Profiles: Users can view all, update own
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() is not null);

-- Products: All can view, admin only create/update/delete
create policy "products_select" on products for select using (true);
create policy "products_admin" on products for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Categories: All can view
create policy "categories_select" on categories for select using (true);

-- Transactions: Users view own, admin all
create policy "transactions_select_own" on transactions for select using (auth.uid() = user_id);
create policy "transactions_admin" on transactions for select using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "transactions_insert" on transactions for insert with check (auth.uid() = user_id);

-- Admin configs: Admin only
create policy "admin_configs_admin" on admin_configs for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Pending payments: Users insert own, admin all
create policy "pending_payments_select_own" on pending_payments for select using (auth.uid() = user_id);
create policy "pending_payments_admin" on pending_payments for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "pending_payments_insert" on pending_payments for insert with check (auth.uid() = user_id);

-- Account credentials: Admin only
create policy "account_credentials_admin" on account_credentials for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Reward configs: Admin only
create policy "reward_configs_admin" on reward_configs for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Chats: Users view own, admin all
create policy "chats_select" on chats for select using (
  auth.uid() = user_id or auth.uid() = admin_id or
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "chats_insert" on chats for insert with check (auth.uid() = user_id);

-- Messages: Users view own chat messages, admin all
create policy "messages_select" on messages for select using (
  exists (select 1 from chats where chats.id = messages.chat_id and (chats.user_id = auth.uid() or chats.admin_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and is_admin = true)))
);
create policy "messages_insert" on messages for insert with check (auth.uid() = sender_id);

-- Referrals: Users view own, admin all
create policy "referrals_select_own" on referrals for select using (auth.uid() = referrer_id);
create policy "referrals_admin" on referrals for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- =====================================================
-- TRIGGERS FOR UPDATED AT
-- =====================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles
for each row execute function update_updated_at();

create trigger update_products_updated_at before update on products
for each row execute function update_updated_at();

create trigger update_admin_configs_updated_at before update on admin_configs
for each row execute function update_updated_at();

-- Backfill profiles for auth users that were created before this schema/trigger existed.
insert into public.profiles (
  id,
  name,
  username,
  email,
  phone,
  country,
  currency,
  is_admin,
  is_paid,
  referral_code
)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) || '-' || substr(u.id::text, 1, 6),
  u.email,
  coalesce(u.raw_user_meta_data->>'phone', ''),
  coalesce(u.raw_user_meta_data->>'country', 'NG'),
  coalesce(u.raw_user_meta_data->>'currency', 'NGN'),
  u.email = 'honestansah@gmail.com',
  u.email = 'honestansah@gmail.com',
  coalesce(u.raw_user_meta_data->>'referral_code', 'EAR-' || upper(substr(replace(u.id::text, '-', ''), 1, 8)))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;