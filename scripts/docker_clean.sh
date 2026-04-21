#!/bin/bash
set -e

# Configuration
KEEP_VERSIONS=3
LOG_FILE="scripts/docker_clean.log"

echo "=========================================="
echo "Docker Cleanup Utility - $(date)"
echo "==========================================" | tee -a $LOG_FILE

# 1. Prune Build Cache (Aggressive)
echo "[Step 1] Pruning Build Cache (This frees the most space)..." | tee -a $LOG_FILE
# Keep cache younger than 24h to avoid rebuilding everything from scratch if working actively
# But user said 50GB is too much, so we'll prune everything older than 1h or just all
docker builder prune -a -f --filter "until=1h" | tee -a $LOG_FILE

# 2. Prune Stopped Containers
echo "[Step 2] Pruning Stopped Containers..." | tee -a $LOG_FILE
docker container prune -f | tee -a $LOG_FILE

# 3. Prune Dangling Images
echo "[Step 3] Pruning Dangling Images..." | tee -a $LOG_FILE
docker image prune -f | tee -a $LOG_FILE

# 4. Clean Old Application Images (Keep last N versions)
echo "[Step 4] Cleaning Old Application Versions (Keeping last $KEEP_VERSIONS)..." | tee -a $LOG_FILE

clean_repo() {
    REPO=$1
    echo "Cleaning repository: $REPO" | tee -a $LOG_FILE
    
    # List Image IDs sorted by creation date (newest first)
    # We use 'docker images' with filter to handle specific repositories correctly
    # Output format: ID CreatedAt (e.g., "a1b2c3d4 2024-02-12...")
    # Sort by 2nd column (Date) descending
    IDS=$(docker images --format "{{.ID}} {{.CreatedAt}}" "$REPO" | sort -k 2 -r | awk '{print $1}')
    
    # Check if we have any images
    if [ -z "$IDS" ]; then
        echo "  No images found for $REPO." | tee -a $LOG_FILE
        return
    fi

    # Calculate how many to delete
    COUNT=$(echo "$IDS" | wc -l | tr -d ' ')
    if [ "$COUNT" -le "$KEEP_VERSIONS" ]; then
        echo "  Found $COUNT images (Threshold: $KEEP_VERSIONS). No cleanup needed." | tee -a $LOG_FILE
        return
    fi
    
    # Extract IDs to delete (skip the first N)
    TO_DELETE=$(echo "$IDS" | tail -n +$(($KEEP_VERSIONS + 1)))
    DELETE_COUNT=$(echo "$TO_DELETE" | wc -l | tr -d ' ')
    
    echo "  Deleting $DELETE_COUNT old images..." | tee -a $LOG_FILE
    echo "$TO_DELETE" | xargs docker rmi -f 2>/dev/null || echo "  Some images could not be deleted (likely in use)." | tee -a $LOG_FILE
}

clean_repo "supplypro-backend"
clean_repo "supplypro-frontend"
clean_repo "supplypro-supplypro-backend" # Handle potential docker-compose built image name variation

# 5. Remove Unused Base Images (Optional, manual list)
echo "[Step 5] Removing Unused Base Images..." | tee -a $LOG_FILE
# We use bellsoft/liberica-runtime-container:jre-17-musl now.
# We can try to remove others. If they are used by build cache or other containers, it will fail (which is fine).
IMAGES_TO_TRY_REMOVE=(
    "amazoncorretto:17-alpine"
    "eclipse-temurin:17-jre"
    "maven:3.9.6-eclipse-temurin-17"
    "azul/zulu-openjdk-alpine:17-jre"
)

for img in "${IMAGES_TO_TRY_REMOVE[@]}"; do
    docker rmi "$img" 2>/dev/null || echo "Skipping $img (in use or not found)"
done

echo "=========================================="
echo "Cleanup Complete."
echo "Current Disk Usage:"
docker system df
