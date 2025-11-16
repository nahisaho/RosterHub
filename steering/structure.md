# Project Structure - RosterHub

## Overview
This document defines the architectural patterns, directory organization, and code structure conventions for RosterHub (OneRoster Japan Profile Integration Hub). It serves as the single source of truth for structural decisions and guides all development efforts.

**Last Updated**: 2025-11-15 (Updated by Steering Agent - Sprint 5 Security Implementation)

---

## Organization Philosophy

RosterHub follows a **domain-driven, feature-first architecture** aligned with OneRoster specification and Japanese educational data integration requirements:

- **Domain-driven design**: Clear bounded contexts around OneRoster entities (users, orgs, classes, enrollments, etc.)
- **Feature-first organization**: Code organized by business capabilities (CSV import/export, REST API, data validation, audit logging)
- **Vertical slice architecture**: Each feature contains its own controllers, services, repositories, and DTOs in a cohesive module
- **Specification-driven**: Structure mirrors OneRoster Japan Profile 1.2.2 entity model
- **API-first design**: RESTful API as the primary interface, with CSV import/export as batch alternatives

This architecture enables:
- OneRoster specification compliance through clear entity boundaries
- Independent development of CSV vs API access paths
- Easy navigation (find user-related code in `oneroster/entities/users/`, not scattered)
- Scalable codebase for large-scale educational data (200,000+ users)
- Future extensibility for new OneRoster entities or Japan Profile updates

---

## Directory Structure

### Root Level
**Purpose**: Project configuration, documentation, and application structure

```
RosterHub/
├── apps/                    # Application code
│   └── api/                 # NestJS API server (primary application)
├── docs/                    # Documentation
│   ├── research/            # Research documents (OneRoster analysis)
│   ├── requirements/        # Requirements specifications (EARS format)
│   ├── design/              # Architecture and design documents
│   ├── api/                 # API documentation (OpenAPI/Swagger)
│   └── guides/              # Developer guides
├── steering/                # Project memory (AI agent context)
│   ├── structure.md         # This document (English)
│   ├── structure.ja.md      # This document (Japanese)
│   ├── tech.md              # Technology stack
│   ├── tech.ja.md           # Technology stack (Japanese)
│   ├── product.md           # Product context
│   └── product.ja.md        # Product context (Japanese)
├── .claude/                 # AI agent definitions (Musuhi SDD agents)
├── scripts/                 # Build and utility scripts
├── .github/                 # GitHub Actions workflows (CI/CD)
├── docker/                  # Docker configurations (PostgreSQL, Redis)
├── package.json             # Root workspace configuration
├── README.md                # Project overview
└── CLAUDE.md                # Musuhi project instructions

```

---

## Application Structure (apps/api/)

### API Server (NestJS)
**Purpose**: OneRoster Japan Profile REST API and CSV processing backend

```
apps/api/
├── src/
│   ├── oneroster/           # **OneRoster domain module** (core feature)
│   │   ├── entities/        # OneRoster entity modules
│   │   │   ├── users/       # User entity (students, teachers, staff)
│   │   │   │   ├── users.controller.ts      # REST API endpoints
│   │   │   │   ├── users.service.ts         # Business logic
│   │   │   │   ├── users.repository.ts      # Data access layer
│   │   │   │   ├── dto/                     # Data transfer objects
│   │   │   │   │   ├── create-user.dto.ts
│   │   │   │   │   ├── update-user.dto.ts
│   │   │   │   │   └── user-response.dto.ts
│   │   │   │   ├── entities/                # Prisma entity models
│   │   │   │   │   └── user.entity.ts
│   │   │   │   └── users.module.ts          # NestJS module
│   │   │   │
│   │   │   ├── orgs/        # Organization entity (schools, districts)
│   │   │   │   ├── orgs.controller.ts
│   │   │   │   ├── orgs.service.ts
│   │   │   │   ├── orgs.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── orgs.module.ts
│   │   │   │
│   │   │   ├── classes/     # Class entity (courses + periods)
│   │   │   │   ├── classes.controller.ts
│   │   │   │   ├── classes.service.ts
│   │   │   │   ├── classes.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── classes.module.ts
│   │   │   │
│   │   │   ├── courses/     # Course entity (course catalog)
│   │   │   │   ├── courses.controller.ts
│   │   │   │   ├── courses.service.ts
│   │   │   │   ├── courses.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── courses.module.ts
│   │   │   │
│   │   │   ├── enrollments/ # Enrollment entity (student-class relationships)
│   │   │   │   ├── enrollments.controller.ts
│   │   │   │   ├── enrollments.service.ts
│   │   │   │   ├── enrollments.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── enrollments.module.ts
│   │   │   │
│   │   │   ├── academic-sessions/  # Academic session entity (terms, semesters)
│   │   │   │   ├── academic-sessions.controller.ts
│   │   │   │   ├── academic-sessions.service.ts
│   │   │   │   ├── academic-sessions.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── academic-sessions.module.ts
│   │   │   │
│   │   │   └── demographics/ # Demographics entity (Japan Profile extension)
│   │   │       ├── demographics.controller.ts
│   │   │       ├── demographics.service.ts
│   │   │       ├── demographics.repository.ts
│   │   │       ├── dto/
│   │   │       ├── entities/
│   │   │       └── demographics.module.ts
│   │   │
│   │   ├── csv/             # **CSV import/export module**
│   │   │   ├── import/      # CSV import feature
│   │   │   │   ├── csv-import.controller.ts   # Upload endpoint
│   │   │   │   ├── csv-import.service.ts      # Orchestration logic
│   │   │   │   ├── csv-parser.service.ts      # Streaming parser (csv-parse)
│   │   │   │   ├── csv-validator.service.ts   # Japan Profile validation
│   │   │   │   ├── bulk-insert.service.ts     # Database bulk insert
│   │   │   │   ├── import-job.processor.ts    # BullMQ background job
│   │   │   │   ├── dto/
│   │   │   │   │   ├── csv-import-request.dto.ts
│   │   │   │   │   └── csv-import-status.dto.ts
│   │   │   │   └── csv-import.module.ts
│   │   │   │
│   │   │   └── export/      # CSV export feature
│   │   │       ├── csv-export.controller.ts   # Download endpoint
│   │   │       ├── csv-export.service.ts      # CSV generation logic
│   │   │       ├── csv-formatter.service.ts   # Japan Profile formatting
│   │   │       ├── dto/
│   │   │       │   ├── csv-export-request.dto.ts
│   │   │       │   └── csv-export-response.dto.ts
│   │   │       └── csv-export.module.ts
│   │   │
│   │   ├── api/             # **REST API feature** (Bulk + Delta endpoints)
│   │   │   ├── v1/          # API version 1
│   │   │   │   ├── bulk/    # Bulk API (full data access)
│   │   │   │   │   ├── bulk-api.controller.ts
│   │   │   │   │   ├── bulk-api.service.ts
│   │   │   │   │   └── bulk-api.module.ts
│   │   │   │   │
│   │   │   │   └── delta/   # Delta/Incremental API
│   │   │   │       ├── delta-api.controller.ts
│   │   │   │       ├── delta-api.service.ts
│   │   │   │       ├── change-tracker.service.ts  # Track dateLastModified
│   │   │   │       └── delta-api.module.ts
│   │   │   │
│   │   │   └── common/      # Shared API utilities
│   │   │       ├── pagination.dto.ts
│   │   │       ├── filter.dto.ts
│   │   │       ├── sort.dto.ts
│   │   │       └── response.interceptor.ts
│   │   │
│   │   ├── auth/            # **API authentication module** (Sprint 5 ✅)
│   │   │   ├── api-key/     # API Key management
│   │   │   │   ├── api-key.service.ts       # Key generation, validation, revocation
│   │   │   │   ├── api-key.controller.ts    # CRUD API endpoints
│   │   │   │   └── api-key.module.ts        # NestJS module
│   │   │   ├── repositories/
│   │   │   │   └── api-key.repository.ts    # Database access for API keys
│   │   │   └── dto/
│   │   │       ├── create-api-key.dto.ts    # API key creation request
│   │   │       └── api-key-response.dto.ts  # API key response
│   │   │
│   │   ├── validation/      # **Data validation module**
│   │   │   ├── japan-profile-validator.service.ts   # Japan Profile rules
│   │   │   ├── reference-validator.service.ts       # Foreign key checks
│   │   │   ├── duplicate-detector.service.ts        # Duplicate detection
│   │   │   ├── rules/                               # Validation rule definitions
│   │   │   │   ├── user-validation.rules.ts
│   │   │   │   ├── org-validation.rules.ts
│   │   │   │   ├── class-validation.rules.ts
│   │   │   │   └── enrollment-validation.rules.ts
│   │   │   └── validation.module.ts
│   │   │
│   │   ├── audit/           # **Audit logging module** (Sprint 5 ✅)
│   │   │   ├── audit.service.ts         # Audit query and analytics
│   │   │   ├── audit.controller.ts      # Audit log API (query, GDPR reports)
│   │   │   ├── repositories/
│   │   │   │   └── audit-log.repository.ts  # Database access for audit logs
│   │   │   └── audit.module.ts
│   │   │
│   │   └── oneroster.module.ts  # Root OneRoster module
│   │
│   ├── common/              # Shared resources across the application
│   │   ├── decorators/      # Custom decorators
│   │   │   ├── api-key.decorator.ts
│   │   │   └── audit-log.decorator.ts
│   │   ├── filters/         # Exception filters
│   │   │   ├── http-exception.filter.ts
│   │   │   └── validation-exception.filter.ts
│   │   ├── guards/          # **Security Guards** (Sprint 5 ✅)
│   │   │   ├── api-key.guard.ts                  # API key validation (Redis cache)
│   │   │   ├── ip-whitelist.guard.ts             # IP whitelist check (IPv4/IPv6/CIDR)
│   │   │   ├── ip-whitelist.guard.spec.ts        # Unit tests (15 tests)
│   │   │   ├── rate-limit.guard.ts               # Token bucket rate limiter
│   │   │   ├── rate-limit-sliding-window.guard.ts # Advanced sliding window limiter
│   │   │   └── rate-limit.guard.spec.ts          # Unit tests (11 tests)
│   │   ├── interceptors/    # **Global interceptors** (Sprint 5 ✅)
│   │   │   ├── audit.interceptor.ts      # Enhanced audit logging (DB + console)
│   │   │   ├── logging.interceptor.ts    # Request/response logging
│   │   │   └── transform.interceptor.ts  # Response transformation
│   │   ├── pipes/           # Validation pipes
│   │   │   └── validation.pipe.ts
│   │   └── utils/           # Utility functions
│   │       ├── date-utils.ts
│   │       ├── csv-utils.ts
│   │       └── sourcedid-generator.ts
│   │
│   ├── config/              # Configuration management
│   │   ├── database.config.ts      # PostgreSQL configuration
│   │   ├── redis.config.ts         # Redis configuration (BullMQ)
│   │   ├── auth.config.ts          # API authentication config
│   │   ├── csv.config.ts           # CSV processing config
│   │   └── app.config.ts           # General app config
│   │
│   ├── prisma/              # Prisma ORM (database layer)
│   │   ├── schema.prisma    # Database schema (OneRoster entities)
│   │   ├── migrations/      # Database migrations
│   │   │   ├── 20250101_init/
│   │   │   ├── 20250102_add_users/
│   │   │   ├── 20250103_add_orgs/
│   │   │   └── ...
│   │   └── seed.ts          # Database seeding (test data)
│   │
│   ├── main.ts              # Application entry point
│   └── app.module.ts        # Root NestJS module
│
├── tests/                   # Test files
│   ├── e2e/                 # End-to-end tests
│   │   ├── csv-import.e2e-spec.ts
│   │   ├── csv-export.e2e-spec.ts
│   │   ├── bulk-api.e2e-spec.ts
│   │   └── delta-api.e2e-spec.ts
│   └── unit/                # Unit tests (or colocated with source)
│
├── nest-cli.json            # NestJS CLI configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

---

## OneRoster Entity Module Pattern

### Standard Entity Module Structure

Each OneRoster entity (users, orgs, classes, courses, enrollments, academicSessions, demographics) follows this consistent structure:

```
oneroster/entities/[entity-name]/
├── [entity].controller.ts   # REST API endpoints (CRUD)
├── [entity].service.ts      # Business logic
├── [entity].repository.ts   # Data access layer (Prisma)
├── [entity].module.ts       # NestJS module definition
├── dto/                     # Data transfer objects
│   ├── create-[entity].dto.ts    # POST request body
│   ├── update-[entity].dto.ts    # PUT/PATCH request body
│   ├── [entity]-response.dto.ts  # API response format
│   └── [entity]-filter.dto.ts    # Query filters
└── entities/                # Prisma entity models
    └── [entity].entity.ts   # TypeScript entity class
```

### Example: User Entity Module

```typescript
// oneroster/entities/users/users.controller.ts
@Controller('oneroster/v1/users')
@UseGuards(ApiKeyGuard, IpWhitelistGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() filter: UserFilterDto): Promise<UserResponseDto[]> {
    return this.usersService.findAll(filter);
  }

  @Get(':sourcedId')
  async findOne(@Param('sourcedId') sourcedId: string): Promise<UserResponseDto> {
    return this.usersService.findBySourcedId(sourcedId);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Put(':sourcedId')
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.usersService.update(sourcedId, updateUserDto);
  }

  @Delete(':sourcedId')
  async delete(@Param('sourcedId') sourcedId: string): Promise<void> {
    return this.usersService.delete(sourcedId);
  }
}

// oneroster/entities/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly validationService: JapanProfileValidatorService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findAll(filter: UserFilterDto): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findAll(filter);
    return users.map(user => this.toDto(user));
  }

  async findBySourcedId(sourcedId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findBySourcedId(sourcedId);
    if (!user) {
      throw new NotFoundException(`User with sourcedId ${sourcedId} not found`);
    }
    return this.toDto(user);
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Validate Japan Profile fields
    await this.validationService.validateUser(createUserDto);

    // Create user
    const user = await this.usersRepository.create(createUserDto);

    // Audit log
    await this.auditLogService.logCreate('User', user.sourcedId);

    return this.toDto(user);
  }

  async update(sourcedId: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Validate Japan Profile fields
    await this.validationService.validateUser(updateUserDto);

    // Update user
    const user = await this.usersRepository.update(sourcedId, updateUserDto);

    // Audit log
    await this.auditLogService.logUpdate('User', sourcedId);

    return this.toDto(user);
  }

  async delete(sourcedId: string): Promise<void> {
    // Soft delete (set status to 'tobedeleted')
    await this.usersRepository.softDelete(sourcedId);

    // Audit log
    await this.auditLogService.logDelete('User', sourcedId);
  }

  private toDto(user: User): UserResponseDto {
    // Map entity to DTO (Japan Profile format)
    return new UserResponseDto(user);
  }
}

// oneroster/entities/users/users.repository.ts
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: UserFilterDto): Promise<User[]> {
    return this.prisma.user.findMany({
      where: this.buildWhereClause(filter),
      orderBy: filter.sort,
      skip: filter.offset,
      take: filter.limit,
    });
  }

  async findBySourcedId(sourcedId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { sourcedId },
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
      where.dateLastModified = { gte: filter.dateLastModified };
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

## Security Architecture Pattern (Sprint 5)

### Guard Execution Order

Security is implemented using NestJS Guards with a specific execution order:

```typescript
@Controller('ims/oneroster/v1p2/users')
@UseGuards(
  ApiKeyGuard,           // 1. Validate API key (check cache → database)
  IpWhitelistGuard,      // 2. Verify IP whitelist (if configured)
  RateLimitGuard,        // 3. Check rate limit (sliding window)
)
@UseInterceptors(
  AuditInterceptor,      // 4. Log all requests/responses
)
export class UsersController {}
```

**Execution Flow**:
1. **ApiKeyGuard** validates X-API-Key header
   - Checks Redis cache (5-minute TTL)
   - Falls back to database validation via ApiKeyService
   - Attaches API key metadata to request object
   - Extracts client IP from X-Forwarded-For or request.ip

2. **IpWhitelistGuard** validates client IP against whitelist
   - Skips if API key has no IP whitelist configured
   - Supports IPv4 exact match (e.g., `192.168.1.100`)
   - Supports IPv6 exact match (e.g., `2001:db8::1`)
   - Supports CIDR ranges (e.g., `192.168.1.0/24`, `2001:db8::/32`)
   - Uses `ipaddr.js` for IP parsing and range validation

3. **RateLimitGuard** enforces rate limits
   - Two implementations available:
     - `RateLimitGuard`: Simple token bucket (cache-manager)
     - `RateLimitSlidingWindowGuard`: Precise sliding window (Redis sorted sets)
   - Default limit: 1000 requests/hour per API key
   - Fail-open behavior: Allows requests if Redis is unavailable
   - Sets rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

4. **AuditInterceptor** logs all API activity
   - Stores in database (AuditLog table) for compliance
   - Logs to console (structured JSON) for monitoring
   - Captures request details (method, path, body, headers)
   - Captures response details (status, body, duration)
   - Sanitizes sensitive data (passwords, tokens, API keys)
   - Extracts entity context (entity type, action, sourcedId)

### Security Module Structure

```
src/
├── oneroster/auth/              # API Key management
│   ├── api-key/
│   │   ├── api-key.service.ts       # Generate, validate, revoke keys
│   │   ├── api-key.controller.ts    # POST/GET/DELETE /api/v1/auth/api-keys
│   │   └── api-key.module.ts
│   ├── repositories/
│   │   └── api-key.repository.ts    # Database access
│   └── dto/
│       ├── create-api-key.dto.ts    # Name, org, IP whitelist, rate limit
│       └── api-key-response.dto.ts  # Plain-text key (shown once)
│
├── oneroster/audit/             # Audit logging
│   ├── audit.service.ts             # Query logs, GDPR reports, statistics
│   ├── audit.controller.ts          # GET /api/v1/audit (filtering, pagination)
│   ├── repositories/
│   │   └── audit-log.repository.ts  # Database access
│   └── audit.module.ts
│
└── common/
    ├── guards/                      # Reusable guards
    │   ├── api-key.guard.ts             # Authentication (Redis cache)
    │   ├── ip-whitelist.guard.ts        # Authorization (IP check)
    │   ├── rate-limit.guard.ts          # DoS protection (token bucket)
    │   └── rate-limit-sliding-window.guard.ts  # Advanced rate limiting
    │
    └── interceptors/
        └── audit.interceptor.ts     # Automatic audit logging
```

### API Key Format

- **Format**: `rh_live_{64_hex_characters}` or `rh_test_{64_hex_characters}`
- **Generation**: `crypto.randomBytes(32).toString('hex')` (64 hex chars)
- **Storage**: Bcrypt hashed with 12 salt rounds
- **Validation**: Bcrypt comparison (`await bcrypt.compare(plainKey, hashedKey)`)
- **Security**: Plain-text key shown only once at creation, never retrievable

### Rate Limiting Algorithms

**Token Bucket (Simple)**:
- Uses `@nestjs/cache-manager` with Redis
- Fixed window per API key
- Lower overhead, simpler implementation

**Sliding Window (Advanced)**:
- Uses `ioredis` directly with Redis sorted sets
- True sliding window (no burst at window boundaries)
- More accurate request counting
- Recommended for production

### Audit Log Data Model

```typescript
interface AuditLog {
  id: string;
  timestamp: DateTime;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  entityType: string;           // 'User', 'Org', 'Class', etc.
  entitySourcedId: string;
  apiKeyId?: string;            // API key used
  userId?: string;              // OneRoster user (if available)
  ipAddress: string;
  userAgent?: string;
  requestMethod: string;        // GET, POST, PUT, DELETE
  requestPath: string;          // /ims/oneroster/v1p2/users/abc123
  requestBody?: Json;           // Sanitized request body
  responseStatus: number;       // 200, 404, 500, etc.
  responseBody?: Json;          // Sanitized response (size limited)
  duration: number;             // Request duration in ms
  errorMessage?: string;        // Error message (if failed)
  errorStack?: string;          // Stack trace (non-production only)
}
```

### GDPR Compliance Features

- **Data Access Logging**: All API operations logged with timestamps
- **Right of Access (Article 15)**: GDPR report API endpoint
- **Data Retention**: Configurable retention policy (default: 2 years)
- **Data Sanitization**: Sensitive fields removed from logs
- **Audit Trail**: Complete history of data access and modifications

---

## Naming Conventions

### Files and Directories

#### Backend (NestJS)
- **Controllers**: `kebab-case.controller.ts` (e.g., `users.controller.ts`, `csv-import.controller.ts`)
- **Services**: `kebab-case.service.ts` (e.g., `users.service.ts`, `csv-parser.service.ts`)
- **Repositories**: `kebab-case.repository.ts` (e.g., `users.repository.ts`)
- **Modules**: `kebab-case.module.ts` (e.g., `users.module.ts`, `oneroster.module.ts`)
- **Entities**: `PascalCase.entity.ts` (e.g., `User.entity.ts`, `Org.entity.ts`)
- **DTOs**: `kebab-case.dto.ts` (e.g., `create-user.dto.ts`, `user-response.dto.ts`)
- **Guards**: `kebab-case.guard.ts` (e.g., `api-key.guard.ts`, `ip-whitelist.guard.ts`)
- **Interceptors**: `kebab-case.interceptor.ts` (e.g., `logging.interceptor.ts`)
- **Pipes**: `kebab-case.pipe.ts` (e.g., `validation.pipe.ts`)
- **Test Files**: `*.spec.ts` (e.g., `users.controller.spec.ts`)

#### Database (Prisma)
- **Schema File**: `schema.prisma`
- **Migration Directories**: `YYYYMMDD_description` (e.g., `20250101_init`, `20250102_add_users`)

### Code Elements

```typescript
// Variables and Functions: camelCase
const sourcedId = 'abc123';
const dateLastModified = new Date();
function validateJapanProfile() {}
const handleCsvImport = async () => {};

// Classes and Interfaces: PascalCase
class UsersService {}
class UserResponseDto {}
interface OneRosterEntity {}
type UserRole = 'student' | 'teacher' | 'staff';

// Constants: UPPER_SNAKE_CASE
const MAX_CSV_FILE_SIZE_MB = 100;
const DEFAULT_PAGE_SIZE = 100;
const CSV_ENCODING = 'utf8';

// Enums: PascalCase (keys in PascalCase)
enum UserRole {
  Student = 'student',
  Teacher = 'teacher',
  Staff = 'staff',
  Administrator = 'administrator'
}

enum StatusType {
  Active = 'active',
  Tobedeleted = 'tobedeleted',
  Inactive = 'inactive'
}

// OneRoster Fields: camelCase (following spec)
// - sourcedId (not sourceId or sourced_id)
// - dateLastModified (not last_modified or lastModifiedDate)
// - metadata.jp.* (Japan Profile extensions)
```

---

## Import Organization

### Standard Order

```typescript
// 1. External dependencies (NestJS, libraries)
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

// 2. Internal absolute imports (@/ paths)
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ApiKeyGuard } from '@/oneroster/auth/api-key.guard';
import { AuditLogService } from '@/oneroster/audit/audit-log.service';

// 3. Relative imports (same feature/module)
import { User } from './entities/user.entity';
import { UserFilterDto } from './dto/user-filter.dto';
```

### Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/oneroster/*": ["src/oneroster/*"],
      "@/common/*": ["src/common/*"],
      "@/config/*": ["src/config/*"]
    }
  }
}
```

---

## Architectural Patterns

### Key Principles

1. **OneRoster Specification Compliance**
   - Entity structure mirrors OneRoster spec exactly
   - Field names match spec (sourcedId, dateLastModified, etc.)
   - Japan Profile extensions in `metadata.jp.*` namespace

2. **Separation of Concerns**
   - Controllers handle HTTP requests/responses
   - Services contain business logic
   - Repositories handle database access
   - Validators handle data validation
   - Interceptors/Guards handle cross-cutting concerns

3. **Dependency Direction**
   - Controllers depend on Services
   - Services depend on Repositories and Validators
   - Repositories depend on Prisma (database layer)
   - No circular dependencies

4. **DRY (Don't Repeat Yourself)**
   - Common validation rules in `validation/rules/`
   - Shared DTOs in `common/dto/`
   - Reusable utilities in `common/utils/`

### Common Patterns

#### Repository Pattern (Data Access Layer)
```typescript
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: UserFilterDto): Promise<User[]> {
    return this.prisma.user.findMany({
      where: this.buildWhereClause(filter),
    });
  }

  private buildWhereClause(filter: UserFilterDto): Prisma.UserWhereInput {
    // Build complex where clause
  }
}
```

#### Service Layer Pattern (Business Logic)
```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly validator: JapanProfileValidatorService,
    private readonly auditLog: AuditLogService
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.validator.validateUser(dto);
    const user = await this.repository.create(dto);
    await this.auditLog.logCreate('User', user.sourcedId);
    return this.toDto(user);
  }
}
```

#### DTO Pattern (Data Transfer Objects)
```typescript
// Japan Profile-compliant DTO
export class UserResponseDto {
  sourcedId: string;
  dateCreated: Date;
  dateLastModified: Date;
  status: StatusType;
  enabledUser: boolean;
  username: string;
  userIds: string[];
  givenName: string;
  familyName: string;
  middleName?: string;
  role: UserRole;
  identifier: string;
  email: string;
  sms?: string;
  phone?: string;
  metadata: {
    jp: {
      kanaGivenName?: string;
      kanaFamilyName?: string;
      kanaMiddleName?: string;
      homeClass?: string;
    };
  };
  orgs: { href: string; sourcedId: string; type: string }[];
  agents: { href: string; sourcedId: string; type: string }[];
}
```

#### CSV Streaming Pattern (Large Files)
```typescript
@Injectable()
export class CsvParserService {
  async parseStream(fileStream: Readable): Promise<AsyncIterableIterator<any>> {
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      encoding: 'utf8',
      bom: true,
    });

    fileStream.pipe(parser);

    // Return async iterable for streaming processing
    return parser[Symbol.asyncIterator]();
  }
}

// Usage in import service
async importUsers(fileStream: Readable): Promise<void> {
  const records = await this.csvParser.parseStream(fileStream);
  const batch = [];

  for await (const record of records) {
    // Validate record
    await this.validator.validateUser(record);

    // Add to batch
    batch.push(record);

    // Bulk insert every 1000 records
    if (batch.length >= 1000) {
      await this.bulkInsert.insertUsers(batch);
      batch.length = 0;
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    await this.bulkInsert.insertUsers(batch);
  }
}
```

---

## Database Schema Organization (Prisma)

### Schema Structure

```
apps/api/src/prisma/
├── schema.prisma           # Main schema file
├── migrations/             # Auto-generated migrations
│   ├── 20250101_init/
│   ├── 20250102_add_users/
│   ├── 20250103_add_orgs/
│   └── ...
└── seed.ts                 # Database seeding script
```

### Schema Organization (within schema.prisma)

```prisma
// 1. Generator and datasource configuration
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 2. Enums (OneRoster spec)
enum StatusType {
  active
  tobedeleted
  inactive
}

enum UserRole {
  student
  teacher
  staff
  administrator
}

enum OrgType {
  department
  school
  district
  local
  state
  national
}

// 3. Core OneRoster entities
// Users (students, teachers, staff)
model User {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  enabledUser        Boolean
  username           String
  userIds            String[]
  givenName          String
  familyName         String
  middleName         String?
  role               UserRole
  identifier         String    @unique
  email              String
  sms                String?
  phone              String?
  metadata           Json?     // Japan Profile extensions

  // Relationships
  orgs               Org[]     @relation("OrgMembers")
  agents             User[]    @relation("AgentRelationship")
  enrollments        Enrollment[]
  demographics       Demographic?

  @@index([dateLastModified])
  @@index([status])
  @@index([role])
}

// Organizations (schools, districts)
model Org {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  name               String
  type               OrgType
  identifier         String    @unique
  metadata           Json?     // Japan Profile extensions

  // Relationships
  parent             Org?      @relation("OrgHierarchy", fields: [parentSourcedId], references: [sourcedId])
  parentSourcedId    String?
  children           Org[]     @relation("OrgHierarchy")
  members            User[]    @relation("OrgMembers")
  classes            Class[]

  @@index([dateLastModified])
  @@index([status])
  @@index([type])
}

// Classes (courses + periods)
model Class {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  title              String
  classCode          String
  classType          String
  location           String?
  metadata           Json?     // Japan Profile extensions

  // Relationships
  course             Course    @relation(fields: [courseSourcedId], references: [sourcedId])
  courseSourcedId    String
  school             Org       @relation(fields: [schoolSourcedId], references: [sourcedId])
  schoolSourcedId    String
  terms              AcademicSession[]
  enrollments        Enrollment[]

  @@index([dateLastModified])
  @@index([status])
  @@index([courseSourcedId])
  @@index([schoolSourcedId])
}

// Courses (course catalog)
model Course {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  title              String
  courseCode         String
  schoolYear         String?
  metadata           Json?     // Japan Profile extensions

  // Relationships
  school             Org       @relation(fields: [schoolSourcedId], references: [sourcedId])
  schoolSourcedId    String
  classes            Class[]

  @@index([dateLastModified])
  @@index([status])
  @@index([schoolSourcedId])
}

// Enrollments (student-class relationships)
model Enrollment {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  role               String    // primary, secondary, etc.
  primary            Boolean
  beginDate          DateTime?
  endDate            DateTime?
  metadata           Json?     // Japan Profile extensions

  // Relationships
  user               User      @relation(fields: [userSourcedId], references: [sourcedId])
  userSourcedId      String
  class              Class     @relation(fields: [classSourcedId], references: [sourcedId])
  classSourcedId     String
  school             Org       @relation(fields: [schoolSourcedId], references: [sourcedId])
  schoolSourcedId    String

  @@index([dateLastModified])
  @@index([status])
  @@index([userSourcedId])
  @@index([classSourcedId])
  @@index([schoolSourcedId])
  @@unique([userSourcedId, classSourcedId])
}

// Academic Sessions (terms, semesters)
model AcademicSession {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  title              String
  type               String    // gradingPeriod, semester, schoolYear, term
  startDate          DateTime
  endDate            DateTime
  schoolYear         String
  metadata           Json?     // Japan Profile extensions

  // Relationships
  parent             AcademicSession? @relation("SessionHierarchy", fields: [parentSourcedId], references: [sourcedId])
  parentSourcedId    String?
  children           AcademicSession[] @relation("SessionHierarchy")
  classes            Class[]

  @@index([dateLastModified])
  @@index([status])
  @@index([type])
  @@index([startDate, endDate])
}

// Demographics (Japan Profile extension)
model Demographic {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  birthDate          DateTime?
  sex                String?
  metadata           Json?     // Japan Profile extensions

  // Relationships
  user               User      @relation(fields: [userSourcedId], references: [sourcedId])
  userSourcedId      String    @unique

  @@index([dateLastModified])
  @@index([status])
}

// 4. System entities (non-OneRoster)
// API Keys (authentication)
model ApiKey {
  id                 String    @id @default(uuid())
  key                String    @unique
  hashedKey          String
  name               String
  organizationId     String
  ipWhitelist        String[]
  rateLimit          Int       @default(1000)
  isActive           Boolean   @default(true)
  expiresAt          DateTime?
  createdAt          DateTime  @default(now())
  lastUsedAt         DateTime?

  @@index([key])
  @@index([organizationId])
}

// Audit Logs (compliance)
model AuditLog {
  id                 String    @id @default(uuid())
  timestamp          DateTime  @default(now())
  action             String    // CREATE, UPDATE, DELETE, READ
  entityType         String    // User, Org, Class, etc.
  entitySourcedId    String
  userId             String?
  ipAddress          String
  requestMethod      String
  requestPath        String
  requestBody        Json?
  responseStatus     Int
  changes            Json?     // Before/after values

  @@index([timestamp])
  @@index([entityType, entitySourcedId])
  @@index([userId])
  @@index([action])
}

// CSV Import Jobs (background processing)
model CsvImportJob {
  id                 String    @id @default(uuid())
  status             String    // pending, processing, completed, failed
  fileName           String
  fileSize           Int
  totalRecords       Int?
  processedRecords   Int       @default(0)
  successRecords     Int       @default(0)
  failedRecords      Int       @default(0)
  errors             Json?
  startedAt          DateTime?
  completedAt        DateTime?
  createdAt          DateTime  @default(now())
  createdBy          String

  @@index([status])
  @@index([createdAt])
}
```

---

## Testing Structure

### Backend Testing

**Colocated Unit Tests**
```
oneroster/entities/users/
├── users.controller.ts
├── users.controller.spec.ts
├── users.service.ts
├── users.service.spec.ts
├── users.repository.ts
└── users.repository.spec.ts
```

**Separated E2E Tests**
```
tests/e2e/
├── csv-import.e2e-spec.ts
├── csv-export.e2e-spec.ts
├── users-api.e2e-spec.ts
├── orgs-api.e2e-spec.ts
├── classes-api.e2e-spec.ts
├── enrollments-api.e2e-spec.ts
├── delta-api.e2e-spec.ts
└── auth.e2e-spec.ts
```

---

## File Size Guidelines

- **Maximum file size**: 300-400 lines (excluding tests)
- **Controllers**: Ideally under 200 lines
- **Services**: Under 300 lines
- **Repositories**: Under 250 lines
- **If exceeding limits**:
  - Split into multiple services (e.g., UserValidationService, UserTransformationService)
  - Extract complex logic into separate utility files
  - Break into sub-modules

---

## Documentation Standards

### Required Documentation Files

```
docs/
├── README.md                # Project overview and quick start
├── ARCHITECTURE.md          # Detailed architecture decisions
├── ONEROSTER_COMPLIANCE.md  # OneRoster Japan Profile compliance details
├── API.md                   # API documentation (or use Swagger)
└── DEPLOYMENT.md            # Deployment instructions
```

### Code Documentation

**JSDoc for Public APIs**
```typescript
/**
 * Imports OneRoster users from CSV file (Japan Profile format).
 *
 * @param file - CSV file stream (UTF-8 BOM encoded)
 * @param options - Import options (validation level, batch size)
 * @returns Import job status with processed record counts
 * @throws {ValidationException} If CSV format or Japan Profile validation fails
 * @throws {DuplicateException} If sourcedId duplicates are detected
 */
export async function importUsersFromCsv(
  file: Readable,
  options: CsvImportOptions
): Promise<CsvImportStatus> {
  // Implementation
}
```

---

## Version Control Structure

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches (e.g., `feature/csv-import`, `feature/delta-api`)
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Production hotfixes

### Commit Convention
Follow Conventional Commits:
```
feat(users): add Japan Profile validation for user entity
feat(csv): implement streaming CSV parser for large files
fix(delta-api): correct dateLastModified query filter
docs(api): update OpenAPI spec for enrollment endpoints
test(users): add E2E tests for user CRUD operations
refactor(validation): extract Japan Profile rules to separate module
```

---

**Note**: This document captures the current architectural decisions for RosterHub (OneRoster integration). Update this document when:
- OneRoster entity modules are added or modified
- Directory structure changes
- New architectural patterns are introduced
- Major refactoring occurs

Document patterns and principles, not exhaustive file lists. New files following existing patterns don't require updates to this document.

**Last Updated**: 2025-11-15 (Updated by Steering Agent - Sprint 5 Security Implementation complete)
