#!/usr/bin/env bash
#
# T17 - Low-Downtime Release Strategy
#
# Symlinked-release deploy with a health gate. The candidate release is staged
# into releases/<sha> and served on its own port while the current release keeps
# serving. Traffic is switched only after the candidate answers a real HTTP
# health check, and a failed candidate leaves `current` exactly where it was.
#
# Order of operations is the whole point:
#
#   prepare -> serve candidate -> health check -> switch (only on pass)
#
# The naive version of this script deletes or overwrites the live directory
# first and then unpacks the new release into it. That has two failure modes we
# specifically avoid: the site is down for the duration of the copy, and if the
# new release is broken there is no previous version left to fall back to.
#
# Usage:
#   release-switch.sh --source DIR --sha SHA [--root DIR] [--port N] [--keep N]

set -euo pipefail

SOURCE=""
SHA=""
ROOT="deploy"
PORT="8099"
KEEP="3"

while [ $# -gt 0 ]; do
  case "$1" in
    --source) SOURCE="$2"; shift 2 ;;
    --sha)    SHA="$2";    shift 2 ;;
    --root)   ROOT="$2";   shift 2 ;;
    --port)   PORT="$2";   shift 2 ;;
    --keep)   KEEP="$2";   shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$SOURCE" ] || [ -z "$SHA" ]; then
  echo "::error::--source and --sha are required" >&2
  exit 2
fi

RELEASES_DIR="${ROOT}/releases"
CURRENT_LINK="${ROOT}/current"
CANDIDATE="${RELEASES_DIR}/${SHA}"

log() { echo "[release-switch] $*"; }

previous_target=""
if [ -L "$CURRENT_LINK" ]; then
  previous_target="$(readlink "$CURRENT_LINK")"
fi

log "release root      : ${ROOT}"
log "candidate sha     : ${SHA}"
log "current release   : ${previous_target:-<none>}"

########################################
# 1. Prepare - stage the candidate alongside the live release, never over it
########################################
log "PREPARE: staging candidate into ${CANDIDATE}"
rm -rf "$CANDIDATE"
mkdir -p "$CANDIDATE"
cp -R "${SOURCE}/." "$CANDIDATE/"
log "PREPARE: staged $(find "$CANDIDATE" -type f | wc -l | tr -d ' ') files"

if [ -n "$previous_target" ]; then
  log "PREPARE: current release still serving from ${previous_target} (untouched)"
fi

########################################
# 2. Serve the candidate on its own port
########################################
log "HEALTH: starting candidate server on port ${PORT}"
node "$(dirname "$0")/serve-release.mjs" "$CANDIDATE" "$PORT" &
CANDIDATE_PID=$!

cleanup() {
  if kill -0 "$CANDIDATE_PID" 2>/dev/null; then
    kill "$CANDIDATE_PID" 2>/dev/null || true
    wait "$CANDIDATE_PID" 2>/dev/null || true
    log "HEALTH: candidate server stopped"
  fi
}
trap cleanup EXIT

########################################
# 3. Health gate - poll, do not sleep-and-hope
########################################
health_ok=0
for attempt in $(seq 1 20); do
  body="$(curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/health" 2>/dev/null || true)"
  if [ "$body" = "ok" ]; then
    log "HEALTH: candidate answered /health with 'ok' after ${attempt} attempt(s)"
    health_ok=1
    break
  fi
  sleep 0.5
done

# A 200 on /health alone is not proof the release is usable - a release can be
# healthy and still have shipped an empty index.html. Check the document the
# users actually land on too.
if [ "$health_ok" = "1" ]; then
  if ! curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/" -o /dev/null; then
    log "HEALTH: candidate failed to serve /"
    health_ok=0
  fi
fi

########################################
# 4. Switch - only on a passing gate
########################################
if [ "$health_ok" != "1" ]; then
  log "HEALTH: FAILED - candidate did not pass the gate"
  log "SWITCH: REFUSED. Traffic was never moved."
  if [ -n "$previous_target" ]; then
    log "PRESERVED: current still points at ${previous_target}"
    if [ -e "$CURRENT_LINK" ]; then
      log "PRESERVED: known-good release is still readable through current/"
    fi
  else
    log "PRESERVED: there was no previous release to keep"
  fi
  exit 1
fi

log "SWITCH: health passed, promoting ${SHA}"

# Atomic promotion. `ln -sfn` unlinks and re-creates, leaving a window in which
# `current` does not exist - a request arriving in that window 404s. Creating a
# temporary link and renaming it over the old one is a single rename(2) call, so
# a reader sees either the old release or the new one and never nothing.
ln -s "releases/${SHA}" "${ROOT}/.current.tmp"
mv -T "${ROOT}/.current.tmp" "$CURRENT_LINK"

log "SWITCH: current -> $(readlink "$CURRENT_LINK")"

########################################
# 5. Retain previous releases so rollback stays possible
########################################
if [ -n "$previous_target" ]; then
  log "ROLLBACK: previous release ${previous_target} retained"
fi

# Keep the newest N releases. Rollback is only a promise if the bytes are still
# on disk, so pruning is deliberate and bounded rather than "delete the old one".
pruned=0
if [ "$KEEP" -gt 0 ]; then
  current_name="$(basename "$(readlink "$CURRENT_LINK")")"
  # shellcheck disable=SC2012
  for old in $(ls -1t "$RELEASES_DIR" 2>/dev/null | tail -n +"$((KEEP + 1))"); do
    if [ "$old" != "$current_name" ]; then
      rm -rf "${RELEASES_DIR:?}/${old}"
      log "PRUNE: removed old release ${old}"
      pruned=$((pruned + 1))
    fi
  done
fi
log "PRUNE: retained $(ls -1 "$RELEASES_DIR" | wc -l | tr -d ' ') release(s), removed ${pruned}"

log "DONE: ${SHA} is live"
