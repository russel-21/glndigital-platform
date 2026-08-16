-- Veille concurrentielle publicitaire — brique séparée des 7 phases de
-- CLAUDE.md, voir DECISIONS-VEILLE-CONCURRENTIELLE.md pour le contexte
-- complet, le diagnostic de faisabilité et ce qui a été explicitement
-- abandonné.
--
-- competitive_briefs: un brief exportable par concurrent, généré à partir
-- de notes saisies par l'admin (recherche déjà faite manuellement, ex. via
-- AdWhispr) + une vraie recherche web horodatée (même discipline que la
-- Phase 3) — jamais de budget/performance publicitaire inventé, ni de
-- prétention d'accès direct à une bibliothèque de pubs Meta/TikTok.

create table if not exists public.competitive_briefs (
  id uuid primary key default gen_random_uuid(),
  competitor_name text not null,
  -- Recherche déjà collectée manuellement par l'admin (ex. via AdWhispr) —
  -- seule source de faits sur les publicités/le budget du concurrent que
  -- ce module ne va jamais chercher lui-même via une API.
  admin_notes text,
  brief_content text,
  -- Sources web réelles utilisées, même format que trends_used en Phase 3 :
  -- array de {claim, source_url, source_title, retrieved_at}.
  sources jsonb,
  is_mock boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists competitive_briefs_created_at_idx
  on public.competitive_briefs (created_at desc);

alter table public.competitive_briefs enable row level security;

drop policy if exists "Admins can read competitive briefs" on public.competitive_briefs;
drop policy if exists "Admins can insert competitive briefs" on public.competitive_briefs;
drop policy if exists "Admins can delete competitive briefs" on public.competitive_briefs;

create policy "Admins can read competitive briefs"
on public.competitive_briefs
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert competitive briefs"
on public.competitive_briefs
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can delete competitive briefs"
on public.competitive_briefs
for delete
to authenticated
using (public.is_admin());

-- No update policy: regenerating a brief inserts a new row rather than
-- editing in place, same append-only spirit as audit_snapshots.
