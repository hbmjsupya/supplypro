#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)

echo -e "${YELLOW}Starting System Health Check...${NC}"

# 1. Check Backend (Port 8080)
echo -e "\n[Backend Service]"
if lsof -i :8080 > /dev/null; then
    echo -e "${GREEN}✓ Backend is running on port 8080${NC}"
else
    echo -e "${RED}✗ Backend is NOT running on port 8080${NC}"
    echo -e "${YELLOW}  -> Try starting it with: ./backend/start_server.sh${NC}"
fi

# 2. Check Frontend (Port 5173 or 80)
echo -e "\n[Frontend Service]"
if lsof -i :5173 > /dev/null; then
    echo -e "${GREEN}✓ Frontend (Dev) is running on port 5173${NC}"
elif lsof -i :80 > /dev/null; then
    echo -e "${GREEN}✓ Frontend (Docker) is running on port 80${NC}"
else
    echo -e "${RED}✗ Frontend is NOT running on port 5173 or 80${NC}"
    # Check if docker container exists
    if docker ps -a | grep -q "frontend"; then
        echo -e "${YELLOW}  -> Frontend container exists but might be stopped.${NC}"
    else
        echo -e "${YELLOW}  -> Frontend container not found.${NC}"
    fi
fi

# 3. Check Database (Port 3307)
echo -e "\n[Database Service]"
if lsof -i :3307 > /dev/null; then
    echo -e "${GREEN}✓ Database is listening on port 3307${NC}"
else
    echo -e "${RED}✗ Database is NOT listening on port 3307${NC}"
    echo -e "${YELLOW}  -> Check your Docker containers.${NC}"
fi

# 4. Check Docker Containers
echo -e "\n[Docker Container Status]"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "supplypro|mysql|redis|frontend" || echo "No relevant containers running."

echo -e "\n${YELLOW}Health Check Complete.${NC}"
