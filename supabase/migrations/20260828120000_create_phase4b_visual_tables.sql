-- Phase 4b (Production visuelle/vidéo) of the AI social media agent
-- pipeline — see CLAUDE.md "Feature en cours de cadrage : automatisation
-- reseaux sociaux par agents IA", sections 3 et 4.
--
-- SCOPE (strict, per CLAUDE.md's Phase 4b row and section 4/7 rules): this
-- phase only ever processes media the admin explicitly submitted — never
-- generates a visual or video from nothing. Four operations only:
--   image_enhance     — improve the quality of a submitted image
--   video_upscale     — improve the quality of a submitted video
--   video_highlights  — cut the best moments out of a submitted video
--   visual_from_media — create a derived visual from submitted image(s)/video
-- Actual processing happens on RunPod (GPU rented on demand, see
-- supabase/functions/_shared/runpodClient.ts) — this table is metadata +
-- storage paths + the human validation gate only, never the media itself
-- inline (that lives in the "phase4b-media" Storage bucket created below).
--
-- Human validation gate is REAL per CLAUDE.md ("Validation humaine
-- requise : Oui, validation qualité" for Phase 4b) — review_status starts
-- at 'pending_review' and is never auto-approved by the edge function,
-- same pattern as Phase 2/3/4a.

create table if not exists public.phase4b_visual_jobs (
  id uuid primary key default gen_random_uuid(),
  social_connection_id uuid not null references public.social_connections(id) on delete cascade,
  operation_type text not null
    check (operation_type in ('image_enhance', 'video_upscale', 'video_highlights', 'visual_from_media')),
  -- Free-text instructions from the admin for what's wanted (e.g. which
  -- moments to keep, what the derived visual should emphasize) — carried
  -- through to the RunPod worker, never invented if left blank.
  instructions text,
  input_storage_path text not null,
  -- Null until the job actually finishes successfully.
  output_storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  runpod_job_id text,
  -- Raw status string last seen from RunPod's /status endpoint
  -- (IN_QUEUE/IN_PROGRESS/COMPLETED/FAILED/CANCELLED/TIMED_OUT) — kept
  -- verbatim for debugging, distinct from our own simplified `status`.
  runpod_status text,
  is_mock boolean not null default false,
  error text,
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists phase4b_visual_jobs_social_connection_id_idx
  on public.phase4b_visual_jobs (social_connection_id);

alter table public.phase4b_visual_jobs enable row level security;

drop policy if exists "Admins can read phase4b visual jobs" on public.phase4b_visual_jobs;
drop policy if exists "Admins can insert phase4b visual jobs" on public.phase4b_visual_jobs;
drop policy if exists "Admins can update phase4b visual jobs" on public.phase4b_visual_jobs;

create policy "Admins can read phase4b visual jobs"
on public.phase4b_visual_jobs
for select
to authenticated
using (public.is_admin());

-- Inserts happen from the phase4b-process edge function (admin JWT, no
-- service-role key), same pattern as every other phase's tables.
create policy "Admins can insert phase4b visual jobs"
on public.phase4b_visual_jobs
for insert
to authenticated
with check (public.is_admin());

-- NOTE: same row-level-only limitation as diagnostics/content_strategies
-- elsewhere in this schema — this policy allows any admin-authenticated
-- update to the whole row, not just review_status/reviewed_by/reviewed_at/
-- review_notes or the status/runpod_* fields the edge function writes.
-- Postgres RLS has no column-level granularity; the admin UI and the edge
-- function only ever write their own designated fields, same tradeoff as
-- the rest of this project.
create policy "Admins can update phase4b visual jobs"
on public.phase4b_visual_jobs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Private Storage bucket for both submitted media and processed results —
-- NOT public (unlike "portfolio"), client-sensitive raw/processed footage,
-- not public-facing until an admin explicitly publishes it elsewhere.
-- Objects are stored under "input/{job_id}/..." and "output/{job_id}/..."
-- prefixes by convention (enforced in application code, not by RLS).
insert into storage.buckets (id, name, public)
values ('phase4b-media', 'phase4b-media', false)
on conflict (id) do nothing;

drop policy if exists "Admins can upload phase4b media" on storage.objects;
drop policy if exists "Admins can read phase4b media" on storage.objects;
drop policy if exists "Admins can delete phase4b media" on storage.objects;

create policy "Admins can upload phase4b media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'phase4b-media' and public.is_admin());

create policy "Admins can read phase4b media"
on storage.objects
for select
to authenticated
using (bucket_id = 'phase4b-media' and public.is_admin());

create policy "Admins can delete phase4b media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'phase4b-media' and public.is_admin());
