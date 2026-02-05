#!/bin/bash

PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)

echo "Starting Project Cleanup..."

# 1. Clean Backend Build Artifacts
echo "Cleaning Backend Target..."
if [ -d "${PROJECT_ROOT}/backend/target" ]; then
    rm -rf "${PROJECT_ROOT}/backend/target"
    echo "Removed backend/target"
fi

# 2. Clean Frontend Build Artifacts & Cache
echo "Cleaning Frontend Dist and Cache..."
if [ -d "${PROJECT_ROOT}/frontend/dist" ]; then
    rm -rf "${PROJECT_ROOT}/frontend/dist"
    echo "Removed frontend/dist"
fi
if [ -d "${PROJECT_ROOT}/frontend/.npm-cache" ]; then
    rm -rf "${PROJECT_ROOT}/frontend/.npm-cache"
    echo "Removed frontend/.npm-cache"
fi

# 3. Clean Logs
echo "Cleaning Logs..."
find "${PROJECT_ROOT}" -name "*.log" -type f -delete
echo "Removed *.log files"

# 4. Clean Temp Files
echo "Cleaning Temp Files..."
find "${PROJECT_ROOT}" -name ".DS_Store" -type f -delete
find "${PROJECT_ROOT}" -name "Thumbs.db" -type f -delete

# 5. Check for Duplicate JDKs (Interactive)
echo "Checking for Duplicate JDKs..."
JDK_COUNT=$(find "${PROJECT_ROOT}/backend/tools" -name "java" -type f | grep "/bin/java$" | wc -l)
if [ "$JDK_COUNT" -gt 1 ]; then
    echo "WARNING: Multiple JDKs found in backend/tools. Please manually verify and remove duplicates."
    find "${PROJECT_ROOT}/backend/tools" -name "java" -type f | grep "/bin/java$"
fi

# 6. Git GC (Optional, aggressive)
echo "Optimizing Git Repository..."
git gc --prune=now

echo "Cleanup Complete!"
