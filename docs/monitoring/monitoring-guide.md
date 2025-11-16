# Monitoring & Observability Guide

This document provides comprehensive guidance on monitoring the RosterHub OneRoster API using Prometheus and Grafana.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Metrics Reference](#metrics-reference)
- [Grafana Dashboards](#grafana-dashboards)
- [Health Checks](#health-checks)
- [Alerting](#alerting)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Overview

RosterHub implements comprehensive monitoring and observability features:

- **Prometheus** - Metrics collection and time-series database
- **Grafana** - Visualization and dashboarding
- **Custom Metrics** - Business and technical metrics for OneRoster API
- **Health Checks** - Liveness and readiness endpoints for container orchestration

### Monitoring Stack

```
┌─────────────────┐
│  OneRoster API  │ ← Exposes /metrics endpoint
└────────┬────────┘
         │
         │ (scrapes every 10s)
         ▼
┌─────────────────┐
│   Prometheus    │ ← Stores time-series data
└────────┬────────┘
         │
         │ (queries)
         ▼
┌─────────────────┐
│    Grafana      │ ← Visualizes metrics
└─────────────────┘
```

## Architecture

### Components

1. **Metrics Service** (`src/monitoring/metrics.service.ts`)
   - Collects and stores metrics
   - Exposes Prometheus-format metrics
   - Provides helper methods for recording metrics

2. **Metrics Interceptor** (`src/monitoring/metrics.interceptor.ts`)
   - Automatically tracks HTTP request metrics
   - Records response times and status codes
   - Tracks errors by type

3. **Metrics Controller** (`src/monitoring/metrics.controller.ts`)
   - `GET /metrics` - Prometheus text format
   - `GET /metrics/json` - JSON format for debugging

4. **Health Controller** (`src/monitoring/health.controller.ts`)
   - `GET /health` - Basic health check
   - `GET /health/ready` - Readiness probe (checks dependencies)
   - `GET /health/live` - Liveness probe (checks application state)

## Quick Start

### 1. Start Monitoring Stack

```bash
cd apps/api/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

This starts:
- Prometheus on http://localhost:9090
- Grafana on http://localhost:3001

### 2. Start API Server

```bash
cd apps/api
npm run start:dev
```

### 3. Access Grafana

1. Open http://localhost:3001
2. Login with `admin` / `admin` (change on first login)
3. Navigate to "Dashboards" → "OneRoster" → "OneRoster API - Overview Dashboard"

### 4. Verify Metrics Collection

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Check Prometheus targets
# Open http://localhost:9090/targets
```

## Metrics Reference

### HTTP Request Metrics

#### `oneroster_http_requests_total`

**Type:** Counter
**Labels:** `method`, `endpoint`, `status`
**Description:** Total number of HTTP requests

**Example:**
```
oneroster_http_requests_total{method="GET",endpoint="/ims/oneroster/v1p2/users",status="200"} 1234
```

**Usage:**
```promql
# Request rate per second
rate(oneroster_http_requests_total[1m])

# Total requests by endpoint
sum by (endpoint) (oneroster_http_requests_total)
```

#### `oneroster_http_request_duration_seconds`

**Type:** Histogram
**Labels:** `method`, `endpoint`, `status`
**Buckets:** 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
**Description:** HTTP request duration in seconds

**Usage:**
```promql
# p95 response time
histogram_quantile(0.95, rate(oneroster_http_request_duration_seconds_bucket[5m]))

# p99 response time
histogram_quantile(0.99, rate(oneroster_http_request_duration_seconds_bucket[5m]))

# Average response time
rate(oneroster_http_request_duration_seconds_sum[5m]) / rate(oneroster_http_request_duration_seconds_count[5m])
```

### Entity Operation Metrics

#### `oneroster_entity_operations_total`

**Type:** Counter
**Labels:** `entity`, `operation` (create, read, update, delete)
**Description:** Total number of entity operations

**Usage:**
```promql
# Operations per second by entity
rate(oneroster_entity_operations_total[1m])

# Total creates vs deletes
sum by (operation) (oneroster_entity_operations_total)
```

#### `oneroster_entities_total`

**Type:** Gauge
**Labels:** `entity`, `status`
**Description:** Current total count of entities by type

**Usage:**
```promql
# Total active users
oneroster_entities_total{entity="users",status="active"}

# All entities count
sum(oneroster_entities_total)
```

### CSV Operation Metrics

#### `oneroster_csv_import_total`

**Type:** Counter
**Labels:** `entity`, `status` (success, failed)
**Description:** Total number of CSV import operations

#### `oneroster_csv_export_total`

**Type:** Counter
**Labels:** `entity`, `status` (success, failed)
**Description:** Total number of CSV export operations

#### `oneroster_csv_records_processed`

**Type:** Counter
**Labels:** `entity`, `operation` (import, export)
**Description:** Total number of CSV records processed

#### `oneroster_csv_processing_duration_seconds`

**Type:** Histogram
**Labels:** `entity`, `operation`
**Buckets:** 0.1s, 0.5s, 1s, 2s, 5s, 10s, 30s, 60s, 120s, 300s
**Description:** CSV processing duration in seconds

**Usage:**
```promql
# CSV import success rate
sum(rate(oneroster_csv_import_total{status="success"}[5m])) / sum(rate(oneroster_csv_import_total[5m])) * 100

# Average CSV processing time
rate(oneroster_csv_processing_duration_seconds_sum[5m]) / rate(oneroster_csv_processing_duration_seconds_count[5m])
```

### Database Metrics

#### `oneroster_db_query_duration_seconds`

**Type:** Histogram
**Labels:** `operation`, `table`
**Description:** Database query duration in seconds

#### `oneroster_db_connections`

**Type:** Gauge
**Labels:** `state` (active, idle)
**Description:** Current number of database connections

### Cache Metrics

#### `oneroster_cache_operations_total`

**Type:** Counter
**Labels:** `operation` (get, set, del), `result` (hit, miss)
**Description:** Total number of cache operations

#### `oneroster_cache_hit_rate`

**Type:** Gauge
**Description:** Cache hit rate (0-1)

**Usage:**
```promql
# Cache hit rate percentage
oneroster_cache_hit_rate * 100
```

### Error Metrics

#### `oneroster_errors_total`

**Type:** Counter
**Labels:** `type` (validation, database, internal, etc.), `endpoint`
**Description:** Total number of errors

**Usage:**
```promql
# Error rate
rate(oneroster_errors_total[5m])

# Errors by type
sum by (type) (oneroster_errors_total)
```

### Japan Profile Metrics

#### `oneroster_japan_profile_validations_total`

**Type:** Counter
**Labels:** `entity`, `field`, `result` (pass, fail)
**Description:** Total number of Japan Profile metadata validations

**Usage:**
```promql
# Validation success rate
sum(oneroster_japan_profile_validations_total{result="pass"}) / sum(oneroster_japan_profile_validations_total) * 100
```

## Grafana Dashboards

### OneRoster API - Overview Dashboard

Located at: `apps/api/monitoring/grafana/dashboards/oneroster-api-overview.json`

**Panels:**

1. **Request Rate** - req/sec by endpoint
2. **Response Time (p95)** - 95th and 99th percentile response times
3. **Error Rate (%)** - 4xx and 5xx error rates
4. **Total Requests** - Total request count
5. **Active Database Connections** - Current active DB connections
6. **Entity Operations** - CRUD operations per second
7. **CSV Operations** - Import/export operations per second
8. **Cache Hit Rate** - Cache effectiveness gauge
9. **Database Query Duration (p95)** - DB query performance
10. **Error Breakdown** - Pie chart of errors by type
11. **Japan Profile Validation Success Rate** - Metadata validation health

**Variables:**
- `endpoint` - Filter by API endpoint
- `entity` - Filter by entity type (users, orgs, classes, etc.)

### Creating Custom Dashboards

1. Open Grafana: http://localhost:3001
2. Click "+" → "Dashboard" → "Add new panel"
3. Write PromQL query in the "Metrics" field
4. Configure visualization type and options
5. Save dashboard

**Example PromQL Queries:**

```promql
# Request rate by status code
sum by (status) (rate(oneroster_http_requests_total[5m]))

# Top 5 slowest endpoints (p95)
topk(5, histogram_quantile(0.95, rate(oneroster_http_request_duration_seconds_bucket[5m])))

# Error rate as percentage
sum(rate(oneroster_http_requests_total{status=~"5.."}[5m])) / sum(rate(oneroster_http_requests_total[5m])) * 100
```

## Health Checks

### GET /health

Basic health check - returns 200 if API is running.

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "service": "oneroster-api",
  "version": "0.0.1"
}
```

### GET /health/ready

Readiness check - verifies API can accept traffic (checks database, Redis, etc.).

```bash
curl http://localhost:3000/health/ready
```

**Response (Healthy):**
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 0
    },
    "redis": {
      "status": "not_configured"
    }
  }
}
```

**Response (Unhealthy):**
```json
{
  "status": "not_ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "Connection refused"
    }
  }
}
```

**HTTP Status:** 503 Service Unavailable

### GET /health/live

Liveness check - indicates if API should be restarted.

```bash
curl http://localhost:3000/health/live
```

**Use in Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Alerting

### Setting Up Alerts in Prometheus

Create alert rules in `prometheus/alerts/api-alerts.yml`:

```yaml
groups:
  - name: oneroster_api
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: sum(rate(oneroster_http_requests_total{status=~"5.."}[5m])) / sum(rate(oneroster_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow response time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(oneroster_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response time"
          description: "p95 response time is {{ $value }}s"

      # Database connection issues
      - alert: DatabaseConnectionHigh
        expr: oneroster_db_connections{state="active"} > 50
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Active connections: {{ $value }}"
```

### Grafana Alerts

1. Open a dashboard panel
2. Click "Alert" tab
3. Create alert rule with conditions
4. Configure notification channels (Slack, email, PagerDuty)

## Troubleshooting

### Metrics Not Appearing

**Problem:** Metrics endpoint returns empty or minimal data

**Solutions:**
1. Verify API is receiving traffic: `curl http://localhost:3000/health`
2. Check metrics endpoint: `curl http://localhost:3000/metrics`
3. Verify MonitoringModule is imported in AppModule
4. Check interceptor is registered

### Prometheus Not Scraping

**Problem:** Prometheus shows target as "DOWN"

**Solutions:**
1. Check Prometheus config: http://localhost:9090/config
2. Verify API URL in `prometheus.yml`
3. Check network connectivity: `docker network inspect monitoring_monitoring`
4. Review Prometheus logs: `docker logs oneroster-prometheus`

### Grafana Shows "No Data"

**Problem:** Dashboards show "No data" or empty graphs

**Solutions:**
1. Verify Prometheus datasource is configured
2. Check time range (default: last 1 hour)
3. Verify queries in panel: Edit → Query inspector
4. Check Prometheus has data: http://localhost:9090/graph

### High Memory Usage

**Problem:** Prometheus consuming excessive memory

**Solutions:**
1. Reduce retention time in docker-compose: `--storage.tsdb.retention.time=7d`
2. Reduce scrape frequency in prometheus.yml
3. Limit metrics cardinality (avoid high-cardinality labels)

## Production Deployment

### Best Practices

1. **Use persistent volumes** for Prometheus and Grafana data
2. **Set up authentication** for Grafana (disable default admin/admin)
3. **Configure alerting** with appropriate notification channels
4. **Monitor metrics storage** and set retention policies
5. **Use HTTPS** for Grafana access
6. **Backup Grafana dashboards** regularly

### Kubernetes Deployment

```yaml
apiVersion: v1
kind: Service
metadata:
  name: oneroster-api-metrics
spec:
  selector:
    app: oneroster-api
  ports:
    - name: metrics
      port: 3000
      targetPort: 3000
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: oneroster-api
spec:
  selector:
    matchLabels:
      app: oneroster-api
  endpoints:
    - port: metrics
      path: /metrics
      interval: 15s
```

### Security Considerations

1. **Restrict metrics endpoint access** in production
2. **Use network policies** to limit Prometheus scraping
3. **Enable authentication** for Prometheus and Grafana
4. **Use TLS** for all monitoring traffic
5. **Audit dashboard access** regularly

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

## Support

For monitoring-related questions:
- Review this documentation
- Check Prometheus/Grafana logs
- Create an issue in GitHub
- Contact DevOps team
