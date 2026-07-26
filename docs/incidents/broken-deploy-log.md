# Broken Deploy Rehearsal

Seeded symptom: deployment artifact upload fails because the workflow points at `build`, but Vite writes production output to `dist`.

Expected fix: identify the log line, restore the previous release if production is affected, then change the workflow to upload/deploy `dist`.

## Root cause

Two faults in `.github/workflows/deploy-broken.yml`, both downstream of a green build:

1. **`npm ci` ran at the repository root.** There is no lockfile there — the root
   `package.json` only delegates to `team-site/`. `npm ci` requires a lockfile, so
   the job failed before reaching the build. This is the log line that fails first.
2. **The artifact upload pointed at `build`.** Vite writes production output to
   `team-site/dist`. Had fault 1 not failed first, this would have uploaded an
   *empty* artifact — a deploy that reports success and publishes nothing.

Fault 2 is the more dangerous of the two: no error, no missing step, just an empty
release that looks healthy in Actions.

## Recovery

Production was never affected — the seeded workflow is `workflow_dispatch` only and
is not part of the release path (`ci.yml` → `deploy.yml` → organizer deployer), so
no rollback was required. Had it been live, `rollback.yml` (T04) republishes a
known-good release, and `recover.yml` (T29) rebuilds runtime state from Actions.

## Forward fix

- `npm ci` and `npm run build` now run with `working-directory: team-site`
- the upload path is `team-site/dist`
- `if-no-files-found: error` so an empty artifact fails instead of shipping
- an explicit assertion that `dist/index.html` exists and is non-empty, so the
  class of failure that produced this incident cannot recur silently
