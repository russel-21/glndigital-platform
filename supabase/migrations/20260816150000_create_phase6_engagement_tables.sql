-- Phase 6 (Engagement communautaire) of the AI social media agent
-- pipeline — see CLAUDE.md "Feature en cours de cadrage : automatisation
-- reseaux sociaux par agents IA".
--
-- engagement_items: one row per comment/DM detected on a social_connections
-- account. `needs_response` + `classification_rationale` are the ONLY AI
-- output this table stores — deliberately no "suggested_reply" column
-- anywhere in this schema, because CLAUDE.md's Phase 6 rule is absolute:
-- "Aucune réponse n'est générée ni publiée automatiquement par l'agent, y
-- compris pour les questions simples. La rédaction de la réponse reste
-- entièrement humaine." `human_notes` exists only for an admin's own
-- reference/draft — nothing in this codebase ever sends it anywhere.

create table if not exists public.engagement_items (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  -- Zernio's own ID for this comment/DM — dedupe key so re-running the
  -- check doesn't re-notify on the same item.
  platform_comment_id text not null,
  kind text not null check (kind in ('comment', 'dm')),
  author_handle text,
  content text not null,
  posted_at timestamptz,
  -- Null until classified (or if classification failed — see `error`).
  needs_response boolean,
  classification_rationale text,
  is_mock boolean not null default false,
  error text,
  -- Human-only fields. Never written by any agent — see comment above.
  handled boolean not null default false,
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  human_notes text,
  created_at timestamptz not null default now(),
  unique (social_connection_id, platform_comment_id)
);

create index if not exists engagement_items_social_connection_id_idx
  on public.engagement_items (social_connection_id);
create index if not exists engagement_items_needs_response_idx
  on public.engagement_items (social_connection_id, needs_response, handled);

alter table public.engagement_items enable row level security;

drop policy if exists "Admins can read engagement items" on public.engagement_items;
drop policy if exists "Admins can insert engagement items" on public.engagement_items;
drop policy if exists "Admins can update engagement items" on public.engagement_items;

create policy "Admins can read engagement items"
on public.engagement_items
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert engagement items"
on public.engagement_items
for insert
to authenticated
with check (public.is_admin());

-- Update is needed for the human-only fields (handled/handled_by/
-- handled_at/human_notes) — same column-level caveat as elsewhere in this
-- project: RLS is row-level, not column-level, so this doesn't stop a
-- direct API call from also editing needs_response/classification_rationale.
create policy "Admins can update engagement items"
on public.engagement_items
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
