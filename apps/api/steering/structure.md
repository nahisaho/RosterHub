# RosterHub - Architecture Structure

## Document Overview

**Project**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**Version**: 1.0
**Last Updated**: 2025-11-15
**Purpose**: Documents architecture patterns, directory organization, naming conventions, and module structure

---

## 1. Architecture Pattern

### 1.1 Overall Pattern

**NestJS Modular Architecture** with **Feature-First Organization**

RosterHub follows a clean, modular architecture based on NestJS best practices:
- **Modular Design**: Each OneRoster entity (users, orgs, classes, etc.) is a self-contained module
- **Layered Architecture**: Clear separation between Controller → Service → Repository → Database
- **Domain-Driven Design Influence**: Business logic organized around OneRoster domain entities
- **Vertical Slicing**: Features organized by entity type rather than technical layer

### 1.2 Architectural Layers

```
┌─────────────────────────────────────────────────┐
│  Presentation Layer (Controllers)              │
│  - REST API endpoints                          │
│  - Request/Response DTOs                       │
│  - OpenAPI/Swagger documentation               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Application Layer (Services)                  │
│  - Business logic                              │
│  - Data transformation                         │
│  - Orchestration                               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Data Access Layer (Repositories)              │
│  - Database operations                         │
│  - Query building                              │
│  - Base repository pattern                     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Infrastructure Layer (Prisma ORM)             │
│  - PostgreSQL database                         │
│  - Schema management                           │
│  - Migrations                                  │
└─────────────────────────────────────────────────┘
```

### 1.3 Cross-Cutting Concerns

**Guards** (Security Layer):
- `ApiKeyGuard`: API key authentication
- `IpWhitelistGuard`: IP address validation
- `RateLimitGuard`: Rate limiting (sliding window algorithm)

**Interceptors** (AOP):
- `AuditInterceptor`: Automatic audit logging for all API operations

**Pipes** (Validation):
- `ValidationPipe`: Global request validation using `class-validator`

**Filters** (Exception Handling):
- Global exception filters for standardized error responses

---

## 2. Directory Structure

### 2.1 Root Structure

```
apps/api/
├── src/                      # Source code
├── prisma/                   # Database schema and migrations
├── test/                     # E2E tests
├── uploads/                  # CSV file uploads (runtime)
├── exports/                  # CSV file exports (runtime)
├── logs/                     # Application logs (runtime)
├── steering/                 # Project memory (this document)
├── Dockerfile                # Multi-stage production build
├── docker-compose.yml        # Local development stack
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── nest-cli.json             # NestJS CLI configuration
```

### 2.2 Source Code Structure (`src/`)

```
src/
├── main.ts                   # Application entry point
├── app.module.ts             # Root module (imports all feature modules)
├── app.controller.ts         # Health check endpoint
├── app.service.ts            # Application service
│
├── config/                   # Configuration modules
│   ├── app.config.ts         # App-level config (port, CORS, etc.)
│   └── database.config.ts    # Database connection config
│
├── database/                 # Database infrastructure
│   ├── database.module.ts    # Database module (Prisma)
│   ├── prisma.service.ts     # Prisma client service
│   └── base.repository.ts    # Base repository with common CRUD operations
│
├── common/                   # Shared utilities (cross-cutting)
│   ├── guards/               # Security guards
│   │   ├── api-key.guard.ts
│   │   ├── ip-whitelist.guard.ts
│   │   └── rate-limit.guard.ts
│   ├── interceptors/         # AOP interceptors
│   │   └── audit.interceptor.ts
│   ├── filters/              # Exception filters
│   ├── pipes/                # Custom pipes
│   ├── decorators/           # Custom decorators
│   └── utils/                # Utility functions
│
└── oneroster/                # OneRoster domain (main feature area)
    │
    ├── entities/             # OneRoster entity modules (vertical slices)
    │   ├── users/
    │   │   ├── users.module.ts
    │   │   ├── users.controller.ts      # REST endpoints (/ims/oneroster/v1p2/users)
    │   │   ├── users.service.ts         # Business logic
    │   │   ├── users.repository.ts      # Data access
    │   │   ├── dto/                     # Data Transfer Objects
    │   │   │   ├── create-user.dto.ts
    │   │   │   ├── user-response.dto.ts
    │   │   │   └── query-users.dto.ts
    │   │   └── entities/                # Domain entities (optional)
    │   │
    │   ├── orgs/                        # Organizations module (same structure)
    │   ├── classes/                     # Classes module
    │   ├── courses/                     # Courses module
    │   ├── enrollments/                 # Enrollments module
    │   ├── academic-sessions/           # Academic Sessions module
    │   └── demographics/                # Demographics module
    │
    ├── common/               # OneRoster-specific shared utilities
    │   ├── oneroster-common.module.ts
    │   ├── dto/
    │   │   ├── pagination.dto.ts        # Pagination params (limit, offset)
    │   │   └── sorting.dto.ts           # Sorting params (orderBy)
    │   └── services/
    │       ├── filter-parser.service.ts # OneRoster filter query parser
    │       └── field-selection.service.ts # Field selection service
    │
    ├── csv/                  # CSV import/export module
    │   ├── csv.module.ts
    │   ├── csv-import.controller.ts     # CSV import endpoints
    │   ├── csv-export.controller.ts     # CSV export endpoints
    │   ├── services/
    │   │   ├── csv-import.service.ts    # Streaming CSV import
    │   │   └── csv-export.service.ts    # Streaming CSV export
    │   ├── processors/
    │   │   └── csv-import.processor.ts  # BullMQ background processor
    │   ├── mappers/
    │   │   └── csv-entity.mapper.ts     # CSV ↔ Entity mapping
    │   ├── validators/
    │   │   └── csv-validator.service.ts # CSV row validation
    │   └── dto/
    │       └── csv-import-job.dto.ts
    │
    ├── auth/                 # API authentication module
    │   ├── api-key/
    │   │   ├── api-key.module.ts
    │   │   ├── api-key.controller.ts    # API key management endpoints
    │   │   └── api-key.service.ts
    │   ├── repositories/
    │   │   └── api-key.repository.ts
    │   └── dto/
    │       ├── create-api-key.dto.ts
    │       └── api-key-response.dto.ts
    │
    └── audit/                # Audit logging module
        ├── audit.module.ts
        ├── audit.controller.ts          # Audit log query endpoints
        ├── audit.service.ts
        └── repositories/
            └── audit-log.repository.ts
```

---

## 3. Module Organization Patterns

### 3.1 Entity Module Pattern (Template)

Each OneRoster entity follows this consistent structure:

```
{entity}/
├── {entity}.module.ts          # NestJS module definition
├── {entity}.controller.ts      # REST API endpoints
├── {entity}.service.ts         # Business logic layer
├── {entity}.repository.ts      # Data access layer
├── dto/                        # Data Transfer Objects
│   ├── create-{entity}.dto.ts  # Create request DTO
│   ├── update-{entity}.dto.ts  # Update request DTO (if applicable)
│   ├── {entity}-response.dto.ts # Response DTO
│   └── query-{entity}.dto.ts   # Query parameters DTO
└── entities/                   # Domain entities (optional)
    └── {entity}.entity.ts
```

**Example**: `users/` module

### 3.2 Module Dependency Rules

**Allowed Dependencies**:
- Entity modules → Common utilities (`common/`, `oneroster/common/`)
- Entity modules → Database module (`database/`)
- Entity modules → Config module (`config/`)
- CSV module → Entity repositories (for import/export)
- Audit module → All modules (via interceptor)

**Forbidden Dependencies**:
- Entity modules → Other entity modules (avoid coupling)
- Common utilities → Entity modules (circular dependency)

### 3.3 Base Repository Pattern

All repositories extend `BaseRepository<T>` which provides:
- `findAll(params)`: List with pagination, filtering, sorting
- `findById(id)`: Find by internal UUID
- `findBySourcedId(sourcedId)`: Find by OneRoster sourcedId
- `create(data)`: Create new record
- `update(id, data)`: Update existing record
- `upsert(sourcedId, data)`: Update or insert
- `softDelete(id)`: Soft delete (status = 'tobedeleted')

---

## 4. Naming Conventions

### 4.1 File Naming

**Pattern**: `{feature}.{type}.ts`

- Modules: `{entity}.module.ts` (e.g., `users.module.ts`)
- Controllers: `{entity}.controller.ts` (e.g., `users.controller.ts`)
- Services: `{entity}.service.ts` (e.g., `users.service.ts`)
- Repositories: `{entity}.repository.ts` (e.g., `users.repository.ts`)
- DTOs: `{action}-{entity}.dto.ts` (e.g., `create-user.dto.ts`)
- Guards: `{feature}.guard.ts` (e.g., `api-key.guard.ts`)
- Interceptors: `{feature}.interceptor.ts` (e.g., `audit.interceptor.ts`)
- Tests: `{feature}.spec.ts` (e.g., `users.service.spec.ts`)

### 4.2 Class Naming

**Pattern**: PascalCase with suffix

- Modules: `{Entity}Module` (e.g., `UsersModule`)
- Controllers: `{Entity}Controller` (e.g., `UsersController`)
- Services: `{Entity}Service` (e.g., `UsersService`)
- Repositories: `{Entity}Repository` (e.g., `UsersRepository`)
- DTOs: `{Action}{Entity}Dto` (e.g., `CreateUserDto`)
- Guards: `{Feature}Guard` (e.g., `ApiKeyGuard`)
- Interceptors: `{Feature}Interceptor` (e.g., `AuditInterceptor`)

### 4.3 API Endpoint Patterns

**OneRoster v1.2 REST API Specification Compliance**

Base Path: `/ims/oneroster/v1p2`

**Entity Endpoints**:
- `GET /ims/oneroster/v1p2/{entities}` - List all entities
- `GET /ims/oneroster/v1p2/{entities}/{id}` - Get single entity
- `POST /ims/oneroster/v1p2/{entities}` - Create entity (non-standard, added for Japan Profile)
- `PUT /ims/oneroster/v1p2/{entities}/{id}` - Update entity (non-standard)
- `DELETE /ims/oneroster/v1p2/{entities}/{id}` - Soft delete entity (status = tobedeleted)

**Relationship Endpoints**:
- `GET /ims/oneroster/v1p2/users/{userId}/classes` - Get user's classes
- `GET /ims/oneroster/v1p2/classes/{classId}/students` - Get class students

**Query Parameters** (OneRoster standard):
- `limit`: Page size (default: 100, max: 1000)
- `offset`: Pagination offset
- `orderBy`: Sort field (default: `dateLastModified DESC`)
- `filter`: OneRoster filter expression (e.g., `status='active' AND role='student'`)
- `fields`: Field selection (comma-separated list)

---

## 5. Data Flow Patterns

### 5.1 Request Flow (Read Operation)

```
Client Request
      ↓
[Controller] receives request, validates query params (QueryDto)
      ↓
[Service] applies business logic, calls repository
      ↓
[Repository] builds Prisma query (filter, pagination, sorting)
      ↓
[Prisma] executes SQL query
      ↓
[Repository] returns entities
      ↓
[Service] transforms to ResponseDto
      ↓
[Controller] returns HTTP response with ResponseDto
      ↓
Client Response
```

**Audit Trail**: `AuditInterceptor` logs READ action to `audit_logs` table

### 5.2 Write Operation Flow

```
Client Request (POST/PUT/DELETE)
      ↓
[ApiKeyGuard] validates API key
      ↓
[IpWhitelistGuard] checks IP whitelist
      ↓
[RateLimitGuard] enforces rate limit
      ↓
[Controller] receives request, validates DTO
      ↓
[Service] applies business logic
      ↓
[Repository] executes database operation (create/update/softDelete)
      ↓
[Prisma] executes SQL transaction
      ↓
[Repository] returns updated entity
      ↓
[Service] transforms to ResponseDto
      ↓
[Controller] returns HTTP response
      ↓
[AuditInterceptor] logs CREATE/UPDATE/DELETE action
      ↓
Client Response
```

### 5.3 CSV Import Flow

```
Client uploads CSV file
      ↓
[CsvImportController] receives file, creates import job
      ↓
[BullMQ] enqueues background job
      ↓
[CsvImportProcessor] processes job asynchronously
      ↓
[CsvImportService] streams CSV file
      ↓
[CsvValidatorService] validates each row
      ↓
[CsvEntityMapper] maps CSV → Entity
      ↓
[Repository] batch inserts (1000 records/batch)
      ↓
[Prisma] executes bulk inserts
      ↓
Job status updated (processing → completed)
      ↓
Client polls job status endpoint
```

---

## 6. Database Schema Organization

### 6.1 Prisma Schema Structure

**Location**: `prisma/schema.prisma`

**Organization**:
1. Generator and datasource configuration
2. Enums (OneRoster specification enums)
3. OneRoster core entities (User, Org, Course, Class, Enrollment, AcademicSession, Demographic)
4. Junction tables (many-to-many relationships)
5. System entities (ApiKey, AuditLog, CsvImportJob)

### 6.2 Naming Conventions (Database)

- **Table names**: Plural, snake_case (e.g., `users`, `academic_sessions`)
- **Column names**: camelCase in Prisma, snake_case in PostgreSQL
- **Foreign keys**: `{entity}SourcedId` (e.g., `userSourcedId`, `classSourcedId`)
- **Indexes**: Composite indexes for foreign keys, dateLastModified, status
- **Enums**: PascalCase in Prisma, lowercase in PostgreSQL

### 6.3 Key Design Decisions

- **Dual Identifiers**:
  - `id` (UUID): Internal primary key
  - `sourcedId` (string): OneRoster identifier (unique)
- **Soft Deletes**: `status = 'tobedeleted'` instead of physical deletes
- **Audit Timestamps**: `dateCreated`, `dateLastModified` (auto-updated)
- **Japan Profile Extensions**: `metadata` JSONB column for flexible extensions

---

## 7. Testing Structure

### 7.1 Test Organization

```
src/
├── {module}/
│   ├── {module}.service.spec.ts    # Unit tests for service
│   ├── {module}.controller.spec.ts # Unit tests for controller
│   └── {module}.repository.spec.ts # Unit tests for repository
│
test/
├── e2e/
│   ├── users.e2e-spec.ts           # E2E tests for users API
│   ├── csv-import.e2e-spec.ts      # E2E tests for CSV import
│   └── auth.e2e-spec.ts            # E2E tests for authentication
└── jest-e2e.json                   # E2E test configuration
```

### 7.2 Test Naming Convention

- Unit tests: `{feature}.spec.ts`
- E2E tests: `{feature}.e2e-spec.ts`
- Test suites: `describe('{ClassName}', () => {})`
- Test cases: `it('should {behavior}', () => {})`

---

## 8. Configuration Management

### 8.1 Environment Variables

**Location**: `.env` file (not committed, `.env.example` provided)

**Categories**:
- Database: `DATABASE_URL`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- API Security: `API_KEY_ENABLED`, `IP_WHITELIST_ENABLED`, `RATE_LIMIT_ENABLED`
- OneRoster: `ONEROSTER_VERSION`, `JAPAN_PROFILE_VERSION`
- CSV Processing: `CSV_UPLOAD_MAX_SIZE`, `CSV_BATCH_SIZE`

### 8.2 Configuration Pattern

**Typed Configuration** using `@nestjs/config`:
- `app.config.ts`: Application-level config
- `database.config.ts`: Database connection config

Loaded globally in `app.module.ts` via `ConfigModule.forRoot()`

---

## 9. Security Architecture

### 9.1 Authentication Layer

**API Key Authentication** (Primary):
- Header: `X-API-Key`
- Storage: `api_keys` table (hashed with bcrypt)
- Validation: `ApiKeyGuard` with Redis caching (5-minute TTL)
- Metadata: Organization ID, rate limit, IP whitelist, expiration

### 9.2 Authorization Layer

**IP Whitelist** (Optional):
- Per-API-key IP whitelist configuration
- Guard: `IpWhitelistGuard`
- Supports CIDR notation and individual IPs

### 9.3 Rate Limiting

**Sliding Window Algorithm**:
- Guard: `RateLimitGuard`
- Storage: Redis (sorted sets)
- Per-API-key rate limits
- Default: 1000 requests/hour (configurable)

### 9.4 Audit Logging

**Comprehensive Audit Trail**:
- Interceptor: `AuditInterceptor` (applied globally)
- Logs: All CRUD operations (CREATE, READ, UPDATE, DELETE)
- Data: Entity type, sourcedId, user ID, API key ID, IP address, request/response
- Storage: `audit_logs` table

---

## 10. Background Job Processing

### 10.1 Queue Architecture

**BullMQ** with Redis:
- Queue: `csv-import-queue`
- Processor: `CsvImportProcessor`
- Jobs: CSV import operations (async, background)

### 10.2 Job Flow

1. Controller enqueues job → BullMQ
2. BullMQ stores job in Redis
3. Processor picks up job asynchronously
4. Job status tracked in `csv_import_jobs` table
5. Client polls job status endpoint

---

## 11. Error Handling Patterns

### 11.1 Exception Hierarchy

- `BadRequestException` (400): Validation errors, invalid filter syntax
- `UnauthorizedException` (401): Invalid API key
- `ForbiddenException` (403): IP not whitelisted, rate limit exceeded
- `NotFoundException` (404): Entity not found
- `ConflictException` (409): Duplicate sourcedId
- `InternalServerErrorException` (500): Unexpected errors

### 11.2 Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "givenName",
      "message": "givenName must be a string"
    }
  ],
  "timestamp": "2025-11-15T10:30:00.000Z",
  "path": "/ims/oneroster/v1p2/users"
}
```

---

## 12. API Documentation

### 12.1 OpenAPI/Swagger

**Location**: `http://localhost:3000/api/docs`

**Configuration**: `main.ts` using `@nestjs/swagger`

**Tags**:
- `users`: User entity operations
- `orgs`: Organization entity operations
- `classes`: Class entity operations
- `courses`: Course entity operations
- `enrollments`: Enrollment entity operations
- `academicSessions`: Academic Session entity operations
- `demographics`: Demographic entity operations
- `csv`: CSV import/export operations
- `auth`: API key management

---

## 13. Key Architectural Decisions

### 13.1 Why NestJS?

- Enterprise-grade TypeScript framework
- Built-in dependency injection (Inversion of Control)
- Modular architecture aligns with OneRoster entity structure
- Excellent TypeScript support and type safety
- Rich ecosystem (Swagger, Prisma, BullMQ integration)

### 13.2 Why Prisma?

- Type-safe ORM with excellent TypeScript integration
- Automatic migration generation
- Query builder prevents SQL injection
- Performance optimization via query batching
- PostgreSQL full-text search support (for future)

### 13.3 Why Feature-First Organization?

- OneRoster entities are naturally independent
- Each module can be developed/tested/deployed independently
- Clear boundaries reduce coupling
- Easier for teams to work in parallel

### 13.4 Why Base Repository Pattern?

- DRY principle: Common CRUD operations in one place
- Consistent query patterns across all entities
- Easy to add cross-cutting features (soft deletes, audit logging)
- Testability: Mock base repository for unit tests

---

## 14. Migration Strategy

### 14.1 Database Migrations

**Prisma Migrate**:
- Dev: `npx prisma migrate dev` (creates migration + applies)
- Production: `npx prisma migrate deploy` (applies pending migrations)
- Migration files: `prisma/migrations/`

### 14.2 Breaking Changes

- No breaking changes allowed in production (backward compatibility)
- Use versioned API paths if schema changes require it
- Support multiple OneRoster versions via versioned modules

---

## 15. Performance Optimization Patterns

### 15.1 Database Optimizations

- **Indexes**: All foreign keys, dateLastModified, status, role, email
- **Pagination**: Offset-based pagination (limit + offset)
- **Batch Inserts**: CSV import uses batches of 1000 records
- **Query Optimization**: Prisma query optimization via `select` and `include`

### 15.2 Caching Strategy

- **API Key Validation**: Redis cache (5-minute TTL)
- **Rate Limiting**: Redis sorted sets (sliding window)
- **Future**: Response caching for read-heavy endpoints

### 15.3 CSV Processing

- **Streaming Parser**: `csv-parse` with streaming (handles 100MB+ files)
- **Background Jobs**: BullMQ for async processing
- **Progress Tracking**: Real-time job status updates

---

## 16. Future Architectural Enhancements

### 16.1 Planned Improvements

- **Event Sourcing**: Add event log for audit trail replay
- **CQRS**: Separate read/write models for performance
- **GraphQL API**: Add GraphQL layer alongside REST
- **Microservices**: Split CSV processing into separate service
- **Real-time Updates**: WebSocket support for live data sync

### 16.2 Scalability Considerations

- **Horizontal Scaling**: Stateless API servers (scale behind load balancer)
- **Database Read Replicas**: Separate read/write databases
- **Redis Cluster**: Distribute cache across multiple Redis nodes
- **CDN**: Cache static API documentation and OpenAPI spec

---

## Summary

RosterHub follows a **clean, modular NestJS architecture** with:
- **Feature-first organization** around OneRoster entities
- **Layered architecture** (Controller → Service → Repository → Database)
- **Base repository pattern** for consistent data access
- **Comprehensive security** (API key, IP whitelist, rate limiting, audit logging)
- **Background job processing** for CSV import/export
- **Type-safe database access** via Prisma ORM
- **OpenAPI documentation** for all endpoints

This architecture provides:
- **Maintainability**: Clear module boundaries and consistent patterns
- **Testability**: Dependency injection and repository pattern
- **Scalability**: Stateless design, background jobs, caching
- **Security**: Multi-layered authentication and authorization
- **Compliance**: OneRoster v1.2 + Japan Profile 1.2.2 specification adherence
