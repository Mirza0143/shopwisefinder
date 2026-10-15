-- ShopWiseFinder support contact settings.
-- Run once in the same Supabase project used by the enhanced website.

create table if not exists public.swf_support_settings (
  id smallint primary key default 1 check (id = 1),
  telegram_url text not null default '',
  whatsapp_url text not null default '',
  instagram_url text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.swf_support_settings (id, telegram_url, whatsapp_url, instagram_url)
values (1, '', '', '')
on conflict (id) do nothing;

alter table public.swf_support_settings enable row level security;
revoke all on table public.swf_support_settings from anon, authenticated;
grant all on table public.swf_support_settings to service_role;
comment on table public.swf_support_settings is 'Admin-managed public support contact links. Read/writes go through server routes; browser roles have no table access.';
