-- Phase 5 (Publication) of the AI social media agent pipeline — see
-- CLAUDE.md "Feature en cours de cadrage : automatisation reseaux sociaux
-- par agents IA".
--
-- scheduled_publications: one row per scheduling decision for an APPROVED
-- content_drafts row. `content_snapshot` freezes the exact caption/hook/
-- script at scheduling time — the actual publish call always uses this
-- frozen copy, never a live re-read of content_drafts, which is how the
-- CLAUDE.md Phase 5 rule ("aucune modification silencieuse entre
-- validation et publication") is enforced structurally rather than just by
-- convention.
--
-- publication_log: append-only timestamped trace of every state
-- transition (CLAUDE.md: "Log horodaté de traçabilité") — same
-- append-only pattern as audit_snapshots, never updated in place.

create table if not exists public.scheduled_publications (
  id uuid primary key default gen_random_uuid(),
  content_draft_id uuid not null references public.content_drafts(id),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  -- Frozen copy of the approved content_drafts row at scheduling time.
  -- Shape: {caption, hook, script, calendar_working_title, calendar_platform}.
  content_snapshot jsonb not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'published', 'failed', 'cancelled')),
  is_mock boolean not null default false,
  platform_post_id text,
  error text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists scheduled_publications_social_connection_id_idx
  on public.scheduled_publications (social_connection_id);
create index if not exists scheduled_publications_content_draft_id_idx
  on public.scheduled_publications (content_draft_id);

alter table public.scheduled_publications enable row level security;

drop policy if exists "Admins can read scheduled publications" on public.scheduled_publications;
drop policy if exists "Admins can insert scheduled publications" on public.scheduled_publications;
drop policy if exists "Admins can update scheduled publications" on public.scheduled_publications;

create policy "Admins can read scheduled publications"
on public.scheduled_publications
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert scheduled publications"
on public.scheduled_publications
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update scheduled publications"
on public.scheduled_publications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.publication_log (
  id uuid primary key default gen_random_uuid(),
  scheduled_publication_id uuid not null references public.scheduled_publications(id) on delete cascade,
  event text not null check (event in ('scheduled', 'publish_attempted', 'published', 'failed', 'cancelled')),
  detail text,
  occurred_at timestamptz not null default now()
);

create index if not exists publication_log_scheduled_publication_id_idx
  on public.publication_log (scheduled_publication_id);

alter table public.publication_log enable row level security;

drop policy if exists "Admins can read publication log" on public.publication_log;
drop policy if exists "Admins can insert publication log" on public.publication_log;

create policy "Admins can read publication log"
on public.publication_log
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert publication log"
on public.publication_log
for insert
to authenticated
with check (public.is_admin());

-- No update/delete policy: append-only by design, same as audit_snapshots.
