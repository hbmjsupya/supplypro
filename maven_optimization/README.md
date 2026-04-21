# Maven Build Optimization Manual

## Overview
This document outlines the optimizations applied to the SupplyPro backend Maven build process to improve performance, stability, and reproducibility.

## Optimizations Implemented

### 1. Dependency Caching (Docker)
- **Problem**: Previously, `pom.xml` and `src` were copied together, causing `mvn package` to re-download all dependencies whenever source code changed.
- **Solution**: Split the build into two stages:
    1. Copy `pom.xml` and `settings.xml`.
    2. Run `mvn dependency:resolve` to download and cache dependencies.
    3. Copy `src` and run `mvn package -o` (offline mode).
- **Benefit**: Changing source code now only triggers the compilation step (~10-15s) instead of full dependency resolution (~3-5 mins).

### 2. Mirror Configuration
- **Configuration**: Added `aliyunmaven` mirror in `backend/settings.xml`.
- **Benefit**: Significantly faster download speeds for dependencies compared to Maven Central.

### 3. Version Standardization
- **Action**: Refactored `backend/pom.xml` to use `<properties>` for all dependency and plugin versions.
- **Benefit**: Ensures consistent versions across the project and simplifies upgrades.
- **Note**: The `dependency-check-maven-plugin` was temporarily disabled due to stability issues with the mirror.

### 4. Offline Mode
- **Action**: Enabled offline mode (`-o`) for the final build step in Docker.
- **Benefit**: Guarantees that the build uses only cached dependencies, preventing unexpected network delays or failures during the critical build phase.

## Usage Guide

### For Docker Users (Recommended)
The optimization is built into the `Dockerfile`. Simply run:
```bash
docker-compose build supplypro-backend
```
or
```bash
docker build -t supplypro-backend backend/
```
The first build will take time to download dependencies. Subsequent builds (if `pom.xml` is unchanged) will be instant.

### For Local Maven Users
If you install Maven locally (`brew install maven` on macOS), you can use the optimized settings:
1. Copy the settings file:
   ```bash
   mkdir -p ~/.m2
   cp maven_optimization/settings.xml ~/.m2/settings.xml
   ```
2. Run builds:
   ```bash
   cd backend
   mvn clean install -o
   ```
   (Note: Run without `-o` once to download dependencies).

## Troubleshooting
- **Missing Dependencies**: If a build fails in offline mode, run `mvn dependency:resolve` (online) to update the cache.
- **Mirror Issues**: If Aliyun is unreachable, edit `backend/settings.xml` to comment out the mirror section.
