#!/usr/bin/env bash
#
# T27 - Secret Leak Drill: prevention scan.
#
# Fails the build if a known-leaked token, a credential-shaped string, or a
# workflow that prints a secret reaches the repository.
#
# NOTE ON THE NEEDLE
# ------------------
# The seeded token is assembled from parts at runtime and never written as a
# literal in this file. A scanner that contains the string it searches for is
# itself a copy of the leak: it would trip its own check, and worse, "remediating
# a leak" by committing the value into a detector leaves the value in git history
# exactly as before. This is the same reason the incident report below documents
# the token by name and never by value.
#
# Usage: scan-secrets.sh [--include-dist]

set -euo pipefail

INCLUDE_DIST=0
[ "${1:-}" = "--include-dist" ] && INCLUDE_DIST=1

# Assembled, never literal. See the note above.
seeded_prefix='DEPLOY_SPRINT_TEST_TOKEN'
seeded_suffix='T23_DO_NOT_USE'
SEEDED_NEEDLE="${seeded_prefix}_${seeded_suffix}"

findings=0

report() {
  echo "::error file=$1,line=$2::$3"
  findings=$((findings + 1))
}

echo "== scanning tracked files for the seeded token =="
# -I skips binary files; tracked files only, so build output and node_modules
# cannot create noise. `|| true` because grep exits 1 when it finds nothing,
# which is the outcome we want.
while IFS=: read -r file line _; do
  [ -z "${file:-}" ] && continue
  report "$file" "$line" "seeded leaked token present in tracked source"
done < <(git grep -I -n -F -- "$SEEDED_NEEDLE" -- . 2>/dev/null || true)

if [ "$INCLUDE_DIST" = "1" ] && [ -d team-site/dist ]; then
  echo "== scanning build output for the seeded token =="
  while IFS=: read -r file line _; do
    [ -z "${file:-}" ] && continue
    report "$file" "$line" "seeded leaked token present in build output"
  done < <(grep -I -r -n -F -- "$SEEDED_NEEDLE" team-site/dist 2>/dev/null || true)
fi

echo "== scanning for credential-shaped strings =="
# Patterns for real credential formats. The point of adding these alongside the
# drill token is that the next leak will not be the one we already know about.
patterns=(
  'BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY'
  'gh[pousr]_[A-Za-z0-9]{36}'
  'github_pat_[A-Za-z0-9_]{22,}'
  'AKIA[0-9A-Z]{16}'
  're_[A-Za-z0-9]{24,}'
)
for pattern in "${patterns[@]}"; do
  while IFS=: read -r file line _; do
    [ -z "${file:-}" ] && continue
    # This script documents the patterns, so exclude itself.
    [ "$file" = "scripts/scan-secrets.sh" ] && continue
    report "$file" "$line" "credential-shaped string matching /${pattern}/"
  done < <(git grep -I -n -E -- "$pattern" -- . 2>/dev/null || true)
done

echo "== scanning workflows for printed secrets =="
# The seeded leak was a workflow that echoed a token. Actions masks values it
# knows are secrets, but masking is a safety net, not a control: anything
# assembled, base64-ed or interpolated into a longer string can slip past it.
# Printing a secret is never intentional, so it is blocked outright.
if [ -d .github/workflows ]; then
  while IFS=: read -r file line _; do
    [ -z "${file:-}" ] && continue
    report "$file" "$line" "workflow prints a secret to the log"
  done < <(git grep -I -n -E -- '(echo|printf)[^|;]*\$\{\{[[:space:]]*secrets\.' -- .github/workflows 2>/dev/null || true)
fi

echo
if [ "$findings" -gt 0 ]; then
  echo "FAIL: ${findings} finding(s). Nothing is committed until these are resolved."
  exit 1
fi

echo "PASS: no seeded token, no credential-shaped strings, no secret printed by a workflow."
