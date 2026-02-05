# Project Maintenance & Cleanup Guide

This document outlines the procedures for maintaining a clean and efficient development environment for the SupplyPro project.

## Project Structure Optimization

To prevent the project size from growing uncontrollably (e.g., exceeding 4GB), we have implemented automated monitoring and cleanup scripts.

### 1. Monitoring Project Size

We provide a script to analyze the project size, identify large directories, and detect duplicate tools (JDKs).

**Run the monitor script:**
```bash
./scripts/monitor/check_project_size.sh
```

**Output:**
- Total project size.
- List of directories larger than 100MB.
- Detection of duplicate JDK installations in `backend/tools`.
- Alert if total size exceeds 2GB.

### 2. Automated Cleanup

To free up space, use the cleanup script. This script removes:
- `frontend/.npm-cache` (Dependency cache)
- `backend/target` (Maven build artifacts)
- `frontend/dist` (Frontend build artifacts)
- `*.log` files (Application logs)
- `.DS_Store` and `Thumbs.db` (OS temp files)
- Optimizes Git repository (`git gc`)

**Run the cleanup script:**
```bash
./scripts/maintenance/cleanup.sh
```

### 3. Tool Management (JDK)

The project requires **Java 17**. To avoid redundancy:
- **Do not** extract multiple JDK versions into `backend/tools`.
- The system expects **one** valid JDK at `backend/tools/amazon-corretto-17.jdk`.
- If multiple JDKs are detected by the monitor script, manually delete the unused folders.

**Correct Structure:**
```
backend/tools/
└── amazon-corretto-17.jdk/  <-- KEEP THIS
```

**Incorrect Structure (DELETE THESE):**
```
backend/tools/
├── jdk-17.0.17+10/
├── jdk17/
└── jdk17.tar.gz
```

### 4. Git Ignore Rules

We have configured `.gitignore` to prevent committing large files:
- `frontend/.npm-cache/`
- `backend/uploads/`
- `backend/tools/` (except the required one if needed, but preferably tools should be ignored and installed via script)
- `*.tar.gz`, `*.zip`
- `node_modules/`

**Best Practice:**
- Always check `git status` before committing.
- Do not force add (`git add -f`) large binary files.
- Use the `uploads/` directory for local testing files, which is ignored.

## Emergency Steps (If Project > 4GB)

1. Run `./scripts/monitor/check_project_size.sh` to identify the culprit.
2. If `backend/tools` is huge, delete duplicate JDKs.
3. If `.git` is huge, run `git gc --prune=now`.
4. If `node_modules` are huge, consider `pnpm prune` or deleting and reinstalling only production deps.

## System Health & Login Issues

If you encounter "Unable to access site" or login failures:

### 1. Run Health Check
Use the automated health check script to diagnose the status of Backend, Frontend, and Database services.
```bash
./scripts/monitor/health_check.sh
```

### 2. Common Fixes
- **Backend Down (Port 8080):**
  Check logs or restart the server:
  ```bash
  ./backend/start_server.sh
  ```
- **Frontend Down (Port 5173):**
  Ensure the Docker container is running:
  ```bash
  docker start supplypro-frontend
  ```
- **Database Down (Port 3307):**
  Ensure the Database container is running:
  ```bash
  docker start supplypro-db
  ```
