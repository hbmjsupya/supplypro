#!/bin/bash
set -e

# Configuration
BACKEND_JAR="target/supplypro-backend-0.0.1-SNAPSHOT.jar"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
FRONTEND_PORT=4173
LOG_FILE="deployment.log"
FRONTEND_LOG="frontend.log"
MAX_RETRIES=30
RETRY_INTERVAL=1

echo "=== SupplyPro Automated CI/CD Deployment Script ===" | tee -a $LOG_FILE
date | tee -a $LOG_FILE

# --- Backend Deployment (Existing Logic) ---

# 1. Stop Backend
echo "[1/7] Stopping existing backend service..." | tee -a $LOG_FILE
pkill -f "supplypro-backend" || echo "No running backend found."
sleep 2

# 2. Build Backend
echo "[2/7] Building Backend (Maven)..." | tee -a $LOG_FILE
cd $BACKEND_DIR
./mvnw clean package -DskipTests >> ../$LOG_FILE 2>&1
if [ $? -ne 0 ]; then
    echo "Backend build failed! Check $LOG_FILE"
    exit 1
fi
cd ..

# 3. Start Backend
echo "[3/7] Starting Backend in Background..." | tee -a $LOG_FILE
nohup java -jar $BACKEND_DIR/$BACKEND_JAR > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID" | tee -a $LOG_FILE

echo "Waiting for backend to initialize (30s)..."
sleep 30

# 4. Verify API Contract
echo "[4/7] Verifying API Contract..." | tee -a $LOG_FILE
if [ -f "scripts/verify-api.js" ]; then
    if command -v node >/dev/null 2>&1; then
        node scripts/verify-api.js
        if [ $? -ne 0 ]; then
            echo "API Contract Verification FAILED! Aborting deployment." | tee -a $LOG_FILE
            kill $BACKEND_PID
            exit 1
        fi
        echo "API Contract Verified Successfully." | tee -a $LOG_FILE
    else
        echo "Node.js not found, skipping verification." | tee -a $LOG_FILE
    fi
else
    echo "Verification script not found, skipping." | tee -a $LOG_FILE
fi

# 4a. Route Operations Pipeline
echo "[Route Ops] Running Route Update Automation Pipeline..." | tee -a $LOG_FILE
if [ -f "./route-ops.sh" ]; then
    ./route-ops.sh
    if [ $? -ne 0 ]; then
        echo "Route Operations Failed! Aborting deployment." | tee -a $LOG_FILE
        # Cleanup backend if needed
        kill $BACKEND_PID
        exit 1
    fi
else
    echo "route-ops.sh not found, skipping." | tee -a $LOG_FILE
fi

# --- Frontend Deployment (New Logic) ---

echo "[5/7] Preparing Frontend Environment..." | tee -a $LOG_FILE

# 5.1 Stop Existing Frontend Services safely
echo "  > Stopping existing frontend services..." | tee -a $LOG_FILE

# Kill processes listening on the target port
PORT_PID=$(lsof -t -i:$FRONTEND_PORT) || true
if [ ! -z "$PORT_PID" ]; then
    echo "  > Found process on port $FRONTEND_PORT (PID: $PORT_PID). Terminating..." | tee -a $LOG_FILE
    kill $PORT_PID || kill -9 $PORT_PID
    sleep 2
fi

# Kill any lingering 'npm run preview' or 'vite preview' processes
pkill -f "vite preview" || echo "  > No other vite preview processes found."

# 5.2 Backup Dist (Rollback preparation)
if [ -d "$FRONTEND_DIR/dist" ]; then
    echo "  > Backing up existing dist..." | tee -a $LOG_FILE
    rm -rf "$FRONTEND_DIR/dist_backup"
    cp -r "$FRONTEND_DIR/dist" "$FRONTEND_DIR/dist_backup"
fi

# 6. Build Frontend
echo "[6/7] Building Frontend..." | tee -a $LOG_FILE
cd $FRONTEND_DIR

# Install dependencies
echo "  > Installing dependencies..." | tee -a $LOG_FILE
npm install >> ../$LOG_FILE 2>&1

# Build
echo "  > Running build..." | tee -a $LOG_FILE
npm run build >> ../$LOG_FILE 2>&1
BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
    echo "  > Frontend build FAILED! Initiating Rollback..." | tee -a $LOG_FILE
    if [ -d "dist_backup" ]; then
        rm -rf dist
        mv dist_backup dist
        echo "  > Rolled back to previous version." | tee -a $LOG_FILE
    else
        echo "  > No backup found. Rollback skipped." | tee -a $LOG_FILE
    fi
    exit 1
else
    echo "  > Build successful. Removing backup." | tee -a $LOG_FILE
    rm -rf dist_backup
fi

# 7. Start Frontend Service & Health Check
echo "[7/7] Starting Frontend Service..." | tee -a $LOG_FILE

# Start preview server on fixed port
nohup npm run preview -- --port $FRONTEND_PORT --host > ../$FRONTEND_LOG 2>&1 &
FRONTEND_PID=$!
echo "  > Frontend started with PID $FRONTEND_PID on port $FRONTEND_PORT" | tee -a $LOG_FILE

# Health Check
echo "  > Performing Health Check..." | tee -a $LOG_FILE
HEALTH_CHECK_URL="http://localhost:$FRONTEND_PORT"
ATTEMPT=0
SUCCESS=false

cd ..

while [ $ATTEMPT -lt $MAX_RETRIES ]; do
    ATTEMPT=$((ATTEMPT+1))
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL || echo "000")
    
    if [ "$HTTP_CODE" == "200" ]; then
        SUCCESS=true
        break
    fi
    
    echo "  > Health check attempt $ATTEMPT/$MAX_RETRIES failed (Status: $HTTP_CODE). Retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

if [ "$SUCCESS" = true ]; then
    echo "  > Health Check PASSED! Service is up and running." | tee -a $LOG_FILE
else
    echo "  > Health Check FAILED after $MAX_RETRIES attempts. Check $FRONTEND_LOG for details." | tee -a $LOG_FILE
    echo "  > Stopping failed service..."
    kill $FRONTEND_PID
    exit 1
fi

echo "=== Deployment Complete Successfully ===" | tee -a $LOG_FILE
echo "Backend: http://localhost:8080 (PID $BACKEND_PID)"
echo "Frontend: http://localhost:$FRONTEND_PORT (PID $FRONTEND_PID)"
