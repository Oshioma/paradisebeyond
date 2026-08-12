-- App-wide, admin-editable settings as a small key/value store.
-- Currently holds the selected AI model for the Retreat Builder; kept generic
-- so future runtime toggles can reuse it.

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

alter table public.app_settings enable row level security;

-- The values here are non-sensitive (e.g. a model id), so any authenticated
-- user may read them; only admins may write.
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select using (true);

drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
