# Incident: seeded secret leak drill (T27)

**Status:** contained and closed
**Credential:** referenced by name only as `SEEDED_TEST_TOKEN`
**Severity if real:** high — a deploy-scoped token echoed into public CI output

This report deliberately does not contain the token's value. Writing it here to
"document the leak" would copy the credential into our permanent history, which
is the thing the drill is about.

---

## What was found

The organizer branch `task-assets/secret-leak` seeds the same fake token in two
different exposure classes:

| Location | Exposure class |
| --- | --- |
| `docs/incidents/seeded-secret-leak.md` | plaintext credential committed to source |
| `.github/workflows/leaky-debug.yml` | credential echoed into workflow logs |

The second is the more dangerous of the two. Source is reviewable and greppable;
CI logs are read by fewer people, are retained separately, and on a public
repository are world-readable. A value that reaches a log is disclosed even if the
file that produced it is deleted a minute later.

## Blast-radius assessment

Three questions, answered by checking rather than assuming:

**1. Did the token reach Actions logs?**
No. `Leaky debug rehearsal` is `workflow_dispatch`-only and has never been run —
there is no run of it in this repository's Actions history. So no log, artifact or
job summary contains the value.

**2. Is the token on `main`?**
No. It has never been merged.

**3. Which refs carry it?**
Exactly one: `refs/remotes/origin/task-assets/secret-leak`, which is
organizer-owned. Verified by scanning every `origin/*` ref for the value.

## Remediation

**The seeded files were not merged into `main`.**

This is the decision worth explaining. The obvious reading of the drill is "merge
the asset branch, then remove the token in the same PR". We rejected that: the
merge commit would put the credential into `main`'s permanent history, and the
subsequent deletion would remove it only from the tip. `main` would be
*apparently* clean while still carrying the value at every commit in between,
retrievable with one `git log -p`. Removing a secret from HEAD is not removal.

So the remediation keeps it out instead:

1. **This file** replaces the seeded document at the same path, carrying the
   incident record without the value.
2. **`.github/workflows/leaky-debug.yml` is not adopted.** A workflow whose only
   step echoes a token has no legitimate use, so it is not "fixed" — it is simply
   never brought onto `main`.
3. **`scripts/scan-secrets.sh`** detects the token, credential-shaped strings, and
   any workflow that prints a secret.
4. **`.github/workflows/secret-scan.yml`** runs that scanner on every pull request
   and every push to `main`, over both source and generated `dist/`.

### Why no history rewrite

We did not rewrite history, and would not have even if the token had reached
`main`:

- **It does not achieve the goal.** The moment a credential is pushed it must be
  assumed compromised. Forks, clones, CI caches, and the GitHub API's cached
  objects all survive a rewrite. A rewrite makes the repository look clean; it
  does not make the credential safe.
- **The real fix is rotation.** Revoke the exposed credential and issue a new one.
  That invalidates the leaked value everywhere, including the copies you cannot
  reach. Rewriting history without rotating is theatre; rotating without
  rewriting is sufficient.
- **It destroys the audit trail.** A force-push over shared history removes the
  record of what happened and when — exactly the evidence an incident review
  needs, and exactly what this event should leave behind.

### Rotation / revocation decision

The seeded token is fake and is documented by organizers as
`<team-created-or-organizer-provided>` test data, so there is nothing live to
revoke. Handled as if it were real, the action would be:

1. Revoke the token at the issuer immediately — before cleaning up any file.
   Cleanup is cosmetic while the credential still works.
2. Issue a replacement, store it as a GitHub Secret, never as a repository
   variable. *(We have direct experience of this failure mode: earlier in this
   event `DNS_PORTAL_PASSWORD` was found stored as a repository **variable** —
   cleartext, and printed unmasked in workflow logs. It was moved to Secrets and
   the variable deleted.)*
3. Re-run the deploy so the new value is picked up.
4. Leave the history intact and keep this report as the record.

## Prevention

| Control | Where |
| --- | --- |
| Seeded token blocked from source and `dist/` | `scripts/scan-secrets.sh` |
| Credential-shaped strings blocked | private keys, GitHub PAT/OAuth, AWS key ids, Resend keys |
| Workflows printing secrets blocked | pattern check across `.github/workflows` |
| Runs on every PR and push to `main` | `.github/workflows/secret-scan.yml` |
| Secrets never stored as variables | T05 separation, enforced by the CI bundle check |
| Build output checked, not just source | scanner runs with `--include-dist` after a real build |

The scanner assembles the token from parts at runtime rather than containing it,
so the detector is not itself a copy of the leak.

Two properties worth noting about the gate: it is granted **no secrets** — a job
that hunts for credentials has no business holding any — and it blocks any
workflow that echoes a `secrets.*` expression. GitHub masks values it recognises,
but masking is a safety net rather than a control: anything concatenated,
base64-encoded or interpolated into a longer string can slip past it. Printing a
secret is never intentional, so it is refused outright rather than trusted to be
masked.
