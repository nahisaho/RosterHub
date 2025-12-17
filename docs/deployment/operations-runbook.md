# RosterHub Operations Runbook

## Overview

This document describes operational procedures, troubleshooting guides, and emergency response procedures for the RosterHub production environment.

---

## 1. System Overview

### Component Architecture

| Component | Technology | Port | Role |
|-----------|-----------|------|------|
| API Server | NestJS 11.x | 3000 | REST API endpoints |
| PostgreSQL | 15.x | 5432 | Main database |
| Redis | 7.x | 6379 | Cache, job queue |
| Nginx | Latest | 80/443 | Reverse proxy |

### Health Check Endpoints

```
GET /health/live    # Liveness probe
GET /health/ready   # Readiness probe
GET /health         # Detailed health check
GET /metrics        # Prometheus metrics
```

---

## 2. Start/Stop Procedures

### 2.1 Docker Compose Environment

```bash
# Start
cd /path/to/RosterHub
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f api

# Restart
docker compose restart api
```

### 2.2 Kubernetes Environment

```bash
# Deploy
kubectl apply -k k8s/overlays/production

# Check pods
kubectl get pods -n rosterhub

# View logs
kubectl logs -f deployment/rosterhub-api -n rosterhub

# Rolling restart
kubectl rollout restart deployment/rosterhub-api -n rosterhub

# Rollback
kubectl rollout undo deployment/rosterhub-api -n rosterhub
```

---

## 3. Routine Operations

### 3.1 Log Rotation

Logs are automatically rotated, but for manual verification:

```bash
# Check Docker log size
docker system df

# Clean up logs
docker system prune --volumes -f
```

### 3.2 Database Backup

```bash
# Manual backup
pg_dump -h localhost -U rosterhub -d rosterhub > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup (cron example)
0 3 * * * pg_dump -h localhost -U rosterhub -d rosterhub | gzip > /backups/rosterhub_$(date +\%Y\%m\%d).sql.gz
```

### 3.3 Cache Clear

```bash
# Clear Redis cache
redis-cli FLUSHDB

# Delete only specific pattern keys
redis-cli --scan --pattern "cache:*" | xargs redis-cli DEL
```

### 3.4 Job Queue Management

```bash
# Check BullMQ queue status via Redis CLI
redis-cli LLEN bull:csv-import:wait
redis-cli LLEN bull:csv-import:active
redis-cli LLEN bull:csv-import:failed

# Clear failed jobs
redis-cli DEL bull:csv-import:failed
```

---

## 4. Monitoring and Alerts

### 4.1 Key Metrics

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| API Response Time (p95) | < 200ms | > 500ms | > 1000ms |
| Error Rate | < 1% | > 3% | > 5% |
| CPU Usage | < 60% | > 80% | > 90% |
| Memory Usage | < 70% | > 85% | > 95% |
| DB Connections | < 50 | > 80 | > 95 |

### 4.2 Grafana Dashboards

- **Overview**: `/grafana/d/oneroster-overview`
- **API Performance**: `/grafana/d/oneroster-api`
- **Database**: `/grafana/d/oneroster-db`

### 4.3 Alert Configuration Example

```yaml
# Prometheus AlertManager rules
groups:
  - name: rosterhub
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 10m
        labels:
          severity: warning
```

---

## 5. Troubleshooting

### 5.1 API Not Responding

**Symptoms**: API endpoints timeout or return 5xx errors

**Verification steps**:
```bash
# 1. Check Pod/Container status
kubectl get pods -n rosterhub
# or
docker compose ps

# 2. Check logs
kubectl logs deployment/rosterhub-api -n rosterhub --tail=100
# or
docker compose logs api --tail=100

# 3. Health check
curl -v http://localhost:3000/health

# 4. Resource usage
kubectl top pods -n rosterhub
```

**Resolution**:
1. Restart Pod/Container
2. Verify DB connection
3. Verify Redis connection
4. Scale out if necessary

### 5.2 Database Connection Errors

**Symptoms**: `ECONNREFUSED` or `Connection timeout`

**Verification steps**:
```bash
# Check DB connection
psql -h localhost -U rosterhub -d rosterhub -c "SELECT 1"

# Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'rosterhub'"

# Check long-running queries
psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
         FROM pg_stat_activity 
         WHERE state = 'active' 
         AND query NOT LIKE '%pg_stat_activity%'
         ORDER BY duration DESC"
```

**Resolution**:
1. Terminate long-running queries: `SELECT pg_terminate_backend(PID)`
2. Adjust connection pool size
3. Restart PostgreSQL (last resort)

### 5.3 Out of Memory

**Symptoms**: OOMKilled or high memory usage

**Verification steps**:
```bash
# Memory usage
kubectl top pods -n rosterhub
free -h

# Check OOM events
kubectl describe pod <pod-name> -n rosterhub | grep -A 10 "Last State"
```

**Resolution**:
1. Increase memory limits
2. Clear unnecessary caches
3. Limit large CSV imports

### 5.4 CSV Import Slow/Failing

**Symptoms**: Import jobs taking too long or not completing

**Verification steps**:
```bash
# Check job status
redis-cli LRANGE bull:csv-import:active 0 -1

# Check worker logs
kubectl logs deployment/rosterhub-api -n rosterhub | grep "CSV"
```

**Resolution**:
1. Check file size (limit: 100MB)
2. Monitor memory usage
3. Check for DB transaction locks
4. Manually cancel job if necessary

### 5.5 API Key Authentication Errors

**Symptoms**: 401 Unauthorized

**Verification steps**:
```bash
# Check API key
psql -c "SELECT key, name, is_active, expires_at FROM api_keys WHERE key = 'your-key'"

# Check expired keys
psql -c "SELECT * FROM api_keys WHERE expires_at < NOW()"
```

**Resolution**:
1. Verify API key validity
2. Extend expiration date
3. Issue new API key

---

## 6. Emergency Procedures

### 6.1 Security Incident

1. **Immediate response**:
   ```bash
   # Block external access
   kubectl scale deployment rosterhub-api --replicas=0 -n rosterhub
   
   # Or apply network policy
   kubectl apply -f network-policy-deny-all.yaml
   ```

2. **Investigation**:
   ```bash
   # Check access logs
   kubectl logs deployment/rosterhub-api -n rosterhub | grep "401\|403\|suspicious"
   
   # Check suspicious API key usage
   psql -c "SELECT * FROM api_key_audit_logs ORDER BY created_at DESC LIMIT 100"
   ```

3. **Resolution**:
   - Revoke compromised API keys
   - Preserve logs
   - Create incident report

### 6.2 Data Corruption

1. **Immediate response**:
   ```bash
   # Stop writes
   kubectl scale deployment rosterhub-api --replicas=0 -n rosterhub
   ```

2. **Recovery procedure**:
   ```bash
   # Restore from latest backup
   psql -d rosterhub < /backups/latest_backup.sql
   
   # Or Point-in-Time Recovery
   pg_restore -d rosterhub -j 4 /backups/latest.dump
   ```

3. **Verification**:
   ```bash
   # Check data integrity
   psql -c "SELECT COUNT(*) FROM users"
   psql -c "SELECT COUNT(*) FROM orgs"
   ```

### 6.3 Failover

```bash
# Switch to replica DB (PostgreSQL)
# 1. Stop application connections
kubectl scale deployment rosterhub-api --replicas=0 -n rosterhub

# 2. Promote replica to primary
kubectl exec -it postgres-replica-0 -n rosterhub -- pg_ctl promote

# 3. Update connection settings
kubectl edit secret rosterhub-secrets -n rosterhub
# Change DATABASE_URL to new primary

# 4. Restart application
kubectl scale deployment rosterhub-api --replicas=3 -n rosterhub
```

---

## 7. Scaling Procedures

### 7.1 Horizontal Scaling

```bash
# Manual scale
kubectl scale deployment rosterhub-api --replicas=5 -n rosterhub

# Check HPA autoscaling
kubectl get hpa rosterhub-api -n rosterhub
```

### 7.2 Vertical Scaling

```yaml
# Update resource limits
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

---

## 8. Maintenance Procedures

### 8.1 Planned Maintenance

1. **Pre-notification**: Notify users 24 hours in advance
2. **Enable maintenance mode**:
   ```bash
   kubectl set env deployment/rosterhub-api MAINTENANCE_MODE=true -n rosterhub
   ```
3. **Perform maintenance**
4. **Disable maintenance mode**:
   ```bash
   kubectl set env deployment/rosterhub-api MAINTENANCE_MODE=false -n rosterhub
   ```

### 8.2 Upgrade Procedure

```bash
# 1. Build new version image
docker build -t rosterhub/api:v1.1.0 .

# 2. Push image
docker push rosterhub/api:v1.1.0

# 3. Rolling update
kubectl set image deployment/rosterhub-api api=rosterhub/api:v1.1.0 -n rosterhub

# 4. Monitor progress
kubectl rollout status deployment/rosterhub-api -n rosterhub

# 5. Rollback if issues
kubectl rollout undo deployment/rosterhub-api -n rosterhub
```

---

## 9. Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Operations Team | ops@example.com | 24/7 |
| Development Team | dev@example.com | Business hours 9:00-18:00 |
| Security Team | security@example.com | 24/7 |

---

## Change History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-13 | 1.0.0 | Initial release |

---

*Last Updated: 2025-01-13*
