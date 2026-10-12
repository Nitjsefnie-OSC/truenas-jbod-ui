# Release wrap: v0.24.0-beta.3

Date: `2026-10-11`

## Scope

v0.24.0-beta.3 is the third prerelease of v0.24.0. It adds the twelve pull
requests merged after `v0.24.0-beta.2`: #929, #930, #931, #932, #933, #934,
#935, #939, #940, #942, #944 and #946. GHCR gets the fixed `v0.24.0-beta.3`
and `0.24.0-beta.3` tags and moves `dev` to it; `latest` stays on `v0.23.0`.

Release preparation branch: `release/v0.24.0-beta.3` (PR #945). It is merged
into `main` with a merge commit, never squashed, so the validated commit stays
reachable from the tag, which goes on that `main` merge commit.

Validated release-branch commit: `d816a054e70acda1eb1b84b0db2630e8298f1fd3`.
Later commits change only files under `qa/` (browser-test helpers and their
fixture cases), which `.dockerignore` excludes from the image, and this wrap.

Validated Linux QA image: `sha256:751810c9c76586b1e6293f2339cd9c656693e1f915eccfb54f07eacaf7a1aaf0`, built on the Linux QA host
from that commit with `org.opencontainers.image.revision` set to it. It reports
`0.24.0-beta.3`.

Validated against `docs/RELEASE_CHECKLIST.md`, including its "Prereleases"
section.

Changelog coverage: pass (18 PRs)

## Checklist evidence

| Gate | Required | Evidence | Result | N/A Reason |
| --- | --- | --- | --- | --- |
| Scope and branch | yes | `release/v0.24.0-beta.3` at `d816a054e70acda1eb1b84b0db2630e8298f1fd3` is `main` at `57eacef3e43e0bc32f22a5877da9bb4129431be6` (#929-#946) plus the prerelease version bump and two `qa/`-only helper fixes; `## v0.24.0-beta.3 - 2026-10-11` covers 18 numbers (12 PRs and the 6 issues their commits name); `check_release_changelog_coverage.py v0.24.0-beta.2` passed with the external wiki commit `788e8459c68c9406533514459870cd63906aacb2` verified as a branch tip | Pass |  |
| Python unit and syntax gates | yes | `python scripts/dev_check.py --full` at `d816a05`: 4,258 Python tests OK (6 skipped), compileall, bounded Ruff, diff hygiene, test-count manifest, performance baseline and checked public-demo artifact passed. Locally `promtool` is absent, so the alert-rule gate ran in CI only. CI on the PR head: 24 checks passed, 11 routing skips, 0 failed, including both Python versions across all 8 shards | Pass |  |
| JavaScript syntax gates | yes | Same full source gate at `d816a05`: syntax checks for app, admin, history, SAS Fabric and every `qa/*.spec.js`, plus 1,197 JavaScript unit tests, 0 failed. At the final `qa/` head the CI fixture-only browser specs pass locally: 233 passed | Pass |  |
| Docker build and health gates | yes | QA image built from `d816a05` with a matching revision label; reports `0.24.0-beta.3`. UI, history and admin `/livez` and `/healthz` passed in the matrix and every restore drill. CI production container, image-only upgrade and hardened upgrade smokes passed | Pass |  |
| Optional-sidecar runtime matrix | yes | `scripts/run_compose_runtime_matrix.py` on the Linux QA host at `d816a05`: 7 variants passed; 4 alias cycles, 4 mapping cycles, 1 admin setup, 1 scheduler disabled, 1 scheduler backup; no containers left | Pass |  |
| Full Playwright/browser gates | yes | Live read-only restore at `d816a05`: 16 passed, 2 skipped for `qa/ui-switching.spec.js` and `qa/esxi-smoke.spec.js`, including the release sweep and manual refresh with focus restore. The 2 skips are history refresh actions, which need fixtures the restored data lacks, and auto-refresh after a switch, which needs UI timing. 16 passed, 1 skipped for `qa/private-restore.spec.js` and `qa/admin-operations.spec.js`. CI ran the fixture-only specs, `qa/admin-operations.spec.js` and `qa/public-demo.spec.js` | Pass |  |
| Feature-specific live API/UI gates | yes | Live read-only run at `d816a05` against every saved system: release sweep across every system and enclosure view (including a system that opens on a saved view, #933), manual refresh with focus restore on a two-shelf system (#946), SAS Fabric label and slot-mapping pencil cycles with cleanup, history drawer from enclosure and storage views. Fixes in scope were also checked on the Linux QA host's long-running deployment; see "Fix checks" | Pass |  |
| Local release perf harnesses | yes | Against the live restored stack at `d816a05`, after a completed full history pass: `run_perf_harness.py`, 8 workflows passed (forced and cached inventory, storage views, health, history status, SMART batch, chunked SMART prefetch, snapshot estimate); `run_history_perf_harness.py`, 5 workflows passed including exact counts. `build_perf_baseline.py --check` passed in the source gate | Pass |  |
| Linux QA restore gate | yes | At `d816a05`: default `tar.zst` round trip (the beta.2-made default archive restored with exact counts; a FULL export with no `packaging` field came out `tar.zst`; that export restored with exact counts, restart survival and verified cleanup) and the legacy `7z` round trip of a `0.22.2` backup in live read-only mode. Receipts and deviations under "Restore evidence" | Pass |  |
| Restored Linux QA perf harnesses | yes | Both egress-blocked `tar.zst` restores at `d816a05` passed the history harness; the live read-only restore of the `0.22.2` `7z` backup passed the app and history harnesses | Pass |  |
| Snapshot/export/offline artifact gate | yes | Redacted Auto and Force ZIP exports from two restored stacks at `d816a05` rendered all 60 slots in Chromium with network blocked: offline badge shown, 0 external requests, 0 console errors, 0 private IPv4 addresses, 0 host paths. The 2 credential-pattern hits are the app's own sign-in field code | Pass |  |
| Docs/wiki/public-demo gate | yes | `check_public_docs.py` passed (26 documents, 195 wiki links, 0 prose patterns); `check_public_screenshots.py` passed; `check_public_demo_artifact.py` found the demo publishable (2,095,850 raw bytes); `validate_release_wrap.py v0.24.0-beta.3 --public-demo-only` passed. Public demo deferred: prerelease. `wiki/` changed in 4 files since `v0.24.0-beta.2` (`Advanced-Configuration.md`, `History-Maintenance-and-Recovery.md`, `SSH-Setup-and-Sudo.md`, `TrueNAS-SCALE-Setup.md`) | Pass |  |
| Docs/wiki/public-demo publication | yes | Pending owner publication: external wiki | Blocked |  |
| GHCR publish verification | yes | Recorded after the GitHub prerelease publishes `v0.24.0-beta.3`, `0.24.0-beta.3` and `dev` | Blocked |  |
| Deployment refresh/sniff tests | yes | Recorded after the `dev` image is deployed to a QA host for beta testing | Blocked |  |
| Post-release reopen | yes | Blocked on the deployment gate | Blocked |  |

## Restore evidence

All drills ran on a disposable Linux QA host with
`scripts/run_private_qa_restore.py` at `d816a05`. Archive digests, system
names, counts and timings stay in the restricted QA receipts on that host.

**Default-format round trip (`tar.zst`), egress-blocked.** The beta.2-made
default-format archive restored with exact counts and 8 systems. A redacted
snapshot export rendered offline. A FULL export with no `packaging` field came
out encrypted `tar.zst`, schema 2, with 0 restart failures. Restoring that
export: inspection `tar.zst`, encrypted, export source `0.24.0-beta.3`, no
absent groups; import restored the history database and every saved system;
counts matched exactly; restored rows survived the restart; offline browser and
history performance checks passed; cleanup was verified.

**Legacy round trip (`7z`), live read-only.** An encrypted FULL backup from a `0.22.2` deployment. Inspection reported `7z`, encrypted, schema 2. It was missing only the runtime-overrides and SAS Fabric alias groups, which that release did not export. Import restored the history database and every saved system with 0 restart failures. Counts reconciled, with history growth limited to 13 events. Restored rows survived the restart, and the SAS Fabric label and slot-mapping pencil cycles cleaned up. The live browser, app performance, history live pass and history performance checks passed. The QA host's long-running beta deployment was stopped during the run so only one collector polled the appliances. It came back healthy with 0 restarts.

Deviations:

- The live read-only drill failed twice before the release head was final.
  Run 1 (`a584fae`) failed the release sweep, because `qa/release-readiness.js`
  did not follow #933's opening view on a system switch. It also failed manual
  refresh with a 503. Run 2 (`019fb80`, helper fixed) failed only the manual
  refresh 503. An independent read-only investigation (Fable 5.1) traced the
  503 to the superseded-refresh fence discarding a forced build that was as
  current as the publication that superseded it. #946 fixed it, and it was
  merged into this branch before the recorded run.
- The first launch of the recorded run was stopped before any drill to add a
  wait for the QA restore ports. An earlier attempt had refused to start
  because a port was still held right after the previous drill's teardown.
- After the recorded run, Codex found that with UI timing enabled the browser
  helper expected only a `system-switch` run, not the nested `opening-view`
  run. That fix (`ae9ffe9`) touches `qa/` only. The live drill runs with UI
  timing off, so the recorded run covers the released image.
- As for beta.2, the QA host's long-running beta deployment uses the same fixed
  container names as the restore controller and the Compose matrix. It was
  stopped and its containers renamed aside for the drills, then renamed back
  and started on the same container IDs.

## Fix checks

Fixes in scope that were exercised on the Linux QA host before release:

- #946: the live read-only drill's manual refresh on a two-shelf system
  returned 200 and kept focus on the same slot.
- #933: the live release sweep opened a QuantaStor HA system on its saved
  Primary Chassis view and completed.
- #944: removing four stale per-device `sg_ses` lines from a SCALE system's
  saved command list cleared its Storage Fabric failures on a forced refresh,
  with every bay and locate control intact. The app now skips such lines
  itself.
- #942: the anchored sudo grants were applied to one CORE and one SCALE host.
  `sudo -n -l` allowed every command the app sends and refused SES control-page
  writes, bay power-off, SMART self-tests and setting changes, other `midclt`
  calls, and extra arguments.
- #940, #934, #930: the live SAS Fabric refresh on the cascaded JBOD system ran
  21 commands with 0 failures. A physical locate-light check and the QuantaStor
  HA disk count are scheduled on the QA host after the image deploys.

## Known issues carried into the beta

- A forced refresh without an enclosure selection can still answer 503 "busy"
  with `Retry-After: 1` when another request publishes newer topology while it
  builds. It fails closed by design, because such a build also decides the
  default enclosure (#946). The performance harness's forced inventory retried
  and passed. Refresh Now in the browser always names the enclosure.
- On TrueNAS CORE, the bootstrap's SMART sudo regex is refused after the
  middleware stores it, because the comma in `{0,2}` is escaped (#943). The
  verified comma-free form is in the issue. Linux and SCALE are not affected.
- A system whose boot disk has no storage view (for example a virtual SCALE
  boot disk) reports it as unplaced in the system-wide retention check, so
  `--inventory-url` on that system rolls back until a boot-device view is added.
  This is by design.
- The ESXi host without StorCLI still shows bays without drive models. This
  predates the beta.
- After a restore or restart, history reports failed passes until the main UI
  has a trusted inventory, and its next full pass can be an hour away.

## Hold boundary

This wrap authorizes the `v0.24.0-beta.3` prerelease and its `dev` image only.
It does not move `latest`, deploy to production, or publish the external wiki.
