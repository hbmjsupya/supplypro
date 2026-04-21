#!/bin/bash

# Configuration
URL="http://localhost:8080/actuator/health"
LOG_FILE="scripts/monitor.log"
ALERT_THRESHOLD=3 # Number of failures before alert

check_health() {
    status=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    if [ "$status" -eq 200 ]; then
        return 0
    else
        return 1
    fi
}

echo "[$(date)] Starting Monitoring..." >> $LOG_FILE

FAIL_COUNT=0
while true; do
    if check_health; then
        FAIL_COUNT=0
        # echo "[$(date)] System Healthy"
    else
        FAIL_COUNT=$((FAIL_COUNT+1))
        echo "[$(date)] Health Check Failed! (Count: $FAIL_COUNT)" | tee -a $LOG_FILE
        
        if [ "$FAIL_COUNT" -ge "$ALERT_THRESHOLD" ]; then
            echo "[$(date)] CRITICAL ALERT: System Down!" | tee -a $LOG_FILE
            # Here you would add email/slack notification
            # e.g., ./send_alert.sh "System Down"
        fi
    fi
    sleep 10
done
