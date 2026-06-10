create table if not exists public.audit_requests (
  id text primary key,
  email text not null,
  phone text not null,
  client_name text not null,
  company_name text,
  status text not null default 'pending',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.audit_requests enable row level security;

drop policy if exists "Anyone can submit audit requests" on public.audit_requests;
drop policy if exists "Anyone can read audit requests" on public.audit_requests;
drop policy if exists "Anyone can update audit requests" on public.audit_requests;
drop policy if exists "Anyone can delete audit requests" on public.audit_requests;

create policy "Anyone can submit audit requests"
on public.audit_requests
for insert
with check (true);

create policy "Anyone can read audit requests"
on public.audit_requests
for select
using (true);

create policy "Anyone can update audit requests"
on public.audit_requests
for update
using (true)
with check (true);

create policy "Anyone can delete audit requests"
on public.audit_requests
for delete
using (true);
