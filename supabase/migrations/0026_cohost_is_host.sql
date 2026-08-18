-- Paradise Beyond — a co-host is a host (fix account role).
-- =============================================================================
-- Co-hosts were added as draft editors and listed on the retreat, but nothing
-- promoted their ACCOUNT to the host role. Since getSessionUser only resolves a
-- host slug (and the studio/builder + owner "Edit" controls only unlock) for the
-- host role, an existing co-host could see their name on the retreat yet had no
-- Edit button and couldn't open the builder. Backfill any co-host who owns a
-- host row and isn't already an admin/host up to the host role. New invites are
-- promoted in code (addCoHost).
-- =============================================================================

update profiles p
set role = 'host'
where p.role is distinct from 'admin'
  and p.role is distinct from 'host'
  and exists (
    select 1
    from hosts h
    join retreat_draft_editors de on de.host_id = h.id
    where h.owner_id = p.id
  );
