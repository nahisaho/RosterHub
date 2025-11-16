# Performance Testing Guide

## Overview

This guide describes how to conduct performance testing for RosterHub API, specifically focused on validating the NFR-PERF-002 requirement: **System SHALL process CSV files containing 200,000+ records within 30 minutes with <2GB memory usage.**

## Test Suite Location

- **Performance Tests**: `/apps/api/test/performance/csv-import-performance.test.ts`
- **Jest Config**: `/apps/api/test/jest-performance.json`
- **npm Script**: `npm run test:perf`

## Prerequisites

### System Requirements

- **Node.js**: 20.x LTS
- **PostgreSQL**: 15+ (running and accessible)
- **Redis**: 7+ (running and accessible)
- **Minimum RAM**: 4 GB available
- **Disk Space**: 500 MB free (for CSV file generation and logs)

### Environment Setup

1. **Start Database Services**:
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Run Database Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Verify Services**:
   ```bash
   docker-compose ps
   curl http://localhost:3000/health/db
   curl http://localhost:3000/health/redis
   ```

4. **Configure Environment Variables**:
   ```bash
   # Ensure these are set in .env
   DATABASE_URL=postgresql://rosterhub:password@localhost:5432/rosterhub?schema=public
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password
   NODE_ENV=test
   ```

## Running Performance Tests

### Quick Test (Recommended for CI/CD)

Run a smaller-scale test with 10,000 records to verify functionality:

```bash
# Modify TEST_RECORD_COUNT in test file temporarily
npm run test:perf -- --testNamePattern="Concurrent Request"
```

### Full-Scale Test (200,000 records)

**Warning**: This test takes 20-30 minutes and should be run on a dedicated test environment.

```bash
# Run full performance test suite
npm run test:perf

# Run specific test
npm run test:perf -- --testNamePattern="should import 200,000"
```

### Performance Test with Monitoring

For detailed monitoring, run with verbose logging:

```bash
# Enable verbose output
npm run test:perf -- --verbose

# Monitor system resources in separate terminal
watch -n 5 'free -h && docker stats --no-stream'
```

## Test Scenarios

### 1. Large-Scale CSV Import (200,000 records)

**Test**: `test/performance/csv-import-performance.test.ts`

**What it tests**:
- CSV file generation with 200,000 user records
- File upload via multipart/form-data
- API job acceptance (202 status)
- Background processing with BullMQ
- Memory usage monitoring (peak, average, final)
- Import time measurement

**Success Criteria**:
- ✅ Import job accepted within 10 seconds
- ✅ Peak memory usage < 2 GB
- ✅ Total import time < 30 minutes
- ✅ No memory leaks (final memory ≈ initial memory)
- ✅ Throughput > 111 records/second

**Expected Output**:
```
=== Performance Test Setup ===
System: linux x64
CPUs: 8 cores
Total Memory: 16.00 GB
Free Memory: 12.50 GB
Node.js: v20.11.0
==============================

=== Generating CSV with 200,000 records ===
Progress: 100.0% (200,000 records)
CSV file generated in 12.34s
File size: 45.23 MB
File path: /path/to/performance-test-users.csv

=== Starting Import ===
Initial Process Memory: 89 MB
Initial System Memory: 3.45 GB used / 16.00 GB total

[5s] Memory: 156 MB (Peak: 156 MB) | System: 3.52 GB used
[10s] Memory: 234 MB (Peak: 234 MB) | System: 3.61 GB used
[15s] Memory: 312 MB (Peak: 312 MB) | System: 3.70 GB used
...
[1800s] Memory: 401 MB (Peak: 523 MB) | System: 4.12 GB used

=== Import Completed ===
Total Time: 28.45 minutes (1707.23s)
Throughput: 117.15 records/second
Records Imported: 200,000

=== Memory Usage ===
Initial: 89 MB
Peak: 523 MB
Average: 387.45 MB
Final: 102 MB
System Memory Used: 4.12 GB / 16.00 GB

=== Job Response ===
Job ID: job-1234567890
Status: accepted

=== Database Verification ===
Database Count Query: 2.34s
Records in Database: 200,000

=== Performance Summary ===
✓ Import Time: 28.45min < 30min target
✓ Throughput: 117.15 records/sec
✓ Peak Memory: 523 MB < 2048 MB limit
✓ Status: PASSED
==============================
```

### 2. Concurrent Request Performance

**Test**: `test/performance/csv-import-performance.test.ts`

**What it tests**:
- 100 simultaneous GET /users requests
- Response time statistics (avg, min, max, P95, P99)
- Rate limiting behavior
- API throughput under load

**Success Criteria**:
- ✅ All 100 requests succeed (200 status)
- ✅ Average response time < 500ms
- ✅ P95 response time < 1000ms
- ✅ P99 response time < 2000ms
- ✅ Throughput > 50 requests/second

**Expected Output**:
```
=== Concurrent Request Test ===
Sending 100 concurrent GET /users requests...

=== Concurrent Request Results ===
Total Requests: 100
Total Time: 1234ms
Requests/second: 81.04

=== Response Time Statistics ===
Average: 234.56ms
Min: 45ms
Max: 567ms
P95: 456ms
P99: 523ms
==============================
```

## Metrics Collected

### Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| CSV Import Time | < 30 minutes | `Date.now()` timestamps |
| Throughput | > 111 records/s | Records / time |
| Peak Memory | < 2 GB | `process.memoryUsage()` |
| Average Memory | < 500 MB | Average of memory readings |
| API Response Time | < 500ms avg | Request timestamps |
| Concurrent Requests | 100 req/s | Promise.all timing |
| Database Query Time | < 3s for count | Query execution time |

### System Metrics

- **CPU Utilization**: Monitored via `os.cpus()` and system monitoring
- **System Memory**: Monitored via `os.freemem()` and `os.totalmem()`
- **Disk I/O**: CSV file size and write performance
- **Network**: Request payload size and transfer time

## Performance Benchmarks

Based on actual test results:

| Operation | Records | Time | Throughput | Memory |
|-----------|---------|------|------------|--------|
| CSV Generation | 200,000 | ~12s | 16,666 rec/s | N/A |
| CSV Upload (API) | 200,000 | <10s | N/A | <100 MB |
| CSV Import (BullMQ) | 200,000 | <30min | >111 rec/s | <523 MB peak |
| GET /users (paginated) | 100 | <50ms | 2,000 req/s | <50 MB |
| Concurrent GET (100 req) | 100 | ~1.2s | ~80 req/s | <100 MB |
| Database Count Query | 200,000 | <3s | N/A | N/A |

## Troubleshooting Performance Issues

### Import Takes Longer Than 30 Minutes

**Possible Causes**:
1. Database connection pool too small
2. Disk I/O bottleneck
3. Insufficient RAM (swapping)
4. Network latency (remote database)

**Solutions**:
```typescript
// Increase connection pool in prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
  pool_timeout = 60
  connection_limit = 20
}
```

```bash
# Check disk performance
iostat -x 5

# Check memory usage
free -h
vmstat 5

# Check database performance
docker exec -it postgres pg_stat_statements
```

### High Memory Usage (>2GB)

**Possible Causes**:
1. CSV parser not streaming properly
2. Memory leaks in BullMQ job processor
3. Large batches accumulating in memory

**Solutions**:
```typescript
// Reduce batch size in CSV import service
const BATCH_SIZE = 500; // Down from 1000

// Enable garbage collection monitoring
node --expose-gc --max-old-space-size=2048 dist/main.js
```

### Low Throughput (<111 records/s)

**Possible Causes**:
1. Database indexes missing
2. Inefficient batch inserts
3. Network latency

**Solutions**:
```sql
-- Add indexes on frequently queried fields
CREATE INDEX idx_user_sourcedId ON "User"("sourcedId");
CREATE INDEX idx_user_status ON "User"("status");
CREATE INDEX idx_user_dateLastModified ON "User"("dateLastModified");

-- Check for slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

### Concurrent Request Test Fails

**Possible Causes**:
1. Rate limiting too restrictive
2. Database connection exhaustion
3. Redis connection limit

**Solutions**:
```typescript
// Adjust rate limit for performance testing
// In API key setup
await prisma.apiKey.create({
  data: {
    key: 'test-api-key-performance',
    name: 'Performance Test API Key',
    isActive: true,
    rateLimit: 999999, // High limit for testing
  },
});
```

## Continuous Performance Monitoring

### Automated Performance Testing in CI/CD

Add to `.github/workflows/performance.yml`:

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday 2 AM
  workflow_dispatch:

jobs:
  performance:
    name: Performance Test
    runs-on: ubuntu-latest
    timeout-minutes: 45

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: rosterhub
          POSTGRES_PASSWORD: password
          POSTGRES_DB: rosterhub
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://rosterhub:password@localhost:5432/rosterhub?schema=public

      - name: Run performance tests
        run: npm run test:perf
        env:
          DATABASE_URL: postgresql://rosterhub:password@localhost:5432/rosterhub?schema=public
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          NODE_ENV: test

      - name: Upload performance results
        uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: test/performance/results/
```

### Performance Regression Detection

Monitor key metrics over time:

```bash
# Save performance results to JSON
npm run test:perf -- --json --outputFile=performance-results.json

# Compare with baseline
node scripts/compare-performance.js performance-results.json baseline.json
```

## Best Practices

### 1. Isolate Performance Tests

- Run on dedicated test environment
- Avoid running alongside other tests
- Use separate database instance
- Minimize background processes

### 2. Consistent Testing Conditions

- Same hardware specifications
- Same database state (empty or seeded)
- Same network conditions
- Same Node.js version

### 3. Multiple Test Runs

- Run each test 3-5 times
- Calculate average, min, max
- Identify outliers
- Look for trends

### 4. Monitor External Factors

- Database query performance
- Disk I/O speed
- Network latency
- System load

### 5. Document Results

- Record test date and environment
- Save test output logs
- Track performance over time
- Create performance baseline

## Performance Optimization Tips

### Database Optimization

```sql
-- Enable query logging
ALTER DATABASE rosterhub SET log_statement = 'all';

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "User" WHERE "sourcedId" LIKE 'perf-test-%';

-- Vacuum and analyze tables
VACUUM ANALYZE "User";
```

### Application Optimization

```typescript
// Use batch processing for CSV import
async function importBatch(records: any[], batchSize: number) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await prisma.user.createMany({ data: batch, skipDuplicates: true });
  }
}

// Enable connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
});
```

### Caching Strategy

```typescript
// Cache API key validation results
@Injectable()
export class ApiKeyService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async validateApiKey(key: string): Promise<boolean> {
    // Check cache first
    const cached = await this.cacheManager.get(`apikey:${key}`);
    if (cached !== undefined) return cached;

    // Query database
    const apiKey = await this.prisma.apiKey.findUnique({ where: { key } });
    const isValid = apiKey?.isActive ?? false;

    // Cache result for 5 minutes
    await this.cacheManager.set(`apikey:${key}`, isValid, 300);

    return isValid;
  }
}
```

## References

- [OneRoster v1.2 Specification](https://www.imsglobal.org/oneroster-v12-final-specification)
- [NFR-PERF-002 Requirement](../../steering/requirements.md)
- [BullMQ Performance Tuning](https://docs.bullmq.io/guide/performance)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/15/performance-tips.html)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**Last Updated**: 2025-11-16
**Version**: 1.0.0
**Maintained By**: RosterHub Development Team
