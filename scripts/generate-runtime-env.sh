#!/usr/bin/env bash
#
# T22 - generate the runtime .env for the Compose service.
#
# This is the answer to "where do runtime variables live, and how are they
# updated safely?". They live in exactly one file on the host, written by this
# script from the deploy environment, and they are never committed.
#
# Two properties matter more than the contents:
#
#   1. The file is written atomically. Compose may read it at any moment, and a
#      half-written env file is worse than a stale one - the service would come
#      back up with a truncated configuration. It is written to a temporary file
#      and renamed into place, so a reader sees the old file or the new one.
#
#   2. It is created with 0600 before anything is written to it. Creating the
#      file and then chmod-ing it leaves a window in which the values are
#      world-readable on a shared host.
#
# Values arrive as environment variables from GitHub Secrets. Nothing is echoed:
# the script prints the NAMES it wrote and whether each was populated, which is
# enough to debug a bad deploy without putting the values in a log.
#
# Usage: generate-runtime-env.sh [--output PATH]

set -euo pipefail

OUTPUT="${RUNTIME_ENV_PATH:-.env}"

while [ $# -gt 0 ]; do
  case "$1" in
    --output) OUTPUT="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Public service identity. Safe to appear in logs.
SERVICE_NAME="${SERVICE_NAME:-deploy-sprint-thebyteforce}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-${SERVICE_NAME}}"
APP_PORT="${APP_PORT:-8080}"
IMAGE_TAG="${IMAGE_TAG:-deploy-sprint-thebyteforce:local}"
GIT_COMMIT="${GIT_COMMIT:-local}"

outdir="$(dirname "$OUTPUT")"
mkdir -p "$outdir"

tmp="$(mktemp "${outdir}/.env.XXXXXX")"
chmod 600 "$tmp"

# Written in one redirect so a partial failure leaves the temp file behind
# rather than a partial .env in place.
{
  echo "# Generated at deploy time by scripts/generate-runtime-env.sh"
  echo "# DO NOT COMMIT. Regenerate rather than edit by hand."
  echo "# Written for commit ${GIT_COMMIT}"
  echo ""
  echo "SERVICE_NAME=${SERVICE_NAME}"
  echo "COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}"
  echo "APP_PORT=${APP_PORT}"
  echo "IMAGE_TAG=${IMAGE_TAG}"
  echo "GIT_COMMIT=${GIT_COMMIT}"
  echo "PUBLIC_URL=${PUBLIC_URL:-}"
  echo "PUBLIC_DEPLOY_LABEL=${PUBLIC_DEPLOY_LABEL:-}"
  echo "EMAIL_PROVIDER=${EMAIL_PROVIDER:-resend}"
  echo "RESEND_API_KEY=${RESEND_API_KEY:-}"
  echo "OPENWEATHER_API_KEY=${OPENWEATHER_API_KEY:-}"
  echo "FEATURE_SHOW_INSIGHTS=${FEATURE_SHOW_INSIGHTS:-false}"
} > "$tmp"

mv -f "$tmp" "$OUTPUT"
chmod 600 "$OUTPUT"

# Report names and whether each is populated. Never the values.
echo "[runtime-env] wrote ${OUTPUT} (mode $(stat -c '%a' "$OUTPUT" 2>/dev/null || echo 600))"
while IFS='=' read -r key value; do
  case "$key" in
    ''|\#*) continue ;;
  esac
  if [ -n "$value" ]; then
    echo "[runtime-env]   ${key}=<set>"
  else
    echo "[runtime-env]   ${key}=<empty>"
  fi
done < "$OUTPUT"
