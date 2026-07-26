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
| T02 | `task/T02-connect-custom-domain` | `domain.config.json`, `docs/dns-verification.md` | A record + TXT challenge created via the organizer portal; HTTP domain and raw IP both still serve. HTTPS pending organizer-side TLS, see Public Notes |
| T03 | `task/T03-build-once-deploy-same-artifact` | CI run > `Dry-run deploy from built artifact` | CI artifact `site-dist-<sha>` uploaded once and consumed without rebuilding |
| T04 | `task/T04-rollback-to-known-good-release` | Actions > `Rollback To Known-Good Release` | Manual `workflow_dispatch` redeploy of a known-good `release_ref` |
| T05 | `task/T05-secret-and-config-separation` | CI run + repository settings | Public deploy label kept as configuration; private token kept as a GitHub Secret |
| T06 | `task/T06-ci-gate-before-deployment` | CI run > `Build gate` job summary | CI gate on PRs and main: lockfile install, build, output verification, artifact upload |
| T07 | `task/T07-openweather-api-widget` | Live site widget + CI run | OpenWeather key injected at build time from the `OPENWEATHER_API_KEY` secret; never committed |
| T08 | `task/T08-rebase-organizer-feature` | PR #11 commit history | Organizer feature branch integrated; release badge and weather widget restored after the asset branch dropped them |
| T09 | `task/T09-conflict-merge-with-both-outcomes` | PR diff on `team-site/src/data/deadlines.ts` | Merge reported no conflict yet dropped a deadline card; both outcomes restored deliberately |
| T10 | `task/T10-contact-form` | http://4.155.210.79/api/contact | Web3Forms contact form; access key held in the `WEB3FORMS_ACCESS_KEY` secret and injected at build time, never committed |
| T11 | `task/T11-pull-request-preview-deployment` | Actions > `PR Preview` > artifact `preview-<head-sha>` | Per-PR preview built and uploaded as an artifact; sends no deploy request, so a PR can never reach production |
| T12 | `task/T12-fast-dependency-pipeline` | CI run summary > `Dependency pipeline` | Cache keyed on the `package-lock.json` hash; `npm ci` still runs on a cache hit; `npm audit` reported non-blocking |
| T13 | `task/T13-feature-bundle-with-tests` | CI run + `check-release-readiness.mjs` | Release-readiness feature with its own check script. First merge was reverted (#17), then re-landed as #19 |
| T14 | `task/T14-production-docker-image` | Actions > `Docker Image` > `Build and verify production image` | Multi-stage image (Node build, nginx runtime) tagged with the commit SHA, run in CI and proven to serve on port 8080 |
| T15 |  |  |  |
| T16 |  |  |  |
| T17 |  |  |  |
| T18 |  |  |  |
| T19 | `task/T19-harden-smoke-verification` | Actions > `Post-Deploy Smoke Tests` | Post-deploy verification of `/`, `/health`, `/status` commit and the generated endpoints. Fails the run on a stale or partial release rather than warning. Live checks poll for a bounded propagation window so a slow publish is not misreported as a stale deploy. |
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

### T03 - Build Once, Deploy Same Artifact

CI uploads one immutable artifact, `site-dist-<commit-sha>`. A separate job,
`Dry-run deploy from built artifact`, downloads that exact artifact, asserts it is
deployable, and generates `release-manifest.json` recording commit, artifact name
and workflow run.

That job has no `actions/checkout` and no `npm` step, so a deploy-time rebuild is
structurally impossible rather than merely discouraged. Rebuilding at deploy time
would mean the bytes that ship were never the bytes that were tested: dependency
resolution, toolchain versions and the branch tip can all move between two builds.

The live site confirms the same property end to end - `/status` reports
`deployer.artifact = site-dist-<sha>` and `deployer.sourceRunId`, so the organizer
deployer publishes the exact artifact the CI run produced.

### T05 - Secret And Config Separation

The split is enforced by the bundler, not by convention. Vite inlines any `VITE_*`
variable into the client bundle at build time, so a secret given a `VITE_` prefix
has already leaked.

Public values (deploy label, public URLs, ports, DNS record type and name) are
repository variables. Private values (`PRIVATE_DEPLOY_TOKEN`,
`DEPLOYER_DISPATCH_TOKEN`, `DNS_PORTAL_PASSWORD`, `DNS_TXT_VALUE`,
`OPENWEATHER_API_KEY`, `WEB3FORMS_ACCESS_KEY`) are GitHub Secrets.

`/status` publishes a `config` block that reports secrets **by name, never by
value**, so a reviewer can confirm what is configured without seeing anything. A
CI step then reads the private tokens only to assert they are **absent** from
`team-site/dist`; if anyone ever prefixes a secret with `VITE_`, the build fails
instead of shipping the value. `.env.example` documents every required name with
placeholder values only.

### T06 - CI Gate Before Deployment

Three pipeline-enforced layers stop a broken change reaching the VPS:

1. CI runs on every pull request - `npm ci` installs strictly from the lockfile,
   `npm run build` is `tsc --noEmit && vite build`, and a verification step fails
   the job if the bundle is empty.
2. The artifact is uploaded only after that verification passes, so a broken build
   never becomes a release candidate.
3. `Request Organizer Deploy` only proceeds when the CI conclusion is `success`
   and the branch is `main`.

Stated plainly: we do not control repository settings, so branch protection
requiring the `build` check is not in place. Merging a red PR is prevented by team
convention and peer review rather than by the platform. Layer 3 is what prevents a
bad merge from becoming a bad deployment.

### T07 - OpenWeather API Widget

`OPENWEATHER_API_KEY` is a real authenticator, so it never reaches the browser.
`team-site/scripts/generate-weather.mjs` fetches server-side at build time and
writes `dist/api/weather`; the browser only fetches that generated file. The
generated evidence records `keyExposed: false`. If no key is configured the script
still writes provider evidence without live data, so the build never fails.

### T09 - Conflict Merge With Both Outcomes

The organizer branch `task-assets/conflict-merge` rewrites the first entry of
`team-site/src/data/deadlines.ts`, replacing the repo setup checkpoint with a
merge conflict lab.

Git reports **no conflict** when that branch is merged: its merge base is the
current tip of `main`, and `main` has not touched the file since, so the
rewrite applies cleanly and silently discards the existing card. The conflict is
semantic rather than textual - two branches each claim the same slot in the
`deadlineCards` array - so preserving both outcomes had to be done by hand.

Resolution keeps both cards, ordered chronologically to match the order
`DeadlineBoard` renders them in. Both `id` values are unchanged, so React keys
stay stable and nothing referencing either id breaks.

### T10 - Web3Forms Contact Service

A Web3Forms access key is a form identifier rather than an authenticator - it must
reach the browser for the form to submit at all. It is still held in GitHub Secrets
and injected at build time, for three reasons unrelated to page visibility:
rotation (a committed key lives in git history forever), log masking, and keeping a
single uniform rule instead of a per-key judgement call.

`/api/contact` and `/status` report `contact.provider = web3forms` and a
`configured` boolean. No key value appears in source, generated evidence, PR text
or logs. No test submission was sent, and `testSubmissionSent` stays `false`
accordingly.

### T11 - Pull Request Preview Deployment

Previews run on `pull_request` and publish to a workflow artifact keyed to the PR
head commit, never to the VPS. Production identity comes only from a deploy request
sent after CI succeeds on `main`, and the preview workflow sends no deploy request
at all - so there is no code path from a pull request to the live server.
Concurrency is keyed per PR with `cancel-in-progress`, so each PR keeps one current
preview instead of accumulating stale ones.

### T12 - Fast Dependency Pipeline

The cache key is the hash of `team-site/package-lock.json`, so any dependency
change rewrites the lockfile, changes the hash, and misses the cache. No manual
cache busting is possible or needed.

`npm ci` runs on every build, cache hit or miss. `actions/setup-node` caches the npm
download cache, not `node_modules`, so a hit skips the network while still doing a
full lockfile-exact install into a clean tree. Caching `node_modules` directly would
be faster and unsafe - it can drift from the lockfile or retain removed packages.

`npm audit` runs with a document-result policy: reported in the step and the run
summary, never used to fail the build, so an overnight advisory cannot block an
unrelated release.

### T14 - Production Docker Image

Multi-stage: Node 20 Alpine builds, nginx 1.27 Alpine serves on port 8080. Only
`dist/` crosses the stage boundary, so the runtime image carries no compiler, no
package manager and no dev dependencies. The workflow asserts this rather than
assuming it - a step fails the build if `node` or `node_modules` is present in the
runtime image. Final image is roughly 20 MB.

The image is tagged with the commit SHA and never `latest`, giving the same
traceability the `dist` artifact has in T03. CI runs the built image and asserts
`/`, `/health`, `/status` and `/api/contact` all respond, and that an unknown path
returns 404 rather than falling back to `index.html` - an SPA fallback would mask a
missing endpoint by returning the shell with a 200.

The Web3Forms key is supplied through a BuildKit secret mount rather than a build
argument. `ARG` and `ENV` values persist in image metadata and are readable with
`docker history`; a secret mount exists only for that build step and leaves no
trace in any layer.
