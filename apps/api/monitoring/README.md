# OneRoster API Monitoring

This directory contains the monitoring stack configuration for the OneRoster API using Prometheus and Grafana.

## Quick Start

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access services
open http://localhost:9090  # Prometheus
open http://localhost:3001  # Grafana (admin/admin)

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down
```

## Directory Structure

```
monitoring/
├── README.md                           # This file
├── docker-compose.monitoring.yml       # Docker Compose for Prometheus + Grafana
├── prometheus/
│   └── prometheus.yml                  # Prometheus configuration
└── grafana/
    ├── datasources/
    │   └── prometheus.yml              # Prometheus datasource config
    └── dashboards/
        ├── dashboard-provisioning.yml  # Dashboard provisioning config
        └── oneroster-api-overview.json # Main API dashboard
```

## Services

### Prometheus

**URL:** http://localhost:9090

**Purpose:** Metrics collection and time-series database

**Configuration:**
- Scrapes API metrics every 10 seconds
- Stores data for 30 days
- Accessible at `/metrics` endpoint on API (port 3000)

**Key Endpoints:**
- `/graph` - Query interface
- `/targets` - Scrape targets status
- `/config` - Configuration viewer

### Grafana

**URL:** http://localhost:3001

**Default Credentials:** `admin` / `admin` (change on first login)

**Purpose:** Metrics visualization and dashboarding

**Pre-configured:**
- Prometheus datasource
- OneRoster API Overview dashboard

## Metrics Endpoints

The OneRoster API exposes the following monitoring endpoints:

### GET /metrics

Prometheus text format metrics for scraping.

```bash
curl http://localhost:3000/metrics
```

### GET /metrics/json

JSON format metrics for debugging.

```bash
curl http://localhost:3000/metrics/json | jq
```

### GET /health

Basic health check.

```bash
curl http://localhost:3000/health
```

### GET /health/ready

Readiness check (verifies database connection).

```bash
curl http://localhost:3000/health/ready
```

### GET /health/live

Liveness check (for Kubernetes).

```bash
curl http://localhost:3000/health/live
```

## Available Metrics

### HTTP Metrics
- `oneroster_http_requests_total` - Total HTTP requests (counter)
- `oneroster_http_request_duration_seconds` - Request duration (histogram)

### Entity Metrics
- `oneroster_entity_operations_total` - CRUD operations (counter)
- `oneroster_entities_total` - Entity counts (gauge)

### CSV Metrics
- `oneroster_csv_import_total` - CSV imports (counter)
- `oneroster_csv_export_total` - CSV exports (counter)
- `oneroster_csv_records_processed` - Records processed (counter)
- `oneroster_csv_processing_duration_seconds` - Processing time (histogram)

### Database Metrics
- `oneroster_db_query_duration_seconds` - Query duration (histogram)
- `oneroster_db_connections` - Connection count (gauge)

### Cache Metrics
- `oneroster_cache_operations_total` - Cache operations (counter)
- `oneroster_cache_hit_rate` - Hit rate (gauge)

### Error Metrics
- `oneroster_errors_total` - Errors by type (counter)

### Japan Profile Metrics
- `oneroster_japan_profile_validations_total` - Metadata validations (counter)

## Dashboards

### OneRoster API - Overview Dashboard

Pre-installed dashboard showing:
- Request rate and throughput
- Response times (p95, p99)
- Error rates (4xx, 5xx)
- Entity operation rates
- CSV operation metrics
- Database performance
- Cache effectiveness
- Japan Profile validation health

**Access:** Dashboards → OneRoster → OneRoster API - Overview Dashboard

## Example PromQL Queries

```promql
# Request rate (req/sec)
rate(oneroster_http_requests_total[1m])

# p95 response time
histogram_quantile(0.95, rate(oneroster_http_request_duration_seconds_bucket[5m]))

# Error rate (%)
sum(rate(oneroster_http_requests_total{status=~"5.."}[5m])) / sum(rate(oneroster_http_requests_total[5m])) * 100

# Top 5 slowest endpoints
topk(5, histogram_quantile(0.95, rate(oneroster_http_request_duration_seconds_bucket[5m])))

# Database connection count
oneroster_db_connections{state="active"}

# CSV import success rate
sum(rate(oneroster_csv_import_total{status="success"}[5m])) / sum(rate(oneroster_csv_import_total[5m])) * 100
```

## Troubleshooting

### Prometheus shows target as DOWN

1. Check API is running: `curl http://localhost:3000/health`
2. Verify metrics endpoint: `curl http://localhost:3000/metrics`
3. Check Docker network: `docker network ls`
4. Review Prometheus logs: `docker logs oneroster-prometheus`

### Grafana shows "No Data"

1. Verify Prometheus datasource: Grafana → Configuration → Data Sources
2. Check time range (default: last 1 hour)
3. Verify Prometheus has data: http://localhost:9090/graph
4. Check query syntax in panel editor

### Cannot access Grafana

1. Verify container is running: `docker ps | grep grafana`
2. Check port mapping: `docker port oneroster-grafana`
3. Review Grafana logs: `docker logs oneroster-grafana`

## Data Persistence

Metrics and dashboards are stored in Docker volumes:

```bash
# View volumes
docker volume ls | grep monitoring

# Backup volumes
docker run --rm -v monitoring_prometheus-data:/data -v $(pwd):/backup ubuntu tar czf /backup/prometheus-backup.tar.gz /data

# Restore volumes
docker run --rm -v monitoring_prometheus-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/prometheus-backup.tar.gz -C /
```

## Production Deployment

For production use:

1. **Change Grafana password**
   ```bash
   docker exec -it oneroster-grafana grafana-cli admin reset-admin-password <new-password>
   ```

2. **Configure retention** in `prometheus.yml`:
   ```yaml
   --storage.tsdb.retention.time=90d  # Keep 90 days of data
   ```

3. **Set up alerts** in `prometheus/alerts/*.yml`

4. **Enable HTTPS** for Grafana access

5. **Configure backup** for volumes

6. **Set up authentication** for Prometheus

## Resources

- [Complete Monitoring Guide](../../../docs/monitoring/monitoring-guide.md)
- [Japanese Version](../../../docs/monitoring/monitoring-guide.ja.md)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

## Support

For monitoring-related questions:
- See [monitoring-guide.md](../../../docs/monitoring/monitoring-guide.md)
- Check Prometheus/Grafana logs
- Create an issue in GitHub
