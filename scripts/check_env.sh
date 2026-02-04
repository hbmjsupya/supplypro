#!/bin/bash

# Environment Check Script for SupplyPro
# Checks for JDK compatibility, Maven, and Docker

echo "========================================"
echo "   SupplyPro Environment Check Tool"
echo "========================================"

# 1. Check Java Version
echo "[1/3] Checking Java Version..."
if type -p java > /dev/null; then
    _java=java
elif [[ -n "$JAVA_HOME" ]] && [[ -x "$JAVA_HOME/bin/java" ]];  then
    _java="$JAVA_HOME/bin/java"
else
    echo "❌ Java not found in PATH or JAVA_HOME."
    echo "   Action Required: Install JDK 11 or 17."
    exit 1
fi

if [[ "$_java" ]]; then
    version=$("$_java" -version 2>&1 | awk -F '"' '/version/ {print $2}')
    echo "   Found Java version: $version"
    
    # Extract major version
    major_version=$(echo "$version" | awk -F. '{print $1}')
    if [[ "$major_version" == "1" ]]; then
        major_version=$(echo "$version" | awk -F. '{print $2}')
    fi

    if [[ "$major_version" -ge 21 ]]; then
        echo "⚠️  WARNING: Java version $major_version detected."
        echo "   Spring Boot 2.x may not be compatible with JDK 21+."
        echo "   Recommended: JDK 11 or JDK 17."
    elif [[ "$major_version" -lt 11 ]]; then
        echo "⚠️  WARNING: Java version $major_version detected."
        echo "   Recommended: JDK 11 or JDK 17."
    else
        echo "✅ Java version $major_version is compatible."
    fi
fi

echo ""

# 2. Check Maven
echo "[2/3] Checking Maven..."
if command -v mvn &> /dev/null; then
    mvn_ver=$(mvn -v | head -n 1)
    echo "✅ Maven found: $mvn_ver"
else
    echo "❌ Maven not found."
    echo "   Action Required: Install Maven or use ./mvnw (if available)."
fi

echo ""

# 3. Check Docker
echo "[3/3] Checking Docker..."
if command -v docker &> /dev/null; then
    docker_ver=$(docker --version)
    echo "✅ Docker found: $docker_ver"
    echo "   Tip: Use 'docker-compose up --build' to bypass local JDK issues."
else
    echo "⚠️  Docker not found."
    echo "   Recommended: Install Docker Desktop for easier deployment."
fi

echo ""
echo "========================================"
echo "Check Complete."
