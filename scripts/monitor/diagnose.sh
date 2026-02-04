#!/bin/bash

# Diagnosis Script
# Analyzes logs for errors

LOG_LINES=200
KEYWORDS="Exception|Error|Caused by|Connection refused"

echo "=== Backend Log Diagnosis ==="
docker logs --tail $LOG_LINES supplypro-backend | grep -E "$KEYWORDS" | head -n 20

echo -e "\n=== Database Log Diagnosis ==="
docker logs --tail $LOG_LINES supplypro-db | grep -E "$KEYWORDS" | head -n 20

echo -e "\n=== Redis Log Diagnosis ==="
docker logs --tail $LOG_LINES supplypro-redis | grep -E "$KEYWORDS" | head -n 20
