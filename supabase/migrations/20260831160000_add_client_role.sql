-- Adds a real "client" role: until now the platform only ever had
-- student/partner/admin — a client whose social accounts GLN manages had no
-- way to log in, connect their own account, or see/validate anything. See
-- CLAUDE.md "Feature en cours de cadrage", this migration is Phase 1 of the
-- plan adding self-service client access to the 7-phase pipeline.
--
-- social_connections.client_profile_id already existed (added in Phase 1's
-- own migration, 20260809120000) but was never actually populated by any
-- flow — this migration is what starts using it for real: RLS everywhere
-- downstream keys off social_connections.client_profile_id = auth.uid().

-- One Zernio "Profile" (their own agency/workspace concept, distinct from
-- this table) per client, created lazily on first OAuth connect attempt —
-- see supabase/functions/zernio-connect/index.ts.
alter table public.profiles add column if not exists zernio_profile_id text;

-- ─── social_connections: client owns rows where client_profile_id = them ───
drop policy if exists "Admins can read social connections" on public.social_connections;
drop policy if exists "Clients can read own social connections" on public.social_connections;
drop policy if exists "Clients can insert own social connections" on public.social_connections;
drop policy if exists "Clients can update own social connections" on public.social_connections;

create policy "Clients can read own social connections"
on public.social_connections
for select
to authenticated
using (public.is_admin() or client_profile_id = auth.uid());

-- The client has a real JWT here (unlike the anonymous public audit-request
-- form), so RLS alone is enough to scope this — no service_role needed.
create policy "Clients can insert own social connections"
on public.social_connections
for insert
to authenticated
with check (public.is_admin() or client_profile_id = auth.uid());

create policy "Clients can update own social connections"
on public.social_connections
for update
to authenticated
using (public.is_admin() or client_profile_id = auth.uid())
with check (public.is_admin() or client_profile_id = auth.uid());

-- ─── Read-only client visibility on every downstream phase table ───
-- Same pattern repeated on each: admin keeps full access (existing policy
-- untouched), client gets an additional SELECT scoped through
-- social_connections.client_profile_id. None of these grant the client
-- INSERT/UPDATE/DELETE — that stays admin-only except content_strategies/
-- content_drafts below, which also get a client UPDATE for approve/reject.

drop policy if exists "Clients can read own audit snapshots" on public.audit_snapshots;
create policy "Clients can read own audit snapshots"
on public.audit_snapshots
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = audit_snapshots.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

drop policy if exists "Clients can read own diagnostics" on public.diagnostics;
create policy "Clients can read own diagnostics"
on public.diagnostics
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = diagnostics.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

drop policy if exists "Clients can read own content strategies" on public.content_strategies;
create policy "Clients can read own content strategies"
on public.content_strategies
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = content_strategies.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

-- Client approval gate (Phase 3). Same column-level caveat already
-- documented on the admin update policies in this project (RLS is
-- row-level, not column-level) — the client UI only ever writes
-- review_status/reviewed_by/reviewed_at, nothing here structurally stops a
-- direct API call from also editing the AI-generated fields.
drop policy if exists "Clients can review own content strategies" on public.content_strategies;
create policy "Clients can review own content strategies"
on public.content_strategies
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = content_strategies.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = content_strategies.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

drop policy if exists "Clients can read own content drafts" on public.content_drafts;
create policy "Clients can read own content drafts"
on public.content_drafts
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = content_drafts.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

-- Client approval gate (Phase 4a) — same caveat as content_strategies above.
drop policy if exists "Clients can review own content drafts" on public.content_drafts;
create policy "Clients can review own content drafts"
on public.content_drafts
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = content_drafts.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = content_drafts.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

drop policy if exists "Clients can read own phase4b jobs" on public.phase4b_visual_jobs;
create policy "Clients can read own phase4b jobs"
on public.phase4b_visual_jobs
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = phase4b_visual_jobs.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

drop policy if exists "Clients can read own scheduled publications" on public.scheduled_publications;
create policy "Clients can read own scheduled publications"
on public.scheduled_publications
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = scheduled_publications.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

-- publication_log has no social_connection_id of its own — it hangs off
-- scheduled_publications, so the client-visibility check is a two-hop join.
drop policy if exists "Clients can read own publication log" on public.publication_log;
create policy "Clients can read own publication log"
on public.publication_log
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.scheduled_publications sp
    join public.social_connections sc on sc.id = sp.social_connection_id
    where sp.id = publication_log.scheduled_publication_id
      and sc.client_profile_id = auth.uid()
  )
);

drop policy if exists "Clients can read own engagement items" on public.engagement_items;
create policy "Clients can read own engagement items"
on public.engagement_items
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = engagement_items.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

drop policy if exists "Clients can read own performance analyses" on public.performance_analyses;
create policy "Clients can read own performance analyses"
on public.performance_analyses
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = performance_analyses.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);
