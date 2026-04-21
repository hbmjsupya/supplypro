#!/bin/bash
set -e

LOG_FILE="benchmark_results.txt"
echo "Benchmark Results - $(date)" > $LOG_FILE

measure_time() {
    local start_time=$(date +%s)
    eval "$1"
    local end_time=$(date +%s)
    echo $((end_time - start_time))
}

echo "Starting Benchmark..." | tee -a $LOG_FILE

# 1. Clean Build
echo "1. Measuring Clean Build (Deep Clean)..." | tee -a $LOG_FILE
./scripts/rebuild_env.sh --clean > /dev/null 2>&1
clean_time=$(measure_time "./scripts/rebuild_env.sh --clean > /dev/null 2>&1")
# Note: The above measure_time actually runs it AGAIN. 
# Correct approach: Run once and measure.

start=$(date +%s)
./scripts/rebuild_env.sh --clean > /dev/null 2>&1
end=$(date +%s)
clean_time=$((end - start))
echo "Clean Build Time: ${clean_time}s" | tee -a $LOG_FILE

# 2. No-Op Rebuild (Cache Hit)
echo "2. Measuring No-Op Rebuild (Fully Cached)..." | tee -a $LOG_FILE
start=$(date +%s)
./scripts/rebuild_env.sh > /dev/null 2>&1
end=$(date +%s)
noop_time=$((end - start))
echo "No-Op Build Time: ${noop_time}s" | tee -a $LOG_FILE

# 3. Incremental Rebuild (Backend Code Change)
echo "3. Measuring Incremental Rebuild (Backend Code Change)..." | tee -a $LOG_FILE
# Touch a file
touch backend/src/main/java/com/supplypro/SupplyproBackendApplication.java
start=$(date +%s)
./scripts/rebuild_env.sh > /dev/null 2>&1
end=$(date +%s)
inc_backend_time=$((end - start))
echo "Incremental Backend Build Time: ${inc_backend_time}s" | tee -a $LOG_FILE

# 4. Incremental Rebuild (Frontend Code Change)
echo "4. Measuring Incremental Rebuild (Frontend Code Change)..." | tee -a $LOG_FILE
# Touch a file
touch frontend/src/main.tsx
start=$(date +%s)
./scripts/rebuild_env.sh > /dev/null 2>&1
end=$(date +%s)
inc_frontend_time=$((end - start))
echo "Incremental Frontend Build Time: ${inc_frontend_time}s" | tee -a $LOG_FILE

echo "Benchmark Complete." | tee -a $LOG_FILE
