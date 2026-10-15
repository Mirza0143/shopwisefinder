-- ShopWiseFinder repair/upgrade migration v4.
-- Safe to run once even if v2 was skipped and support settings already exist.
-- Creates the missing bundle table and adds per-channel ON/OFF toggles without deleting saved URLs.

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

-- Ensure the support settings row exists, even if the earlier support migration was skipped.
create table if not exists public.swf_support_settings (
  id smallint primary key default 1 check (id = 1),
  telegram_url text not null default '',
  whatsapp_url text not null default '',
  instagram_url text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.swf_support_settings add column if not exists telegram_enabled boolean not null default true;
alter table public.swf_support_settings add column if not exists whatsapp_enabled boolean not null default true;
alter table public.swf_support_settings add column if not exists instagram_enabled boolean not null default true;

insert into public.swf_support_settings (id, telegram_url, whatsapp_url, instagram_url, telegram_enabled, whatsapp_enabled, instagram_enabled)
values (1, '', '', '', true, true, true)
on conflict (id) do nothing;

alter table public.swf_support_settings enable row level security;
revoke all on table public.swf_support_settings from anon, authenticated;
grant all on table public.swf_support_settings to service_role;
comment on table public.swf_support_settings is 'Admin-managed support links. Disabled channels retain URLs but are hidden from public pages.';

-- Ask PostgREST/Supabase to refresh its schema cache so newly-created tables/columns are visible.
notify pgrst, 'reload schema';
