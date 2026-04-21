#!/bin/bash

# Fast Environment Reconstruction Script
# Usage: ./scripts/rebuild_env.sh [options]
# Options:
#   --clean       : Perform deep clean (remove volumes, no cache) - SLOW
#   --help        : Show help

set -e

CLEAN_MODE=false

for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN_MODE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--clean]"
            exit 0
            ;;
    esac
done

echo "=========================================="
echo "Starting Environment Reconstruction..."
echo "Mode: $(if $CLEAN_MODE; then echo 'DEEP CLEAN'; else echo 'FAST (Incremental)'; fi)"
echo "=========================================="

# 1. Check Prerequisites
if ! command -v docker &> /dev/null; then
    echo "Error: docker is not installed."
    exit 1
fi

# 2. Stop Services
echo "[Step 1] Stopping services..."
if $CLEAN_MODE; then
    docker-compose down -v --remove-orphans
    # Clean local artifacts
    rm -rf frontend/dist
    rm -rf backend/target
    echo "Cleaned volumes and local artifacts."
else
    docker-compose down --remove-orphans
    echo "Stopped services (volumes preserved)."
fi

# 3. Build and Start
echo "[Step 2] Building and starting services..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

if $CLEAN_MODE; then
    # Force no-cache for deep clean
    docker-compose build --no-cache --parallel
else
    # Use cache for fast rebuild
    docker-compose build --parallel
fi

docker-compose up -d --force-recreate

# 4. Health Check
echo "[Step 3] Verifying deployment..."
echo "Waiting for services to be ready..."

MAX_RETRIES=60 # 5 minutes max
COUNT=0
BACKEND_URL="http://localhost:8080/actuator/health"

while [ $COUNT -lt $MAX_RETRIES ]; do
    if curl -s "$BACKEND_URL" | grep -q "UP"; then
        echo "Backend is UP!"
        break
    fi
    echo -ne "Waiting for backend... ($COUNT/$MAX_RETRIES)\r"
    sleep 5
    COUNT=$((COUNT+1))
done
echo ""

if [ $COUNT -eq $MAX_RETRIES ]; then
    echo "Warning: Backend health check timed out."
    docker-compose logs --tail=50 supplypro-backend
else
    echo "Environment is ready!"
    echo "Frontend: http://localhost:80"
    echo "Backend:  http://localhost:8080"
fi
