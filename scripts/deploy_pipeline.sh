#!/bin/bash
set -e

# Configuration
HISTORY_FILE="scripts/deployment_history.log"
DATE_TAG=$(date +%Y%m%d-%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "nogit")
TAG="v${DATE_TAG}-${GIT_HASH}"

echo "=========================================="
echo "Starting CI/CD Pipeline"
echo "Target Version: $TAG"
echo "=========================================="

# 1. Test Stage (Simulated)
echo "[Stage 1] Running Tests..."
# Here you would add:
# cd backend && ./mvnw test
# cd frontend && npm test
echo "Tests passed (simulated)."

# 2. Build Stage
echo "[Stage 2] Building Docker Images..."
export TAG=$TAG
docker-compose build

# 3. Deploy Stage
echo "[Stage 3] Deploying..."
docker-compose up -d

# 4. Verification
echo "[Stage 4] Verifying Deployment..."
# Robust health check with retries
MAX_RETRIES=30
COUNT=0
BACKEND_URL="http://localhost:8080/actuator/health"

echo "Waiting for backend to be ready..."
while [ $COUNT -lt $MAX_RETRIES ]; do
    if curl -s "$BACKEND_URL" | grep -q "UP"; then
        echo "Backend is UP!"
        echo "Deployment Successful!"
        # Log success
        echo "$TAG | $(date) | Success" >> $HISTORY_FILE
        echo "Pipeline Completed Successfully."
        echo "Deployed Version: $TAG"
        exit 0
    fi
    echo -ne "Waiting... ($COUNT/$MAX_RETRIES)\r"
    sleep 2
    COUNT=$((COUNT+1))
done

echo ""
echo "Deployment Verification Failed (Timeout)!"
echo "$TAG | $(date) | Failed" >> $HISTORY_FILE
docker-compose logs --tail=20 supplypro-backend
exit 1
