#!/bin/bash
set -e

# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Clean existing builder if exists
docker buildx rm builder-cache 2>/dev/null || true

# Create a new builder instance with driver-opt
docker buildx create --name builder-cache --use --driver docker-container

# Inspect builder
docker buildx inspect --bootstrap

# Run bake
echo "Starting parallel build with cache..."
docker buildx bake --print
docker buildx bake

echo "Build completed successfully!"
