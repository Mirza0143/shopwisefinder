-- ShopWiseFinder product manager schema.
-- Run once in your Supabase project's SQL Editor.
-- The table is intentionally not readable/writable by public browser roles.

create table if not exists public.swf_products (
  slug text primary key,
  title text not null,
  brand text not null,
  category text not null,
  asin text null,
  price numeric(14,2) not null check (price > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  images text[] not null check (status = 'archived' or cardinality(images) = 3),
  price_source text not null default 'unknown' check (price_source in ('unknown', 'manual_verified', 'amazon_creators_api', 'approved_provider')),
  price_checked_at timestamptz null,
  product_data jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists swf_products_status_updated_idx on public.swf_products (status, updated_at desc);
create index if not exists swf_products_category_idx on public.swf_products (category);
create index if not exists swf_products_asin_idx on public.swf_products (asin) where asin is not null;

alter table public.swf_products enable row level security;
revoke all on table public.swf_products from anon, authenticated;
grant all on table public.swf_products to service_role;

comment on table public.swf_products is 'ShopWiseFinder admin-managed product catalogue. Access only via server-side service credentials.';
