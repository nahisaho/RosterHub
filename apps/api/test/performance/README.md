# Performance Testing with k6

This directory contains performance and load tests for the RosterHub OneRoster API using [k6](https://k6.io/).

## Quick Start

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Linux

# Run baseline test
k6 run scenarios/baseline.js

# Run with custom API URL
k6 run --env API_URL=http://localhost:3000 scenarios/baseline.js
```

## Directory Structure

```
performance/
├── README.md              # This file
├── k6.config.js          # Shared k6 configuration
├── helpers.js            # Common utilities and metrics
├── scenarios/            # Test scenarios
│   ├── baseline.js       # Baseline performance test (10 VUs, 1min)
│   ├── load.js          # Load test (0→100 VUs, 8min)
│   ├── stress.js        # Stress test (0→300 VUs, 12min)
│   └── spike.js         # Spike test (10→200→10 VUs, 3.5min)
└── results/             # Test results (gitignored)
```

## Test Scenarios

### 1. Baseline Test

Establishes baseline metrics for all endpoints.

- **Duration:** 1 minute
- **Virtual Users:** 10
- **Purpose:** Baseline metrics

```bash
k6 run scenarios/baseline.js
```

### 2. Load Test

Validates performance under normal load.

- **Duration:** 8 minutes (2min ramp-up, 5min steady, 1min ramp-down)
- **Max VUs:** 100
- **Purpose:** Normal load validation

```bash
k6 run scenarios/load.js
```

### 3. Stress Test

Finds the breaking point of the system.

- **Duration:** 12 minutes
- **Max VUs:** 300
- **Purpose:** Find capacity limits

```bash
k6 run scenarios/stress.js
```

### 4. Spike Test

Tests resilience to sudden traffic spikes.

- **Duration:** 3.5 minutes
- **Spike:** 10 → 200 VUs in 10 seconds
- **Purpose:** Test auto-scaling and resilience

```bash
k6 run scenarios/spike.js
```

## Environment Variables

All tests support the following environment variables:

- `API_URL` - Base URL of the API (default: `http://localhost:3000`)
- `API_KEY` - API key for authentication (default: `test-api-key-performance`)

Example:

```bash
k6 run \
  --env API_URL=https://staging.rosterhub.example.com \
  --env API_KEY=your-api-key-here \
  scenarios/load.js
```

## Performance Targets

### Response Times (p95)

| Endpoint | Target | Acceptable |
|----------|--------|------------|
| GET /users | 300ms | 400ms |
| GET /users/:id | 200ms | 300ms |
| GET /classes | 300ms | 400ms |
| GET /enrollments | 350ms | 500ms |
| GET /csv/export/* | 1500ms | 2000ms |

### Thresholds

- **Error Rate:** < 1% (baseline/load), < 5% (stress), < 10% (spike)
- **p(95) Response Time:** < 500ms for most endpoints
- **p(99) Response Time:** < 1000ms for most endpoints

## Interpreting Results

### Key Metrics

```
http_req_duration..............: avg=245ms  p(90)=350ms p(95)=450ms p(99)=800ms
http_req_failed................: 0.12%  ✓ 15   ✗ 12435
http_reqs......................: 12450  207.5/s
```

- **http_req_duration:** Response time distribution
  - **p(95):** Primary SLA metric (95% of requests faster than this)
  - **p(99):** 99th percentile
- **http_req_failed:** Error rate (should be < 1%)
- **http_reqs:** Total requests and rate

### Success Criteria

✅ **Pass:**
- p(95) < target threshold
- Error rate < 1%
- All thresholds green

⚠️ **Warning:**
- p(95) within 10% of threshold
- Error rate 1-5%

❌ **Fail:**
- p(95) exceeds threshold
- Error rate > 5%

## Saving Results

### JSON Output

```bash
k6 run --out json=results/baseline-$(date +%Y%m%d-%H%M%S).json scenarios/baseline.js
```

### Summary Export

```bash
k6 run --summary-export=results/summary.json scenarios/load.js
```

### InfluxDB + Grafana

```bash
# Start InfluxDB
docker run -d -p 8086:8086 influxdb:1.8

# Run test with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 scenarios/load.js

# View in Grafana
# Import k6 dashboard: https://grafana.com/grafana/dashboards/2587
```

## Docker Usage

```bash
# Run baseline test
docker run --rm -i \
  -v $(pwd):/scripts \
  -e API_URL=http://host.docker.internal:3000 \
  -e API_KEY=test-api-key \
  grafana/k6:latest run /scripts/scenarios/baseline.js

# Run with results export
docker run --rm -i \
  -v $(pwd):/scripts \
  grafana/k6:latest run \
  --summary-export=/scripts/results/summary.json \
  /scripts/scenarios/load.js
```

## Custom Metrics

The test suite tracks custom metrics per endpoint:

- `users_response_time` - Response time for /users endpoints
- `orgs_response_time` - Response time for /orgs endpoints
- `classes_response_time` - Response time for /classes endpoints
- `courses_response_time` - Response time for /courses endpoints
- `enrollments_response_time` - Response time for /enrollments endpoints
- `demographics_response_time` - Response time for /demographics endpoints
- `academic_sessions_response_time` - Response time for /academicSessions endpoints
- `csv_export_response_time` - Response time for CSV exports

## Troubleshooting

### Connection Refused

**Problem:** `connection refused` errors

**Solutions:**
1. Verify API server is running: `curl http://localhost:3000/health`
2. Check `API_URL` environment variable
3. Ensure no firewall blocking

### High Response Times

**Problem:** p(95) > 1000ms

**Solutions:**
1. Check database query performance
2. Review Prisma query logs
3. Add database indexes
4. Implement caching

### High Error Rate

**Problem:** Error rate > 5%

**Solutions:**
1. Check API server logs
2. Increase database connection pool
3. Check memory/CPU usage
4. Review rate limiting configuration

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Performance Tests
  run: |
    docker run --rm -i \
      -v $(pwd)/apps/api/test/performance:/scripts \
      grafana/k6:latest run /scripts/scenarios/baseline.js
```

### Automated Baseline Tracking

```bash
# Run daily and track trends
k6 run --summary-export=results/baseline-$(date +%Y%m%d).json scenarios/baseline.js

# Compare with previous baseline
# (Use jq or custom script to compare summary files)
```

## Resources

- [Complete Performance Testing Guide](../../../../docs/testing/performance-testing-guide.md)
- [Japanese Version](../../../../docs/testing/performance-testing-guide.ja.md)
- [k6 Documentation](https://k6.io/docs/)
- [OneRoster v1.2 Spec](https://www.imsglobal.org/oneroster-v12-final-specification)

## Support

For questions or issues:
- See [docs/testing/performance-testing-guide.md](../../../../docs/testing/performance-testing-guide.md)
- Create an issue in GitHub
- Contact DevOps team
