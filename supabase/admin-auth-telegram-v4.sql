-- ShopWiseFinder Telegram second-factor login challenges.
-- Run once in the same Supabase project after schema.sql and v2/v3 migrations.
-- The table is server-only: do not add browser-readable policies.
create table if not exists public.swf_admin_auth_challenges (
  id uuid primary key,
  otp_hash text not null check (otp_hash ~ '^[0-9a-f]{64}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz null,
  constraint swf_admin_challenge_expiry_after_creation check (expires_at > created_at)
);

create index if not exists swf_admin_auth_challenges_request_created_idx
  on public.swf_admin_auth_challenges (request_hash, created_at desc);
create index if not exists swf_admin_auth_challenges_expiry_idx
  on public.swf_admin_auth_challenges (expires_at);

alter table public.swf_admin_auth_challenges enable row level security;
revoke all on table public.swf_admin_auth_challenges from anon, authenticated;
grant all on table public.swf_admin_auth_challenges to service_role;
comment on table public.swf_admin_auth_challenges is 'Hashed, short-lived, single-use Telegram OTP challenges for the ShopWiseFinder admin login. Server-only.';
