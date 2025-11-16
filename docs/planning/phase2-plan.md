# RosterHub Phase 2 Implementation Plan

**Version**: 1.0
**Date**: 2025-11-16
**Status**: Planning
**Duration**: 6 months (Months 7-12)

---

## 📋 Executive Summary

Phase 2 focuses on **Enhanced Operations** to improve user experience, observability, and system reliability. Building on Phase 1's solid foundation (100% E2E test coverage, production-ready infrastructure), Phase 2 adds operational tools and advanced features to support production deployments at scale.

### Phase 2 Goals
1. ✅ Complete E2E test coverage (all 7 entities)
2. ✅ Performance and load testing
3. ✅ Advanced monitoring and observability
4. ✅ Web-based CSV import UI
5. ✅ Webhook notifications for async operations
6. ✅ Enhanced configuration management

---

## 🎯 Phase 2 Objectives

| Objective | Priority | Timeline | Success Criteria |
|-----------|----------|----------|------------------|
| Complete E2E Test Coverage | **CRITICAL** | Weeks 1-2 | 100% coverage for all 7 entities |
| Performance & Load Testing | **HIGH** | Weeks 2-4 | Baseline established, bottlenecks identified |
| Monitoring Dashboard | **HIGH** | Weeks 3-6 | Prometheus + Grafana deployed |
| Web-based CSV UI | **MEDIUM** | Weeks 5-10 | React app with drag-drop upload |
| Webhook Notifications | **MEDIUM** | Weeks 8-12 | Configurable webhooks for job events |
| Data Mapping Config | **LOW** | Weeks 10-15 | UI for custom field mappings |
| Performance Optimization | **MEDIUM** | Weeks 12-18 | 50% improvement in key metrics |
| Kubernetes Deployment | **LOW** | Weeks 16-20 | Helm charts + production manifests |

---

## 📊 Current State (Phase 1 Complete)

### ✅ Completed Features
- OneRoster v1.2 REST API (7 entities: users, orgs, classes, courses, enrollments, demographics, academicSessions)
- CSV Import/Export with streaming (100MB+ files)
- Delta/Incremental API
- Advanced filtering (all OneRoster operators)
- Security (API key, IP whitelist, rate limiting, audit logging)
- Background job processing (BullMQ)
- Docker infrastructure (PostgreSQL, Redis)
- CI/CD pipeline (GitHub Actions)
- **E2E Test Coverage**: 33/33 tests (100% for users, orgs, CSV import)

### 🔍 Gaps Identified for Phase 2

#### Testing Gaps
- **Missing E2E Tests**: 5 entities (classes, courses, enrollments, demographics, academicSessions)
  - Current: 33/33 tests (users: 15, orgs: 6, CSV: 11, health: 1)
  - Target: ~80 tests (add 47 tests for remaining entities)

- **Performance Testing**: Framework exists but no baseline metrics
  - Need: Response time baselines, throughput metrics, resource utilization

- **Load Testing**: No stress/load tests
  - Need: Concurrent user testing, CSV upload stress tests, API rate limit validation

#### Operational Gaps
- **Monitoring**: Basic health checks only
  - Need: Metrics (Prometheus), dashboards (Grafana), alerting

- **Observability**: Application logs only
  - Need: Distributed tracing (Jaeger), structured logging, correlation IDs

- **User Experience**: API-only interface
  - Need: Web UI for CSV uploads, job status monitoring

#### Feature Gaps
- **Webhooks**: No async notifications
  - Need: Configurable webhooks for job completion, errors

- **Configuration**: Hardcoded field mappings
  - Need: UI for custom CSV-to-entity mappings

---

## 🏗️ Phase 2 Implementation Plan

### Sprint 1-2: Complete E2E Test Coverage (Weeks 1-2)

**Goal**: Achieve 100% E2E test coverage for all 7 OneRoster entities

#### Tasks

##### 1.1 Classes E2E Tests (8 tests)
- ✅ GET /ims/oneroster/v1p2/classes (list with pagination)
- ✅ GET /ims/oneroster/v1p2/classes/:id (single class)
- ✅ GET /ims/oneroster/v1p2/classes?filter=title='Math 101' (filtering)
- ✅ GET /ims/oneroster/v1p2/classes?fields=sourcedId,title (field selection)
- ✅ GET /ims/oneroster/v1p2/classes?sort=title (sorting)
- ✅ PUT /ims/oneroster/v1p2/classes/:id (update)
- ✅ DELETE /ims/oneroster/v1p2/classes/:id (soft delete)
- ✅ Japan Profile metadata validation

**Files**:
- Create: `apps/api/test/oneroster-classes.e2e-spec.ts`

##### 1.2 Courses E2E Tests (8 tests)
- ✅ GET /ims/oneroster/v1p2/courses (list)
- ✅ GET /ims/oneroster/v1p2/courses/:id (single)
- ✅ Filtering, field selection, sorting
- ✅ PUT, DELETE operations
- ✅ Japan Profile metadata

**Files**:
- Create: `apps/api/test/oneroster-courses.e2e-spec.ts`

##### 1.3 Enrollments E2E Tests (10 tests)
- ✅ GET /ims/oneroster/v1p2/enrollments (list)
- ✅ GET /ims/oneroster/v1p2/enrollments/:id (single)
- ✅ GET /ims/oneroster/v1p2/classes/:classId/enrollments (class enrollments)
- ✅ GET /ims/oneroster/v1p2/users/:userId/enrollments (user enrollments)
- ✅ Filtering by role, beginDate, endDate
- ✅ Field selection, sorting
- ✅ PUT, DELETE operations
- ✅ Japan Profile metadata

**Files**:
- Create: `apps/api/test/oneroster-enrollments.e2e-spec.ts`

##### 1.4 Demographics E2E Tests (7 tests)
- ✅ GET /ims/oneroster/v1p2/demographics/:id
- ✅ Filtering, field selection
- ✅ PUT operation
- ✅ Japan Profile validation (kana fields)

**Files**:
- Create: `apps/api/test/oneroster-demographics.e2e-spec.ts`

##### 1.5 AcademicSessions E2E Tests (8 tests)
- ✅ GET /ims/oneroster/v1p2/academicSessions (list)
- ✅ GET /ims/oneroster/v1p2/academicSessions/:id (single)
- ✅ Filtering by type, startDate, endDate
- ✅ Field selection, sorting
- ✅ PUT, DELETE operations
- ✅ Nested academic sessions (parent/children)

**Files**:
- Create: `apps/api/test/oneroster-academic-sessions.e2e-spec.ts`

##### 1.6 CSV Import E2E Tests (6 additional tests)
- ✅ CSV import for classes, courses, enrollments, demographics, academicSessions
- ✅ CSV export for all entities (delta mode)

**Files**:
- Update: `apps/api/test/csv-import.e2e-spec.ts`

**Deliverables**:
- 47 new E2E tests
- **Total E2E Tests**: 80 (current 33 + new 47)
- All tests passing (100%)
- CI pipeline updated to run all tests

**Acceptance Criteria**:
- E2E tests for all 7 entities
- 100% pass rate in CI
- Test coverage report generated

---

### Sprint 3-4: Performance & Load Testing (Weeks 2-4)

**Goal**: Establish performance baselines and identify bottlenecks

#### Tasks

##### 2.1 Performance Test Infrastructure
- ✅ Set up k6 for load testing
- ✅ Configure test scenarios (smoke, load, stress, spike)
- ✅ Add performance tests to CI pipeline (optional)

**Files**:
- Create: `apps/api/test/performance/k6/`
  - `smoke-test.js` (minimal load)
  - `load-test.js` (expected load)
  - `stress-test.js` (breaking point)
  - `spike-test.js` (sudden traffic)

##### 2.2 API Performance Tests
**Test Scenarios**:
1. **GET /users** (list endpoint)
   - Target: 100 RPS, p95 < 200ms

2. **GET /users/:id** (single resource)
   - Target: 200 RPS, p95 < 100ms

3. **CSV Import** (100MB file)
   - Target: < 60s processing time

4. **Filtering** (complex queries)
   - Target: 50 RPS, p95 < 300ms

**Files**:
- Create: `apps/api/test/performance/k6/api-performance.js`

##### 2.3 Database Performance
- ✅ Query analysis (EXPLAIN ANALYZE)
- ✅ Index optimization
- ✅ Connection pool tuning

**Files**:
- Create: `docs/performance/database-optimization.md`

##### 2.4 Performance Baseline Report
**Metrics to Capture**:
- Response time (p50, p95, p99)
- Throughput (RPS)
- Resource utilization (CPU, memory, disk I/O)
- Database query performance

**Files**:
- Create: `docs/performance/baseline-report.md`

**Deliverables**:
- k6 test suite
- Performance baseline report
- Identified bottlenecks and optimization plan

**Acceptance Criteria**:
- All performance tests executable via `npm run test:perf`
- Baseline metrics documented
- Top 3 performance bottlenecks identified

---

### Sprint 5-6: Monitoring & Observability (Weeks 3-6)

**Goal**: Deploy comprehensive monitoring with Prometheus and Grafana

#### Tasks

##### 3.1 Prometheus Setup
- ✅ Add Prometheus service to `docker-compose.yml`
- ✅ Configure metrics collection
- ✅ Set up retention and storage

**Files**:
- Update: `docker-compose.yml`
- Create: `prometheus/prometheus.yml`

##### 3.2 Application Metrics
- ✅ Install `@willsoto/nestjs-prometheus`
- ✅ Expose metrics endpoint `/metrics`
- ✅ Add custom metrics:
  - HTTP request duration (histogram)
  - Request count by endpoint (counter)
  - CSV import job duration (histogram)
  - Active CSV import jobs (gauge)
  - API key usage by client (counter)

**Files**:
- Update: `apps/api/src/common/common.module.ts`
- Create: `apps/api/src/common/interceptors/metrics.interceptor.ts`

##### 3.3 Grafana Dashboards
- ✅ Add Grafana service to `docker-compose.yml`
- ✅ Create dashboards:
  - **API Overview**: Request rate, error rate, latency
  - **CSV Operations**: Import jobs, success/failure rate, processing time
  - **System Resources**: CPU, memory, disk, network
  - **Security**: API key usage, rate limit hits, failed auth attempts

**Files**:
- Create: `grafana/dashboards/api-overview.json`
- Create: `grafana/dashboards/csv-operations.json`
- Create: `grafana/dashboards/system-resources.json`
- Create: `grafana/dashboards/security.json`
- Create: `grafana/provisioning/dashboards.yml`
- Create: `grafana/provisioning/datasources.yml`

##### 3.4 Alerting
- ✅ Configure Prometheus alerting rules:
  - High error rate (>5%)
  - High latency (p95 > 500ms)
  - Failed CSV imports (>10%)
  - Low disk space (<20%)

**Files**:
- Create: `prometheus/alerts.yml`

##### 3.5 Distributed Tracing (Optional)
- ✅ Add Jaeger service (optional)
- ✅ Instrument with OpenTelemetry

**Files**:
- Update: `docker-compose.yml` (add jaeger service)
- Create: `apps/api/src/common/tracing.ts`

**Deliverables**:
- Prometheus + Grafana stack deployed
- 4 Grafana dashboards
- Alerting rules configured
- Documentation: Monitoring Guide

**Acceptance Criteria**:
- Metrics visible in Grafana
- Alerts triggerable via test scenarios
- Documentation complete

---

### Sprint 7-10: Web-based CSV Import UI (Weeks 5-10)

**Goal**: Provide user-friendly web interface for CSV uploads

#### Tasks

##### 4.1 Frontend Project Setup
- ✅ Create React app with Vite
- ✅ TypeScript + TailwindCSS
- ✅ Folder structure

**Files**:
- Create: `apps/web/` (new React app)

##### 4.2 CSV Upload Component
**Features**:
- Drag-and-drop file upload
- Entity type selection (users, orgs, classes, etc.)
- File validation (CSV only, max 100MB)
- Upload progress bar
- Real-time job status updates

**Files**:
- Create: `apps/web/src/components/CsvUpload.tsx`
- Create: `apps/web/src/components/FileDropzone.tsx`
- Create: `apps/web/src/components/UploadProgress.tsx`

##### 4.3 Job Status Dashboard
**Features**:
- List of all CSV import jobs
- Status: pending, processing, completed, failed
- Progress percentage
- Error details (if failed)
- Download result (if completed)

**Files**:
- Create: `apps/web/src/components/JobDashboard.tsx`
- Create: `apps/web/src/components/JobCard.tsx`

##### 4.4 API Integration
- ✅ Axios client for API calls
- ✅ WebSocket for real-time updates (or polling)
- ✅ Authentication (API key input)

**Files**:
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/hooks/useCsvJobs.ts`

##### 4.5 Backend: Job Status API
- ✅ GET /ims/oneroster/v1p2/csv/jobs (list jobs)
- ✅ GET /ims/oneroster/v1p2/csv/jobs/:id (job status)
- ✅ WebSocket endpoint (optional)

**Files**:
- Update: `apps/api/src/oneroster/csv/csv-import.controller.ts`
- Create: `apps/api/src/oneroster/csv/dto/job-status.dto.ts`

**Deliverables**:
- React web app
- CSV upload UI
- Job status dashboard
- Real-time updates

**Acceptance Criteria**:
- Users can upload CSV via UI
- Job progress visible in real-time
- Errors displayed clearly
- Mobile-responsive

---

### Sprint 8-12: Webhook Notifications (Weeks 8-12)

**Goal**: Enable async notifications for CSV job events

#### Tasks

##### 5.1 Webhook Configuration
- ✅ Database schema for webhooks (url, events, secret)
- ✅ CRUD API for webhook management

**Files**:
- Update: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/oneroster/webhooks/webhooks.module.ts`
- Create: `apps/api/src/oneroster/webhooks/webhooks.controller.ts`

##### 5.2 Webhook Delivery Service
- ✅ HTTP POST to webhook URL
- ✅ Retry logic (exponential backoff)
- ✅ Signature verification (HMAC)
- ✅ Webhook event types:
  - `csv.import.started`
  - `csv.import.completed`
  - `csv.import.failed`
  - `csv.export.completed`

**Files**:
- Create: `apps/api/src/oneroster/webhooks/webhook-delivery.service.ts`

##### 5.3 Event Emission
- ✅ Trigger webhooks from CSV processors
- ✅ Payload: jobId, entityType, status, timestamp, metadata

**Files**:
- Update: `apps/api/src/oneroster/csv/processors/csv-import.processor.ts`

##### 5.4 Webhook Testing
- ✅ E2E tests for webhook delivery
- ✅ Mock webhook server for testing

**Files**:
- Create: `apps/api/test/webhooks.e2e-spec.ts`

**Deliverables**:
- Webhook management API
- Webhook delivery service
- E2E tests

**Acceptance Criteria**:
- Webhooks configurable via API
- Events delivered reliably
- Signature verification works

---

### Sprint 10-15: Data Mapping Configuration (Weeks 10-15)

**Goal**: Allow custom CSV field mappings

#### Tasks

##### 6.1 Mapping Schema
- ✅ Database schema for mappings
- ✅ Default mappings (OneRoster standard)
- ✅ Custom mappings per organization

**Files**:
- Update: `apps/api/prisma/schema.prisma`

##### 6.2 Mapping API
- ✅ GET /ims/oneroster/v1p2/mappings/:entityType
- ✅ PUT /ims/oneroster/v1p2/mappings/:entityType
- ✅ Validation: required fields must be mapped

**Files**:
- Create: `apps/api/src/oneroster/mappings/mappings.module.ts`
- Create: `apps/api/src/oneroster/mappings/mappings.controller.ts`

##### 6.3 Mapping UI (Web App)
- ✅ Drag-and-drop field mapping
- ✅ Preview CSV with sample data
- ✅ Save/reset mappings

**Files**:
- Create: `apps/web/src/components/FieldMapper.tsx`

##### 6.4 CSV Import Integration
- ✅ Use custom mappings during import
- ✅ Fallback to default mappings

**Files**:
- Update: `apps/api/src/oneroster/csv/services/csv-import.service.ts`

**Deliverables**:
- Mapping management API
- Mapping UI
- Integration with CSV import

**Acceptance Criteria**:
- Custom mappings saveable
- CSV import uses custom mappings
- UI user-friendly

---

### Sprint 12-18: Performance Optimization (Weeks 12-18)

**Goal**: Improve key performance metrics by 50%

#### Tasks

##### 7.1 Database Query Optimization
- ✅ Add missing indexes (based on query analysis)
- ✅ Optimize N+1 queries (Prisma includes)
- ✅ Implement query caching (Redis)

**Files**:
- Update: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/common/cache/query-cache.service.ts`

##### 7.2 API Response Optimization
- ✅ Implement HTTP caching (ETag, Last-Modified)
- ✅ Enable gzip compression
- ✅ Add response caching for read-only endpoints

**Files**:
- Update: `apps/api/src/main.ts`
- Create: `apps/api/src/common/interceptors/cache.interceptor.ts`

##### 7.3 CSV Import Optimization
- ✅ Batch inserts (increase from 1000 to 5000)
- ✅ Parallel processing (multiple workers)
- ✅ Streaming optimization

**Files**:
- Update: `apps/api/src/oneroster/csv/services/csv-import.service.ts`

##### 7.4 Re-benchmark
- ✅ Run k6 tests again
- ✅ Compare with baseline
- ✅ Document improvements

**Files**:
- Update: `docs/performance/baseline-report.md`

**Deliverables**:
- Optimized queries
- Optimized CSV import
- Performance comparison report

**Acceptance Criteria**:
- 50% improvement in p95 latency
- 2x improvement in CSV import throughput

---

### Sprint 16-20: Kubernetes Deployment (Weeks 16-20) [OPTIONAL]

**Goal**: Enable Kubernetes deployment

#### Tasks

##### 8.1 Helm Chart
- ✅ Create Helm chart for RosterHub
- ✅ Configurable values (replicas, resources, etc.)
- ✅ Support for PostgreSQL (external or in-cluster)

**Files**:
- Create: `charts/rosterhub/Chart.yaml`
- Create: `charts/rosterhub/values.yaml`
- Create: `charts/rosterhub/templates/deployment.yaml`
- Create: `charts/rosterhub/templates/service.yaml`
- Create: `charts/rosterhub/templates/ingress.yaml`

##### 8.2 Production Manifests
- ✅ Deployment with health checks
- ✅ HPA (Horizontal Pod Autoscaler)
- ✅ PVC for persistent storage

**Files**:
- Create: `k8s/production/deployment.yaml`
- Create: `k8s/production/hpa.yaml`

##### 8.3 Documentation
- ✅ Kubernetes deployment guide
- ✅ Helm chart usage

**Files**:
- Create: `docs/deployment/kubernetes-deployment.md`

**Deliverables**:
- Helm chart
- Production manifests
- Deployment guide

**Acceptance Criteria**:
- Deployable to Kubernetes
- Helm chart tested on local cluster (minikube/kind)

---

## 📅 Timeline

| Week | Sprint | Focus | Deliverables |
|------|--------|-------|--------------|
| 1-2 | 1-2 | E2E Test Coverage | 47 new tests, 100% coverage |
| 2-4 | 3-4 | Performance Testing | k6 suite, baseline report |
| 3-6 | 5-6 | Monitoring | Prometheus + Grafana stack |
| 5-10 | 7-10 | Web CSV UI | React app, upload UI |
| 8-12 | 8-12 | Webhooks | Webhook API, delivery service |
| 10-15 | 10-15 | Data Mapping | Mapping API + UI |
| 12-18 | 12-18 | Performance Optimization | 50% improvement |
| 16-20 | 16-20 | Kubernetes (Optional) | Helm chart, manifests |

---

## 🎯 Success Metrics

| Metric | Phase 1 | Phase 2 Target | Measurement |
|--------|---------|----------------|-------------|
| E2E Test Coverage | 33 tests (users, orgs, CSV) | 80 tests (all entities) | CI pipeline |
| API Latency (p95) | Unknown | < 200ms | Prometheus |
| CSV Import (100MB) | Unknown | < 60s | Performance tests |
| Test Pass Rate | 100% | 100% | CI pipeline |
| Monitoring Coverage | Health checks only | Full metrics + alerts | Grafana dashboards |
| User Interface | API only | Web UI for CSV | User feedback |

---

## 🚀 Phase 2 Deliverables Summary

### Testing
- ✅ 80 E2E tests (100% entity coverage)
- ✅ k6 performance test suite
- ✅ Performance baseline report

### Monitoring
- ✅ Prometheus + Grafana stack
- ✅ 4 Grafana dashboards
- ✅ Alerting rules

### User Experience
- ✅ React web app for CSV uploads
- ✅ Job status dashboard
- ✅ Real-time progress updates

### Features
- ✅ Webhook notifications
- ✅ Custom data mappings
- ✅ Performance optimizations

### Infrastructure (Optional)
- ✅ Kubernetes Helm chart
- ✅ Production manifests

### Documentation
- ✅ Phase 2 implementation guide
- ✅ Performance optimization guide
- ✅ Monitoring guide
- ✅ Kubernetes deployment guide

---

## 🔗 Related Documentation

- [Phase 1 Completion Report](../../orchestrator/reports/phase1-completion-report-20251116.md)
- [Phase 1 Test Results](../testing/phase1-test-results.md)
- [Performance Testing Guide](../../apps/api/docs/testing/performance-testing-guide.md)
- [Deployment Manual](../deployment/deployment-manual.md)

---

## 📝 Notes

### Priority Levels
- **CRITICAL**: Blockers, must complete for Phase 2 success
- **HIGH**: Important for production operations
- **MEDIUM**: Enhances user experience or ops efficiency
- **LOW**: Nice-to-have, can defer to Phase 3

### Dependencies
- Sprint 1-2 (E2E tests) should complete before other sprints
- Monitoring (Sprint 5-6) required for performance optimization (Sprint 12-18)
- Web UI (Sprint 7-10) can run in parallel with webhooks (Sprint 8-12)

### Risk Mitigation
- **Risk**: Performance targets not met
  - **Mitigation**: Establish baseline early, iterate on optimizations

- **Risk**: Web UI delays
  - **Mitigation**: API-first approach, UI can be v2 feature

- **Risk**: Kubernetes complexity
  - **Mitigation**: Mark as optional, focus on Docker Compose for v1.0

---

**Phase 2 Planning Complete** ✅
**Next Step**: Begin Sprint 1-2 (E2E Test Coverage)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Maintained By**: RosterHub Development Team
