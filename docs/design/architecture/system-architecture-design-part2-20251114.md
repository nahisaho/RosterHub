# RosterHub System Architecture Design Document
## Part 2: C4 Component, Data Flow, Module Structure, Security

**Project**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**Version**: 1.0
**Date**: 2025-11-14
**Author**: System Architect AI
**Status**: Draft
**Prerequisite**: Read Part 1 first (`system-architecture-design-part1-20251114.md`)

---

## Table of Contents (Part 2)

6. [C4 Model - Level 3: Component Diagram](#6-c4-model---level-3-component-diagram)
7. [C4 Model - Level 4: Code Diagrams](#7-c4-model---level-4-code-diagrams)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Module Structure (NestJS)](#9-module-structure-nestjs)
10. [Security Architecture](#10-security-architecture)
11. [Integration Patterns](#11-integration-patterns)

---

## 6. C4 Model - Level 3: Component Diagram

### 6.1 NestJS API Server Components

```mermaid
C4Component
    title Component Diagram - API Server (NestJS Modules)

    Container_Boundary(api, "API Server") {
        Component(userController, "UsersController", "NestJS Controller", "REST endpoints for User entity")
        Component(orgController, "OrgsController", "NestJS Controller", "REST endpoints for Org entity")
        Component(classController, "ClassesController", "NestJS Controller", "REST endpoints for Class entity")
        Component(enrollmentController, "EnrollmentsController", "NestJS Controller", "REST endpoints for Enrollment entity")

        Component(csvImportController, "CsvImportController", "NestJS Controller", "CSV file upload endpoint")
        Component(csvExportController, "CsvExportController", "NestJS Controller", "CSV file download endpoint")

        Component(userService, "UsersService", "NestJS Service", "User business logic")
        Component(orgService, "OrgsService", "NestJS Service", "Org business logic")
        Component(csvImportService, "CsvImportService", "NestJS Service", "CSV import orchestration")
        Component(csvParserService, "CsvParserService", "NestJS Service", "Streaming CSV parser")

        Component(validationService, "JapanProfileValidatorService", "NestJS Service", "Japan Profile validation")
        Component(referenceValidator, "ReferenceValidatorService", "NestJS Service", "Foreign key validation")

        Component(userRepository, "UsersRepository", "NestJS Repository", "User data access")
        Component(orgRepository, "OrgsRepository", "NestJS Repository", "Org data access")
        Component(auditRepository, "AuditLogRepository", "NestJS Repository", "Audit log storage")

        Component(apiKeyGuard, "ApiKeyGuard", "NestJS Guard", "API Key validation")
        Component(ipWhitelistGuard, "IpWhitelistGuard", "NestJS Guard", "IP restriction")
        Component(rateLimitGuard, "RateLimitGuard", "NestJS Guard", "Rate limiting")

        Component(auditInterceptor, "AuditLogInterceptor", "NestJS Interceptor", "Automatic audit logging")
    }

    ContainerDb(db, "PostgreSQL", "Database")
    ContainerDb(redis, "Redis", "Cache/Queue")

    Rel(userController, apiKeyGuard, "Uses")
    Rel(userController, userService, "Calls")
    Rel(userService, validationService, "Validates")
    Rel(userService, userRepository, "Accesses data")
    Rel(userRepository, db, "Queries", "Prisma")

    Rel(csvImportController, csvImportService, "Calls")
    Rel(csvImportService, csvParserService, "Parses CSV")
    Rel(csvImportService, validationService, "Validates")
    Rel(csvImportService, redis, "Enqueues job", "BullMQ")

    Rel(apiKeyGuard, redis, "Checks cache")
    Rel(auditInterceptor, auditRepository, "Logs action")
    Rel(auditRepository, db, "Writes log")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### 6.2 Component Responsibilities

**Controllers (API Endpoints)**:
- **UsersController**: `GET /ims/oneroster/v1p2/users`, `POST`, `PUT`, `DELETE`
- **OrgsController**: `GET /ims/oneroster/v1p2/orgs`, etc.
- **ClassesController**: `GET /ims/oneroster/v1p2/classes`, etc.
- **EnrollmentsController**: `GET /ims/oneroster/v1p2/enrollments`, etc.
- **CsvImportController**: `POST /csv/import` (multipart file upload)
- **CsvExportController**: `GET /csv/export` (streaming download)

**Services (Business Logic)**:
- **UsersService**: User CRUD operations, business rules
- **OrgsService**: Org CRUD operations, hierarchy management
- **CsvImportService**: CSV import orchestration, job creation
- **CsvParserService**: Streaming CSV parsing (csv-parse library)
- **CsvFormatterService**: CSV generation (Japan Profile format)

**Validators (Data Quality)**:
- **JapanProfileValidatorService**: Japan Profile field validation
  - kanaGivenName format (全角ひらがな)
  - attendanceNumber uniqueness within homeroom
  - gender enum validation
- **ReferenceValidatorService**: Foreign key validation
  - Org parent exists
  - User agents exist
  - Class course exists
- **DuplicateDetectorService**: Detect duplicate sourcedId

**Repositories (Data Access)**:
- **UsersRepository**: `findAll()`, `findBySourcedId()`, `create()`, `update()`, `softDelete()`
- **OrgsRepository**: Similar CRUD methods
- **AuditLogRepository**: `logCreate()`, `logUpdate()`, `logDelete()`, `logRead()`

**Guards (Security)**:
- **ApiKeyGuard**: Validate API key from `Authorization: Bearer {key}` header
- **IpWhitelistGuard**: Check request IP against allowed list
- **RateLimitGuard**: Enforce rate limits (1000 req/hour per API key)

**Interceptors (Cross-cutting Concerns)**:
- **AuditLogInterceptor**: Automatic audit logging for all requests
- **LoggingInterceptor**: Structured request/response logging
- **TransformInterceptor**: Transform response to OneRoster JSON format

### 6.3 Background Worker Components

```mermaid
graph TB
    subgraph "Background Worker (NestJS)"
        JobProcessor[CSV Import Job Processor<br/>BullMQ Consumer]
        CsvParser[Streaming CSV Parser<br/>csv-parse]
        Validator[Japan Profile Validator<br/>Batch Validation]
        BulkInserter[Bulk Insert Service<br/>Prisma Batching]
        ErrorReporter[Error Reporter<br/>Detailed Error Messages]
    end

    Redis[(Redis<br/>BullMQ Queue)]
    DB[(PostgreSQL<br/>OneRoster Data)]

    Redis -->|Dequeue job| JobProcessor
    JobProcessor --> CsvParser
    CsvParser -->|Stream records| Validator
    Validator -->|Valid records| BulkInserter
    Validator -->|Invalid records| ErrorReporter
    BulkInserter --> DB
    ErrorReporter --> DB
```

**Job Processing Flow**:
1. **JobProcessor**: Receives job from BullMQ queue
2. **CsvParser**: Streams CSV file (handles 100MB+ without OOM)
3. **Validator**: Validates each record batch (1000 records)
4. **BulkInserter**: Inserts valid records in batches (Prisma `createMany`)
5. **ErrorReporter**: Logs invalid records with detailed error messages

---

## 7. C4 Model - Level 4: Code Diagrams

### 7.1 User Entity Class Diagram

```mermaid
classDiagram
    class User {
        +String id (UUID)
        +String sourcedId (unique)
        +DateTime dateCreated
        +DateTime dateLastModified
        +StatusType status
        +Boolean enabledUser
        +String username
        +String[] userIds
        +String givenName
        +String familyName
        +String middleName?
        +UserRole role
        +String identifier
        +String email
        +String sms?
        +String phone?
        +Json metadata
        +Org[] orgs
        +User[] agents
        +Enrollment[] enrollments
        +Demographic demographic?
    }

    class UserMetadata {
        +UserMetadataJp jp
    }

    class UserMetadataJp {
        +String kanaGivenName (全角ひらがな)
        +String kanaFamilyName (全角ひらがな)
        +String kanaMiddleName?
        +String gender? (male/female/other/notSpecified)
        +String homeClass? (Class sourcedId)
        +Integer attendanceNumber? (1-99)
    }

    class StatusType {
        <<enumeration>>
        active
        tobedeleted
        inactive
    }

    class UserRole {
        <<enumeration>>
        student
        teacher
        staff
        administrator
        aide
        guardian
    }

    User --> UserMetadata : metadata (JSONB)
    UserMetadata --> UserMetadataJp : jp
    User --> StatusType : status
    User --> UserRole : role
```

### 7.2 Service Layer Class Diagram

```mermaid
classDiagram
    class UsersController {
        -UsersService usersService
        +findAll(filter: UserFilterDto): UserResponseDto[]
        +findOne(sourcedId: string): UserResponseDto
        +create(dto: CreateUserDto): UserResponseDto
        +update(sourcedId: string, dto: UpdateUserDto): UserResponseDto
        +delete(sourcedId: string): void
    }

    class UsersService {
        -UsersRepository repository
        -JapanProfileValidatorService validator
        -AuditLogService auditLog
        +findAll(filter: UserFilterDto): UserResponseDto[]
        +findBySourcedId(sourcedId: string): UserResponseDto
        +create(dto: CreateUserDto): UserResponseDto
        +update(sourcedId: string, dto: UpdateUserDto): UserResponseDto
        +delete(sourcedId: string): void
        -toDto(user: User): UserResponseDto
    }

    class UsersRepository {
        -PrismaService prisma
        +findAll(filter: UserFilterDto): User[]
        +findBySourcedId(sourcedId: string): User
        +create(data: CreateUserDto): User
        +update(sourcedId: string, data: UpdateUserDto): User
        +softDelete(sourcedId: string): User
        -buildWhereClause(filter: UserFilterDto): Prisma.UserWhereInput
    }

    class JapanProfileValidatorService {
        +validateUser(dto: CreateUserDto | UpdateUserDto): ValidationResult
        +validateKanaName(kana: string): boolean
        +validateGender(gender: string): boolean
        +validateAttendanceNumber(number: number, homeClass: string): boolean
    }

    class AuditLogService {
        -AuditLogRepository repository
        +logCreate(entityType: string, sourcedId: string): void
        +logUpdate(entityType: string, sourcedId: string, changes: any): void
        +logDelete(entityType: string, sourcedId: string): void
        +logRead(entityType: string, sourcedId: string): void
    }

    UsersController --> UsersService
    UsersService --> UsersRepository
    UsersService --> JapanProfileValidatorService
    UsersService --> AuditLogService
```

### 7.3 Repository Pattern Implementation

```typescript
// Example: UsersRepository Implementation
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: UserFilterDto): Promise<User[]> {
    return this.prisma.user.findMany({
      where: this.buildWhereClause(filter),
      orderBy: filter.sort || { dateLastModified: 'desc' },
      skip: filter.offset || 0,
      take: filter.limit || 100,
      include: {
        orgs: true,
        agents: true,
        enrollments: true,
        demographics: true,
      },
    });
  }

  async findBySourcedId(sourcedId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { sourcedId },
      include: {
        orgs: true,
        agents: true,
        enrollments: true,
        demographics: true,
      },
    });
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        sourcedId: generateSourcedId('user'),
        dateCreated: new Date(),
        dateLastModified: new Date(),
      },
    });
  }

  async update(sourcedId: string, data: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { sourcedId },
      data: {
        ...data,
        dateLastModified: new Date(),
      },
    });
  }

  async softDelete(sourcedId: string): Promise<User> {
    return this.prisma.user.update({
      where: { sourcedId },
      data: {
        status: 'tobedeleted',
        dateLastModified: new Date(),
      },
    });
  }

  private buildWhereClause(filter: UserFilterDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filter.dateLastModified) {
      where.dateLastModified = { gte: new Date(filter.dateLastModified) };
    }

    if (filter.role) {
      where.role = filter.role;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    return where;
  }
}
```

---

## 8. Data Flow Diagrams

### 8.1 CSV Import Flow (Detailed)

```mermaid
sequenceDiagram
    participant Admin as System Administrator
    participant API as API Server
    participant Redis as Redis (BullMQ)
    participant Worker as Background Worker
    participant Parser as CSV Parser
    participant Validator as Validator
    participant DB as PostgreSQL

    Admin->>API: POST /csv/import (CSV file)
    API->>API: Validate file size/type
    API->>Redis: Enqueue import job
    Redis-->>API: Job ID
    API-->>Admin: 202 Accepted (Job ID)

    Worker->>Redis: Poll for jobs
    Redis-->>Worker: CSV Import Job
    Worker->>Worker: Download CSV file
    Worker->>Parser: Stream CSV file

    loop For each batch (1000 records)
        Parser-->>Worker: Record batch
        Worker->>Validator: Validate batch

        alt Validation Success
            Validator-->>Worker: Valid records
            Worker->>DB: Bulk insert (Prisma createMany)
            DB-->>Worker: Success
            Worker->>Redis: Update job progress
        else Validation Failure
            Validator-->>Worker: Invalid records + errors
            Worker->>DB: Log errors
            Worker->>Redis: Update job status (partial failure)
        end
    end

    Worker->>Redis: Mark job complete
    Worker->>DB: Log audit entry
    Admin->>API: GET /csv/import/status/{jobId}
    API->>Redis: Query job status
    Redis-->>API: Job result
    API-->>Admin: Job status + error report
```

### 8.2 REST API Delta Query Flow

```mermaid
sequenceDiagram
    participant LMS as Learning Tool (LMS)
    participant API as API Server
    participant Guard as Auth Guards
    participant Service as UsersService
    participant Repo as UsersRepository
    participant DB as PostgreSQL
    participant Audit as AuditLogService

    LMS->>API: GET /ims/oneroster/v1p2/users?filter=dateLastModified>2025-01-01T00:00:00Z
    API->>Guard: ApiKeyGuard.canActivate()
    Guard->>Guard: Validate API key
    Guard->>Guard: Check IP whitelist
    Guard->>Guard: Check rate limit
    Guard-->>API: Authorized

    API->>Service: findAll(filter)
    Service->>Repo: findAll(filter)
    Repo->>DB: SELECT * FROM users WHERE dateLastModified > '2025-01-01' AND status != 'inactive'
    DB-->>Repo: Query results
    Repo-->>Service: User entities
    Service->>Service: Transform to DTO (Japan Profile format)
    Service-->>API: UserResponseDto[]

    API->>Audit: logRead('User', sourcedIds)
    Audit->>DB: INSERT INTO audit_log

    API-->>LMS: 200 OK (JSON response)
```

### 8.3 CSV Export Flow

```mermaid
sequenceDiagram
    participant Admin as System Administrator
    participant API as API Server
    participant Export as CsvExportService
    participant Formatter as CsvFormatterService
    participant DB as PostgreSQL

    Admin->>API: GET /csv/export?entities=users,orgs,classes
    API->>API: Authenticate (API Key)
    API->>Export: generateCsv(entities)

    Export->>DB: Stream users (cursor pagination)
    DB-->>Export: User batch
    Export->>Formatter: Format as Japan Profile CSV
    Formatter-->>Export: CSV rows

    Export->>DB: Stream orgs
    DB-->>Export: Org batch
    Export->>Formatter: Format as CSV
    Formatter-->>Export: CSV rows

    Export->>DB: Stream classes
    DB-->>Export: Class batch
    Export->>Formatter: Format as CSV
    Formatter-->>Export: CSV rows

    Export-->>API: CSV file stream
    API-->>Admin: 200 OK (CSV download, UTF-8 BOM)
```

---

## 9. Module Structure (NestJS)

### 9.1 Root Module Organization

```
src/
├── app.module.ts                   # Root module (imports all feature modules)
├── main.ts                         # Application entry point
│
├── oneroster/                      # OneRoster domain module
│   ├── entities/                   # Entity modules (Users, Orgs, Classes, etc.)
│   ├── csv/                        # CSV import/export modules
│   ├── api/                        # REST API modules
│   ├── auth/                       # Authentication module
│   ├── validation/                 # Validation module
│   ├── audit/                      # Audit logging module
│   └── oneroster.module.ts         # Root OneRoster module
│
├── common/                         # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
│
├── config/                         # Configuration management
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── auth.config.ts
│   └── app.config.ts
│
└── prisma/                         # Prisma ORM
    ├── schema.prisma
    ├── migrations/
    └── seed.ts
```

### 9.2 Entity Module Pattern (Example: Users)

```
oneroster/entities/users/
├── users.controller.ts             # REST API endpoints
├── users.service.ts                # Business logic
├── users.repository.ts             # Data access layer
├── users.module.ts                 # NestJS module definition
├── dto/                            # Data transfer objects
│   ├── create-user.dto.ts          # POST request body
│   ├── update-user.dto.ts          # PUT/PATCH request body
│   ├── user-response.dto.ts        # API response format
│   └── user-filter.dto.ts          # Query filters
└── entities/                       # Prisma entity models
    └── user.entity.ts              # TypeScript entity class
```

### 9.3 CSV Module Structure

```
oneroster/csv/
├── import/                         # CSV import feature
│   ├── csv-import.controller.ts    # Upload endpoint
│   ├── csv-import.service.ts       # Orchestration logic
│   ├── csv-parser.service.ts       # Streaming parser (csv-parse)
│   ├── csv-validator.service.ts    # Japan Profile validation
│   ├── bulk-insert.service.ts      # Database bulk insert
│   ├── import-job.processor.ts     # BullMQ background job
│   ├── dto/
│   │   ├── csv-import-request.dto.ts
│   │   └── csv-import-status.dto.ts
│   └── csv-import.module.ts
│
└── export/                         # CSV export feature
    ├── csv-export.controller.ts    # Download endpoint
    ├── csv-export.service.ts       # CSV generation logic
    ├── csv-formatter.service.ts    # Japan Profile formatting
    ├── dto/
    │   ├── csv-export-request.dto.ts
    │   └── csv-export-response.dto.ts
    └── csv-export.module.ts
```

### 9.4 Module Dependencies

```mermaid
graph TD
    AppModule[App Module]
    OneRosterModule[OneRoster Module]

    UsersModule[Users Module]
    OrgsModule[Orgs Module]
    ClassesModule[Classes Module]
    EnrollmentsModule[Enrollments Module]

    CsvImportModule[CSV Import Module]
    CsvExportModule[CSV Export Module]

    BulkApiModule[Bulk API Module]
    DeltaApiModule[Delta API Module]

    AuthModule[Auth Module]
    ValidationModule[Validation Module]
    AuditModule[Audit Module]

    ConfigModule[Config Module]
    PrismaModule[Prisma Module]

    AppModule --> OneRosterModule
    AppModule --> ConfigModule
    AppModule --> PrismaModule

    OneRosterModule --> UsersModule
    OneRosterModule --> OrgsModule
    OneRosterModule --> ClassesModule
    OneRosterModule --> EnrollmentsModule
    OneRosterModule --> CsvImportModule
    OneRosterModule --> CsvExportModule
    OneRosterModule --> BulkApiModule
    OneRosterModule --> DeltaApiModule
    OneRosterModule --> AuthModule
    OneRosterModule --> ValidationModule
    OneRosterModule --> AuditModule

    UsersModule --> ValidationModule
    UsersModule --> AuditModule
    UsersModule --> PrismaModule

    CsvImportModule --> ValidationModule
    CsvImportModule --> PrismaModule

    BulkApiModule --> UsersModule
    BulkApiModule --> OrgsModule
    BulkApiModule --> AuthModule

    DeltaApiModule --> UsersModule
    DeltaApiModule --> OrgsModule
    DeltaApiModule --> AuthModule
```

---

## 10. Security Architecture

### 10.1 Authentication Flow (API Key + IP Whitelist)

```mermaid
sequenceDiagram
    participant Client as Learning Tool
    participant Guard as ApiKeyGuard
    participant Cache as Redis Cache
    participant DB as PostgreSQL

    Client->>Guard: Request with Authorization: Bearer {api_key}
    Guard->>Guard: Extract API key from header

    Guard->>Cache: Check API key cache
    alt Cache Hit
        Cache-->>Guard: Cached API key data
    else Cache Miss
        Guard->>DB: SELECT * FROM api_keys WHERE key = ?
        DB-->>Guard: API key record
        Guard->>Cache: Store in cache (5 min TTL)
    end

    Guard->>Guard: Validate API key (active, not expired)
    Guard->>Guard: Check IP whitelist
    Guard->>Guard: Check rate limit (Redis counter)

    alt Authorized
        Guard-->>Client: Allow request
    else Unauthorized
        Guard-->>Client: 401 Unauthorized
    end
```

### 10.2 API Key Management

**API Key Structure**:
```typescript
interface ApiKey {
  id: string;                    // UUID
  key: string;                   // Unique API key (32 characters)
  hashedKey: string;             // bcrypt hashed (stored in DB)
  name: string;                  // Human-readable name (e.g., "LMS Vendor A")
  organizationId: string;        // Board of Education ID
  ipWhitelist: string[];         // Allowed IP addresses (e.g., ["203.0.113.0/24"])
  rateLimit: number;             // Requests per hour (default: 1000)
  isActive: boolean;             // Can be deactivated without deletion
  expiresAt: Date | null;        // Optional expiration date
  createdAt: Date;
  lastUsedAt: Date | null;       // Track usage
}
```

**Key Generation**:
- 32-character random string (base62 encoding)
- Stored hashed in database (bcrypt, 12 rounds)
- Original key shown once at creation (never stored)

**Key Rotation**:
- Generate new key, keep old key active for 30-day transition period
- Deactivate old key after all clients migrated

### 10.3 Authorization Model

**Role-Based Access Control (RBAC)**:

| Role | Permissions |
|------|-------------|
| **SuperAdmin** | All operations (CRUD), manage API keys, view audit logs |
| **OrgAdmin** | CRUD operations for own organization only, view own audit logs |
| **Vendor (API Consumer)** | Read-only access via REST API (GET endpoints only) |

**Resource-Level Permissions**:
- API keys scoped to specific organizations (Board of Education)
- Queries automatically filtered by `organizationId`
- No cross-organization data leakage

### 10.4 Data Encryption

**At Rest**:
- **PostgreSQL**: AWS RDS encryption (AES-256)
- **Redis**: AWS ElastiCache encryption at rest
- **Backups**: Encrypted with AWS KMS

**In Transit**:
- **TLS 1.3**: All API communications
- **Certificate**: Let's Encrypt or AWS Certificate Manager
- **HSTS**: Strict-Transport-Security header enabled

**Sensitive Data**:
- **API Keys**: bcrypt hashed (never stored plaintext)
- **Personal Data**: Stored encrypted if additional compliance required (future)

### 10.5 Audit Logging

**Logged Events**:
- All CRUD operations (CREATE, UPDATE, DELETE, READ)
- API Key usage (authentication attempts)
- CSV import/export operations
- Failed authentication attempts
- Rate limit violations

**Audit Log Schema**:
```typescript
interface AuditLog {
  id: string;                    // UUID
  timestamp: Date;               // Event timestamp
  action: string;                // CREATE, UPDATE, DELETE, READ
  entityType: string;            // User, Org, Class, etc.
  entitySourcedId: string;       // Affected entity
  userId: string | null;         // API key owner (if applicable)
  ipAddress: string;             // Request IP
  requestMethod: string;         // GET, POST, PUT, DELETE
  requestPath: string;           // API endpoint
  requestBody: any;              // Request payload (excluding sensitive data)
  responseStatus: number;        // HTTP status code
  changes: any;                  // Before/after values (UPDATE only)
}
```

**Retention Policy**:
- Audit logs retained for 3 years (configurable)
- Older logs archived to S3 Glacier (optional)

### 10.6 Rate Limiting

**Implementation**: Redis-based sliding window

**Limits**:
- **Default**: 1000 requests per hour per API key
- **Configurable**: Per API key (can increase for high-volume clients)
- **Burst**: Allow 100 requests in 1 minute (prevent short bursts)

**Response**:
- **429 Too Many Requests** with `Retry-After` header
- Error message: "Rate limit exceeded. Please retry after {seconds} seconds."

### 10.7 Security Headers

**HTTP Headers** (configured in NestJS):
```typescript
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'no-referrer',
}
```

---

## 11. Integration Patterns

### 11.1 CSV Import Integration (校務支援システム → RosterHub)

**Pattern**: File Upload (Asynchronous Processing)

**Steps**:
1. 校務支援システム exports OneRoster Japan Profile CSV files
2. Administrator uploads CSV files via API or Web UI (Phase 2)
3. RosterHub validates file format, enqueues background job
4. Background worker processes CSV (streaming parser)
5. Administrator receives completion notification with error report

**Error Handling**:
- **Validation Errors**: Detailed report with row number, field, error message
- **Partial Success**: Valid records imported, invalid records skipped
- **Retry**: Administrator can fix errors and re-upload

### 11.2 REST API Integration (RosterHub → 学習ツール)

**Pattern**: RESTful API (Bulk + Delta)

**Initial Sync (Bulk API)**:
1. Learning tool requests all data (`GET /ims/oneroster/v1p2/users`)
2. RosterHub returns paginated JSON response (100 records per page)
3. Learning tool stores data in internal database
4. Repeat for other entities (orgs, classes, enrollments)

**Incremental Sync (Delta API)**:
1. Learning tool tracks last sync timestamp
2. Request changed records (`GET /ims/oneroster/v1p2/users?filter=dateLastModified>2025-01-01T00:00:00Z`)
3. RosterHub returns only changed records (new, updated, deleted)
4. Learning tool updates internal database

**Pagination**:
- **Default**: 100 records per page
- **Max**: 1000 records per page (configurable)
- **Headers**: `X-Total-Count`, `Link` header with next/prev URLs

**Filtering**:
- `filter=dateLastModified>{timestamp}` (Delta API)
- `filter=status=active` (exclude inactive records)
- `filter=role=student` (filter by role)

**Sorting**:
- `sort=familyName` (ascending)
- `sort=-dateLastModified` (descending, `-` prefix)

### 11.3 Error Handling Strategy

**HTTP Status Codes**:
- **200 OK**: Successful GET request
- **201 Created**: Successful POST request
- **204 No Content**: Successful DELETE request
- **400 Bad Request**: Validation error (detailed error message in response)
- **401 Unauthorized**: Invalid API key or IP not whitelisted
- **404 Not Found**: Entity with sourcedId not found
- **409 Conflict**: Duplicate sourcedId
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected error (logged to Sentry)

**Error Response Format** (OneRoster standard):
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "Validation error: kanaGivenName must be 全角ひらがな",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "kanaGivenName",
        "imsx_codeMinorFieldValue": "invalid_format"
      }
    ]
  }
}
```

**Retry Strategy** (for Learning Tools):
- **Transient Errors (5xx)**: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- **Rate Limit (429)**: Wait `Retry-After` seconds
- **Client Errors (4xx)**: Do not retry (fix data and resend)

---

## Summary

This Part 2 document covered:
- ✅ **C4 Component Diagram**: NestJS modules, services, repositories
- ✅ **C4 Code Diagrams**: Class diagrams for User entity and service layer
- ✅ **Data Flow Diagrams**: CSV import, REST API queries, CSV export
- ✅ **Module Structure**: NestJS organization, entity modules, CSV modules
- ✅ **Security Architecture**: API Key authentication, audit logging, encryption
- ✅ **Integration Patterns**: CSV upload, REST API consumption, error handling

**Next Document**: Architecture Decision Records (ADRs) - 8 key decisions

---

**Document Status**: Draft - Part 2 Complete
**Review Required**: External Vendor, Security Auditor, Software Developer
**Next Review Date**: 2025-11-21

---

**Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | System Architect AI | Initial draft - Part 2 (Components, Data Flow, Modules, Security) |
