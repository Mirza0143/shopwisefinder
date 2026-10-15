-- ShopWiseFinder Admin Telegram authentication controls.
-- Run this once in the same Supabase project used by this app, after admin-auth-telegram-v4.sql.
-- Tables are server-only. Never grant anon/authenticated access.

create table if not exists public.swf_admin_security_settings (
  id smallint primary key default 1 check (id = 1),
  telegram_otp_enabled boolean not null default true,
  telegram_chat_id text null,
  pending_pair_code_hash text null check (pending_pair_code_hash is null or pending_pair_code_hash ~ '^[0-9a-f]{64}$'),
  pending_pair_expires_at timestamptz null,
  telegram_update_offset bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint swf_admin_pair_expiry_requires_hash check ((pending_pair_code_hash is null and pending_pair_expires_at is null) or (pending_pair_code_hash is not null and pending_pair_expires_at is not null))
);

alter table public.swf_admin_security_settings add column if not exists telegram_update_offset bigint not null default 0;

insert into public.swf_admin_security_settings (id, telegram_otp_enabled)
values (1, true)
on conflict (id) do nothing;

create table if not exists public.swf_admin_security_challenges (
  id uuid primary key,
  purpose text not null check (purpose in ('disable_telegram_otp')),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  target_chat_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz null,
  constraint swf_admin_security_challenge_expiry_after_creation check (expires_at > created_at)
);

create index if not exists swf_admin_security_challenges_created_idx
  on public.swf_admin_security_challenges (purpose, created_at desc);
create index if not exists swf_admin_security_challenges_expiry_idx
  on public.swf_admin_security_challenges (expires_at);

alter table public.swf_admin_security_settings enable row level security;
revoke all on table public.swf_admin_security_settings from anon, authenticated;
grant all on table public.swf_admin_security_settings to service_role;

alter table public.swf_admin_security_challenges enable row level security;
revoke all on table public.swf_admin_security_challenges from anon, authenticated;
grant all on table public.swf_admin_security_challenges to service_role;

comment on table public.swf_admin_security_settings is 'Server-managed Telegram OTP state and hashed one-time Telegram account-pairing code. Browser roles have no direct access.';
comment on table public.swf_admin_security_challenges is 'Short-lived hashed OTP challenges that require confirmation before disabling Telegram admin verification. Server-only.';
notify pgrst, 'reload schema';
