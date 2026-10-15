-- ShopWiseFinder Admin enhancements (v2)
-- Run this once in Supabase SQL Editor after the original product-manager schema.
-- Bundle data is read/written only by server routes using a secret key.

create table if not exists public.swf_bundles (
  slug text primary key,
  title text not null,
  category text not null check (category in ('mobile-gaming', 'gaming', 'fashion', 'desk', 'everyday')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 100 check (sort_order >= 1),
  bundle_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists swf_bundles_status_order_idx on public.swf_bundles (status, sort_order, title);
alter table public.swf_bundles enable row level security;
revoke all on table public.swf_bundles from anon, authenticated;
grant all on table public.swf_bundles to service_role;
comment on table public.swf_bundles is 'ShopWiseFinder curated bundles, served to visitors only when status is published.';
