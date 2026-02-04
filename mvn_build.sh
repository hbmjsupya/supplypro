#!/bin/bash

# Maven Build Validation Script
# Checks environment and runs Maven build with validation plugins

echo "========================================================"
echo "      SupplyPro Maven Build & Validation Script"
echo "========================================================"

# 0. Setup Local JDK 17
PROJECT_ROOT=$(pwd)
# LOCAL_JDK="$PROJECT_ROOT/backend/tools/jdk-17/amazon-corretto-17.jdk/Contents/Home"
LOCAL_JDK="$PROJECT_ROOT/backend/tools/amazon-corretto-17.jdk/Contents/Home"

if [ -d "$LOCAL_JDK" ]; then
    echo "[INFO] Found Local JDK 17 at $LOCAL_JDK"
    export JAVA_HOME="$LOCAL_JDK"
    export PATH="$JAVA_HOME/bin:$PATH"
else
    echo "[INFO] Local JDK 17 not found. Using system Java."
fi

# 1. Environment Check
echo "[INFO] Checking Environment..."

# Ensure java command is available
if ! command -v java &> /dev/null; then
    echo "[ERROR] 'java' command not found."
    exit 1
fi

JAVA_VER=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}')
echo "[INFO] Detected Java Version: $JAVA_VER"
echo "[INFO] JAVA_HOME: $JAVA_HOME"

if [[ "$JAVA_VER" != "17"* ]]; then
    echo "[WARNING] Detected Java version is not 17. Build may fail or be unstable."
    echo "[WARNING] Project requires JDK 17 (strictly enforced by Maven Enforcer)."
    # If strictly required, we could exit 1 here.
else
    echo "[INFO] Java version check passed."
fi

MVN_CMD="./backend/tools/apache-maven-3.9.6/bin/mvn"
if [ ! -f "$MVN_CMD" ]; then
    echo "[ERROR] Maven wrapper not found at $MVN_CMD"
    MVN_CMD="mvn" # Fallback to system maven
fi

echo "[INFO] Using Maven: $($MVN_CMD -version | head -n 1)"

# 2. Clean and Install with Validation
echo "========================================================"
echo "      Running Maven Build (Clean, Install, Validate)"
echo "========================================================"

# -e: Show errors
# -U: Force update snapshots
# -Dmaven.test.failure.ignore=false: Fail on test failure
# -f backend/pom.xml: Point to backend pom

$MVN_CMD clean install -f backend/pom.xml \
    -e \
    -U \
    -Dmaven.test.failure.ignore=false

BUILD_STATUS=$?

echo "========================================================"
if [ $BUILD_STATUS -eq 0 ]; then
    echo "[SUCCESS] Build and Validation Passed!"
    exit 0
else
    echo "[FAILURE] Build Failed. Check logs above."
    echo "Possible causes:"
    echo "  1. JDK Version mismatch (Must be JDK 17)"
    echo "  2. Dependency conflicts (Check dependency:tree)"
    echo "  3. Vulnerabilities found (Check dependency-check report)"
    exit 1
fi
