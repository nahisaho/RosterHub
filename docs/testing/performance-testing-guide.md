# Performance Testing Guide

This document provides comprehensive guidelines for running performance tests on the RosterHub OneRoster API.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Test Scenarios](#test-scenarios)
- [Running Tests](#running-tests)
- [Interpreting Results](#interpreting-results)
- [Baseline Metrics](#baseline-metrics)
- [Performance Targets](#performance-targets)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

RosterHub uses [k6](https://k6.io/) for performance and load testing. Our test suite includes multiple scenarios to validate API performance under different load conditions.

### Test Architecture

```
apps/api/test/performance/
├── k6.config.js           # Common k6 configuration
├── helpers.js             # Shared utilities and metrics
├── scenarios/
│   ├── baseline.js        # Baseline performance test
│   ├── load.js           # Normal load test
│   ├── stress.js         # Stress test (find breaking points)
│   └── spike.js          # Spike test (sudden traffic increases)
└── results/              # Test results directory
```

## Prerequisites

### 1. Install k6

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows (Chocolatey):**
```powershell
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6:latest
```

### 2. Prepare Test Environment

1. **Start the API server:**
   ```bash
   npm run start:dev
   ```

2. **Create test API key:**
   ```bash
   # Use an existing API key or create one via the API
   export API_KEY="your-test-api-key"
   ```

3. **Seed test data (optional):**
   ```bash
   npm run seed:performance
   ```

## Test Scenarios

### 1. Baseline Test

**Purpose:** Establish baseline performance metrics

**Configuration:**
- Virtual Users: 10
- Duration: 1 minute
- Operations: All endpoints with varied operations

**Run:**
```bash
cd apps/api/test/performance
k6 run scenarios/baseline.js
```

### 2. Load Test

**Purpose:** Validate performance under normal load

**Configuration:**
- Ramp-up: 0 → 100 VUs over 2 minutes
- Steady state: 100 VUs for 5 minutes
- Ramp-down: 100 → 0 VUs over 1 minute
- Total duration: 8 minutes

**Run:**
```bash
k6 run scenarios/load.js
```

### 3. Stress Test

**Purpose:** Find the breaking point

**Configuration:**
- Ramp-up: 0 → 300 VUs over 7 minutes
- Peak: 300 VUs for 3 minutes
- Ramp-down: 300 → 0 VUs over 2 minutes
- Total duration: 12 minutes

**Run:**
```bash
k6 run scenarios/stress.js
```

### 4. Spike Test

**Purpose:** Test resilience to sudden traffic spikes

**Configuration:**
- Normal: 10 VUs for 1 minute
- Spike: 10 → 200 VUs in 10 seconds
- Hold: 200 VUs for 1 minute
- Drop: 200 → 10 VUs in 10 seconds
- Recovery: 10 VUs for 1 minute

**Run:**
```bash
k6 run scenarios/spike.js
```

## Running Tests

### Basic Usage

```bash
# Navigate to performance test directory
cd apps/api/test/performance

# Run a specific scenario
k6 run scenarios/baseline.js

# Run with custom API URL
k6 run --env API_URL=https://api.example.com scenarios/baseline.js

# Run with custom API key
k6 run --env API_KEY=your-api-key scenarios/baseline.js

# Output results to JSON
k6 run --out json=results/baseline-$(date +%Y%m%d-%H%M%S).json scenarios/baseline.js
```

### Docker Usage

```bash
docker run --rm -i \
  -v $(pwd):/scripts \
  -e API_URL=http://host.docker.internal:3000 \
  -e API_KEY=test-api-key \
  grafana/k6:latest run /scripts/scenarios/baseline.js
```

### Advanced Options

```bash
# Run with HTML summary report
k6 run --summary-export=results/summary.json scenarios/load.js

# Run with InfluxDB output (for Grafana visualization)
k6 run --out influxdb=http://localhost:8086/k6 scenarios/load.js

# Run with custom thresholds
k6 run --env THRESHOLD_P95=300 scenarios/baseline.js
```

## Interpreting Results

### Key Metrics

#### HTTP Request Duration
```
http_req_duration..............: avg=245ms  min=50ms  med=200ms  max=1.2s  p(90)=350ms p(95)=450ms
```

- **avg**: Average response time
- **med (p50)**: Median response time (50th percentile)
- **p(90)**: 90th percentile (90% of requests faster than this)
- **p(95)**: 95th percentile ⚠️ **Primary SLA metric**
- **p(99)**: 99th percentile
- **max**: Maximum response time

#### Request Rate
```
http_reqs......................: 12450  207.5/s
```

- Total requests and requests per second

#### Error Rate
```
http_req_failed................: 0.12%  ✓ 15   ✗ 12435
```

- Percentage of failed requests

### Success Criteria

✅ **Pass** if:
- p(95) response time < target threshold
- Error rate < 1%
- All thresholds green

⚠️ **Warning** if:
- p(95) approaching threshold (within 10%)
- Error rate 1-5%

❌ **Fail** if:
- p(95) exceeds threshold
- Error rate > 5%
- Critical thresholds red

## Baseline Metrics

### Target Response Times (p95)

| Endpoint                | Target (ms) | Acceptable (ms) |
|------------------------|-------------|-----------------|
| GET /users             | 300         | 400            |
| GET /users/:id         | 200         | 300            |
| GET /orgs              | 250         | 300            |
| GET /orgs/:id          | 150         | 250            |
| GET /classes           | 300         | 400            |
| GET /classes/:id       | 200         | 300            |
| GET /courses           | 250         | 300            |
| GET /courses/:id       | 150         | 250            |
| GET /enrollments       | 350         | 500            |
| GET /enrollments/:id   | 200         | 300            |
| GET /demographics      | 300         | 400            |
| GET /demographics/:id  | 200         | 300            |
| GET /academicSessions  | 250         | 300            |
| GET /academicSessions/:id | 150      | 250            |
| GET /csv/export/*      | 1500        | 2000           |
| POST /csv/import       | 500         | 1000           |

### Throughput Targets

| Load Level    | Requests/sec | Concurrent Users |
|--------------|-------------|------------------|
| Light        | 50          | 10               |
| Normal       | 100-200     | 50-100           |
| Heavy        | 200-500     | 100-300          |
| Peak         | 500+        | 300+             |

### Error Rate Thresholds

| Test Type    | Max Error Rate |
|-------------|---------------|
| Baseline    | 0.1%          |
| Load        | 1%            |
| Stress      | 5%            |
| Spike       | 10%           |

## Performance Targets

### Phase 2 Goals

1. **Baseline Established** ✅
   - All endpoints measured
   - Metrics documented
   - CI/CD integrated

2. **Load Testing** (Target: Week 2)
   - 100 concurrent users
   - < 1% error rate
   - p(95) < 500ms

3. **Stress Testing** (Target: Week 3)
   - Find breaking point (target: 300+ VUs)
   - Graceful degradation
   - Error recovery validated

4. **Optimization** (Target: Week 4)
   - 50% improvement in p(95) response times
   - Database query optimization
   - Caching implementation

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start API
        run: docker-compose up -d api

      - name: Run Baseline Test
        run: |
          docker run --rm -i \
            -v $(pwd)/apps/api/test/performance:/scripts \
            -e API_URL=http://api:3000 \
            -e API_KEY=${{ secrets.PERF_API_KEY }} \
            --network=host \
            grafana/k6:latest run /scripts/scenarios/baseline.js \
            --summary-export=/scripts/results/summary.json

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: apps/api/test/performance/results/

      - name: Check Thresholds
        run: |
          # Parse summary.json and check if thresholds passed
          # Exit 1 if any threshold failed
```

### Continuous Performance Monitoring

1. **Daily baseline tests** - Track performance trends
2. **Pre-release load tests** - Validate before deployment
3. **Post-deployment validation** - Ensure no regressions
4. **Alert on threshold violations** - Immediate notification

## Troubleshooting

### High Response Times

**Symptoms:** p(95) > 1000ms

**Possible Causes:**
1. Database query performance
2. Missing indexes
3. N+1 query problem
4. Inefficient data serialization

**Solutions:**
1. Enable Prisma query logging
2. Review slow query log
3. Add database indexes
4. Implement response caching
5. Optimize eager loading

### High Error Rate

**Symptoms:** Error rate > 5%

**Possible Causes:**
1. Database connection pool exhausted
2. Memory leaks
3. CPU throttling
4. Network timeouts

**Solutions:**
1. Increase connection pool size
2. Check memory usage trends
3. Scale horizontally
4. Optimize resource-intensive operations

### Connection Errors

**Symptoms:** `connection refused` or `timeout` errors

**Possible Causes:**
1. API server not running
2. Wrong API URL
3. Network firewall blocking
4. Too many open connections

**Solutions:**
1. Verify API server status
2. Check API_URL environment variable
3. Review firewall rules
4. Increase server connection limits

### Inconsistent Results

**Symptoms:** Large variance in response times

**Possible Causes:**
1. Database not warmed up
2. Cache cold start
3. Background processes interfering
4. Shared test environment

**Solutions:**
1. Run warm-up period before tests
2. Use dedicated test environment
3. Disable background jobs during tests
4. Ensure consistent test data

## Best Practices

1. **Always run tests on isolated environment**
   - Dedicated test server
   - Separate database
   - No production traffic

2. **Establish baselines before changes**
   - Run baseline test
   - Document current metrics
   - Compare after changes

3. **Use realistic test data**
   - Production-like data volume
   - Representative query patterns
   - Japan Profile metadata included

4. **Monitor system resources**
   - CPU usage
   - Memory consumption
   - Database connections
   - Network bandwidth

5. **Document findings**
   - Save test results
   - Track trends over time
   - Share insights with team

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [OneRoster v1.2 Specification](https://www.imsglobal.org/oneroster-v12-final-specification)
- [RosterHub API Documentation](../api/README.md)
- [Performance Optimization Guide](./performance-optimization.md)

## Support

For questions or issues:
- Create an issue in GitHub
- Contact the DevOps team
- Review #performance Slack channel
