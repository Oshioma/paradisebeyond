-- Public Storage bucket for uploaded media (host retreat photos + admin image
-- overrides). Uploads run with the service role (which bypasses RLS); making
-- the bucket public means the returned public URLs are viewable by anyone, so
-- uploaded photos render instead of 404'ing. Idempotent.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = excluded.public;

-- Belt-and-suspenders public read of media objects. Guarded: on some projects
-- the migration role can't own policies on storage.objects — if so we skip it
-- (a public bucket already serves objects via the public endpoint).
do $$
begin
  drop policy if exists media_public_read on storage.objects;
  create policy media_public_read on storage.objects
    for select using (bucket_id = 'media');
exception when others then
  raise notice 'Skipped media_public_read policy: %', sqlerrm;
end $$;
