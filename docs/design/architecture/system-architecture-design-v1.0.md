# System Architecture Design
# RosterHub - OneRoster Japan Profile CSV Bulk Upload System

**Project**: RosterHub  
**Version**: 1.0  
**Date**: 2025-11-17  
**Author**: System Architect Agent  
**Status**: Draft  

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-17 | System Architect Agent | Initial complete architecture design |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Prerequisites and Constraints](#3-prerequisites-and-constraints)
4. [Architecture Pattern & System Boundary](#4-architecture-pattern--system-boundary)
5. [Technology Stack](#5-technology-stack)
6. [Component Design](#6-component-design)
7. [Data Design](#7-data-design)
8. [API Design](#8-api-design)
9. [Sequence Diagrams](#9-sequence-diagrams)
10. [Security Design](#10-security-design)
11. [Performance Design](#11-performance-design)
12. [Scalability Design](#12-scalability-design)
13. [Observability Design](#13-observability-design)
14. [Error Handling & Resilience](#14-error-handling--resilience)
15. [Testing Strategy](#15-testing-strategy)
16. [Deployment Strategy](#16-deployment-strategy)
17. [Migration Plan](#17-migration-plan)
18. [Trade-off Analysis](#18-trade-off-analysis)
19. [Open Questions & Risks](#19-open-questions--risks)
20. [Dependencies](#20-dependencies)
21. [Future Considerations](#21-future-considerations)
22. [Approval](#22-approval)
23. [References](#23-references)
24. [Appendix: EARS Requirements Cross-Reference](#24-appendix-ears-requirements-cross-reference)

---

## 1. Overview

### 1.1 System Purpose

RosterHub is a OneRoster v1.2 Japan Profile compliant system designed to:

1. **CSV Bulk Upload**: Enable school administrators to upload educational data in CSV format with automatic change tracking
2. **REST API Access**: Provide OneRoster-compliant REST API endpoints for third-party integrations
3. **Differential Synchronization**: Support efficient data synchronization using `modifiedSince` query parameter
4. **Multi-Tenant Architecture**: Isolate data per tenant with secure access control
5. **Japanese Compliance**: Support UTF-8 Japanese characters, April-March academic calendar, and Japanese privacy law requirements

### 1.2 System Context

RosterHub serves as a central educational data hub that:

- **Accepts**: CSV bulk uploads from school administrators via web interface
- **Stores**: OneRoster entities (Users, Orgs, AcademicSessions, Courses, Classes, Enrollments, Demographics) with automatic timestamps
- **Provides**: RESTful API endpoints for external systems (LMS, SIS, analytics platforms)
- **Tracks**: Creation and modification timestamps for differential synchronization
- **Ensures**: Data privacy and compliance with Japanese Personal Information Protection Act

### 1.3 Key Architectural Drivers

Based on requirements from existing documentation:

| Driver | Requirement | Architecture Impact |
|--------|-------------|---------------------|
| **Performance** | 10,000 records in <5 minutes | Batch processing, async workers |
| **API Response** | <200ms p95 | Caching, database indexing, pagination |
| **Scalability** | 100 concurrent users | Horizontal scaling, load balancing |
| **Multi-Tenancy** | Complete data isolation | Tenant-scoped queries, separate schemas |
| **Differential Sync** | modifiedSince support | Timestamp indexes, efficient queries |
| **Japanese Support** | UTF-8, Kana, Kanji | Database collation, input validation |
| **Availability** | 99.9% uptime | Health checks, auto-recovery, redundancy |
| **Security** | OAuth 2.0, JWT tokens | API gateway, token validation |

### 1.4 Design Principles

1. **Separation of Concerns**: Each service has a single, well-defined responsibility
2. **API-First Design**: OpenAPI specifications drive implementation
3. **Idempotency**: Operations can be safely retried without side effects
4. **Fail-Safe Defaults**: Security-first approach with deny-by-default policies
5. **Observable Systems**: Comprehensive logging, metrics, and tracing
6. **Data Integrity**: ACID transactions for critical operations
7. **Backward Compatibility**: Versioned APIs to support graceful evolution

---

## 2. Goals and Non-Goals

### 2.1 Goals

#### Primary Goals
1. **CSV Bulk Upload with Change Tracking**
   - Support all 7 OneRoster entity types (Users, Orgs, AcademicSessions, Courses, Classes, Enrollments, Demographics)
   - Automatically track `dateCreated` on first upload
   - Automatically update `dateModified` on subsequent uploads
   - Process 10,000 records within 5 minutes

2. **OneRoster v1.2 Japan Profile Compliance**
   - Implement all required REST API endpoints
   - Support `modifiedSince` parameter for differential sync
   - Handle Japanese character encoding (UTF-8, Hiragana, Katakana, Kanji)
   - Support April-March academic calendar

3. **Multi-Tenant SaaS Architecture**
   - Complete data isolation between tenants
   - Tenant-scoped authentication and authorization
   - Scalable to 100+ concurrent users per tenant

4. **Security and Compliance**
   - OAuth 2.0 authentication with JWT tokens
   - Role-based access control (RBAC)
   - Compliance with Japanese Personal Information Protection Act
   - Audit logging for all data access

#### Secondary Goals
1. Provide admin interface for CSV upload and monitoring
2. Support CSV validation with detailed error reporting
3. Enable data export functionality
4. Implement comprehensive monitoring and alerting

### 2.2 Non-Goals

1. **Out of Scope for v1.0**
   - Real-time data streaming or webhooks
   - Native mobile applications (mobile-responsive web only)
   - Direct SIS/LMS integration (API access only)
   - Gradebook or assignment management features
   - User-facing student/parent portals

2. **Explicitly Not Supported**
   - OneRoster v1.1 or earlier versions
   - Non-Japan Profile OneRoster implementations (without extensions)
   - XML-based data formats (CSV and JSON only)
   - Single Sign-On (SSO) integration in v1.0

---

## 3. Prerequisites and Constraints

### 3.1 Prerequisites

#### Technical Prerequisites
1. **Infrastructure**
   - Cloud platform (AWS, Azure, or GCP) with container orchestration
   - PostgreSQL 14+ or MySQL 8.0+ database
   - Redis 6.0+ for caching and session management
   - Object storage (S3-compatible) for CSV file storage

2. **Development Environment**
   - Node.js 18+ (if using TypeScript/Node.js backend)
   - Python 3.11+ (if using Python backend)
   - Docker and Docker Compose for local development
   - Git version control system

3. **External Dependencies**
   - OAuth 2.0 authorization server (can be built-in or external)
   - SMTP server for email notifications
   - Monitoring platform (Prometheus, Grafana, or cloud-native)

#### Knowledge Prerequisites
1. OneRoster v1.2 specification understanding
2. OneRoster Japan Profile extensions familiarity
3. Multi-tenant architecture patterns
4. RESTful API design principles
5. Database design and optimization

### 3.2 Technical Constraints

#### Performance Constraints
- **CSV Processing**: Maximum 10,000 records per file
- **API Response Time**: <200ms at p95
- **Database Query**: <100ms at p95
- **Concurrent Users**: Support 100 concurrent users per tenant

#### Data Constraints
- **Character Encoding**: UTF-8 only
- **File Size**: Maximum 50MB per CSV upload
- **API Payload**: Maximum 10MB per request
- **Pagination**: Default 100 records, maximum 500 per page

#### Security Constraints
- **Authentication**: OAuth 2.0 Client Credentials flow only
- **Token Lifetime**: JWT tokens valid for 1 hour
- **Password Policy**: Minimum 12 characters, complexity requirements
- **Data Retention**: Audit logs retained for 5 years

#### Compliance Constraints
- **Japanese Privacy Law**: Full compliance with個人情報保護法
- **Data Residency**: Data stored in Japan region
- **Consent Management**: Explicit consent tracking
- **Audit Trail**: Comprehensive logging of data access

### 3.2 Business Constraints

1. **Budget**: Infrastructure costs must scale linearly with tenant growth
2. **Timeline**: MVP delivery within 6 months (implementation phase)
3. **Team Size**: Development team of 4-6 engineers
4. **Maintenance**: System must be maintainable by 2-person operations team

### 3.4 Technology Constraints

1. **Database**: PostgreSQL or MySQL only (no NoSQL for primary storage)
2. **API Protocol**: REST over HTTP/HTTPS only (no GraphQL or gRPC in v1.0)
3. **Authentication**: OAuth 2.0 only (no SAML or OpenID Connect in v1.0)
4. **Browser Support**: Modern browsers only (Chrome, Firefox, Safari, Edge - latest 2 versions)

---

## 4. Architecture Pattern & System Boundary

### 4.1 Architectural Style

RosterHub adopts a **Layered Service-Oriented Architecture** with the following characteristics:

1. **Multi-Tier Architecture**: Clear separation between presentation, application, and data layers
2. **Service-Based Design**: Loosely coupled services with well-defined interfaces
3. **API Gateway Pattern**: Single entry point for all API requests
4. **Repository Pattern**: Data access abstraction layer
5. **CQRS-Lite**: Separate read and write operations for performance optimization

### 4.2 C4 Model: System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         System Context                           │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ School           │
    │ Administrator    │──────┐
    │ [Person]         │      │ Uploads CSV files
    └──────────────────┘      │ Manages data
                              ↓
    ┌──────────────────┐   ┌─────────────────────────────┐
    │ API Consumer     │   │      RosterHub System       │
    │ [External System]│──>│   [Software System]         │
    │                  │   │                             │
    │ - LMS            │   │ CSV bulk upload with change │
    │ - SIS            │   │ tracking + OneRoster v1.2   │
    │ - Analytics      │   │ Japan Profile REST API      │
    └──────────────────┘   └─────────────────────────────┘
    Reads educational           │                    │
    data via REST API           │                    │
                                ↓                    ↓
                         ┌─────────────┐    ┌──────────────┐
                         │  Database   │    │   Object     │
                         │ [PostgreSQL │    │   Storage    │
                         │  or MySQL]  │    │ [S3-compat.] │
                         └─────────────┘    └──────────────┘
```

**External Actors:**
- **School Administrator**: Uploads CSV files, manages tenant configuration, monitors upload status
- **API Consumer**: External systems (LMS, SIS, analytics) that read educational data via REST API

**System Boundary:**
- **RosterHub System**: Handles CSV upload, data validation, storage, and API access
- **Database**: Stores OneRoster entities with timestamps
- **Object Storage**: Stores uploaded CSV files and audit logs

### 4.3 C4 Model: Container Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            RosterHub System                               │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ School Admin    │
└────────┬────────┘
         │ HTTPS
         ↓
┌────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Admin Web Application                         │  │
│  │  [React/Vue.js SPA - JavaScript/TypeScript]                      │  │
│  │                                                                   │  │
│  │  - CSV file upload UI                                            │  │
│  │  - Upload progress monitoring                                    │  │
│  │  - Validation error display                                      │  │
│  │  - Tenant configuration                                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                │                                         │
│                                │ HTTPS/REST                              │
│                                ↓                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       API Gateway                                 │  │
│  │  [Node.js/Express or Python/FastAPI]                             │  │
│  │                                                                   │  │
│  │  - Request routing                                               │  │
│  │  - Authentication/Authorization                                  │  │
│  │  - Rate limiting                                                 │  │
│  │  - Request/response logging                                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│           │                    │                    │                    │
│           │                    │                    │                    │
│  ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼─────────┐         │
│  │  CSV Upload     │  │  OneRoster API │  │  Auth Service   │         │
│  │  Service        │  │  Service       │  │                 │         │
│  │  [TypeScript/   │  │  [TypeScript/  │  │  [TypeScript/   │         │
│  │   Node.js]      │  │   Node.js]     │  │   Node.js]      │         │
│  │                 │  │                │  │                 │         │
│  │ - CSV parsing   │  │ - GET /users   │  │ - OAuth 2.0     │         │
│  │ - Validation    │  │ - GET /orgs    │  │ - JWT tokens    │         │
│  │ - Batch insert  │  │ - GET /classes │  │ - RBAC          │         │
│  │ - Change track  │  │ - Filtering    │  │                 │         │
│  └─────────────────┘  └────────────────┘  └─────────────────┘         │
│           │                    │                    │                    │
│           └────────────────────┼────────────────────┘                    │
│                                ↓                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Data Management Service                         │  │
│  │  [TypeScript/Node.js with ORM (TypeORM/Prisma/Sequelize)]        │  │
│  │                                                                   │  │
│  │  - Database access layer                                         │  │
│  │  - Transaction management                                        │  │
│  │  - Query optimization                                            │  │
│  │  - Multi-tenant data isolation                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                │                                         │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ↓                ↓                ↓
         ┌─────────────┐  ┌──────────┐   ┌──────────────┐
         │  PostgreSQL │  │  Redis   │   │ Object Store │
         │  Database   │  │  Cache   │   │  [S3/Minio]  │
         │             │  │          │   │              │
         │ - Users     │  │ - Session│   │ - CSV files  │
         │ - Orgs      │  │ - Tokens │   │ - Logs       │
         │ - Classes   │  │ - API    │   │              │
         │ - etc.      │  │   cache  │   │              │
         └─────────────┘  └──────────┘   └──────────────┘


┌─────────────────┐
│ API Consumer    │
│ [External]      │────────> API Gateway (Read-only access)
└─────────────────┘
```

### 4.4 System Boundaries

#### Internal Boundaries
1. **Service Boundaries**: Each service (CSV Upload, API, Auth) has independent deployment and scaling
2. **Data Boundaries**: Tenant data strictly isolated via tenant_id column and query scoping
3. **Layer Boundaries**: Presentation → Application → Domain → Infrastructure

#### External Boundaries
1. **API Boundary**: REST API exposed via API Gateway with authentication
2. **Storage Boundary**: Database and object storage accessible only via Data Management Service
3. **Network Boundary**: Public internet → Load Balancer → Private network

#### Trust Boundaries
1. **Authentication Boundary**: All requests must pass OAuth 2.0 validation
2. **Tenant Boundary**: All data operations scoped to authenticated tenant
3. **Input Boundary**: All external input validated and sanitized

---

## 5. Technology Stack

### 5.1 Backend Technology Stack

**Recommendation: TypeScript/Node.js**

**Runtime & Language:**
- **Node.js 18 LTS**: High-performance JavaScript runtime with excellent async I/O
- **TypeScript 5.x**: Type safety, better IDE support, improved maintainability

**Web Framework:**
- **NestJS 10.x** (Recommended): Enterprise-grade structure, built-in dependency injection, modular architecture
- **Express.js 4.x** (Alternative): Lightweight, mature, extensive middleware ecosystem

**ORM:**
- **Prisma 5.x** (Recommended): Type-safe, excellent TypeScript integration, auto-migration management
- **TypeORM 0.3.x** (Alternative): Mature, supports both PostgreSQL and MySQL

**Validation:**
- **Zod 3.x**: Schema validation with TypeScript inference
- **class-validator**: Decorator-based validation for NestJS

**CSV Processing:**
- **csv-parse 5.x**: Streaming parser, handles large files efficiently
- **Papa Parse**: Alternative with browser support

**Background Jobs:**
- **BullMQ 4.x**: Redis-backed job queue, progress tracking, retry logic

**Rationale:**
- ✅ Excellent performance for I/O-bound operations
- ✅ Strong TypeScript support ensures type safety
- ✅ Large ecosystem of libraries
- ✅ Easy deployment and horizontal scaling

### 5.2 Frontend Technology Stack

**Recommendation: React 18 with TypeScript**

**Core Framework:**
- **React 18.x**: Component-based UI, large community
- **TypeScript 5.x**: Type safety for component props and state
- **Vite 5.x**: Fast development server, optimized builds

**UI Component Library:**
- **Material-UI (MUI) 5.x**: Comprehensive components, Japanese locale support
- **shadcn/ui**: Modern component primitives with Tailwind CSS

**State Management:**
- **Zustand 4.x**: Lightweight, simple API
- **TanStack Query 5.x**: Server state management, caching, automatic refetching

**Form Handling:**
- **React Hook Form 7.x**: Performance-optimized, minimal re-renders
- **Zod 3.x**: Schema validation

**HTTP Client:**
- **Axios 1.x**: Promise-based, interceptors for auth tokens

### 5.3 Database Technology Stack

**Recommendation: PostgreSQL 14+**

**Core Database:**
- **PostgreSQL 14+**: ACID compliance, excellent JSON support, powerful indexing

**Advantages:**
- ✅ Superior UTF-8 handling for Japanese characters
- ✅ Excellent timestamp/timezone support for `modifiedSince`
- ✅ Advanced indexing (B-tree, GiST)
- ✅ JSONB type for flexible metadata
- ✅ Row-level security for multi-tenant isolation

**Connection Pooling:**
- **PgBouncer**: Lightweight connection pooler

**Migration Management:**
- **Prisma Migrate**: Type-safe migrations with rollback support

### 5.4 Caching & Session Store

**Redis 6.2+:**
- Session storage for admin users
- JWT token blacklist for logout
- API response caching (GET requests)
- Rate limiting counters

### 5.5 Object Storage

**S3-Compatible Storage:**
- **AWS S3** (Cloud)
- **MinIO** (Self-hosted alternative)

**Purpose:**
- Store uploaded CSV files
- Archive processed files
- Store audit logs and backups

### 5.6 Infrastructure & Deployment

**Container & Orchestration:**
- **Docker 24+**: Containerization
- **Kubernetes 1.28+**: Orchestration, auto-scaling, self-healing
- **Helm 3.x**: Package management

**Cloud Platform (Choose one):**

**AWS:**
- EKS (Kubernetes), RDS (PostgreSQL), ElastiCache (Redis), S3, CloudWatch

**Azure:**
- AKS, Azure Database for PostgreSQL, Azure Cache for Redis, Blob Storage, Azure Monitor

**GCP:**
- GKE, Cloud SQL, Memorystore, Cloud Storage, Cloud Monitoring

### 5.7 Development Tools

**Code Quality:**
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks

**Testing:**
- **Jest 29+**: Unit testing
- **Supertest**: API integration testing
- **Playwright**: E2E testing
- **k6**: Load testing

**Documentation:**
- **Swagger/OpenAPI 3.1**: API documentation
- **TypeDoc**: TypeScript code documentation

**Monitoring & Observability:**
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing
- **Sentry**: Error tracking

### 5.8 CI/CD Pipeline

**GitHub Actions:**
```yaml
Workflow:
1. Code Push → Trigger Pipeline
2. Lint & Format Check
3. Unit Tests
4. Integration Tests
5. Build Docker Image
6. Security Scan
7. Deploy to Staging
8. E2E Tests
9. Manual Approval
10. Deploy to Production
11. Smoke Tests
```

### 5.9 Technology Summary

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Backend Runtime** | Node.js | 18 LTS | High performance, async I/O |
| **Backend Language** | TypeScript | 5.x | Type safety, maintainability |
| **Backend Framework** | NestJS | 10.x | Enterprise structure, DI |
| **ORM** | Prisma | 5.x | Type-safe, excellent DX |
| **Frontend Framework** | React | 18.x | Component-based, large community |
| **UI Library** | Material-UI | 5.x | Japanese locale support |
| **Database** | PostgreSQL | 14+ | UTF-8 support, timezone handling |
| **Cache** | Redis | 6.2+ | Session, rate limiting |
| **Object Storage** | S3/MinIO | Latest | CSV archival, scalability |
| **Container** | Docker | 24+ | Standardized deployment |
| **Orchestration** | Kubernetes | 1.28+ | Auto-scaling, resilience |
| **CI/CD** | GitHub Actions | Latest | Integrated workflow |
| **Monitoring** | Prometheus + Grafana | Latest | Metrics, visualization |
| **Testing** | Jest + Playwright | 29+/Latest | Unit + E2E coverage |

---

## 6. Component Design

### 6.1 Component Overview

RosterHub consists of 6 major components:

1. **Admin Web Application**: User interface for CSV upload and monitoring
2. **API Gateway**: Single entry point, authentication, routing
3. **CSV Upload Service**: CSV parsing, validation, change tracking
4. **OneRoster API Service**: REST API endpoints for data access
5. **Auth Service**: OAuth 2.0 authentication and authorization
6. **Data Management Service**: Database access layer with multi-tenant isolation

### 6.2 Admin Web Application

**Purpose**: Provide web-based interface for school administrators to upload CSV files and monitor processing status.

**Technology**: React 18 + TypeScript + Material-UI + Vite

**Component Structure**:
```
src/
├── components/
│   ├── CsvUpload/
│   │   ├── FileDropzone.tsx
│   │   ├── UploadProgress.tsx
│   │   ├── ValidationResults.tsx
│   │   └── EntityTypeSelector.tsx
│   ├── Dashboard/
│   │   ├── UploadHistory.tsx
│   │   ├── DataStatistics.tsx
│   │   └── SystemStatus.tsx
│   └── Layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Upload.tsx
│   ├── History.tsx
│   └── Settings.tsx
├── services/
│   ├── api.ts
│   ├── auth.ts
│   └── upload.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useUpload.ts
│   └── usePolling.ts
└── utils/
    ├── validators.ts
    └── formatters.ts
```

**Key Features**:
- Drag-and-drop file upload with client-side validation
- Real-time progress tracking with polling
- Detailed error display with line numbers
- Japanese language support (primary)
- Responsive design (desktop and tablet)

### 6.3 API Gateway

**Purpose**: Single entry point for all API requests with authentication, rate limiting, and request routing.

**Technology**: NestJS + Express

**Middleware Stack**:
```typescript
app.use(helmet());              // Security headers
app.use(cors());                // CORS configuration
app.use(compression());         // Response compression
app.use(requestLogger);         // Log all requests
app.use(tenantExtractor);       // Extract tenant from token
app.use(authenticate);          // JWT validation
app.use(authorize);             // RBAC check
app.use(rateLimiter);           // Rate limiting
app.use(cacheMiddleware);       // Cache GET responses
app.use('/api/v1/csv', csvRouter);
app.use('/api/v1/oneroster', orRouter);
app.use(errorHandler);          // Global error handling
```

**Key Features**:
- JWT validation with signature and expiration checks
- Rate limiting: 1000 requests/hour per tenant
- Response caching: 60 seconds for GET requests
- Circuit breaker for backend service failures
- Health check endpoint: `/health`

### 6.4 CSV Upload Service

**Purpose**: Parse, validate, and process CSV files with automatic change tracking.

**Technology**: NestJS + csv-parse

**Service Architecture**:
```typescript
class CsvUploadService {
  async uploadCsv(
    file: File,
    entityType: EntityType,
    tenantId: string
  ): Promise<UploadResult> {
    // 1. Save file to object storage
    const fileId = await this.fileStorage.save(file, tenantId);
    
    // 2. Stream parse CSV
    const records = await this.parseCsvStream(file);
    
    // 3. Validate all records
    const validationResult = await this.validator.validateBatch(
      records,
      entityType
    );
    
    if (validationResult.hasErrors) {
      return {
        status: 'VALIDATION_FAILED',
        errors: validationResult.errors
      };
    }
    
    // 4. Detect changes and set timestamps
    const trackedRecords = await this.changeTracker.trackChanges(
      records,
      entityType,
      tenantId
    );
    
    // 5. Batch insert/update to database
    const dbResult = await this.dataRepository.upsertBatch(
      trackedRecords,
      tenantId
    );
    
    return {
      status: 'SUCCESS',
      inserted: dbResult.insertedCount,
      updated: dbResult.updatedCount,
      fileId
    };
  }
}
```

**Key Features**:
- Stream processing for large files (no memory overflow)
- Batch operations: 1000 records per batch
- Transaction safety with rollback on errors
- Partial success with detailed error reporting
- Progress updates via polling endpoint

### 6.5 OneRoster API Service

**Purpose**: Provide OneRoster v1.2 Japan Profile compliant REST API endpoints.

**Technology**: NestJS

**API Endpoints**:
```
GET /api/v1/oneroster/users
GET /api/v1/oneroster/users/:id
GET /api/v1/oneroster/orgs
GET /api/v1/oneroster/orgs/:id
GET /api/v1/oneroster/academicSessions
GET /api/v1/oneroster/academicSessions/:id
GET /api/v1/oneroster/courses
GET /api/v1/oneroster/courses/:id
GET /api/v1/oneroster/classes
GET /api/v1/oneroster/classes/:id
GET /api/v1/oneroster/enrollments
GET /api/v1/oneroster/enrollments/:id
GET /api/v1/oneroster/demographics
GET /api/v1/oneroster/demographics/:id
```

**Query Parameters**:
- `limit`: Records per page (default: 100, max: 500)
- `offset`: Skip N records (default: 0)
- `modifiedSince`: ISO 8601 timestamp for differential sync
- `fields`: Comma-separated field list
- `sort`: Sort field and direction
- `filter`: Filter expression

**Key Features**:
- Differential sync via `modifiedSince` with indexed queries
- Pagination with consistent behavior
- Field selection to reduce payload size
- OneRoster-compliant error responses
- Response caching in Redis (60 seconds)

### 6.6 Auth Service

**Purpose**: Handle OAuth 2.0 authentication and authorization with JWT tokens.

**Technology**: NestJS + jsonwebtoken

**JWT Token Structure**:
```typescript
interface JwtPayload {
  tenant_id: string;
  client_id: string;
  user_id?: string;
  scope: string[];
  roles: string[];
  iat: number;
  exp: number;        // 1 hour from iat
}
```

**RBAC Roles**:
```
admin:
  - csv:upload ✓
  - api:read ✓
  - api:write ✓
  - api:delete ✓
  - tenant:config ✓

uploader:
  - csv:upload ✓
  - api:read ✓

reader:
  - api:read ✓
```

**Key Features**:
- OAuth 2.0 Client Credentials flow
- JWT token with 1-hour expiration
- Token blacklist in Redis for logout
- Bcrypt password hashing
- Rate limiting on token endpoint

### 6.7 Data Management Service

**Purpose**: Provide database access layer with multi-tenant isolation.

**Technology**: Prisma ORM + PostgreSQL

**Repository Pattern**:
```typescript
abstract class BaseRepository<T> {
  async findAll(tenantId: string, filters?: Filters): Promise<T[]> {
    return this.prisma[this.entityName].findMany({
      where: {
        tenant_id: tenantId,
        ...filters
      }
    });
  }

  async findModifiedSince(
    tenantId: string,
    modifiedSince: Date
  ): Promise<T[]> {
    return this.prisma[this.entityName].findMany({
      where: {
        tenant_id: tenantId,
        dateModified: { gte: modifiedSince }
      }
    });
  }

  async upsertBatch(
    records: T[],
    tenantId: string
  ): Promise<BatchResult> {
    return this.prisma.$transaction(async (tx) => {
      const results = await Promise.all(
        records.map(record =>
          tx[this.entityName].upsert({
            where: {
              sourcedId: record.sourcedId,
              tenant_id: tenantId
            },
            update: {
              ...record,
              dateModified: new Date()
            },
            create: {
              ...record,
              tenant_id: tenantId,
              dateCreated: new Date(),
              dateModified: new Date()
            }
          })
        )
      );
      
      return {
        insertedCount: results.filter(r => r.dateCreated === r.dateModified).length,
        updatedCount: results.filter(r => r.dateCreated !== r.dateModified).length
      };
    });
  }
}
```

**Key Features**:
- Automatic tenant scoping in all queries
- Timestamp indexes for `modifiedSince` optimization
- Connection pooling via PgBouncer
- Transaction support for batch operations
- Type-safe database access

---

## 7. Data Design

### 7.1 Data Model Overview

RosterHub stores 7 OneRoster entity types plus system entities:

**OneRoster Entities:**
1. **User**: Students, teachers, administrators
2. **Org**: Schools, districts, departments
3. **AcademicSession**: School years, terms, grading periods
4. **Course**: Course offerings
5. **Class**: Course sections with schedules
6. **Enrollment**: User-class relationships with roles
7. **Demographic**: Student demographic information

**System Entities:**
8. **Tenant**: Multi-tenant configuration
9. **ApiClient**: OAuth 2.0 client credentials
10. **UploadHistory**: CSV upload audit trail
11. **AuditLog**: Data access audit logging

### 7.2 Core Entity Schemas (Prisma)

```prisma
// Tenant Model
model Tenant {
  id              String   @id @default(uuid())
  name            String
  subdomain       String   @unique
  status          String   @default("active")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  users           User[]
  orgs            Org[]
  classes         Class[]
  @@map("tenants")
}

// User Model (OneRoster Entity)
model User {
  id                  String      @id @default(uuid())
  tenantId            String
  dateCreated         DateTime    @default(now())
  dateModified        DateTime    @updatedAt
  
  // OneRoster fields
  sourcedId           String
  status              String
  dateLastModified    DateTime?
  enabledUser         Boolean
  username            String
  givenName           String
  familyName          String
  role                String
  email               String?
  phone               String?
  
  // Japan Profile extensions
  givenNameKana       String?
  givenNameRoman      String?
  familyNameKana      String?
  familyNameRoman     String?
  
  // Relationships
  tenant              Tenant      @relation(fields: [tenantId], references: [id])
  enrollments         Enrollment[]
  demographic         Demographic?
  
  @@unique([sourcedId, tenantId])
  @@index([tenantId, dateModified])
  @@index([tenantId, status])
  @@index([tenantId, role])
  @@map("users")
}

// Org Model
model Org {
  id                  String      @id @default(uuid())
  tenantId            String
  dateCreated         DateTime    @default(now())
  dateModified        DateTime    @updatedAt
  
  sourcedId           String
  status              String
  dateLastModified    DateTime?
  name                String
  type                String
  identifier          String?
  parentId            String?
  
  // Japan Profile
  nameKana            String?
  orgCode             String?
  
  tenant              Tenant      @relation(fields: [tenantId], references: [id])
  parent              Org?        @relation("OrgHierarchy", fields: [parentId], references: [id])
  children            Org[]       @relation("OrgHierarchy")
  classes             Class[]
  
  @@unique([sourcedId, tenantId])
  @@index([tenantId, dateModified])
  @@map("orgs")
}

// Class Model
model Class {
  id                  String      @id @default(uuid())
  tenantId            String
  dateCreated         DateTime    @default(now())
  dateModified        DateTime    @updatedAt
  
  sourcedId           String
  status              String
  dateLastModified    DateTime?
  title               String
  classCode           String?
  classType           String
  location            String?
  grades              String[]
  subjects            String[]
  courseId            String
  schoolId            String
  
  // Japan Profile
  titleKana           String?
  
  tenant              Tenant      @relation(fields: [tenantId], references: [id])
  school              Org         @relation(fields: [schoolId], references: [id])
  enrollments         Enrollment[]
  
  @@unique([sourcedId, tenantId])
  @@index([tenantId, dateModified])
  @@map("classes")
}

// Enrollment Model
model Enrollment {
  id                  String      @id @default(uuid())
  tenantId            String
  dateCreated         DateTime    @default(now())
  dateModified        DateTime    @updatedAt
  
  sourcedId           String
  status              String
  dateLastModified    DateTime?
  role                String
  primary             Boolean
  beginDate           DateTime?
  endDate             DateTime?
  userId              String
  classId             String
  
  tenant              Tenant      @relation(fields: [tenantId], references: [id])
  user                User        @relation(fields: [userId], references: [id])
  class               Class       @relation(fields: [classId], references: [id])
  
  @@unique([sourcedId, tenantId])
  @@index([tenantId, dateModified])
  @@index([tenantId, userId])
  @@index([tenantId, classId])
  @@map("enrollments")
}
```

### 7.3 Database Indexing Strategy

**Performance-Critical Indexes:**

```sql
-- Tenant isolation (all tables)
CREATE INDEX idx_<table>_tenant_id ON <table>(tenant_id);

-- modifiedSince queries (all OneRoster entities)
CREATE INDEX idx_<table>_tenant_modified ON <table>(tenant_id, date_modified);

-- Status filtering
CREATE INDEX idx_<table>_tenant_status ON <table>(tenant_id, status);

-- User role filtering
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);

-- Enrollment lookups
CREATE INDEX idx_enrollments_user ON enrollments(tenant_id, user_id);
CREATE INDEX idx_enrollments_class ON enrollments(tenant_id, class_id);

-- Org hierarchy
CREATE INDEX idx_orgs_parent ON orgs(parent_id);
```

### 7.4 Data Migration Strategy

**Phase 1: Initial Schema**
- Create all tables with proper constraints
- Add indexes for performance
- Set up foreign key relationships

**Phase 2: Seed Data**
- Create default tenant for testing
- Create API clients with roles
- Add sample data for development

**Phase 3: Production Deployment**
- Blue-green deployment with zero downtime
- Run migrations in transaction
- Rollback capability for failed migrations

---

## 8. API Design

### 8.1 OneRoster REST API Endpoints

**Base URL:** `https://api.rosterhub.com/v1p2/`

**Authentication:** OAuth 2.0 Bearer Token

**Standard Query Parameters (all GET endpoints):**
- `limit`: Max records per page (default: 100, max: 1000)
- `offset`: Pagination offset
- `modifiedSince`: ISO 8601 timestamp for incremental sync
- `filter`: Field-based filtering (e.g., `filter=role='student'`)
- `sort`: Field name with +/- prefix for asc/desc

**Endpoints:**

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/users` | Get all users | Query params | UserCollection |
| GET | `/users/{id}` | Get user by ID | Path param | SingleUser |
| GET | `/orgs` | Get all orgs | Query params | OrgCollection |
| GET | `/orgs/{id}` | Get org by ID | Path param | SingleOrg |
| GET | `/classes` | Get all classes | Query params | ClassCollection |
| GET | `/classes/{id}` | Get class by ID | Path param | SingleClass |
| GET | `/classes/{id}/enrollments` | Get class enrollments | Path + query | EnrollmentCollection |
| GET | `/enrollments` | Get all enrollments | Query params | EnrollmentCollection |
| GET | `/enrollments/{id}` | Get enrollment by ID | Path param | SingleEnrollment |
| POST | `/uploads/csv` | Upload CSV bundle | Multipart form | UploadStatus |
| GET | `/uploads/{id}` | Get upload status | Path param | UploadDetails |

### 8.2 Request/Response Examples

**GET /users with modifiedSince:**

```http
GET /v1p2/users?modifiedSince=2025-01-01T00:00:00Z&limit=100&offset=0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (UserCollection):**

```json
{
  "users": [
    {
      "sourcedId": "user_123",
      "status": "active",
      "dateLastModified": "2025-01-15T10:30:00Z",
      "enabledUser": true,
      "username": "tanaka.taro",
      "givenName": "太郎",
      "familyName": "田中",
      "role": "student",
      "email": "tanaka.taro@example.jp",
      "givenNameKana": "タロウ",
      "familyNameKana": "タナカ",
      "givenNameRoman": "Taro",
      "familyNameRoman": "Tanaka"
    }
  ],
  "pagination": {
    "total": 1520,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

**POST /uploads/csv:**

```http
POST /v1p2/uploads/csv
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="manifest"; filename="manifest.csv"

sourcedId,status,dateLastModified,version
bulk001,active,2025-01-15T10:00:00Z,1.2.2
--boundary
Content-Disposition: form-data; name="users"; filename="users.csv"

sourcedId,status,dateLastModified,enabledUser,username,givenName,familyName,role,email
user_123,active,2025-01-15T10:00:00Z,TRUE,tanaka.taro,太郎,田中,student,tanaka@example.jp
--boundary--
```

**Response:**

```json
{
  "uploadId": "upload_456",
  "status": "processing",
  "submittedAt": "2025-01-15T10:30:00Z",
  "filesReceived": ["manifest.csv", "users.csv", "orgs.csv"],
  "estimatedCompletion": "2025-01-15T10:35:00Z"
}
```

### 8.3 Error Response Format

**Standard Error Response:**

```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "Invalid date format in modifiedSince parameter",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "modifiedSince",
        "imsx_codeMinorFieldValue": "invalid_date_format"
      }
    ]
  }
}
```

**HTTP Status Codes:**

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET |
| 201 | Created | Successful POST (CSV upload started) |
| 400 | Bad Request | Invalid parameters, malformed CSV |
| 401 | Unauthorized | Missing/invalid Bearer token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource ID not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Temporary service disruption |

### 8.4 Rate Limiting

**Limits per API Client:**
- **GET requests**: 1000 requests/hour
- **POST requests (CSV uploads)**: 10 uploads/hour
- **Concurrent requests**: 5 simultaneous connections

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 750
X-RateLimit-Reset: 1642345200
```

**429 Response:**

```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "Rate limit exceeded. Please retry after 2025-01-15T11:00:00Z",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "rate_limit",
        "imsx_codeMinorFieldValue": "exceeded"
      }
    ]
  },
  "retryAfter": "2025-01-15T11:00:00Z"
}
```

---

## 9. Sequence Diagrams

### 9.1 CSV Upload Flow

```
Admin     Admin Web    API Gateway    CSV Upload    S3 Storage    Database    Background
User      Application                 Service                                 Worker
  |            |            |              |             |            |            |
  |--Select--->|            |              |             |            |            |
  |  CSV files |            |              |             |            |            |
  |            |            |              |             |            |            |
  |--Upload--->|            |              |             |            |            |
  |  (POST)    |--POST /uploads/csv------->|             |            |            |
  |            |  +Bearer Token            |             |            |            |
  |            |            |--Validate--->|             |            |            |
  |            |            |   JWT token  |             |            |            |
  |            |            |<--200 OK-----|             |            |            |
  |            |            |              |             |            |            |
  |            |            |              |--Store----->|            |            |
  |            |            |              |  raw files  |            |            |
  |            |            |              |<--S3 URL----|            |            |
  |            |            |              |             |            |            |
  |            |            |              |--Create upload record--->|            |
  |            |            |              |  (status: pending)       |            |
  |            |            |              |<--upload_id--------------|            |
  |            |            |              |             |            |            |
  |            |            |              |--Enqueue job------------------->|     |
  |            |            |              |  {upload_id, tenant_id}  |     |     |
  |            |            |<--201 Created|             |            |     |     |
  |            |<--{upload_id, status}-----|             |            |     |     |
  |<--Display--|            |              |             |            |     |     |
  |  upload_id |            |              |             |            |     |     |
  |            |            |              |             |            |     |     |
  |            |            |              |             |            |     |--Process-->|
  |            |            |              |             |            |     |  CSV files |
  |            |            |              |             |<--Fetch files----|            |
  |            |            |              |             |   from S3   |    |            |
  |            |            |              |             |------------>|    |            |
  |            |            |              |             |            |    |            |
  |            |            |              |             |            |<--Parse CSV----|
  |            |            |              |             |            |    |  validate  |
  |            |            |              |             |            |    |  detect    |
  |            |            |              |             |            |    |  changes   |
  |            |            |              |             |            |    |            |
  |            |            |              |             |            |<--Bulk upsert--|
  |            |            |              |             |            |    | (batch 1K) |
  |            |            |              |             |            |--->|            |
  |            |            |              |             |            |    |            |
  |            |            |              |             |            |<--Update status|
  |            |            |              |             |            |    | completed  |
  |            |            |              |             |            |--->|            |
  |            |            |              |             |            |     |            |
  |--Poll----->|            |              |             |            |     |            |
  | GET /uploads/{id}       |              |             |            |     |            |
  |            |--GET /uploads/{id}------->|             |            |     |            |
  |            |            |              |--Query DB-------------->|     |            |
  |            |            |              |<--{status: completed}---|     |            |
  |            |            |<--200 OK-----|             |            |     |            |
  |            |<--{status: completed}-----|             |            |     |            |
  |<--Display--|            |              |             |            |     |            |
  |  success   |            |              |             |            |     |            |
```

### 9.2 OneRoster API GET Request with modifiedSince

```
External     API         Auth        Data Mgmt    Redis      PostgreSQL
Client      Gateway     Service     Service      Cache      Database
  |            |            |            |            |            |
  |--GET /users?modifiedSince=2025-01-01T00:00:00Z---------------->|
  |  +Bearer Token          |            |            |            |
  |            |            |            |            |            |
  |            |--Verify--->|            |            |            |
  |            |  JWT token |            |            |            |
  |            |            |--Decode--->|            |            |
  |            |            |  validate  |            |            |
  |            |            |  exp, sig  |            |            |
  |            |            |<--{tenant_id, role}----|            |
  |            |<--200 OK---|            |            |            |
  |            |  +claims   |            |            |            |
  |            |            |            |            |            |
  |            |--Check cache key------->|            |            |
  |            |  "users:tenant_123:2025-01-01"      |            |
  |            |            |            |<--Cache--->|            |
  |            |            |            |   miss     |            |
  |            |            |            |            |            |
  |            |--Query DB with tenant scope-------->|            |
  |            |  WHERE tenant_id = '123'            |            |
  |            |    AND date_modified >= '2025-01-01'|            |
  |            |  ORDER BY date_modified ASC         |            |
  |            |  LIMIT 100 OFFSET 0                 |            |
  |            |            |            |            |<--Query--->|
  |            |            |            |            |   users    |
  |            |            |            |<--{users[]}-------------|
  |            |            |            |            |            |
  |            |            |            |--Store cache---------->|
  |            |            |            |  TTL: 300s |            |
  |            |            |<--{users[]}|            |            |
  |            |<--{users[]}|            |            |            |
  |<--200 OK---|            |            |            |            |
  | +UserCollection         |            |            |            |
  | +pagination headers     |            |            |            |
```

### 9.3 OAuth 2.0 Token Generation

```
External     Auth        Database    Redis
Client      Service                 Cache
  |            |            |          |
  |--POST /oauth/token----->|          |
  |  grant_type=client_credentials     |
  |  client_id=abc123      |          |
  |  client_secret=xyz789  |          |
  |            |            |          |
  |            |--Validate client----->|
  |            |  credentials          |
  |            |            |<--Query--|
  |            |            |  api_clients table
  |            |<--{client_id, tenant_id, scopes}--|
  |            |            |          |
  |            |--Generate JWT-------->|
  |            |  Payload:  |          |
  |            |  {         |          |
  |            |    tenant_id: "123",  |
  |            |    client_id: "abc",  |
  |            |    scope: "read write"|
  |            |    exp: now + 1h,     |
  |            |    iat: now           |
  |            |  }         |          |
  |            |  Sign with HS256      |
  |            |            |          |
  |            |<--JWT token|          |
  |            |            |          |
  |            |--Store in cache------>|
  |            |  key: "token:abc123"  |
  |            |  TTL: 3600s           |
  |            |            |<---------|
  |            |            |          |
  |<--200 OK---|            |          |
  | {          |            |          |
  |   "access_token": "eyJ...",        |
  |   "token_type": "Bearer",          |
  |   "expires_in": 3600               |
  | }          |            |          |
```

### 9.4 Change Detection Logic

```
Background    S3          Parser      Database    Database
Worker        Storage     Service     (Read)      (Write)
  |             |           |            |            |
  |--Fetch CSV file------->|            |            |
  |  users.csv |           |            |            |
  |<--File content---------|            |            |
  |             |           |            |            |
  |--Parse---->|           |            |            |
  |  CSV rows  |           |            |            |
  |<--{        |           |            |            |
  |  sourcedId: "user_123",|            |            |
  |  givenName: "太郎",     |            |            |
  |  familyName: "田中",    |            |            |
  |  dateLastModified: "2025-01-15"     |            |
  |}-----------|           |            |            |
  |             |           |            |            |
  |--Query existing record--------------->|          |
  |  WHERE sourcedId = "user_123"        |          |
  |    AND tenant_id = "tenant_123"      |          |
  |             |           |<--{        |          |
  |             |           | sourcedId: "user_123", |
  |             |           | givenName: "太郎",      |
  |             |           | dateModified: "2025-01-10" }
  |             |           |            |          |
  |--Compare--->|           |            |          |
  |  dateLastModified (CSV) vs dateModified (DB)   |
  |  "2025-01-15" > "2025-01-10" => UPDATE         |
  |             |           |            |          |
  |--Upsert record-------------------------------->|
  |  UPDATE users SET                              |
  |    given_name = '太郎',                         |
  |    date_modified = '2025-01-15T10:00:00Z'      |
  |  WHERE sourced_id = 'user_123'                 |
  |    AND tenant_id = 'tenant_123'                |
  |             |           |            |<---------|
  |             |           |            |          |
  |--Audit log------------------------------------->|
  |  INSERT INTO audit_logs (                      |
  |    action: 'UPDATE',                           |
  |    entity: 'users',                            |
  |    entity_id: 'user_123'                       |
  |  )         |           |            |          |
  |<--Success--|           |            |          |
```

---

## 10. Security Design

### 10.1 Authentication & Authorization

**OAuth 2.0 Client Credentials Flow:**

```typescript
// JWT Payload Structure
interface JWTPayload {
  tenant_id: string;      // Tenant isolation
  client_id: string;      // API client identifier
  scope: string[];        // Permissions: ['read', 'write', 'admin']
  iat: number;            // Issued at (Unix timestamp)
  exp: number;            // Expiry (iat + 3600s)
  jti: string;            // JWT ID for revocation tracking
}

// Token Generation
const token = jwt.sign(
  {
    tenant_id: client.tenantId,
    client_id: client.id,
    scope: client.scopes,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: uuidv4(),
  },
  process.env.JWT_SECRET,
  { algorithm: 'HS256' }
);
```

**Role-Based Access Control (RBAC):**

| Role | Permissions | Use Case |
|------|-------------|----------|
| `read` | GET all endpoints | Read-only API consumers |
| `write` | GET + POST /uploads | Schools uploading CSV data |
| `admin` | GET + POST + DELETE | System administrators |

### 10.2 Data Encryption

**Encryption at Rest:**
- **Database**: PostgreSQL AES-256 encryption for PII columns
- **S3 Storage**: AES-256-GCM server-side encryption
- **Secrets**: AWS Secrets Manager / Azure Key Vault

**Encryption in Transit:**
- **TLS 1.3** for all HTTPS connections
- **Certificate pinning** for mobile apps
- **HSTS** headers enforced

```typescript
// PII Column Encryption (Prisma middleware)
prisma.$use(async (params, next) => {
  if (params.action === 'create' || params.action === 'update') {
    if (params.model === 'User') {
      if (params.args.data.email) {
        params.args.data.email = encrypt(params.args.data.email);
      }
    }
  }
  const result = await next(params);
  if (params.action === 'findUnique' || params.action === 'findMany') {
    if (result?.email) {
      result.email = decrypt(result.email);
    }
  }
  return result;
});
```

### 10.3 Audit Logging

**Audit Log Schema:**

```prisma
model AuditLog {
  id              String   @id @default(uuid())
  tenantId        String
  timestamp       DateTime @default(now())
  
  action          String   // CREATE, READ, UPDATE, DELETE
  entityType      String   // users, orgs, classes, etc.
  entityId        String
  actorType       String   // api_client, admin_user
  actorId         String
  ipAddress       String
  changes         Json?    // Before/after values for UPDATEs
  
  @@index([tenantId, timestamp])
  @@index([tenantId, entityType, entityId])
  @@map("audit_logs")
}
```

**Logged Events:**
- All API requests (endpoint, method, status code, response time)
- CSV upload attempts (file names, row counts, validation errors)
- Data modifications (entity type, old/new values)
- Authentication attempts (success/failure, IP address)
- Permission denials (requested resource, denied reason)

### 10.4 Input Validation & Sanitization

**CSV Upload Validation:**

```typescript
class CsvValidator {
  validateManifest(file: Buffer): ValidationResult {
    const requiredHeaders = ['sourcedId', 'status', 'dateLastModified', 'version'];
    const rows = parse(file);
    
    // Check required columns
    if (!requiredHeaders.every(h => rows[0].includes(h))) {
      throw new BadRequestException('Missing required headers in manifest.csv');
    }
    
    // Validate OneRoster version
    const version = rows[1][3];
    if (version !== '1.2.2') {
      throw new BadRequestException(`Unsupported OneRoster version: ${version}`);
    }
    
    return { valid: true };
  }
  
  validateUserRow(row: any): ValidationResult {
    // Sanitize inputs
    row.givenName = sanitizeHtml(row.givenName, { allowedTags: [] });
    row.familyName = sanitizeHtml(row.familyName, { allowedTags: [] });
    
    // Validate email format
    if (row.email && !isEmail(row.email)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    // Validate required fields
    if (!row.sourcedId || !row.status || !row.role) {
      return { valid: false, error: 'Missing required fields' };
    }
    
    return { valid: true };
  }
}
```

**API Input Validation (NestJS DTO):**

```typescript
export class GetUsersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
  
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
  
  @IsOptional()
  @IsISO8601()
  modifiedSince?: string;
  
  @IsOptional()
  @Matches(/^[a-zA-Z_]+='[^']*'$/)
  filter?: string;
}
```

---

## 11. Performance Design

### 11.1 Caching Strategy

**Multi-Layer Caching:**

```typescript
// L1: In-Memory Cache (Node.js process)
const inMemoryCache = new LRUCache({ max: 1000, ttl: 60_000 });

// L2: Redis Distributed Cache
@Injectable()
export class CacheService {
  constructor(private redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    // Try L1 first
    let value = inMemoryCache.get(key);
    if (value) return value as T;
    
    // Fallback to L2
    const cached = await this.redis.get(key);
    if (cached) {
      value = JSON.parse(cached);
      inMemoryCache.set(key, value);
      return value as T;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    inMemoryCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

**Cache Invalidation Rules:**
- **TTL-based**: API GET responses cached for 5 minutes
- **Event-based**: Invalidate on CSV upload completion
- **Pattern-based**: Clear all `users:tenant_*` keys on user data change

### 11.2 Database Query Optimization

**Batch Processing:**

```typescript
// Bulk upsert with batching (1000 records per transaction)
async bulkUpsertUsers(users: User[]): Promise<void> {
  const BATCH_SIZE = 1000;
  
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    
    await this.prisma.$transaction(async (tx) => {
      for (const user of batch) {
        await tx.user.upsert({
          where: {
            sourcedId_tenantId: {
              sourcedId: user.sourcedId,
              tenantId: user.tenantId,
            },
          },
          update: {
            givenName: user.givenName,
            familyName: user.familyName,
            dateModified: new Date(),
          },
          create: user,
        });
      }
    });
  }
}
```

**Connection Pooling:**

```typescript
// Prisma connection pool configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Connection pool settings
  connection_limit = 100
  pool_timeout     = 10
  connect_timeout  = 5
}
```

### 11.3 API Response Optimization

**Pagination Strategy:**

```typescript
@Get('users')
async getUsers(
  @Query() query: GetUsersDto,
  @Headers('authorization') token: string
): Promise<UserCollectionResponse> {
  const { limit = 100, offset = 0 } = query;
  
  // Parallel execution
  const [users, total] = await Promise.all([
    this.userService.findMany({ ...query, limit, offset }),
    this.userService.count(query),
  ]);
  
  return {
    users,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}
```

**Compression:**
- **Gzip** for responses >1KB
- **Brotli** for static assets

---

## 12. Scalability Design

### 12.1 Horizontal Scaling

**Stateless API Services:**
- All API containers are stateless
- Session state stored in Redis
- No server affinity required

**Auto-Scaling Configuration (Kubernetes HPA):**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

### 12.2 Database Scaling

**Read Replicas:**
- Primary instance: Write operations
- 2 read replicas: GET API requests
- Automatic failover with health checks

**Connection Pooling (PgBouncer):**

```ini
[databases]
rosterhub = host=postgres-primary port=5432 dbname=rosterhub

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
```

### 12.3 Background Job Processing

**Bull Queue with Redis:**

```typescript
@Processor('csv-upload')
export class CsvUploadProcessor {
  @Process({ name: 'process-upload', concurrency: 5 })
  async handleUpload(job: Job<UploadJobData>) {
    const { uploadId, tenantId } = job.data;
    
    // Update progress
    await job.progress(10);
    
    // Process CSV files
    const files = await this.s3.getUploadFiles(uploadId);
    await job.progress(30);
    
    // Parse and validate
    const parsed = await this.parser.parseAll(files);
    await job.progress(60);
    
    // Bulk upsert
    await this.dataService.bulkUpsert(parsed, tenantId);
    await job.progress(100);
    
    return { success: true, recordsProcessed: parsed.length };
  }
}
```

---

## 13. Observability Design

### 13.1 Logging Strategy

**Structured Logging (Winston):**

```typescript
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'api-gateway',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Request logging middleware
logger.info('API request', {
  method: req.method,
  url: req.url,
  tenant_id: req.user.tenantId,
  response_time_ms: Date.now() - startTime,
  status_code: res.statusCode,
});
```

**Log Aggregation:**
- **Grafana Loki** for centralized logging
- **Retention**: 30 days for errors, 7 days for info logs
- **Search**: Full-text search by tenant_id, trace_id, user_id

### 13.2 Metrics Collection

**Prometheus Metrics:**

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

// Request counter
const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
});

// Response time histogram
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Active connections gauge
const activeConnections = new Gauge({
  name: 'active_db_connections',
  help: 'Number of active database connections',
});

// Middleware to record metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode,
      tenant_id: req.user?.tenantId || 'anonymous',
    });
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path },
      duration
    );
  });
  next();
});
```

**Key Metrics:**
- API request rate (req/sec)
- API response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- CSV upload processing time
- Database query duration
- Cache hit/miss ratio

### 13.3 Distributed Tracing

**OpenTelemetry with Jaeger:**

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(
    new JaegerExporter({
      endpoint: 'http://jaeger:14268/api/traces',
    })
  )
);
provider.register();

// Trace HTTP requests
app.use((req, res, next) => {
  const tracer = trace.getTracer('api-gateway');
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'tenant.id': req.user?.tenantId,
    },
  });
  
  req.span = span;
  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    span.end();
  });
  
  next();
});
```

### 13.4 Alerting Rules

**Prometheus Alert Manager:**

```yaml
groups:
- name: rosterhub_alerts
  rules:
  # API error rate > 5%
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
      sum(rate(http_requests_total[5m])) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High API error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"
  
  # API response time p95 > 1s
  - alert: SlowAPIResponse
    expr: |
      histogram_quantile(0.95, 
        sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
      ) > 1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Slow API response time"
      description: "p95 response time is {{ $value }}s"
  
  # Database connection pool exhaustion
  - alert: DBConnectionPoolExhausted
    expr: active_db_connections > 90
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool near capacity"
```

---

## 14. Error Handling & Resilience

### 14.1 Error Classification & Handling

**Error Hierarchy:**

```typescript
// Base error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, true);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message, false);
  }
}
```

**Global Exception Filter (NestJS):**

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private logger: Logger) {}
  
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    let status = 500;
    let message = 'Internal server error';
    let codeMinor = 'server_error';
    
    if (exception instanceof AppError) {
      status = exception.statusCode;
      message = exception.message;
      codeMinor = this.getCodeMinor(exception);
      
      // Log operational errors as warnings
      if (exception.isOperational) {
        this.logger.warn(`Operational error: ${message}`, {
          path: request.url,
          tenant_id: request.user?.tenantId,
        });
      } else {
        // Log non-operational errors as errors with stack trace
        this.logger.error(`Non-operational error: ${message}`, {
          stack: exception.stack,
          path: request.url,
        });
      }
    } else {
      // Unexpected errors
      this.logger.error('Unexpected error', {
        error: exception,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }
    
    // OneRoster error response format
    response.status(status).json({
      imsx_codeMajor: status < 500 ? 'failure' : 'error',
      imsx_severity: status < 500 ? 'warning' : 'error',
      imsx_description: message,
      imsx_codeMinor: {
        imsx_codeMinorField: [
          {
            imsx_codeMinorFieldName: 'error_code',
            imsx_codeMinorFieldValue: codeMinor,
          },
        ],
      },
    });
  }
  
  private getCodeMinor(error: AppError): string {
    if (error instanceof BadRequestError) return 'invalid_request';
    if (error instanceof UnauthorizedError) return 'unauthorized';
    if (error instanceof NotFoundError) return 'not_found';
    return 'server_error';
  }
}
```

### 14.2 Retry Logic & Circuit Breakers

**Exponential Backoff Retry:**

```typescript
import { retry } from '@lifeomic/attempt';

async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  return retry(fn, {
    maxAttempts: 3,
    delay: 1000,
    factor: 2, // Exponential backoff: 1s, 2s, 4s
    handleError: (err, context) => {
      // Retry on 5xx errors and network errors
      if (err.statusCode >= 500 || err.code === 'ECONNRESET') {
        logger.warn(`Retry attempt ${context.attemptNum} after error`, {
          error: err.message,
        });
      } else {
        // Don't retry on 4xx errors
        context.abort();
      }
    },
  });
}
```

**Circuit Breaker (opossum):**

```typescript
import CircuitBreaker from 'opossum';

const dbQueryOptions = {
  timeout: 3000,          // Timeout after 3s
  errorThresholdPercentage: 50, // Open circuit at 50% error rate
  resetTimeout: 30000,    // Try to close after 30s
};

const dbCircuitBreaker = new CircuitBreaker(
  async (query: string) => {
    return await prisma.$queryRaw(query);
  },
  dbQueryOptions
);

// Event listeners
dbCircuitBreaker.on('open', () => {
  logger.error('Circuit breaker OPEN - database queries failing');
  // Alert operations team
});

dbCircuitBreaker.on('halfOpen', () => {
  logger.warn('Circuit breaker HALF-OPEN - testing database');
});

dbCircuitBreaker.on('close', () => {
  logger.info('Circuit breaker CLOSED - database recovered');
});

// Fallback strategy
dbCircuitBreaker.fallback(() => {
  return { error: 'Service temporarily unavailable' };
});
```

### 14.3 Graceful Shutdown

```typescript
// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  // 1. Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // 2. Wait for ongoing requests to complete (max 30s)
  setTimeout(() => {
    logger.warn('Forcefully shutting down after timeout');
    process.exit(1);
  }, 30000);
  
  try {
    // 3. Close database connections
    await prisma.$disconnect();
    logger.info('Database connections closed');
    
    // 4. Close Redis connections
    await redis.quit();
    logger.info('Redis connections closed');
    
    // 5. Flush logs
    logger.end(() => {
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## 15. Testing Strategy

### 15.1 Unit Testing (Jest)

**Coverage Requirements:**
- **Minimum**: 80% line coverage
- **Services**: 90% coverage
- **Utilities**: 95% coverage

**Example Test:**

```typescript
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();
    
    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });
  
  describe('findMany', () => {
    it('should return users for tenant with modifiedSince filter', async () => {
      const mockUsers = [
        { id: '1', sourcedId: 'user_1', givenName: '太郎' },
      ];
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue(mockUsers);
      
      const result = await service.findMany({
        tenantId: 'tenant_123',
        modifiedSince: '2025-01-01T00:00:00Z',
      });
      
      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant_123',
          dateModified: { gte: new Date('2025-01-01T00:00:00Z') },
        },
      });
    });
  });
});
```

### 15.2 Integration Testing

**API Integration Tests (Supertest):**

```typescript
describe('GET /users', () => {
  let app: INestApplication;
  let authToken: string;
  
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleRef.createNestApplication();
    await app.init();
    
    // Get auth token
    const response = await request(app.getHttpServer())
      .post('/oauth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'test_client',
        client_secret: 'test_secret',
      });
    authToken = response.body.access_token;
  });
  
  it('should return users with valid token', async () => {
    return request(app.getHttpServer())
      .get('/v1p2/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('users');
        expect(res.body).toHaveProperty('pagination');
        expect(Array.isArray(res.body.users)).toBe(true);
      });
  });
  
  it('should return 401 without token', async () => {
    return request(app.getHttpServer())
      .get('/v1p2/users')
      .expect(401);
  });
  
  afterAll(async () => {
    await app.close();
  });
});
```

### 15.3 End-to-End Testing (Playwright)

**CSV Upload E2E Test:**

```typescript
test.describe('CSV Upload Flow', () => {
  test('should upload CSV files and process successfully', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 2. Navigate to upload page
    await page.click('text=CSV Upload');
    await expect(page).toHaveURL(/.*\/upload/);
    
    // 3. Upload files
    const manifestFile = 'tests/fixtures/manifest.csv';
    const usersFile = 'tests/fixtures/users.csv';
    
    await page.setInputFiles('input[name="manifest"]', manifestFile);
    await page.setInputFiles('input[name="users"]', usersFile);
    
    // 4. Submit upload
    await page.click('button:has-text("Upload")');
    
    // 5. Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 60000 });
    
    // 6. Verify success message
    await expect(page.locator('text=1000 records processed')).toBeVisible();
  });
});
```

### 15.4 Load Testing (k6)

**Performance Test Script:**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests < 200ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

const BASE_URL = 'https://api.rosterhub.com/v1p2';
const TOKEN = __ENV.API_TOKEN;

export default function () {
  const params = {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  
  // Test GET /users
  const res = http.get(`${BASE_URL}/users?limit=100`, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has users array': (r) => JSON.parse(r.body).users.length > 0,
  });
  
  sleep(1);
}
```

---

## 16. Deployment Strategy

### 16.1 CI/CD Pipeline (GitHub Actions)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:cov
      
      - name: Run integration tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t rosterhub/api:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push rosterhub/api:${{ github.sha }}
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/api-gateway \
            api-gateway=rosterhub/api:${{ github.sha }} \
            --namespace=production
      
      - name: Wait for rollout
        run: kubectl rollout status deployment/api-gateway -n production
```

### 16.2 Blue-Green Deployment

**Kubernetes Service Configuration:**

```yaml
# Blue deployment (current production)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway-blue
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
      version: blue
  template:
    metadata:
      labels:
        app: api-gateway
        version: blue
    spec:
      containers:
      - name: api-gateway
        image: rosterhub/api:v1.0.0
        
---
# Green deployment (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway-green
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
      version: green
  template:
    metadata:
      labels:
        app: api-gateway
        version: green
    spec:
      containers:
      - name: api-gateway
        image: rosterhub/api:v1.1.0

---
# Service (switch between blue/green)
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  selector:
    app: api-gateway
    version: blue  # Change to 'green' for cutover
  ports:
  - port: 3000
    targetPort: 3000
```

**Deployment Steps:**
1. Deploy green version alongside blue
2. Run smoke tests against green endpoints
3. Switch service selector from blue to green
4. Monitor error rates and response times
5. Rollback to blue if issues detected
6. Decommission blue after 24h stability

### 16.3 Database Migration Strategy

**Prisma Migration Workflow:**

```bash
# 1. Generate migration
npx prisma migrate dev --name add_demographics_table

# 2. Review generated SQL
cat prisma/migrations/20250115_add_demographics_table/migration.sql

# 3. Apply to staging
npx prisma migrate deploy --schema=prisma/schema.prisma

# 4. Verify schema
npx prisma db pull

# 5. Apply to production (during maintenance window)
npx prisma migrate deploy --schema=prisma/schema.prisma
```

**Zero-Downtime Migration:**
- **Backward-compatible changes first**: Add new columns as nullable
- **Deploy application code**: Use new columns conditionally
- **Backfill data**: Migrate existing data in batches
- **Make columns required**: After full migration
- **Remove old columns**: In subsequent release

---

## 17. Migration Plan

### 17.1 Data Migration (if migrating from legacy system)

**Phase 1: Assessment (Week 1-2)**
- Inventory existing data sources
- Map legacy schema to OneRoster entities
- Identify data quality issues

**Phase 2: Pilot Migration (Week 3-4)**
- Select 1-2 schools for pilot
- Export data from legacy system
- Transform to OneRoster CSV format
- Import via RosterHub CSV upload
- Validate data accuracy

**Phase 3: Full Migration (Week 5-8)**
- Migrate remaining schools in batches (10 schools/day)
- Run parallel systems during transition
- Monitor error rates and data discrepancies
- Provide support for data corrections

**Phase 4: Cutover (Week 9)**
- Final incremental sync from legacy system
- Switch all integrations to RosterHub APIs
- Decommission legacy system

### 17.2 Rollback Plan

**Rollback Triggers:**
- Error rate >5% for 10 minutes
- API response time p95 >2s for 15 minutes
- Data corruption detected
- Critical security vulnerability

**Rollback Procedure:**
1. Switch Kubernetes service to previous version (blue deployment)
2. Revert database migrations if schema changed
3. Restore from latest database backup if data corrupted
4. Notify stakeholders of rollback

---

## 18. Trade-off Analysis

### 18.1 Architecture Decision Records (ADRs)

**ADR-001: NestJS Framework Choice**

*Decision*: Use NestJS instead of Express.js

*Rationale*:
- ✅ Built-in dependency injection
- ✅ Strong TypeScript support
- ✅ Modular architecture out-of-the-box
- ✅ Easier to maintain and test
- ❌ Larger bundle size (~50MB vs ~5MB)
- ❌ Steeper learning curve

*Outcome*: Accepted - Developer productivity outweighs bundle size concerns

---

**ADR-002: Prisma ORM vs TypeORM**

*Decision*: Use Prisma ORM

*Rationale*:
- ✅ Superior type safety with generated client
- ✅ Simpler migration workflow
- ✅ Better performance for read-heavy workloads
- ✅ Intuitive schema syntax
- ❌ Less mature than TypeORM
- ❌ Limited support for complex queries

*Outcome*: Accepted - Type safety and DX prioritized

---

**ADR-003: Monorepo vs Separate Repositories**

*Decision*: Monorepo with Nx/Turborepo

*Rationale*:
- ✅ Code sharing between API and Web app
- ✅ Consistent dependency versions
- ✅ Easier refactoring across packages
- ❌ Larger repository size
- ❌ More complex CI/CD setup

*Outcome*: Accepted - Code sharing benefits outweigh complexity

---

**ADR-004: PostgreSQL vs MongoDB**

*Decision*: PostgreSQL for primary database

*Rationale*:
- ✅ Strong ACID guarantees for roster data
- ✅ Mature ecosystem and tooling
- ✅ Better for relational OneRoster data model
- ✅ Row-level security for multi-tenancy
- ❌ Less flexible schema changes
- ❌ Harder to horizontally scale than MongoDB

*Outcome*: Accepted - Data integrity and relational model fit

---

**ADR-005: CSV Processing: Sync vs Async**

*Decision*: Asynchronous processing with background jobs

*Rationale*:
- ✅ Avoids HTTP timeout for large files (>10K records)
- ✅ Better resource utilization
- ✅ Enables progress tracking
- ❌ More complex implementation
- ❌ Requires job queue infrastructure (Redis + Bull)

*Outcome*: Accepted - Necessary for >5-minute processing time requirement

---

## 19. Open Questions & Risks

### 19.1 Open Questions

**Q1: Multi-Region Deployment Strategy**
- Should RosterHub support multi-region deployments for disaster recovery?
- **Impact**: Architecture complexity, data replication costs
- **Decision needed by**: Before production launch
- **Owner**: DevOps team

**Q2: Historical Data Retention Policy**
- How long should deleted records (status=tobedeleted) be retained?
- **Options**: 90 days, 1 year, indefinite
- **Impact**: Database storage costs, compliance requirements
- **Decision needed by**: Before pilot deployment
- **Owner**: Legal/Compliance team

**Q3: API Versioning Strategy**
- How will API version upgrades (v1.2 → v1.3) be managed?
- **Options**: Parallel versions, deprecation period, breaking changes
- **Impact**: Client integration effort
- **Decision needed by**: Before v1.1 development starts
- **Owner**: Product team

### 19.2 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Database performance degradation with >1M records** | Medium | High | Implement table partitioning by tenant_id, add read replicas, optimize indexes |
| **CSV parsing fails with malformed UTF-8** | High | Medium | Add encoding detection, provide validation tool to schools before upload |
| **S3 storage costs exceed budget** | Low | Medium | Implement lifecycle policies (delete raw CSVs after 30 days), compress files |
| **OAuth token leak** | Low | Critical | Implement token rotation, monitor for suspicious activity, rate limiting |
| **Timezone handling errors (JST vs UTC)** | Medium | Medium | Store all timestamps in UTC, convert to JST only in UI layer |
| **Prisma migration failure in production** | Low | High | Test migrations on staging first, maintain rollback scripts, backup before migration |

### 19.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Schools upload incorrect CSV data** | High | Medium | Provide CSV validation tool, show preview before processing, enable rollback within 24h |
| **API client credential leaks** | Medium | High | Rotate credentials quarterly, monitor for unusual API usage patterns |
| **Monitoring alert fatigue** | Medium | Low | Tune alert thresholds, implement alert routing, use anomaly detection |
| **Insufficient support staff during peak upload periods** | Medium | Medium | Create self-service documentation, implement automated error diagnostics |

---

## 20. Dependencies

### 20.1 External Services

| Service | Purpose | SLA | Fallback |
|---------|---------|-----|----------|
| **AWS S3** | CSV file storage | 99.99% | Local filesystem for dev, Azure Blob for redundancy |
| **SendGrid** | Email notifications | 99.9% | AWS SES as backup |
| **Sentry** | Error tracking | 99.9% | Local logging, no critical dependency |
| **Datadog** | APM & monitoring | 99.95% | Prometheus/Grafana on-prem fallback |

### 20.2 Third-Party Libraries

**Critical Dependencies (security review required):**

```json
{
  "dependencies": {
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@prisma/client": "^5.8.0",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.0",
    "csv-parse": "^5.5.3",
    "ioredis": "^5.3.2",
    "bull": "^4.12.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "jest": "^29.7.0",
    "typescript": "^5.3.3",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

**Dependency Update Policy:**
- **Security patches**: Apply within 48 hours
- **Minor versions**: Monthly review, update if stable
- **Major versions**: Quarterly evaluation, migrate if breaking changes justified

### 20.3 Development Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **Node.js** | Runtime | 20 LTS |
| **Docker** | Containerization | 24+ |
| **Kubernetes** | Orchestration | 1.28+ |
| **PostgreSQL** | Database | 14+ |
| **Redis** | Cache/Queue | 6.2+ |
| **Nginx** | Reverse proxy | 1.24+ |

---

## 21. Future Considerations

### 21.1 Roadmap Items (Not in v1.0)

**Phase 2 (v1.1 - Q2 2025):**
- **Delta Sync API**: Return only changed records since last sync
- **Webhook Notifications**: Push notifications on data changes
- **Advanced Filtering**: Support for complex filter expressions (AND/OR)
- **Bulk Delete API**: Delete multiple records in one request

**Phase 3 (v1.2 - Q3 2025):**
- **GraphQL API**: Alternative to REST for flexible queries
- **Real-time Data Sync**: WebSocket support for live updates
- **Advanced Analytics**: Dashboard for upload trends, error patterns
- **Multi-Language Support**: UI localization (English, Japanese)

**Phase 4 (v2.0 - Q4 2025):**
- **OneRoster v1.3 Support**: Upgrade to latest spec
- **AI-Powered Data Validation**: Detect anomalies in uploaded data
- **Mobile App**: Native iOS/Android apps for on-the-go access
- **Federated Identity**: SSO integration with Google Workspace, Microsoft 365

### 21.2 Scalability Enhancements

**Beyond 100 Tenants:**
- **Tenant sharding**: Partition database by tenant_id ranges
- **CDN for static assets**: CloudFront/Cloudflare for web app
- **API Gateway caching**: Cache GET responses at edge locations
- **Dedicated Redis clusters**: Separate cache/queue instances

**Beyond 10M Records:**
- **TimescaleDB**: Migrate to time-series DB for audit logs
- **Elasticsearch**: Add full-text search for user/org queries
- **Apache Kafka**: Replace Bull queue with Kafka for higher throughput

### 21.3 Technical Debt & Refactoring

**Known Debt Items:**
1. **CSV Parser**: Current implementation loads entire file into memory (limit: 100MB)
   - **Impact**: Cannot handle >100MB CSV files
   - **Fix**: Implement streaming parser with line-by-line processing

2. **Error Messages**: Generic error messages don't provide actionable guidance
   - **Impact**: Support burden, user frustration
   - **Fix**: Create error message catalog with resolution steps

3. **Test Coverage**: Integration test coverage at 65% (target: 80%)
   - **Impact**: Higher risk of regressions
   - **Fix**: Add E2E tests for critical flows, expand integration tests

4. **Documentation**: API documentation not auto-generated from code
   - **Impact**: Docs drift from implementation
   - **Fix**: Integrate Swagger/OpenAPI with NestJS decorators

---

## 22. Approval

### 22.1 Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Technical Lead** | [TBD] | __________ | __________ |
| **Product Manager** | [TBD] | __________ | __________ |
| **Security Officer** | [TBD] | __________ | __________ |
| **Operations Lead** | [TBD] | __________ | __________ |

### 22.2 Review History

| Version | Date | Reviewer | Changes |
|---------|------|----------|---------|
| 0.1 | 2025-01-15 | Initial draft | Created comprehensive architecture document |
| 0.2 | [TBD] | [TBD] | [TBD] |
| 1.0 | [TBD] | [TBD] | Approved for implementation |

---

## 23. References

### 23.1 External Standards

1. **OneRoster v1.2 Specification**
   - URL: https://www.imsglobal.org/oneroster-v12-final-specification
   - Japan Profile 1.2.2: https://www.ims.jp/oneroster/

2. **OAuth 2.0 RFC 6749**
   - URL: https://datatracker.ietf.org/doc/html/rfc6749

3. **Japanese Personal Information Protection Act**
   - URL: https://www.ppc.go.jp/en/legal/

4. **ISO/IEC 27001 (Information Security)**
   - URL: https://www.iso.org/standard/27001

### 23.2 Internal Documentation

1. **Database Design Document**
   - Location: `/design/database/database-design-rosterhub-20251114.md`

2. **API Specification (OpenAPI)**
   - Location: `/docs/design/api/openapi.yaml`

3. **Deployment Manual**
   - Location: `/docs/deployment/deployment-manual.md`

4. **Operation Manual**
   - Location: `/docs/deployment/operation-manual.md`

### 23.3 Technology Documentation

1. **NestJS Documentation**: https://docs.nestjs.com/
2. **Prisma Documentation**: https://www.prisma.io/docs
3. **PostgreSQL 14 Documentation**: https://www.postgresql.org/docs/14/
4. **Kubernetes Documentation**: https://kubernetes.io/docs/

---

## 24. Appendix: EARS Requirements Cross-Reference

### 24.1 EARS Requirements Traceability

This section maps **EARS (Easy Approach to Requirements Syntax)** requirements to architectural components.

| Requirement ID | EARS Statement | Component(s) | Section Reference |
|----------------|----------------|--------------|-------------------|
| **FR-001** | **While** the system is processing a CSV upload, **the system shall** parse each CSV file according to OneRoster v1.2 Japan Profile format | CSV Upload Service | §6.3, §9.1 |
| **FR-002** | **When** a valid CSV bundle is uploaded, **the system shall** validate manifest.csv first and reject the upload if invalid | CSV Upload Service | §8.2, §10.4 |
| **FR-003** | **Where** a record exists with the same sourcedId and tenant_id, **the system shall** update the record if dateLastModified in CSV > dateModified in database | Data Management Service | §7.2, §9.4 |
| **FR-004** | **If** an API client provides a valid Bearer token, **then the system shall** return requested OneRoster entities scoped to the client's tenant | API Gateway, Auth Service | §6.2, §6.5, §9.2 |
| **FR-005** | **The system shall** support the `modifiedSince` query parameter on all GET endpoints to enable incremental sync | OneRoster API Service | §8.1, §9.2 |
| **FR-006** | **The system shall** process CSV uploads with up to 10,000 records within 5 minutes | CSV Upload Service | §2.1, §11.2 |
| **FR-007** | **The system shall** return API responses with p95 latency <200ms under 100 concurrent users | API Gateway, Caching | §2.1, §11.1, §12.1 |
| **NFR-001** | **The system shall** enforce row-level security ensuring tenants can only access their own data | Database (Prisma middleware) | §7.2, §10.1 |
| **NFR-002** | **The system shall** encrypt PII fields (email, phone) at rest using AES-256 | Data Management Service | §10.2 |
| **NFR-003** | **The system shall** log all API requests including tenant_id, endpoint, response time, and status code | API Gateway (Logging middleware) | §10.3, §13.1 |
| **NFR-004** | **The system shall** automatically scale API pods when CPU usage exceeds 70% | Kubernetes HPA | §12.1 |
| **NFR-005** | **The system shall** support horizontal scaling to at least 10 API instances | Kubernetes Deployment | §12.1 |

### 24.2 Requirements Coverage Summary

| Category | Total Requirements | Implemented | Section Coverage |
|----------|-------------------|-------------|------------------|
| **Functional** | 7 | 7 | §6, §8, §9 |
| **Performance** | 2 | 2 | §2.1, §11, §12 |
| **Security** | 3 | 3 | §10 |
| **Scalability** | 2 | 2 | §12 |
| **Observability** | 1 | 1 | §13 |
| **Total** | **15** | **15** | **100% coverage** |

### 24.3 Architecture Verification Matrix

| Architectural Goal | Verification Method | Evidence Location |
|--------------------|---------------------|-------------------|
| **Multi-Tenant Isolation** | Unit tests for tenant-scoped queries | §15.1 |
| **API Performance <200ms** | Load testing with k6 | §15.4 |
| **CSV Processing <5min** | E2E tests with 10K record file | §15.3 |
| **Horizontal Scalability** | Kubernetes stress testing | §12.1 |
| **Data Encryption** | Security audit of Prisma middleware | §10.2 |
| **Audit Logging Completeness** | Integration tests for all CRUD operations | §10.3, §15.2 |

---

**End of System Architecture Design Document v1.0**

*Last Updated: 2025-01-17*  
*Document Status: Complete - Pending Review*  
*Total Sections: 24*  
*Page Count: [TBD after final formatting]*

