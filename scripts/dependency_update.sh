#!/bin/bash
# Check for dependency updates and display them
# Usage: ./dependency_update.sh

echo "Checking for dependency updates..."
mvn versions:display-dependency-updates
echo "Checking for plugin updates..."
mvn versions:display-plugin-updates
echo "Checking for property updates..."
mvn versions:display-property-updates
