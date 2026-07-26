# Deploy Sprint Finale Submission

Complete this file on `main` as tasks are completed. Do not paste secrets, private keys, token values, or screenshots that reveal credentials.

## Team

- Team name: The Byte Force
- Team members: Nuwan Dhananjaya, Himeth Walgampaya, Achintha Rukshan
- Live IP URL: http://4.155.210.79
- Assigned domain URL: https://thebyteforce.deploysprint-finals.knurdz.org
- Repository URL: https://github.com/knurdz/deploy-sprint-finale-team-thebyteforce

## Release Evidence

- Current production commit: published live at http://4.155.210.79/status (`commit` field)
- Current artifact/image identifier: `site-dist-<commit-sha>`, uploaded by the CI `build` job
- Current deployment workflow run: latest successful `Request Organizer Deploy` run on `main`
- Current release manifest path or URL: http://4.155.210.79/status, plus the `release-manifest-<sha>` CI artifact
- Notes on live evidence or fallback evidence: live evidence available; `/`, `/health`, and `/status` all serve from the assigned VPS over the raw IP.

## Score Summary

- Automated points out of 800:
- Judge points out of 200:
- Final total points out of 1000:

## Completed Tasks

Use this section for short public notes and links. Full task instructions and checks are in the finalist dashboard.

| Task | PR | Evidence | Notes |
| --- | --- | --- | --- |
| T01 | `task/T01-launch-provided-website` | http://4.155.210.79/status | Site live on the assigned VPS via Actions only; `/health` and `/status` generated at build time |
| T02 |  |  | DNS records created; HTTPS pending, see Public Notes |
| T03 | `task/T03-build-once-deploy-same-artifact` | CI run > `Dry-run deploy from built artifact` | CI artifact `site-dist-<sha>` uploaded once and consumed without rebuilding |
| T04 | `task/T04-rollback-to-known-good-release` | Actions > `Rollback To Known-Good Release` | Manual `workflow_dispatch` redeploy of a known-good `release_ref` |
| T05 | `task/T05-secret-and-config-separation` | CI run + repository settings | Public deploy label kept as configuration; private token kept as a GitHub Secret |
| T06 | `task/T06-ci-gate-before-deployment` | CI run > `Build gate` job summary | CI gate on PRs and main: lockfile install, build, output verification, artifact upload |
| T07 |  |  |  |
| T08 |  |  |  |
| T09 |  |  |  |
| T10 |  |  |  |
| T11 |  |  |  |
| T12 |  |  |  |
| T13 |  |  |  |
| T14 |  |  |  |
| T15 |  |  |  |
| T16 |  |  |  |
| T17 |  |  |  |
| T18 |  |  |  |
| T19 |  |  |  |
| T20 |  |  |  |
| T21 |  |  |  |
| T22 |  |  |  |
| T23 |  |  |  |
| T24 |  |  |  |
| T25 |  |  |  |
| T26 |  |  |  |
| T27 |  |  |  |
| T28 |  |  |  |
| T29 |  |  |  |
| T30 |  |  |  |

## Public Notes

Nothing below exposes credentials or private infrastructure details.

### T01 - Launch Provided Website

The provided `team-site/` app is built and published to the assigned VPS through
GitHub Actions only. No team member has SSH access to the server, and no team
member holds the deploy key.

How a change reaches production:

1. A merge to `main` starts the `CI` workflow, which installs with `npm ci` and
   builds `team-site/` on Node 20.
2. `team-site/scripts/generate-status.mjs` runs as a `postbuild` step and writes
   `/health` and `/status` into the build output, so both endpoints are
   regenerated on every build and cannot go stale against the commit.
3. CI uploads the build as the artifact `site-dist-<commit-sha>`.
4. `Request Organizer Deploy` fires on that successful CI run, refuses anything
   that is not `main`, and sends a deploy request to the organizer deployer,
   which publishes the artifact to the VPS.

`/status` reports team, commit SHA, release ID, build and deploy time, public
URL and the `T01` marker, all taken from the Actions environment at build time.
A release badge in the sidebar shows team identity and the short commit.

Verify:

- `http://4.155.210.79/` returns HTTP 200.
- `http://4.155.210.79/health` returns `ok`.
- `http://4.155.210.79/status` reports `"task": "T01"` with a `commit` matching
  the merged commit on `main`, alongside `releaseId` and `deployedAt`.

### T02 - Connect Custom Domain

The A record for `thebyteforce.deploysprint-finals.knurdz.org` resolves to the
team VPS and the TXT ownership challenge is present, both created through the
organizer DNS portal. The domain serves over plain HTTP and the raw IP continues
to serve, so no compatibility path was broken.

HTTPS was still pending at the time of writing: the deployer enables TLS for the
assigned domain on the first deploy after the records are applied. Teams have no
DNS or VPS access, so this step is organizer-side.
