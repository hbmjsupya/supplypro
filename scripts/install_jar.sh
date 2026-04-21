#!/bin/bash
# Install a JAR manually to local Maven repository
# Usage: ./install_jar.sh <file> <groupId> <artifactId> <version>

FILE=$1
GROUP=$2
ARTIFACT=$3
VERSION=$4

if [ -z "$FILE" ] || [ -z "$GROUP" ] || [ -z "$ARTIFACT" ] || [ -z "$VERSION" ]; then
  echo "Usage: ./install_jar.sh <file> <groupId> <artifactId> <version>"
  exit 1
fi

mvn install:install-file \
  -Dfile="$FILE" \
  -DgroupId="$GROUP" \
  -DartifactId="$ARTIFACT" \
  -Dversion="$VERSION" \
  -Dpackaging=jar \
  -DgeneratePom=true
