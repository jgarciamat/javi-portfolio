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
# The case bank (docs/casos-practicos: made-up personas, PDFs and workbooks for the tests) is not
# needed on the server: keep it out of the checkout. Without sparse-checkout (git < 2.25) it stays
# on disk, but it is never in an image nor served (the images build from frontend/ and backend/).
git sparse-checkout set --no-cone '/*' '!/docs/casos-practicos/' 2>/dev/null \
  || echo "!! git sparse-checkout no disponible: docs/casos-practicos se queda en el disco (no se sirve)"
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

# The Caddyfile is a single-file bind mount: `git reset --hard` replaces the file with a new one,
# and the container keeps seeing the old copy until it is recreated. So when the file inside the
# container differs from the one on disk, recreate Caddy (a second or two of downtime); otherwise
# a reload is enough. A reload with an invalid file keeps the running configuration.
echo "==> Reloading Caddy"
HOST_SUM="$(sha256sum Caddyfile | cut -d' ' -f1)"
CONTAINER_SUM="$(docker compose exec -T caddy sha256sum /etc/caddy/Caddyfile 2>/dev/null | cut -d' ' -f1 || true)"
if [ "$HOST_SUM" != "$CONTAINER_SUM" ]; then
  echo "==> Caddyfile changed on disk: recreating Caddy"
  docker compose up -d --force-recreate --no-deps caddy
else
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile \
    || echo "!! Caddy reload failed; the previous configuration is still running" >&2
fi

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
