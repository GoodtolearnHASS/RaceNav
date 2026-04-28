begin;

alter table public.profiles
add column if not exists is_race_officer boolean not null default false;

update public.profiles
set is_race_officer = true
where id = any (
  array[
    '43b1013f-0d3d-4054-9db9-4b67ad21087d'::uuid,
    '16640298-2244-4e58-9b27-6f1bc55764d8'::uuid,
    '58fe0aff-674a-449f-b3e7-a855a57f3cd8'::uuid
  ]
);

drop policy if exists race_sessions_insert_officers_only on public.race_sessions;

create policy race_sessions_insert_officers_only
on public.race_sessions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_race_officer = true
  )
);

drop policy if exists race_sessions_update_officers_only on public.race_sessions;

create policy race_sessions_update_officers_only
on public.race_sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_race_officer = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_race_officer = true
  )
);

commit;
