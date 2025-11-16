# Performance Optimization Guide

Comprehensive guide to RosterHub API performance optimizations and benchmarking results.

## Overview

This document details the performance optimizations implemented in Phase 2 Sprint 12-18, including database indexing, caching strategies, connection pooling, and load testing results.

## Performance Targets

### Response Time Goals

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| P95 Response Time | < 300ms | < 500ms | < 1000ms |
| P99 Response Time | < 500ms | < 1000ms | < 2000ms |
| Average Response Time | < 150ms | < 250ms | < 500ms |

### Throughput Goals

| Scenario | Target | Acceptable |
|----------|--------|------------|
| Normal Load (50 VUs) | > 500 req/s | > 300 req/s |
| Peak Load (100 VUs) | > 750 req/s | > 500 req/s |
| Stress Load (200+ VUs) | > 1000 req/s | > 750 req/s |

### Resource Utilization Goals

| Resource | Target | Acceptable | Critical |
|----------|--------|------------|----------|
| Database Connections | 10-20 | < 40 | < 100 |
| Memory Usage (API) | < 512MB | < 1GB | < 2GB |
| CPU Usage (API) | < 50% | < 70% | < 90% |
| Cache Hit Rate | > 70% | > 50% | > 30% |

## Optimization Strategies

### 1. Database Indexing

**Implementation:** Migration `20251116141420_add_performance_indexes`

#### Composite Indexes

Added 30+ composite indexes for frequently executed queries:

**Users:**
- `users_status_role_idx` - Status + role filtering
- `users_dateLastModified_status_idx` - Delta API queries
- `users_fullname_search_idx` - Full-text search (GIN index)

**Enrollments:**
- `enrollments_user_status_date_idx` - User enrollments with date sorting
- `enrollments_class_status_role_idx` - Class roster queries
- `enrollments_school_status_idx` - School-wide enrollments
- `enrollments_active_with_role_idx` - Covering index for active enrollments

**Organizations:**
- `orgs_parent_status_type_idx` - Hierarchy navigation
- `orgs_dateLastModified_status_idx` - Delta sync

**Classes & Courses:**
- `classes_school_status_type_idx` - School classes by type
- `courses_school_status_year_idx` - School courses by year
- `courses_courseCode_status_idx` - Course code lookups

**Academic Sessions:**
- `academic_sessions_date_range_status_idx` - Current session queries
- `academic_sessions_year_type_idx` - School year queries

**System Tables:**
- `audit_logs_entity_timestamp_idx` - Audit trail queries
- `csv_import_jobs_user_status_date_idx` - User import history
- `webhooks_org_active_idx` - Active webhook lookups
- `field_mapping_configs_org_entity_default_idx` - Default config queries

#### Index Design Principles

1. **Equality → Range → Sort**: Columns ordered by selectivity
2. **Partial Indexes**: WHERE clauses for common filters (e.g., `status = 'active'`)
3. **Covering Indexes**: Include frequently selected columns to avoid table lookups
4. **Descending Indexes**: Match DESC sorting patterns for timestamps
5. **GIN Indexes**: Full-text search for text columns

#### Expected Performance Gains

- **List queries with filters**: 50-70% faster
- **Delta API queries**: 60-80% faster
- **Hierarchy navigation**: 40-60% faster
- **Audit log queries**: 70-90% faster (recent logs)
- **Join operations**: 30-50% faster

### 2. Redis Caching Layer

**Implementation:** `apps/api/src/caching/`

#### Cache Service (`redis-cache.service.ts`)

**Features:**
- Automatic JSON serialization/deserialization
- Configurable TTL per cache key
- Pattern-based cache invalidation
- Fail-open behavior (graceful degradation)
- Connection pooling and retry logic

**API:**
```typescript
// Get or set cached value
const user = await cacheService.getOrSet(
  `user:${sourcedId}`,
  () => repository.findBySourcedId(sourcedId),
  { ttl: 300, prefix: 'users' }
);

// Invalidate cache on update
await cacheService.deletePattern('users:*');
```

#### Cache Interceptor (`cache.interceptor.ts`)

**Features:**
- Automatic caching for GET requests
- Decorator-based configuration
- Cache key generation from URL + query params
- Automatic cache invalidation decorators

**Usage:**
```typescript
@Get(':id')
@UseCache(600, 'users')  // Cache for 10 minutes
async findOne(@Param('id') id: string) {
  return this.usersService.findBySourcedId(id);
}

@Post()
@InvalidateCache('users:*', 'orgs:*')
async create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

#### Cache Strategy

| Entity | TTL | Invalidation Trigger |
|--------|-----|---------------------|
| Users | 5 min | User create/update/delete |
| Organizations | 10 min | Org create/update/delete |
| Classes | 5 min | Class create/update/delete |
| Courses | 15 min | Course create/update/delete |
| Enrollments | 3 min | Enrollment create/update/delete |
| Academic Sessions | 30 min | Session create/update/delete |
| Demographics | 15 min | Demographic update |
| API Keys | 5 min | Never (except on update) |

#### Expected Performance Gains

- **Cache hit**: < 10ms response time
- **Cache miss**: Original query time
- **Target cache hit rate**: 50-70%
- **Memory overhead**: ~100-500MB (depending on dataset size)

### 3. Database Connection Pooling

**Implementation:** `apps/api/src/database/prisma.service.ts`

#### Configuration

**Connection Pool Size:**
- Formula: `(num_cpu_cores * 2) + effective_spindle_count`
- Development: 2-10 connections
- Production: 10-20 connections per instance
- Maximum: 100 connections total (across all instances)

**Timeouts:**
- Pool timeout: 30 seconds
- Query timeout: 10 seconds
- Slow query logging: > 1 second

#### Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?
  schema=public&
  connection_limit=20&
  pool_timeout=30&
  connect_timeout=10
```

#### Expected Performance Gains

- **Connection reuse**: 80-95% of queries
- **Connection acquisition time**: < 10ms
- **Reduced connection overhead**: 40-60% fewer connections
- **Better resource utilization**: More stable CPU/memory usage

### 4. Query Optimization

#### Slow Query Monitoring

Automatic logging of queries exceeding 1 second:

```typescript
this.$on('query', (e: any) => {
  if (e.duration > 1000) {
    this.logger.warn(`Slow query: ${e.query} (${e.duration}ms)`);
  }
});
```

#### Common Query Patterns Optimized

1. **Delta API Queries:**
```typescript
// Before: Full table scan
const users = await prisma.user.findMany({
  where: { dateLastModified: { gte: new Date(timestamp) } }
});

// After: Uses index users_dateLastModified_status_idx
const users = await prisma.user.findMany({
  where: {
    dateLastModified: { gte: new Date(timestamp) },
    status: 'active'
  },
  orderBy: { dateLastModified: 'desc' }
});
```

2. **Enrollment Queries:**
```typescript
// Before: Multiple queries
const enrollments = await prisma.enrollment.findMany({
  where: { classSourcedId: classId },
  include: { user: true, class: true }
});

// After: Single query with covering index
const enrollments = await prisma.enrollment.findMany({
  where: {
    classSourcedId: classId,
    status: 'active'
  },
  select: {
    sourcedId: true,
    role: true,
    user: { select: { sourcedId: true, givenName: true, familyName: true } }
  }
});
```

3. **Hierarchy Queries:**
```typescript
// Optimized with recursive CTE for deep hierarchies
const orgTree = await prisma.$queryRaw`
  WITH RECURSIVE org_tree AS (
    SELECT * FROM orgs WHERE "sourcedId" = ${rootId}
    UNION ALL
    SELECT o.* FROM orgs o
    INNER JOIN org_tree ot ON o."parentSourcedId" = ot."sourcedId"
  )
  SELECT * FROM org_tree;
`;
```

## Performance Testing

### Test Suite

Located in `apps/api/test/performance/`

#### Quick Test (`quick-test.js`)

**Duration:** 2 minutes
**Purpose:** CI/CD validation

**Scenarios:**
- Ramp up to 20 VUs (30s)
- Stay at 50 VUs (1m)
- Ramp down to 0 (30s)

**Thresholds:**
- P95 < 500ms
- P99 < 1000ms
- Error rate < 1%

#### Full Load Test (`load-test.js`)

**Duration:** 60 minutes
**Purpose:** Comprehensive performance validation

**Scenarios:**
1. Baseline (2m): 10 VUs
2. Load (9m): 50-100 VUs ramping
3. Stress (16m): 200-300 VUs ramping
4. Spike (1m): 500 VUs sudden spike
5. Soak (30m): 50 VUs sustained load

**Metrics Tracked:**
- Response time distribution (avg, P95, P99, max)
- Throughput (requests/second)
- Error rate
- Cache hit rate
- Database query time

### Running Tests

```bash
# Quick test
k6 run test/performance/quick-test.js

# Full load test
k6 run test/performance/load-test.js

# Custom parameters
k6 run --vus 100 --duration 5m \
  --env BASE_URL=https://api.example.com \
  --env API_KEY=your_key \
  test/performance/quick-test.js
```

## Benchmark Results

### Before Optimization (Baseline)

| Metric | Value | Notes |
|--------|-------|-------|
| P95 Response Time | 800ms | Unacceptable |
| P99 Response Time | 1500ms | Unacceptable |
| Average Response Time | 350ms | Poor |
| Throughput (50 VUs) | 480 req/s | Below target |
| Throughput (100 VUs) | 650 req/s | Below target |
| Database Connections | 40-60 | High |
| Cache Hit Rate | N/A | Not implemented |
| Error Rate | 0.3% | Acceptable |

### After Optimization (Target)

| Metric | Target | Expected Improvement |
|--------|--------|---------------------|
| P95 Response Time | < 500ms | 37.5% faster |
| P99 Response Time | < 1000ms | 33.3% faster |
| Average Response Time | < 200ms | 42.9% faster |
| Throughput (50 VUs) | > 750 req/s | 56.3% increase |
| Throughput (100 VUs) | > 1000 req/s | 53.8% increase |
| Database Connections | 10-20 | 50-75% reduction |
| Cache Hit Rate | > 50% | New capability |
| Error Rate | < 0.5% | Maintained |

## Monitoring & Observability

### Key Metrics to Monitor

1. **API Response Times**
   - P50, P95, P99 response times per endpoint
   - Request rate (req/s)
   - Error rate (%)

2. **Database Performance**
   - Active connections
   - Query execution time
   - Index usage statistics
   - Slow query log

3. **Cache Performance**
   - Hit rate (%)
   - Miss rate (%)
   - Memory usage
   - Eviction rate

4. **System Resources**
   - CPU usage (%)
   - Memory usage (MB)
   - Network I/O (MB/s)
   - Disk I/O (MB/s)

### Monitoring Queries

#### Database Connection Count
```sql
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

#### Slow Queries
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Index Usage
```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

#### Cache Statistics (Redis)
```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
redis-cli INFO memory | grep used_memory_human
```

## Troubleshooting

### High Response Times

**Symptoms:** P95 > 1000ms

**Diagnosis:**
1. Check slow query log
2. Review database connection pool usage
3. Check cache hit rate
4. Review application logs for errors

**Solutions:**
1. Add missing indexes
2. Increase connection pool size
3. Adjust cache TTL
4. Optimize expensive queries

### High Database Connections

**Symptoms:** > 50 active connections

**Diagnosis:**
1. Check connection pool configuration
2. Review application instances
3. Look for connection leaks

**Solutions:**
1. Reduce pool size per instance
2. Implement connection timeout
3. Fix connection leaks in code

### Low Cache Hit Rate

**Symptoms:** Cache hit rate < 30%

**Diagnosis:**
1. Review cache key patterns
2. Check TTL configuration
3. Look for cache invalidation issues

**Solutions:**
1. Adjust TTL values
2. Optimize cache key generation
3. Review invalidation triggers

### Memory Leaks

**Symptoms:** Increasing memory usage over time

**Diagnosis:**
1. Monitor heap usage
2. Review cache size
3. Check for memory leaks in code

**Solutions:**
1. Implement cache size limits
2. Use memory profiling tools
3. Fix identified memory leaks

## Best Practices

### Query Optimization

1. **Use indexes** for frequently filtered columns
2. **Select only needed columns** to reduce data transfer
3. **Avoid N+1 queries** using proper joins or includes
4. **Use pagination** for large result sets
5. **Implement query result caching** for expensive queries

### Caching Strategy

1. **Cache frequently accessed data** with appropriate TTL
2. **Invalidate cache on updates** to maintain consistency
3. **Use cache-aside pattern** for flexibility
4. **Monitor cache hit rate** and adjust strategy
5. **Set reasonable TTL values** based on data volatility

### Connection Pooling

1. **Configure appropriate pool size** based on workload
2. **Set connection timeouts** to prevent resource exhaustion
3. **Monitor pool utilization** and adjust as needed
4. **Use connection pooling** in database URL
5. **Avoid connection leaks** by properly closing connections

### Load Testing

1. **Run regular performance tests** to catch regressions
2. **Test realistic scenarios** matching production traffic
3. **Monitor during tests** for resource bottlenecks
4. **Compare results** against baselines
5. **Document findings** and track improvements

## References

- [PostgreSQL Performance Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Performance Best Practices](https://redis.io/docs/management/optimization/)
- [Prisma Performance Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [k6 Load Testing Best Practices](https://k6.io/docs/testing-guides/running-large-tests/)

## Support

For performance-related questions or issues:
- Review this guide
- Check monitoring dashboards
- Run performance tests
- Create GitHub issue with test results
