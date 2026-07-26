# Deploy Sprint Finale Submission

Complete this file on `main` as tasks are completed. Do not paste secrets, private keys, token values, or screenshots that reveal credentials.

## Te- Team name: The Byte Force
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
| T01 | `task/T01-launch-provided-website` | http://4.155.210.79/status | `/health` and `/status` generated at build time; `/status` carries commit, release ID and deploy time |
| T02 |  |  | Blocked on an organizer-side DNS portal error; see Public Notes |
| T03 | `task/T03-build-once-deploy-same-artifact` | CI run > `Dry-run deploy from built artifact` job | Deploy consumes `site-dist-<sha>` downloaded from CI; no rebuild, identity recorded in `release-manifest.json` |
| T04 | `task/T04-rollback-to-known-good-release` | Actions > `Rollback To Known-Good Release` | Manual `workflow_dispatch` rollback with a required `release_ref`, sharing the deploy concurrency lock |
| T05 |  |  |  |
| T06 |  |  |  |
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

### T01 - Launch Provided Website

The provided `team-site/` app is built and published to the assigned VPS through
GitHub Actions only. No team member has SSH access to the server.

- `team-site/scripts/generate-status.mjs` writes `/health` and `/status` into the
  build output as a `postbuild` step, so the endpoints are regenerated on every
  build instead of being committed as static files that could go stale.
- `/status` reports team, commit SHA, release ID, build and deploy time, public
  URL and the `T01` marker, taken from the Actions environment at build time.
- `ci.yml` passes the commit SHA, run ID and team slug into the build from
  repository variables.
- A release badge in the sidebar shows team identity and the short commit.

Verify: `http://4.155.210.79/` returns 200, `/health` returns `ok`, and
`/status` reports a `commit` matching the merged commit on `main`.

### T02 - Connect Custom Domain (blocked, organizer side)

The A record `thebyteforce.deploysprint-finals.knurdz.org` already resolves to
the team VPS and the domain serves over plain HTTP. The TXT challenge record
could not be created: the DNS portal's Create Records action returns
`Hostinger API 422 [DNS:4008] DNS resource record is not valid or conflicts with
another resource record`. HTTPS is enabled by the deployer only after that
record is applied, so it remains pending.

Teams have no direct DNS or VPS access, so this cannot be resolved from the
repository. It was reported to the organizers with the correlation ID from the
error. Plain HTTP on the domain and the raw IP both continue to serve; no
compatibility path was broken.

### T03 - Build Once Deploy Same Artifact

CI builds the site exactly once. The `build` job uploads `team-site/dist` as
`site-dist-<commit-sha>`, and the `verify-release-artifact` job performs a
dry-run deploy by downloading that same artifact. That job never checks out the
repository and never runs npm, so it cannot rebuild - the bytes it verifies are
the bytes that were built and tested.

Artifact identity is recorded in `release-manifest.json`, generated during the
run with the commit, artifact name, workflow run, file count and build time.

Verify: the `Dry-run deploy from built artifact` job downloads `site-dist-<sha>`
and lists its contents, and `npm run build` appears only in the `build` job.

### T04 - Rollback To Known-Good Release

`.github/workflows/rollback.yml` provides a manual `workflow_dispatch` rollback
that takes a required `release_ref` (tag or commit SHA), checks out that exact
release, rebuilds its artifact, and asks the organizer deployer to publish it
again. Recovery therefore needs no SSH access to the VPS.

Two safety properties:

- The job refuses to run with an empty `release_ref` rather than rolling back to
  an undefined target.
- It shares the `request-organizer-deploy` concurrency group with the normal
  deploy workflow, so a rollback and a regular release can never publish at the
  same time.

Verify: run the workflow from the Actions tab with a known-good `release_ref`
and confirm the run summary records the requested release and the deploy request
succeeds.
 without exposing credentials or private infrastructure details.
