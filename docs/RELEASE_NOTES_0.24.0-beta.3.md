# Release Notes - v0.24.0-beta.3

v0.24.0-beta.3 is the third prerelease of v0.24.0. It adds the fixes merged
after v0.24.0-beta.2 and is published for testing only. `CHANGELOG.md` lists
each pull request.

## Channel

- GHCR publishes `v0.24.0-beta.3`, `0.24.0-beta.3` and `dev`. `latest` stays on
  v0.23.0.
- The in-app update check reads the newest stable release, so it does not offer
  this beta to a stable install. A beta install reports a development build.
- The public demo and its screenshots stay at v0.23.0 until v0.24.0.

## Highlights

- Locate lights answer in about a second with the enclosure's own readback,
  instead of waiting for a full refresh. Each press first checks, in the same
  short session, that the enclosure device still belongs to the shelf the bay
  was found on, and refuses if it does not.
- Storage Fabric matches each bay to its controller entry by the disk's own
  controller target. On a cascaded JBOD, rear-shelf bays used to show the next
  bay's controller row and kernel errors.
- Overlapping history and inventory refreshes no longer answer busy. That
  includes Refresh Now on a system with two enclosures when the other enclosure
  is rebuilt from the same fresh data during the refresh. History keeps
  recording UNVR and UNVR Pro bays when only an optional command fails.
- Bays keep their state chip and LED dot when selected, a lit locate light
  blinks, the Connections panel can be cleared, and each system can set the
  order its enclosures and views open in.
- The admin bootstrap's remaining wildcard sudo grants are now anchored
  patterns.

## Before you test it

- Upgrading from v0.24.0-beta.2 needs no configuration change. Upgrading from
  v0.23.0 or older, read the v0.24.0-beta.1 and v0.24.0-beta.2 upgrade notes in
  `CHANGELOG.md` first; they all still apply.
- Hosts set up by an older bootstrap keep their stored sudo grants until SSH
  access setup is re-run. The anchored grants need sudo 1.9.10 or newer.
- On SCALE and QuantaStor, saved `sg_ses` lines that read a fixed `/dev/sgN`
  are skipped; the refresh warning says how many. Remove them from the system's
  SSH command list.
- A `.tar.zst.enc` backup made by a v0.24.0 beta cannot be restored by v0.23.0
  or older. Keep a `.7z` backup, or set `BACKUP_FULL_ARCHIVE_FORMAT=7z`, if you
  may roll back.
- The pre-release security review in #737 still has open items. They will be
  closed before v0.24.0.
- To roll back, set `JBOD_UI_IMAGE` to the previous tag or digest and run
  `docker compose pull` and `docker compose up -d`. Durable state under
  `./config`, `./data` and `./history` is not reverted with the image.

## Release process

`docs/RELEASE_WRAP_0.24.0-beta.3.md` records the checklist evidence for this
prerelease.
