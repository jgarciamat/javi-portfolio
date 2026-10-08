#!/usr/bin/env bash
# Deploys the current origin/<branch> on the server.
#   usage: deploy.sh [repo_dir] [branch]
# Images are built before anything is stopped, and containers are only recreated
# when their image or configuration changed, so the site stays up during the build.
set -euo pipefail

REPO_DIR="${1:-/opt/winjgm/javi-portfolio}"
BRANCH="${2:-master}"
DEPLOY_DIR="$REPO_DIR/deploy"
LEGACY_DB_DIR="$REPO_DIR/backend/data"

echo "==> Using repo: $REPO_DIR, branch: $BRANCH"
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

cd "$DEPLOY_DIR"
if [ ! -f .env ]; then
  echo "!! $DEPLOY_DIR/.env is missing (copy .env.example and fill it in)" >&2
  exit 1
fi

echo "==> Building images"
docker compose build --pull

# Versions <= 1.10 kept the SQLite file inside the git checkout (backend/data).
# Copy it once into the api_db volume; the original files are left untouched.
if [ -f "$LEGACY_DB_DIR/money-manager.db" ]; then
  echo "==> Checking legacy database in $LEGACY_DB_DIR"
  docker compose stop api >/dev/null 2>&1 || true
  docker compose run --rm --no-deps --user root --entrypoint sh \
    -v "$LEGACY_DB_DIR:/legacy:ro" api -c '
      if [ -f /data/money-manager.db ]; then
        echo "   volume already has a database, legacy copy skipped"
      else
        cp -a /legacy/money-manager.db* /data/ && chown node:node /data/money-manager.db*
        echo "   legacy database copied into the api_db volume"
      fi'
fi

echo "==> Starting services"
docker compose up -d --remove-orphans

echo "==> Waiting for the API to be healthy"
API_CONTAINER="$(docker compose ps -q api)"
for _ in $(seq 1 30); do
  STATUS="$(docker inspect --format '{{.State.Health.Status}}' "$API_CONTAINER" 2>/dev/null || echo starting)"
  if [ "$STATUS" = "healthy" ]; then
    echo "   API healthy"
    break
  fi
  sleep 2
done
if [ "${STATUS:-}" != "healthy" ]; then
  echo "!! API did not become healthy; last logs:" >&2
  docker compose logs --tail=80 api >&2
  exit 1
fi

docker image prune -f >/dev/null
docker compose ps
