-- Phase 4a (Production texte) of the AI social media agent pipeline — see
-- CLAUDE.md "Feature en cours de cadrage : automatisation reseaux sociaux
-- par agents IA".
--
-- brand_brief: added to social_connections rather than a new table — it's
-- one free-text field per client account, filled in by an admin, that
-- Phase 4a is required to ground every company/product fact in (CLAUDE.md:
-- "Tout fait sur l'entreprise/produit doit venir d'un brand brief fourni,
-- jamais halluciné"). Nothing else in the system currently holds this
-- information — decided with Russel rather than assumed.
--
-- content_drafts: one row per generated caption/hook/script, always tied to
-- one specific entry of an APPROVED content_strategies.editorial_calendar
-- (decision with Russel: one draft per calendar entry, individually
-- reviewed — not one batch for the whole month). The calendar entry's own
-- fields are denormalized onto the row (day offset/platform/format/title)
-- so the admin UI can display a draft without re-indexing back into the
-- parent strategy's JSONB array. Same human-validation gate pattern as
-- Phase 2/3 (CLAUDE.md: "Oui, relecture avant publication" for Phase 4a).

alter table public.social_connections
  add column if not exists brand_brief text;

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  strategy_id uuid not null references public.content_strategies(id),
  calendar_entry_index integer not null,
  calendar_day_offset integer not null,
  calendar_platform text not null,
  calendar_working_title text not null,
  caption text,
  hook text,
  -- Only populated for video-shaped formats (Phase 4a scope: legends,
  -- scripts, hooks — no visuals, that's Phase 4b).
  script text,
  is_mock boolean not null default false,
  error text,
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists content_drafts_social_connection_id_idx
  on public.content_drafts (social_connection_id);
create index if not exists content_drafts_strategy_id_idx
  on public.content_drafts (strategy_id);

alter table public.content_drafts enable row level security;

drop policy if exists "Admins can read content drafts" on public.content_drafts;
drop policy if exists "Admins can insert content drafts" on public.content_drafts;
drop policy if exists "Admins can update content drafts" on public.content_drafts;

create policy "Admins can read content drafts"
on public.content_drafts
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert content drafts"
on public.content_drafts
for insert
to authenticated
with check (public.is_admin());

-- Same column-level caveat as diagnostics/content_strategies: admin-only
-- but not restricted to just the review fields (Postgres RLS can't express
-- that). See CLAUDE.md.
create policy "Admins can update content drafts"
on public.content_drafts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
