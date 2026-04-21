# High-Performance Reconstruction & Optimization Plan

## 1. Performance Analysis & Bottleneck Diagnosis

### Current Performance Bottlenecks
1.  **Backend Dependency Resolution (`mvn dependency:resolve`)**:
    - **Issue**: Takes 60s+ on clean builds.
    - **Cause**: Re-downloads all Maven artifacts if the cache is invalidated.
    - **Impact**: Significant delay in reconstruction.
2.  **Frontend System Dependencies (`apk add`)**:
    - **Issue**: Takes 20-30s.
    - **Cause**: Was placed *after* `COPY package*.json`. Any change to `package.json` (common) invalidated this layer.
    - **Impact**: Unnecessary re-installation of python/make/g++.
3.  **Frontend NPM Install**:
    - **Issue**: Takes 30-60s.
    - **Cause**: Re-installs all node modules if `package.json` changes.
4.  **Database Initialization**:
    - **Issue**: Flyway migrations can be slow or fail, causing container restart loops.

### Optimization Goals
- **Target**: Reduce reconstruction time by >50%.
- **Strategy**: 
    - **Smart Layer Caching**: Optimize Dockerfile instruction order.
    - **Incremental Builds**: Separate "Data Reset" from "Code Rebuild".
    - **Parallel Execution**: Leverage Docker BuildKit.

## 2. Optimization Implementation

### 2.1 Frontend Dockerfile Optimization
**Change**: Moved `apk add` before `COPY package*.json`.
**Benefit**: The heavy system dependency installation (python, make, g++) is now cached and shared across builds, even if dependencies in `package.json` change.

```dockerfile
# Optimized Order
WORKDIR /app
# 1. Install system deps (Cached indefinitely)
RUN apk add --no-cache python3 make g++
# 2. Install node deps (Cached unless package.json changes)
COPY package*.json ./
RUN npm install
# 3. Copy code (Cached unless source changes)
COPY . .
```

### 2.2 Backend Dockerfile Optimization
**Strategy**: Separate `pom.xml` resolution from source code.
**Benefit**: Maven dependencies are cached unless `pom.xml` changes. Source code changes only trigger the compilation/packaging step, which is much faster with `-o` (offline) mode.

```dockerfile
COPY pom.xml .
RUN mvn dependency:resolve
COPY src ./src
RUN mvn clean package -Dmaven.test.skip=true -o
```

### 2.3 Intelligent Reconstruction Script (`rebuild_env.sh`)
**Features**:
- **Fast Mode (Default)**: Reuses existing volume data, only rebuilds code containers. Uses Docker cache.
- **Deep Clean Mode (`--clean`)**: Wipes all data and artifacts for a fresh start.
- **Parallel Build**: Enabled `DOCKER_BUILDKIT=1` and `parallel` flag.

## 3. Performance Comparison (Estimated)

| Step | Original (Clean) | Optimized (Incremental) | Improvement |
|------|------------------|-------------------------|-------------|
| System Deps | ~30s | 0s (Cached) | 100% |
| Maven Resolve | ~60s | 0s (Cached) | 100% |
| NPM Install | ~45s | 0s (Cached) | 100% |
| Code Compile | ~15s | ~15s | 0% |
| Startup | ~30s | ~30s | 0% |
| **Total** | **~180s** | **~45s** | **~75%** |

## 4. Rollback & Stability Mechanism
1.  **Docker Images**: Tagged images allow rolling back to previous versions (e.g., `supplypro-backend:v1`).
2.  **Database**: Flyway ensures schema versioning. To rollback DB, restore from backup (not automated yet) or use Flyway undo (if Pro edition, otherwise requires manual script).
3.  **Config**: `docker-compose.yml` is version controlled.

## 5. Monitoring & Alerting
- **Health Checks**: Implemented in `rebuild_env.sh` (loops until backend `/actuator/health` is UP).
- **Logs**: Script captures logs on failure (`docker-compose logs`).
