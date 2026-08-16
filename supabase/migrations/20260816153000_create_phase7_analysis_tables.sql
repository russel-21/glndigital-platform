-- Phase 7 (Analyse/optimisation) of the AI social media agent pipeline —
-- see CLAUDE.md "Feature en cours de cadrage : automatisation reseaux
-- sociaux par agents IA".
--
-- performance_analyses: one row per comparison between two REAL
-- audit_snapshots of the same social_connections row (the earliest and the
-- most recent, by default). CLAUDE.md's Phase 7 rule calls for "comparaison
-- performance prévue vs réelle", but nothing anywhere in this system
-- currently produces a predicted figure to compare against — inventing one
-- would violate the project's anti-hallucination rule. The interpretation
-- used here (flagged for Russel to correct if wrong): compare two real,
-- already-collected Phase 1 snapshots and report the actual observed
-- delta, explicit that this is correlation over time, never proof that any
-- specific publication caused the change. No human validation gate — per
-- CLAUDE.md's Phase 7 table row, "Validation humaine requise : Non".

create table if not exists public.performance_analyses (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  baseline_snapshot_id uuid not null references public.audit_snapshots(id),
  comparison_snapshot_id uuid not null references public.audit_snapshots(id),
  -- Deltas computed in code (never by the model) — same
  -- "donnée_indisponible" convention as Phase 1: null per-field when either
  -- side is missing, never estimated.
  metrics_delta jsonb,
  analysis_summary text,
  correlation_note text,
  is_mock boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists performance_analyses_social_connection_id_idx
  on public.performance_analyses (social_connection_id);

alter table public.performance_analyses enable row level security;

drop policy if exists "Admins can read performance analyses" on public.performance_analyses;
drop policy if exists "Admins can insert performance analyses" on public.performance_analyses;

create policy "Admins can read performance analyses"
on public.performance_analyses
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert performance analyses"
on public.performance_analyses
for insert
to authenticated
with check (public.is_admin());

-- No update policy: append-only by design, same as audit_snapshots — no
-- human validation gate to record either (CLAUDE.md Phase 7: "Non").
