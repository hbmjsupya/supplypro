#!/bin/bash
# Run Backend Application (Skip Tests)

PROJECT_ROOT=$(pwd)
LOCAL_JDK="$PROJECT_ROOT/backend/tools/amazon-corretto-17.jdk/Contents/Home"

if [ -d "$LOCAL_JDK" ]; then
    export JAVA_HOME="$LOCAL_JDK"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

MVN_CMD="./backend/tools/apache-maven-3.9.6/bin/mvn"
if [ ! -f "$MVN_CMD" ]; then
    MVN_CMD="mvn"
fi

echo "[INFO] Starting Spring Boot Application (DEV Profile)..."
$MVN_CMD spring-boot:run -f backend/pom.xml -DskipTests -Dspring-boot.run.profiles=dev
