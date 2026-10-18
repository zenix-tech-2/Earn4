-- EARNIZI storefront + video-only rewards upgrade.
-- Apply after supabase/schema.sql on an existing EARNIZI project.
-- Safe to re-run: tables, columns, indexes and policies are guarded/idempotent.

create extension if not exists pgcrypto;

-- Public catalog metadata; fulfilment secrets stay in account_credentials / provider tables.
alter table public.products add column if not exists price numeric(12,2) not null default 0;
alter table public.products add column if not exists currency text not null default 'XAF';
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists is_featured boolean not null default false;
alter table public.products add column if not exists product_type text not null default 'digital';
alter table public.products add column if not exists inventory_count integer;
alter table public.products add column if not exists sort_order integer not null default 0;
alter table public.products add column if not exists delivery_notes text;

alter table public.categories add column if not exists slug text;
alter table public.categories add column if not exists description text;
alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.categories add column if not exists sort_order integer not null default 0;
update public.categories
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';
alter table public.categories alter column slug set not null;
create unique index if not exists categories_slug_uidx on public.categories (slug);
insert into public.categories (name, icon, slug, description, sort_order, is_active) values
  ('Virtual Numbers', 'phone', 'virtual-numbers', 'Private OTP numbers from around the world.', 1, true),
  ('Social Media Accounts', 'users', 'social-media', 'Accounts and creator essentials for popular platforms.', 2, true),
  ('Residential Proxies', 'shield-check', 'residential-proxies', 'Residential IP tools for safer browsing.', 3, true),
  ('Premium Apps', 'crown', 'premium-apps', 'Premium access to everyday apps.', 4, true),
  ('Pro Accounts & Subscriptions', 'play', 'subscriptions', 'Streaming, creator, and productivity plans.', 5, true),
  ('Digital Products', 'package', 'digital-products', 'Downloads, websites, software, and eBooks.', 6, true)
on conflict (slug) do update set
  icon = excluded.icon,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;
create index if not exists products_catalog_idx on public.products (is_active, is_featured desc, sort_order, created_at desc);

-- Existing app allowed game/task rewards. EARNIZI deliberately uses video campaigns only.
alter table public.reward_configs drop constraint if exists reward_configs_type_check;
delete from public.reward_configs where type in ('game', 'task');
update public.reward_configs set type = 'video' where type is null;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reward_configs_video_only_check'
      and conrelid = 'public.reward_configs'::regclass
  ) then
    alter table public.reward_configs
      add constraint reward_configs_video_only_check check (type = 'video');
  end if;
end $$;

create table if not exists public.video_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  reward_amount numeric(12,2) not null check (reward_amount > 0),
  currency text not null default 'XAF',
  duration_seconds integer not null default 30 check (duration_seconds between 5 and 3600),
  daily_limit integer not null default 3 check (daily_limit between 1 and 100),
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_watch_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.video_campaigns(id) on delete restrict,
  status text not null default 'watching' check (status in ('watching', 'completed', 'expired')),
  reward_amount numeric(12,2) not null check (reward_amount >= 0),
  currency text not null,
  started_at timestamptz not null default now(),
  watched_seconds numeric(12,3) not null default 0 check (watched_seconds >= 0),
  last_position_seconds numeric(12,3) not null default 0 check (last_position_seconds >= 0),
  last_progress_at timestamptz not null default now(),
  player_ended_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.video_watch_sessions add column if not exists watched_seconds numeric(12,3) not null default 0;
alter table public.video_watch_sessions add column if not exists last_position_seconds numeric(12,3) not null default 0;
alter table public.video_watch_sessions add column if not exists last_progress_at timestamptz not null default now();
alter table public.video_watch_sessions add column if not exists player_ended_at timestamptz;
update public.video_watch_sessions set last_progress_at = started_at where last_progress_at is null;
create index if not exists video_sessions_user_day_idx on public.video_watch_sessions (user_id, campaign_id, created_at desc);

-- Append-only account ledger. Wallet credits from videos happen inside a database transaction.
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_type text not null check (entry_type in ('credit', 'debit')),
  source text not null check (source in ('video_reward', 'store_purchase', 'deposit', 'withdrawal', 'admin_adjustment', 'referral')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'XAF',
  reference_key text not null unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_user_created_idx on public.wallet_ledger (user_id, created_at desc);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded')),
  currency text not null default 'XAF',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_attempt_id uuid,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists store_orders_user_created_idx on public.store_orders (user_id, created_at desc);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title_snapshot text not null,
  quantity integer not null default 1 check (quantity between 1 and 100),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  currency text not null default 'XAF',
  delivery_payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.store_order_items (order_id);

-- Provider-neutral payment records; provider adapter/webhook is enabled only after API details are configured.
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  purpose text not null check (purpose in ('wallet_topup', 'store_order', 'virtual_number')),
  provider text not null,
  provider_reference text,
  provider_event_id text,
  checkout_url text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'XAF',
  status text not null default 'created' check (status in ('created', 'pending', 'paid', 'failed', 'cancelled', 'refunded')),
  order_id uuid references public.store_orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists payment_attempt_provider_ref_uidx on public.payment_attempts (provider, provider_reference) where provider_reference is not null;
create index if not exists payment_attempts_user_created_idx on public.payment_attempts (user_id, created_at desc);
alter table public.store_orders drop constraint if exists store_orders_payment_attempt_id_fkey;
alter table public.store_orders add constraint store_orders_payment_attempt_id_fkey foreign key (payment_attempt_id) references public.payment_attempts(id) on delete set null;

create table if not exists public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.virtual_number_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  country_code char(2) not null,
  service_name text not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'processing', 'active', 'expired', 'cancelled', 'failed')),
  phone_number text,
  provider_reference text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'XAF',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists number_requests_user_idx on public.virtual_number_requests (user_id, created_at desc);

-- Admin check runs as the table owner to avoid recursive profiles RLS.
create or replace function public.earnizi_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true);
$$;
revoke all on function public.earnizi_is_admin() from public;
grant execute on function public.earnizi_is_admin() to authenticated;

-- Least-privilege profile access: users cannot change their own balance, paid flag, or admin flag.
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists earnizi_profiles_select_own_or_admin on public.profiles;
drop policy if exists earnizi_profiles_update_own on public.profiles;
drop policy if exists earnizi_profiles_insert_own on public.profiles;
create policy earnizi_profiles_select_own_or_admin on public.profiles
  for select to authenticated using (auth.uid() = id or public.earnizi_is_admin());
create policy earnizi_profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy earnizi_profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id and coalesce(is_admin, false) = false and coalesce(is_paid, false) = false);
revoke update on public.profiles from authenticated;
grant update (name, username, phone, country) on public.profiles to authenticated;

-- Catalog access is public for active rows; only admins may manage inventory.
alter table public.products enable row level security;
alter table public.categories enable row level security;
drop policy if exists "products_select" on public.products;
drop policy if exists "products_admin" on public.products;
drop policy if exists "categories_select" on public.categories;
drop policy if exists earnizi_products_public_read on public.products;
drop policy if exists earnizi_products_admin_manage on public.products;
drop policy if exists earnizi_categories_public_read on public.categories;
drop policy if exists earnizi_categories_admin_manage on public.categories;
create policy earnizi_products_public_read on public.products for select to anon, authenticated using (is_active = true);
create policy earnizi_products_admin_manage on public.products for all to authenticated using (public.earnizi_is_admin()) with check (public.earnizi_is_admin());
create policy earnizi_categories_public_read on public.categories for select to anon, authenticated using (is_active = true);
create policy earnizi_categories_admin_manage on public.categories for all to authenticated using (public.earnizi_is_admin()) with check (public.earnizi_is_admin());

-- Admin-only video campaign editing; public sees only enabled campaigns.
alter table public.video_campaigns enable row level security;
alter table public.video_watch_sessions enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.virtual_number_requests enable row level security;
drop policy if exists earnizi_video_campaigns_read on public.video_campaigns;
drop policy if exists earnizi_video_campaigns_admin on public.video_campaigns;
drop policy if exists earnizi_video_sessions_own_read on public.video_watch_sessions;
drop policy if exists earnizi_wallet_own_read on public.wallet_ledger;
drop policy if exists earnizi_orders_own_read on public.store_orders;
drop policy if exists earnizi_order_items_own_read on public.store_order_items;
drop policy if exists earnizi_payment_attempts_own_read on public.payment_attempts;
drop policy if exists earnizi_webhook_events_admin_read on public.provider_webhook_events;
drop policy if exists earnizi_number_requests_own_read on public.virtual_number_requests;
create policy earnizi_video_campaigns_read on public.video_campaigns for select to anon, authenticated using (is_active = true);
create policy earnizi_video_campaigns_admin on public.video_campaigns for all to authenticated using (public.earnizi_is_admin()) with check (public.earnizi_is_admin());
create policy earnizi_video_sessions_own_read on public.video_watch_sessions for select to authenticated using (user_id = auth.uid() or public.earnizi_is_admin());
create policy earnizi_wallet_own_read on public.wallet_ledger for select to authenticated using (user_id = auth.uid() or public.earnizi_is_admin());
create policy earnizi_orders_own_read on public.store_orders for select to authenticated using (user_id = auth.uid() or public.earnizi_is_admin());
create policy earnizi_order_items_own_read on public.store_order_items for select to authenticated using (
  exists (select 1 from public.store_orders o where o.id = order_id and (o.user_id = auth.uid() or public.earnizi_is_admin()))
);
create policy earnizi_payment_attempts_own_read on public.payment_attempts for select to authenticated using (user_id = auth.uid() or public.earnizi_is_admin());
create policy earnizi_webhook_events_admin_read on public.provider_webhook_events for select to authenticated using (public.earnizi_is_admin());
create policy earnizi_number_requests_own_read on public.virtual_number_requests for select to authenticated using (user_id = auth.uid() or public.earnizi_is_admin());

-- Do not allow clients to mint balance, mark deposits complete, or alter payment status.
drop policy if exists "transactions_insert" on public.transactions;
drop policy if exists "transactions_admin" on public.transactions;
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists earnizi_transactions_read_own_or_admin on public.transactions;
create policy earnizi_transactions_read_own_or_admin on public.transactions for select to authenticated using (user_id = auth.uid() or public.earnizi_is_admin());
revoke insert, update, delete on public.transactions from authenticated;
revoke insert, update, delete on public.wallet_ledger from anon, authenticated;
revoke insert, update, delete on public.payment_attempts from anon, authenticated;
revoke insert, update, delete on public.provider_webhook_events from anon, authenticated;
revoke insert, update, delete on public.store_orders from anon, authenticated;
revoke insert, update, delete on public.store_order_items from anon, authenticated;
revoke insert, update, delete on public.virtual_number_requests from anon, authenticated;

grant select on public.products, public.categories, public.video_campaigns to anon, authenticated;
grant select on public.profiles, public.video_watch_sessions, public.wallet_ledger, public.store_orders, public.store_order_items, public.payment_attempts, public.virtual_number_requests to authenticated;

-- Database-authoritative video rewards. Client-side timers never credit a wallet.
create or replace function public.start_video_watch_session(p_campaign_id uuid)
returns table (
  session_id uuid,
  title text,
  video_url text,
  reward_amount numeric,
  currency text,
  duration_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.video_campaigns%rowtype;
  v_session_id uuid;
  v_today_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_campaign
  from public.video_campaigns c
  where c.id = p_campaign_id and c.is_active = true;
  if not found then raise exception 'Video campaign is unavailable'; end if;

  update public.video_watch_sessions s
  set status = 'expired'
  where s.user_id = auth.uid() and s.status = 'watching' and s.started_at < now() - interval '2 hours';

  if exists (
    select 1 from public.video_watch_sessions s
    where s.user_id = auth.uid() and s.status = 'watching'
  ) then
    raise exception 'Finish your current video before starting another';
  end if;

  select count(*) into v_today_count
  from public.video_watch_sessions s
  where s.user_id = auth.uid() and s.campaign_id = p_campaign_id
    and s.created_at >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')
    and s.status = 'completed';
  if v_today_count >= v_campaign.daily_limit then raise exception 'Daily watch limit reached'; end if;

  insert into public.video_watch_sessions (user_id, campaign_id, reward_amount, currency)
  values (auth.uid(), p_campaign_id, v_campaign.reward_amount, v_campaign.currency)
  returning id into v_session_id;

  return query select v_session_id, v_campaign.title, v_campaign.video_url,
    v_campaign.reward_amount, v_campaign.currency, v_campaign.duration_seconds;
end;
$$;

create or replace function public.record_video_watch_progress(
  p_session_id uuid,
  p_position_seconds numeric,
  p_is_playing boolean,
  p_ended boolean default false
)
returns table (watched_seconds numeric, required_seconds integer, ready_to_complete boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.video_watch_sessions%rowtype;
  v_duration integer;
  v_position numeric(12,3);
  v_elapsed numeric(12,3);
  v_advance numeric(12,3);
  v_counted numeric(12,3);
  v_total numeric(12,3);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_session_id is null or p_position_seconds is null or p_position_seconds < 0 or p_position_seconds > 86400 then
    raise exception 'Valid playback progress is required';
  end if;
  if p_is_playing is null or p_ended is null or (p_ended and p_is_playing) then
    raise exception 'Invalid playback state';
  end if;

  select s.* into v_session
  from public.video_watch_sessions s
  where s.id = p_session_id and s.user_id = auth.uid()
  for update;
  if not found then raise exception 'Video session not found'; end if;
  if v_session.status <> 'watching' then raise exception 'Video session is no longer active'; end if;
  if v_session.started_at < clock_timestamp() - interval '2 hours' then
    raise exception 'Video session expired; start a new watch';
  end if;

  select c.duration_seconds into v_duration
  from public.video_campaigns c where c.id = v_session.campaign_id;
  if v_duration is null then raise exception 'Video campaign was removed'; end if;

  v_position := round(p_position_seconds, 3);
  v_elapsed := greatest(0, extract(epoch from (clock_timestamp() - coalesce(v_session.last_progress_at, v_session.started_at)))::numeric);
  v_advance := greatest(0, v_position - v_session.last_position_seconds);
  -- Reported playback may advance no faster than server time between progress checks.
  v_counted := least(v_advance, v_elapsed);
  v_total := least(v_duration::numeric, v_session.watched_seconds + v_counted);

  update public.video_watch_sessions
  set watched_seconds = v_total,
      last_position_seconds = v_position,
      last_progress_at = clock_timestamp(),
      player_ended_at = case when p_ended then clock_timestamp() else player_ended_at end
  where id = p_session_id;

  return query select v_total, v_duration,
    (p_ended and v_total >= v_duration and clock_timestamp() >= v_session.started_at + make_interval(secs => v_duration));
end;
$$;

create or replace function public.complete_video_watch_session(p_session_id uuid)
returns table (reward_amount numeric, currency text, new_balance numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.video_watch_sessions%rowtype;
  v_duration integer;
  v_balance numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select s.* into v_session
  from public.video_watch_sessions s
  where s.id = p_session_id and s.user_id = auth.uid()
  for update;
  if not found then raise exception 'Video session not found'; end if;

  if v_session.status = 'completed' then
    select p.balance into v_balance from public.profiles p where p.id = auth.uid();
    return query select v_session.reward_amount, v_session.currency, coalesce(v_balance, 0);
    return;
  end if;
  if v_session.status <> 'watching' then raise exception 'Video session is no longer active'; end if;
  if v_session.started_at < clock_timestamp() - interval '2 hours' then
    raise exception 'Video session expired; start a new watch';
  end if;

  select c.duration_seconds into v_duration
  from public.video_campaigns c where c.id = v_session.campaign_id;
  if v_duration is null then raise exception 'Video campaign was removed'; end if;
  if v_session.player_ended_at is null
    or v_session.player_ended_at < v_session.started_at + make_interval(secs => v_duration)
    or v_session.watched_seconds < v_duration
    or clock_timestamp() < v_session.started_at + make_interval(secs => v_duration) then
    raise exception 'Please finish the full video before claiming';
  end if;

  update public.video_watch_sessions
  set status = 'completed', completed_at = now()
  where id = p_session_id;

  insert into public.wallet_ledger (user_id, entry_type, source, amount, currency, reference_key, description, metadata)
  values (
    auth.uid(), 'credit', 'video_reward', v_session.reward_amount, v_session.currency,
    'video-session:' || p_session_id::text, 'Video reward', jsonb_build_object('campaign_id', v_session.campaign_id)
  ) on conflict (reference_key) do nothing;

  update public.profiles
  set balance = coalesce(balance, 0) + v_session.reward_amount,
      total_earnings = coalesce(total_earnings, 0) + v_session.reward_amount
  where id = auth.uid()
  returning balance into v_balance;

  return query select v_session.reward_amount, v_session.currency, coalesce(v_balance, 0);
end;
$$;

revoke all on function public.start_video_watch_session(uuid) from public;
revoke all on function public.record_video_watch_progress(uuid, numeric, boolean, boolean) from public;
revoke all on function public.complete_video_watch_session(uuid) from public;
grant execute on function public.start_video_watch_session(uuid) to authenticated;
grant execute on function public.record_video_watch_progress(uuid, numeric, boolean, boolean) to authenticated;
grant execute on function public.complete_video_watch_session(uuid) to authenticated;

-- Updated-at triggers on new mutable tables.
drop trigger if exists earnizi_video_campaign_updated_at on public.video_campaigns;
create trigger earnizi_video_campaign_updated_at before update on public.video_campaigns
for each row execute function public.update_updated_at();
drop trigger if exists earnizi_store_orders_updated_at on public.store_orders;
create trigger earnizi_store_orders_updated_at before update on public.store_orders
for each row execute function public.update_updated_at();
drop trigger if exists earnizi_payment_attempts_updated_at on public.payment_attempts;
create trigger earnizi_payment_attempts_updated_at before update on public.payment_attempts
for each row execute function public.update_updated_at();
