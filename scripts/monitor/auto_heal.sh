#!/bin/bash

# Auto Heal Script
# Restarts containers if they are down

source ./health_check.sh > /dev/null

if [ "$ALL_UP" = false ]; then
    echo "⚠️ System Unhealthy. Triggering Auto-Heal..."
    
    # Identify down containers and restart
    for container in "${CONTAINERS[@]}"; do
        if [ "$(docker inspect -f '{{.State.Running}}' $container 2>/dev/null)" != "true" ]; then
            echo "Restarting $container..."
            docker restart $container
        fi
    done
    
    echo "Waiting for services to recover..."
    sleep 30
    
    # Re-check
    ./health_check.sh
else
    echo "System is Healthy. No action needed."
fi
