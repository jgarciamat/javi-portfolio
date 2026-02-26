#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-/opt/winjgm/javi-portfolio}"
BRANCH="${2:-master}"

echo "==> Using repo: $REPO_DIR, branch: $BRANCH"
cd "$REPO_DIR"

echo "==> Fetch & reset to origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Build frontend (Vite) -> frontend/dist"
docker run --rm -t \
  -v "$REPO_DIR/frontend:/app" \
  -w /app \
  node:20-alpine sh -lc "npm ci && npm run build"

echo "==> Copy dist -> docker volume deploy_web_dist"
cd "$REPO_DIR/deploy"
docker run --rm \
  -v deploy_web_dist:/target \
  -v "$REPO_DIR/frontend/dist:/source:ro" \
  alpine:3.20 sh -lc 'rm -rf /target/* && cp -a /source/. /target/'

echo "==> Deploy stack (recreate to pick changes)"
docker compose up -d --force-recreate

echo "==> Status"
docker compose ps
