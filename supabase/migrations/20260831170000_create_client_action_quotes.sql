-- Cost quote/consent gate for client-triggered actions that spend real
-- money (Claude, RunPod) — see CLAUDE.md "Feature en cours de cadrage".
-- Deliberately excludes Zernio: it bills Russel per connected account per
-- month (verified on zernio.com/pricing, 2026-08-31), not per API call, so
-- it doesn't fit a "cost of this one action" quote and stays outside this
-- mechanism per Russel's own decision.
--
-- phase_pricing_config: admin-editable per-action-type pricing assumptions.
-- estimated_input_tokens/estimated_output_tokens/estimated_gpu_seconds are
-- STARTING ESTIMATES, not measurements — no phase has ever run against a
-- real Anthropic/RunPod account yet (both still blocked on external
-- credits/deposits as of this writing), so there is no real usage data to
-- base them on. Each row's `notes` says so explicitly. They're meant to be
-- corrected over time from client_action_quotes.actual_usage below, the
-- same "learn from real data" idea already planned for the Phase 7 -> 2
-- feedback loop in CLAUDE.md.
create table if not exists public.phase_pricing_config (
  action_type text primary key,
  estimated_input_tokens integer,
  estimated_output_tokens integer,
  estimated_gpu_seconds integer,
  margin_pct numeric not null default 30,
  notes text,
  updated_at timestamptz not null default now()
);

insert into public.phase_pricing_config
  (action_type, estimated_input_tokens, estimated_output_tokens, estimated_gpu_seconds, notes)
values
  ('phase2_diagnostic', 7500, 800, null,
   'Estimation de départ (pas une mesure) : ~3 captures d''écran (~2000 tokens/image en vision) + contexte texte. À ajuster une fois de vraies exécutions disponibles.'),
  ('phase3_strategy', 4000, 2500, null,
   'Estimation de départ : contexte compte + résultats de recherche web (outil web_search) + calendrier 4 semaines en sortie structurée.'),
  ('phase4a_text', 2000, 600, null,
   'Estimation de départ : une entrée de calendrier (légende + accroche + script optionnel).'),
  ('phase4b_visual_image_enhance', null, null, 30,
   'Estimation de départ : ~25% du timeout d''exécution configuré (120s) pour une amélioration d''image RunPod.'),
  ('phase4b_visual_video_upscale', null, null, 180,
   'Estimation de départ : ~20% du timeout d''exécution configuré (900s) pour un upscale vidéo RunPod.'),
  ('phase4b_visual_video_highlights', null, null, 180,
   'Estimation de départ : ~20% du timeout d''exécution configuré (900s) pour un montage de moments forts RunPod.'),
  ('phase4b_visual_visual_from_media', null, null, 60,
   'Estimation de départ : ~20% du timeout d''exécution configuré (300s) pour une création de visuel RunPod.'),
  ('phase5_suggest_time', 3000, 500, null,
   'Estimation de départ : contexte compte + recherche web sur les meilleures pratiques d''horaire.'),
  ('phase6_engagement', 1500, 450, null,
   'Estimation de départ : classification de ~3 nouveaux commentaires/DM typiques par vérification.'),
  ('phase7_analysis', 1500, 600, null,
   'Estimation de départ : comparaison de deux relevés déjà calculée en code, Claude ne rédige que le résumé.')
on conflict (action_type) do nothing;

alter table public.phase_pricing_config enable row level security;

drop policy if exists "Admins can read pricing config" on public.phase_pricing_config;
drop policy if exists "Admins can update pricing config" on public.phase_pricing_config;

create policy "Admins can read pricing config"
on public.phase_pricing_config
for select
to authenticated
using (public.is_admin());

create policy "Admins can update pricing config"
on public.phase_pricing_config
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- client_action_quotes: one row per quote shown to a client, whether or not
-- they accepted it. accepted_at is set by the client themselves (RLS-scoped
-- to their own row) right before calling the real phase edge function.
-- actual_cost_usd/actual_usage are filled in afterwards, best-effort, by
-- the phase edge function once the real Claude/RunPod call completes — see
-- each phaseN function's own comments for exactly where.
create table if not exists public.client_action_quotes (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  client_profile_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  estimated_cost_usd numeric(10,4) not null,
  -- Rates, assumed usage and margin actually used, frozen at quote time —
  -- so a later change to phase_pricing_config never silently rewrites the
  -- cost a client already saw and accepted.
  cost_breakdown jsonb not null,
  accepted_at timestamptz,
  actual_cost_usd numeric(10,4),
  actual_usage jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_action_quotes_social_connection_id_idx
  on public.client_action_quotes (social_connection_id);
create index if not exists client_action_quotes_client_profile_id_idx
  on public.client_action_quotes (client_profile_id);

alter table public.client_action_quotes enable row level security;

drop policy if exists "Admins can read all quotes" on public.client_action_quotes;
drop policy if exists "Clients can read own quotes" on public.client_action_quotes;
drop policy if exists "Clients can insert own quotes" on public.client_action_quotes;
drop policy if exists "Clients can accept own quotes" on public.client_action_quotes;

create policy "Clients can read own quotes"
on public.client_action_quotes
for select
to authenticated
using (public.is_admin() or client_profile_id = auth.uid());

create policy "Clients can insert own quotes"
on public.client_action_quotes
for insert
to authenticated
with check (public.is_admin() or client_profile_id = auth.uid());

-- The client (or the get-action-quote / phaseN edge functions, running
-- under the client's own JWT) can update their own quote rows — to set
-- accepted_at at acceptance time, and actual_cost_usd/actual_usage after
-- the real call completes. Same row-not-column caveat as elsewhere in this
-- project: nothing structurally stops a client from also editing
-- estimated_cost_usd via a direct API call, only the UI never does.
create policy "Clients can accept own quotes"
on public.client_action_quotes
for update
to authenticated
using (public.is_admin() or client_profile_id = auth.uid())
with check (public.is_admin() or client_profile_id = auth.uid());
