-- Phase 3 (Stratégie de contenu) of the AI social media agent pipeline —
-- see CLAUDE.md "Feature en cours de cadrage : automatisation reseaux
-- sociaux par agents IA".
--
-- content_strategies: one row per Phase 3 run. Always tied to the
-- social_connections row it's for and to the specific diagnostics row it
-- was built from — and per CLAUDE.md, Phase 3 must only ever consume an
-- APPROVED diagnostic (review_status = 'approved'), enforced at the edge
-- function level (RLS can't express "referenced row has this status" as a
-- FK constraint). Carries its own human-validation gate: Phase 4 (not yet
-- built) must check review_status = 'approved' here too, same pattern as
-- Phase 2 -> Phase 3.

create table if not exists public.content_strategies (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  diagnostic_id uuid not null references public.diagnostics(id),
  -- Content pillars: array of {name, description, rationale}.
  pillars jsonb,
  -- Editorial calendar: array of {day_offset, platform, pillar, format, working_title, brief}.
  editorial_calendar jsonb,
  -- Every "current trend" claim must appear here with a real, timestamped
  -- web source — per CLAUDE.md Phase 3 rule, never from training memory.
  -- Array of {claim, source_url, source_title, retrieved_at}.
  trends_used jsonb,
  summary text,
  is_mock boolean not null default false,
  error text,
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists content_strategies_social_connection_id_idx
  on public.content_strategies (social_connection_id);
create index if not exists content_strategies_diagnostic_id_idx
  on public.content_strategies (diagnostic_id);

alter table public.content_strategies enable row level security;

drop policy if exists "Admins can read content strategies" on public.content_strategies;
drop policy if exists "Admins can insert content strategies" on public.content_strategies;
drop policy if exists "Admins can update content strategies" on public.content_strategies;

create policy "Admins can read content strategies"
on public.content_strategies
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert content strategies"
on public.content_strategies
for insert
to authenticated
with check (public.is_admin());

-- Same column-level caveat as diagnostics: admin-only but not restricted to
-- just the review fields (Postgres RLS can't express that). See CLAUDE.md.
create policy "Admins can update content strategies"
on public.content_strategies
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
