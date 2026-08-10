-- Phase 1 (Audit) of the AI social media agent pipeline — see CLAUDE.md
-- "Feature en cours de cadrage : automatisation reseaux sociaux par agents IA".
--
-- social_connections: one row per client social account GLN staff wants to
-- audit/manage (Meta/Instagram page, TikTok account, YouTube channel).
-- zernio_account_id stays null until the Phase 5 OAuth connect flow is built;
-- Phase 1 can run against an account_handle alone via the Zernio lookup API.
--
-- audit_snapshots: append-only factual data collected by the Phase 1 Audit
-- agent for a given social_connections row. Never updated in place — a new
-- audit run inserts a new snapshot so history is preserved. Per CLAUDE.md
-- Phase 1 rules: no scoring, no interpretation, every row carries its source
-- and extraction timestamp, and is_mock must be true for any non-Zernio data
-- so later phases never mistake development fixtures for real audits.

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid references public.profiles(id) on delete set null,
  platform text not null check (platform in ('meta_facebook', 'meta_instagram', 'tiktok', 'youtube')),
  account_handle text not null,
  zernio_account_id text,
  connection_status text not null default 'not_connected'
    check (connection_status in ('not_connected', 'pending', 'connected', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_connections_client_profile_id_idx
  on public.social_connections (client_profile_id);

alter table public.social_connections enable row level security;

drop policy if exists "Admins can read social connections" on public.social_connections;
drop policy if exists "Admins can insert social connections" on public.social_connections;
drop policy if exists "Admins can update social connections" on public.social_connections;
drop policy if exists "Admins can delete social connections" on public.social_connections;

create policy "Admins can read social connections"
on public.social_connections
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert social connections"
on public.social_connections
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update social connections"
on public.social_connections
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete social connections"
on public.social_connections
for delete
to authenticated
using (public.is_admin());

create table if not exists public.audit_snapshots (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  platform text not null check (platform in ('meta_facebook', 'meta_instagram', 'tiktok', 'youtube')),
  source text not null,
  extracted_at timestamptz not null,
  -- Null when the extraction failed outright (see `error`) — there is
  -- nothing factual to store in that case, not even partial data.
  metrics jsonb,
  raw_response jsonb,
  is_mock boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists audit_snapshots_social_connection_id_idx
  on public.audit_snapshots (social_connection_id);

alter table public.audit_snapshots enable row level security;

drop policy if exists "Admins can read audit snapshots" on public.audit_snapshots;
drop policy if exists "Admins can insert audit snapshots" on public.audit_snapshots;
drop policy if exists "Admins can delete audit snapshots" on public.audit_snapshots;

create policy "Admins can read audit snapshots"
on public.audit_snapshots
for select
to authenticated
using (public.is_admin());

-- Inserts happen from the phase1-audit edge function using the service role
-- key (which bypasses RLS), after the function itself checks the caller is an
-- admin. This policy also allows a directly-authenticated admin client to
-- insert, for local testing without going through the edge function.
create policy "Admins can insert audit snapshots"
on public.audit_snapshots
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can delete audit snapshots"
on public.audit_snapshots
for delete
to authenticated
using (public.is_admin());

-- No update policy: snapshots are append-only by design (see comment above).
