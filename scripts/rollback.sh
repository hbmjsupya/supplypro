#!/bin/bash
set -e

HISTORY_FILE="scripts/deployment_history.log"

echo "=========================================="
echo "Rollback Utility"
echo "=========================================="

if [ ! -f "$HISTORY_FILE" ]; then
    echo "No deployment history found."
    exit 1
fi

echo "Recent Deployments:"
tail -n 10 $HISTORY_FILE | nl

read -p "Enter the Version TAG to rollback to (e.g., v20240212-...): " TARGET_TAG

if [ -z "$TARGET_TAG" ]; then
    echo "Operation cancelled."
    exit 1
fi

echo "Rolling back to version: $TARGET_TAG"

# Check if images exist (optional but good)
if ! docker images | grep -q "$TARGET_TAG"; then
    echo "Warning: Image for tag $TARGET_TAG might not exist locally."
    read -p "Continue anyway? (y/n) " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        exit 1
    fi
fi

export TAG=$TARGET_TAG
echo "Restarting services with TAG=$TAG..."
docker-compose up -d

echo "Rollback command executed."
echo "Verifying..."
sleep 5
curl -s http://localhost:8080/actuator/health
echo ""
