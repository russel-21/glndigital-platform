-- Phase 2 (Diagnostic) of the AI social media agent pipeline — see CLAUDE.md
-- "Feature en cours de cadrage : automatisation reseaux sociaux par agents IA".
--
-- diagnostic_screenshots: admin-uploaded images backing one or more Phase 2
-- runs for a social_connections row. Phase 1's audit_snapshots never carry
-- images, and CLAUDE.md requires screenshots for Phase 2 to be considered
-- complete — this table + the "diagnostic-screenshots" Storage bucket (also
-- created below) is where those live. Files themselves live in Storage;
-- this table is metadata + the storage path only.
--
-- diagnostics: one row per Phase 2 run. Ties back to the social_connections
-- row and (loosely — nullable) the audit_snapshots row it reasoned from.
-- Carries a real human-validation gate (review_status): per CLAUDE.md,
-- Phase 2 requires human validation before Phase 3 can consume its output —
-- a future Phase 3 implementation must check review_status = 'approved'
-- before using a diagnostics row, not just its existence.

create table if not exists public.diagnostic_screenshots (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  storage_path text not null,
  label text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists diagnostic_screenshots_social_connection_id_idx
  on public.diagnostic_screenshots (social_connection_id);

alter table public.diagnostic_screenshots enable row level security;

drop policy if exists "Admins can read diagnostic screenshots" on public.diagnostic_screenshots;
drop policy if exists "Admins can insert diagnostic screenshots" on public.diagnostic_screenshots;
drop policy if exists "Admins can delete diagnostic screenshots" on public.diagnostic_screenshots;

create policy "Admins can read diagnostic screenshots"
on public.diagnostic_screenshots
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert diagnostic screenshots"
on public.diagnostic_screenshots
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can delete diagnostic screenshots"
on public.diagnostic_screenshots
for delete
to authenticated
using (public.is_admin());

create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  audit_snapshot_id uuid references public.audit_snapshots(id) on delete set null,
  screenshot_ids uuid[] not null default '{}',
  -- AI-generated content (never edited directly by admins — see UPDATE
  -- policy note below). Null/empty when the call failed (see `error`).
  conclusive boolean,
  hypotheses jsonb,
  missing_data jsonb,
  summary text,
  is_mock boolean not null default false,
  error text,
  -- Human validation gate — Phase 2 is explicitly non-optional-review per
  -- CLAUDE.md. 'pending_review' is the only value the edge function ever
  -- writes; admins move it to 'approved'/'rejected' via the admin UI.
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists diagnostics_social_connection_id_idx
  on public.diagnostics (social_connection_id);

alter table public.diagnostics enable row level security;

drop policy if exists "Admins can read diagnostics" on public.diagnostics;
drop policy if exists "Admins can insert diagnostics" on public.diagnostics;
drop policy if exists "Admins can update diagnostics" on public.diagnostics;

create policy "Admins can read diagnostics"
on public.diagnostics
for select
to authenticated
using (public.is_admin());

-- Inserts happen from the phase2-diagnostic edge function (admin JWT, no
-- service-role key), same pattern as Phase 1's audit_snapshots.
create policy "Admins can insert diagnostics"
on public.diagnostics
for insert
to authenticated
with check (public.is_admin());

-- NOTE: this policy allows any admin-authenticated update to the whole row,
-- not just the review fields — Postgres RLS is row-level, not column-level,
-- and this project's other admin-only tables (admin_settings, testimonials)
-- follow the same pattern. The admin UI only ever writes review_status/
-- reviewed_by/reviewed_at/review_notes; nothing in this schema stops a
-- direct API call from also editing the AI-generated fields, same tradeoff
-- as elsewhere in this codebase.
create policy "Admins can update diagnostics"
on public.diagnostics
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Private Storage bucket for diagnostic screenshots — NOT public (unlike
-- "portfolio"), since these are client-sensitive materials for internal
-- diagnosis, not public-facing media.
insert into storage.buckets (id, name, public)
values ('diagnostic-screenshots', 'diagnostic-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "Admins can upload diagnostic screenshots" on storage.objects;
drop policy if exists "Admins can read diagnostic screenshots storage" on storage.objects;
drop policy if exists "Admins can delete diagnostic screenshots storage" on storage.objects;

create policy "Admins can upload diagnostic screenshots"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'diagnostic-screenshots' and public.is_admin());

create policy "Admins can read diagnostic screenshots storage"
on storage.objects
for select
to authenticated
using (bucket_id = 'diagnostic-screenshots' and public.is_admin());

create policy "Admins can delete diagnostic screenshots storage"
on storage.objects
for delete
to authenticated
using (bucket_id = 'diagnostic-screenshots' and public.is_admin());
