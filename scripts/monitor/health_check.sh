#!/bin/bash

# Health Check Script for SupplyPro
# Checks Docker containers and HTTP endpoints

LOG_FILE="health_check.log"
DATE=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$DATE] Starting Health Check..." >> $LOG_FILE

# 1. Check Containers
CONTAINERS=("supplypro-backend" "supplypro-frontend" "supplypro-db" "supplypro-redis" "supplypro-es" "supplypro-rabbitmq")
ALL_UP=true

for container in "${CONTAINERS[@]}"; do
    if [ "$(docker inspect -f '{{.State.Running}}' $container 2>/dev/null)" == "true" ]; then
        echo "✅ Container $container is RUNNING"
    else
        echo "❌ Container $container is DOWN"
        echo "[$DATE] Error: Container $container is DOWN" >> $LOG_FILE
        ALL_UP=false
    fi
done

# 2. Check Backend Health Endpoint
if $ALL_UP; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/actuator/health)
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "401" ]; then # 401 is ok if auth protected
        echo "✅ Backend API is reachable (HTTP $HTTP_CODE)"
    else
        echo "❌ Backend API check FAILED (HTTP $HTTP_CODE)"
        echo "[$DATE] Error: Backend API returned $HTTP_CODE" >> $LOG_FILE
    fi
    
    # Check Frontend
    FE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80)
    if [ "$FE_CODE" == "200" ]; then
        echo "✅ Frontend is reachable"
    else
        echo "❌ Frontend check FAILED (HTTP $FE_CODE)"
        echo "[$DATE] Error: Frontend returned $FE_CODE" >> $LOG_FILE
    fi
fi

echo "[$DATE] Health Check Complete" >> $LOG_FILE
