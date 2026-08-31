-- Shared cooldown table for the edge functions that call a paid third-party
-- API (Zernio, Anthropic Claude, RunPod) — phase1-audit, phase2-diagnostic,
-- phase3-strategy, phase4a-text, phase4b-process, phase5-publish,
-- phase5-suggest-time, phase6-engagement, phase7-analysis. Guards against a
-- runaway loop or a compromised admin session inflating the bill by
-- hammering the same resource. Not a general API-abuse rate limiter (no IP
-- tracking, no per-user quota) — deliberately narrow scope: "don't let the
-- same resource be re-triggered again within a short cooldown window". See
-- supabase/functions/_shared/rateLimit.ts for the check/record logic shared
-- by all nine functions.
--
-- One shared table (rather than reusing each phase's own results table, as
-- first considered) because those tables don't share a common key/column
-- shape across phases — a single resource_key/last_called_at table is
-- simpler and less error-prone than nine different per-table lookups.
create table if not exists public.edge_function_rate_limits (
  resource_key text primary key,
  last_called_at timestamptz not null default now()
);

alter table public.edge_function_rate_limits enable row level security;

-- Admin-only, same as every table these functions touch — the caller's own
-- JWT is used (never service_role), consistent with every other edge
-- function in this project.
create policy "Admins can read rate limits"
on public.edge_function_rate_limits
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert rate limits"
on public.edge_function_rate_limits
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update rate limits"
on public.edge_function_rate_limits
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
