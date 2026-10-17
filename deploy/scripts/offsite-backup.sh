#!/usr/bin/env bash
# Off-site copy of the newest database backup, encrypted with restic, kept 14 days.
#
# The API already writes a consistent copy of the SQLite database every 24 h into the
# `api_backups` Docker volume (BackupService). This script takes the newest of those files,
# sends it to the restic repository configured in /root/.finanverso-backup.env (Cloudflare R2
# or any S3-compatible storage), forgets snapshots older than 14 days and pings a health check
# so that a missed or failed run sends an e-mail. See deploy/RESTORE.md.
#
# Run as root from cron, e.g.:  30 4 * * *  /opt/winjgm/javi-portfolio/deploy/scripts/offsite-backup.sh
set -euo pipefail

ENV_FILE="${FINANVERSO_BACKUP_ENV:-/root/.finanverso-backup.env}"
# shellcheck disable=SC1090
source "$ENV_FILE" # RESTIC_REPOSITORY, RESTIC_PASSWORD, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, HEALTHCHECK_URL
export RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

ping() { [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 --retry 3 -o /dev/null "$HEALTHCHECK_URL$1" || true; }
trap 'ping /fail' ERR

ping /start

VOLUME="$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)api_backups$' | head -1)"
[ -n "$VOLUME" ] || { echo "api_backups volume not found" >&2; exit 1; }
DIR="$(docker volume inspect --format '{{.Mountpoint}}' "$VOLUME")"
LATEST="$(ls -1t "$DIR"/money-manager-*.db 2>/dev/null | head -1)"
[ -n "$LATEST" ] || { echo "no backup file in $DIR" >&2; exit 1; }

# Refuse to upload a file older than two days: it means the API stopped writing backups.
if [ "$(find "$LATEST" -mmin -2880 | wc -l)" -eq 0 ]; then
  echo "newest backup $LATEST is older than 48 h" >&2
  exit 1
fi

restic backup --tag finanverso --host finanverso "$LATEST"
restic forget --tag finanverso --keep-within 14d --prune
# A light integrity check of the repository once a week (Sundays).
if [ "$(date +%u)" = "7" ]; then restic check --read-data-subset=5%; fi

ping ""
echo "off-site backup done: $(basename "$LATEST")"
