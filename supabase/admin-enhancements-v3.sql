-- ShopWiseFinder v3: anonymous site analytics, visitor pop-up banners, and image storage.
-- Run once in Supabase SQL Editor after schema.sql and admin-enhancements-v2.sql.
-- Writes/reads use server-side secret credentials only. No visitor IP address is stored.

create table if not exists public.swf_analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('page_view','review_click','affiliate_click','banner_view','banner_click','compare_select')),
  session_id text not null check (char_length(session_id) between 8 and 80),
  page_path text not null default '/',
  product_slug text null,
  link_url text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists swf_analytics_events_created_idx on public.swf_analytics_events (created_at desc);
create index if not exists swf_analytics_events_type_created_idx on public.swf_analytics_events (event_type, created_at desc);
create index if not exists swf_analytics_events_product_idx on public.swf_analytics_events (product_slug, event_type, created_at desc);
alter table public.swf_analytics_events enable row level security;
revoke all on table public.swf_analytics_events from anon, authenticated;
grant all on table public.swf_analytics_events to service_role;
grant usage, select on sequence public.swf_analytics_events_id_seq to service_role;
comment on table public.swf_analytics_events is 'Aggregated, pseudonymous website events for the ShopWiseFinder private KPI report. No IP addresses are stored.';

create table if not exists public.swf_banners (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  message text not null default '',
  image_url text not null,
  link_url text not null default '/products',
  button_label text not null default 'Explore products',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  enabled boolean not null default false,
  sort_order integer not null default 100 check (sort_order >= 1),
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists swf_banners_status_order_idx on public.swf_banners (status, enabled, sort_order, updated_at desc);
alter table public.swf_banners enable row level security;
revoke all on table public.swf_banners from anon, authenticated;
grant all on table public.swf_banners to service_role;
comment on table public.swf_banners is 'Admin-managed visitor welcome/launch pop-up banners. Public route returns only active published banners.';

-- Banner image storage: public read, admin server-only upload via the Supabase secret key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('swf-banners', 'swf-banners', true, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 4194304, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public read ShopWiseFinder banner images" on storage.objects;
create policy "Public read ShopWiseFinder banner images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'swf-banners');
-- No insert/update/delete policy is granted to public browser roles.
