# Troubleshooting Manual

## 1. Common Issues

### 1.1 Frontend Changes Not Reflecting
**Symptom**: You edited `.tsx` files but don't see changes in the browser.
**Cause**: Browser cache or Docker build cache.
**Solution**:
1. Run pipeline: `./scripts/deploy_pipeline.sh` (Generates new tag, forces update).
2. Hard refresh browser (Cmd+Shift+R).
3. If persistent, run deep clean: `./scripts/rebuild_env.sh --clean`.

### 1.2 Backend Startup Failure
**Symptom**: `docker-compose logs supplypro-backend` shows errors.
**Common Causes**:
- **Database Connection**: MySQL not ready. (Check `supplypro-mysql` health).
- **Flyway Migration**: Migration script failed.
  - Fix: Check `V*.sql` files.
  - Reset DB: `./scripts/rebuild_env.sh --clean` (WARNING: Data loss).
- **Elasticsearch**: `Connection refused`.
  - Fix: Ensure ES container is running and not OOM (Out Of Memory).

### 1.3 Rollback Fails
**Symptom**: `rollback.sh` says image not found.
**Cause**: You pruned Docker images or the tag is invalid.
**Solution**:
- Rebuild the specific tag if source is available (manual).
- Deploy the current code as a new version: `./scripts/deploy_pipeline.sh`.

## 2. Logs
- **Backend**: `docker-compose logs -f supplypro-backend`
- **Frontend**: `docker-compose logs -f supplypro-frontend`
- **Deployment History**: `scripts/deployment_history.log`
- **Monitor Logs**: `scripts/monitor.log`

## 3. Performance Tuning
- **Slow Builds**: Ensure Docker BuildKit is enabled (default in scripts).
- **High Disk Usage**: Run `docker system prune -a` to remove unused images/containers.
