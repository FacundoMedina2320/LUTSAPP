create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.luts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  is_premium boolean not null default false,
  price_cents integer not null default 0,
  currency text not null default 'USD',
  before_url text,
  after_url text,
  cube_path text,
  cube_hash text,
  cube_size bigint,
  before_hash text,
  before_size bigint,
  after_hash text,
  after_size bigint,
  tags text[] not null default '{}',
  downloads_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lut_categories (
  lut_id uuid not null references public.luts(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (lut_id, category_id)
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lut_id uuid not null references public.luts(id) on delete cascade,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lut_id uuid not null references public.luts(id) on delete cascade,
  rating integer not null,
  review text,
  created_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lut_id uuid not null references public.luts(id) on delete cascade,
  source text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lut_id uuid not null references public.luts(id) on delete cascade,
  provider text,
  provider_transaction_id text,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text,
  provider_subscription_id text,
  status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lut_id uuid not null references public.luts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, lut_id)
);

create index if not exists luts_category_id_idx on public.luts (category_id);
create index if not exists luts_is_premium_idx on public.luts (is_premium);
create index if not exists luts_slug_idx on public.luts (slug);
create index if not exists downloads_user_id_idx on public.downloads (user_id);
create index if not exists downloads_lut_id_idx on public.downloads (lut_id);
create index if not exists reviews_lut_id_idx on public.reviews (lut_id);
create index if not exists user_library_user_id_idx on public.user_library (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_luts_updated_at on public.luts;
create trigger set_luts_updated_at
before update on public.luts
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid;
$$;

alter table public.categories enable row level security;
alter table public.luts enable row level security;
alter table public.lut_categories enable row level security;
alter table public.downloads enable row level security;
alter table public.reviews enable row level security;
alter table public.entitlements enable row level security;
alter table public.purchases enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_library enable row level security;

drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "luts_select" on public.luts;
create policy "luts_select" on public.luts
  for select using (true);

drop policy if exists "luts_admin_write" on public.luts;
create policy "luts_admin_write" on public.luts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lut_categories_select" on public.lut_categories;
create policy "lut_categories_select" on public.lut_categories
  for select using (true);

drop policy if exists "lut_categories_admin_write" on public.lut_categories;
create policy "lut_categories_admin_write" on public.lut_categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "downloads_insert_own" on public.downloads;
create policy "downloads_insert_own" on public.downloads
  for insert with check (auth.uid() = user_id);

drop policy if exists "downloads_select_own" on public.downloads;
create policy "downloads_select_own" on public.downloads
  for select using (auth.uid() = user_id);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public" on public.reviews
  for select using (true);

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own" on public.entitlements
  for select using (auth.uid() = user_id);

drop policy if exists "entitlements_admin_write" on public.entitlements;
create policy "entitlements_admin_write" on public.entitlements
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own" on public.purchases
  for select using (auth.uid() = user_id);

drop policy if exists "purchases_insert_own" on public.purchases;
create policy "purchases_insert_own" on public.purchases
  for insert with check (auth.uid() = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write" on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "user_library_select_own" on public.user_library;
create policy "user_library_select_own" on public.user_library
  for select using (auth.uid() = user_id);

drop policy if exists "user_library_insert_own" on public.user_library;
create policy "user_library_insert_own" on public.user_library
  for insert with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('luts', 'luts', false)
on conflict (id) do nothing;

drop policy if exists "luts_images_public_read" on storage.objects;
create policy "luts_images_public_read"
  on storage.objects for select
  using (bucket_id = 'luts' and name like 'images/%');

drop policy if exists "luts_admin_write" on storage.objects;
create policy "luts_admin_write"
  on storage.objects for all
  using (bucket_id = 'luts' and public.is_admin())
  with check (bucket_id = 'luts' and public.is_admin());
