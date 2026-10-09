#!/usr/bin/env bash
# deploy.sh - Pull latest changes from git and redeploy the MyManager Docker container
#
# Usage:
#   bash scripts/deploy.sh          # normal redeploy (uses Docker cache)
#   bash scripts/deploy.sh --clean  # full rebuild with no cache
#

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$REPO_DIR/docker-compose.yml"
CLEAN=0

for arg in "$@"; do
  [ "$arg" = "--clean" ] && CLEAN=1
done

echo "==> MyManager deployment starting: $(date '+%Y-%m-%d %H:%M:%S')"
echo "    Repository path: $REPO_DIR"
[ "$CLEAN" = "1" ] && echo "    Rebuild mode: CLEAN (no cache)"

# Step 1: Pull latest changes
echo ""
echo "==> Pulling latest changes from git repository..."
git -C "$REPO_DIR" pull

# Step 2: Build container image
if [ "$CLEAN" = "1" ]; then
  echo "==> Building Docker image (clean rebuild without cache)..."
  docker compose -f "$COMPOSE_FILE" build --no-cache
else
  echo "==> Building Docker image (cached)..."
  docker compose -f "$COMPOSE_FILE" build
fi

# Step 3: Start container stack
echo "==> Starting updated container stack..."
docker compose -f "$COMPOSE_FILE" up -d

# Step 4: Verify container state
echo ""
echo "==> Container status check:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "==> Deployment completed successfully at $(date '+%Y-%m-%d %H:%M:%S')"
