#!/bin/bash

# Setup Environment Variables for SupplyPro
# Usage: source setup_env.sh

PROJECT_ROOT=$(pwd)
LOCAL_JDK="$PROJECT_ROOT/backend/tools/jdk-17/amazon-corretto-17.jdk/Contents/Home"

if [ -d "$LOCAL_JDK" ]; then
    export JAVA_HOME="$LOCAL_JDK"
    export PATH="$JAVA_HOME/bin:$PATH"
    echo "[SUCCESS] Environment configured for JDK 17."
    echo "JAVA_HOME=$JAVA_HOME"
    java -version
else
    echo "[ERROR] Local JDK 17 not found at $LOCAL_JDK"
    echo "Please run: mvn_build.sh first to install dependencies if needed."
fi
