-- Harden public data access and admin-only mutations.
-- Apply this migration in Supabase after confirming the real admin user has
-- roles including "admin" or "super_admin" in public.profiles.
--
-- NOTE: this file's two bare `current_role` references (below and in the
-- profiles update policy further down) were bugs — current_role is a
-- reserved Postgres keyword (like current_user) that always resolves to the
-- session's database role, never to the profiles.current_role column, unless
-- quoted or schema-qualified. As written it made both checks either always
-- false or always true (dead/no-op conditions) rather than checking the
-- actual column — never a security hole (the roles-array check next to it
-- still gated access correctly), just not doing what the comment describes.
-- This text was never actually run against Postgres before now (confirmed
-- via `supabase db push`, which fails on the same class of syntax error in
-- the profiles migration first), so there's no deployed history to
-- preserve — fixed in place rather than via a new migration.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        roles && array['admin', 'super_admin']::text[]
        or "current_role" in ('admin', 'super_admin')
      )
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- admin_settings: never readable publicly.
drop policy if exists "Public can read admin settings" on public.admin_settings;
drop policy if exists "Admins can read admin settings" on public.admin_settings;
drop policy if exists "Admins can update admin settings" on public.admin_settings;

create policy "Admins can read admin settings"
on public.admin_settings
for select
to authenticated
using (public.is_admin());

create policy "Admins can update admin settings"
on public.admin_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- testimonials: public can read visible items, only admins can mutate.
drop policy if exists "Anyone can insert testimonials" on public.testimonials;
drop policy if exists "Anyone can update testimonials" on public.testimonials;
drop policy if exists "Anyone can delete testimonials" on public.testimonials;
drop policy if exists "Admins can insert testimonials" on public.testimonials;
drop policy if exists "Admins can update testimonials" on public.testimonials;
drop policy if exists "Admins can delete testimonials" on public.testimonials;

create policy "Admins can insert testimonials"
on public.testimonials
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update testimonials"
on public.testimonials
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete testimonials"
on public.testimonials
for delete
to authenticated
using (public.is_admin());

-- portfolio_media: public can read visible items, only admins can mutate.
drop policy if exists "Anyone can insert media" on public.portfolio_media;
drop policy if exists "Anyone can update media" on public.portfolio_media;
drop policy if exists "Anyone can delete media" on public.portfolio_media;
drop policy if exists "Admins can insert media" on public.portfolio_media;
drop policy if exists "Admins can update media" on public.portfolio_media;
drop policy if exists "Admins can delete media" on public.portfolio_media;

create policy "Admins can insert media"
on public.portfolio_media
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update media"
on public.portfolio_media
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete media"
on public.portfolio_media
for delete
to authenticated
using (public.is_admin());

-- profiles: users see/edit their own profile; admins can see/edit all.
drop policy if exists "Public can view profiles" on public.profiles;
drop policy if exists "Users can insert/update their own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (
  public.is_admin()
  or (
    auth.uid() = id
    and not (roles && array['admin', 'super_admin']::text[])
    and "current_role" not in ('admin', 'super_admin')
  )
);

create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin());

-- audit_requests: public can submit; admins can manage; authenticated users
-- can read only requests matching their profile email or phone.
drop policy if exists "Anyone can read audit requests" on public.audit_requests;
drop policy if exists "Anyone can update audit requests" on public.audit_requests;
drop policy if exists "Anyone can delete audit requests" on public.audit_requests;
drop policy if exists "Admins can read audit requests" on public.audit_requests;
drop policy if exists "Admins can update audit requests" on public.audit_requests;
drop policy if exists "Admins can delete audit requests" on public.audit_requests;
drop policy if exists "Users can read own audit requests" on public.audit_requests;

create policy "Users can read own audit requests"
on public.audit_requests
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.email = audit_requests.email or p.phone = audit_requests.phone)
  )
);

create policy "Admins can update audit requests"
on public.audit_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete audit requests"
on public.audit_requests
for delete
to authenticated
using (public.is_admin());

-- portfolio storage bucket: keep public read if media is public-facing, but
-- restrict writes to admins.
drop policy if exists "Anyone can upload portfolio files" on storage.objects;
drop policy if exists "Anyone can update portfolio files" on storage.objects;
drop policy if exists "Anyone can delete portfolio files" on storage.objects;
drop policy if exists "Admins can upload portfolio files" on storage.objects;
drop policy if exists "Admins can update portfolio files" on storage.objects;
drop policy if exists "Admins can delete portfolio files" on storage.objects;

create policy "Admins can upload portfolio files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'portfolio' and public.is_admin());

create policy "Admins can update portfolio files"
on storage.objects
for update
to authenticated
using (bucket_id = 'portfolio' and public.is_admin())
with check (bucket_id = 'portfolio' and public.is_admin());

create policy "Admins can delete portfolio files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'portfolio' and public.is_admin());
