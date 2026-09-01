-- Client-owned Storage access on the diagnostic-screenshots bucket. Phase 2
-- is now client-triggerable (see 20260831160000 + phase2-diagnostic's
-- updated auth check) and Phase 2 requires at least one screenshot per
-- CLAUDE.md — so the client needs to upload their own before they can
-- trigger a diagnostic, not just read admin-uploaded ones.
--
-- Object paths are `${social_connection_id}/${uuid}.${ext}` (see
-- uploadDiagnosticScreenshot() in src/lib/phase2DiagnosticStore.ts), so
-- storage.foldername(name)[1] is the owning social_connections.id — joined
-- against social_connections.client_profile_id, same ownership check used
-- everywhere else in this migration set.
drop policy if exists "Clients can upload own diagnostic screenshots" on storage.objects;
drop policy if exists "Clients can read own diagnostic screenshots storage" on storage.objects;

create policy "Clients can upload own diagnostic screenshots"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'diagnostic-screenshots'
  and (
    public.is_admin()
    or exists (
      select 1 from public.social_connections sc
      where sc.id::text = (storage.foldername(name))[1]
        and sc.client_profile_id = auth.uid()
    )
  )
);

create policy "Clients can read own diagnostic screenshots storage"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'diagnostic-screenshots'
  and (
    public.is_admin()
    or exists (
      select 1 from public.social_connections sc
      where sc.id::text = (storage.foldername(name))[1]
        and sc.client_profile_id = auth.uid()
    )
  )
);

-- The diagnostic_screenshots TABLE (metadata row, separate from the Storage
-- object above) also needs a client policy — missed in 20260831160000,
-- which covered every other Phase 1-7 table but not this one, since Phase 2
-- wasn't yet planned as client-triggerable when that migration was written.
drop policy if exists "Clients can read own diagnostic screenshots" on public.diagnostic_screenshots;
drop policy if exists "Clients can insert own diagnostic screenshots" on public.diagnostic_screenshots;

create policy "Clients can read own diagnostic screenshots"
on public.diagnostic_screenshots
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = diagnostic_screenshots.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);

create policy "Clients can insert own diagnostic screenshots"
on public.diagnostic_screenshots
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1 from public.social_connections sc
    where sc.id = diagnostic_screenshots.social_connection_id
      and sc.client_profile_id = auth.uid()
  )
);
