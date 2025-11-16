# RosterHub - Technology Stack

## Document Overview

**Project**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**Version**: 1.0
**Last Updated**: 2025-11-15
**Purpose**: Documents technology stack, frameworks, development tools, dependencies, and technical decisions

---

## 1. Technology Stack Overview

### 1.1 Core Stack

```
┌─────────────────────────────────────────────────┐
│  Runtime: Node.js 20.x LTS                     │
│  Language: TypeScript 5.7.x                    │
│  Framework: NestJS 11.x                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Database: PostgreSQL 15                       │
│  ORM: Prisma 6.19.x                           │
│  Migrations: Prisma Migrate                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Cache/Queue: Redis 7.x                        │
│  Job Queue: BullMQ 5.63.x                      │
│  Session Store: IORedis 5.8.x                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Containerization: Docker 24.x                 │
│  Orchestration: Docker Compose 2.x             │
│  Deployment: Multi-stage Dockerfile            │
└─────────────────────────────────────────────────┘
```

### 1.2 Technology Selection Rationale

**Why Node.js 20.x LTS?**
- Long-term support (LTS) until April 2026
- Excellent performance with V8 JavaScript engine
- Native ES modules support
- Strong async/await and Promise support
- Large ecosystem for educational data integration

**Why TypeScript 5.7.x?**
- Type safety reduces runtime errors by 15-30%
- Excellent IDE support (IntelliSense, refactoring)
- Better maintainability for large codebases
- Prisma ORM requires TypeScript for type generation
- NestJS framework is built on TypeScript

**Why NestJS 11.x?**
- Enterprise-grade architecture (modular, scalable, testable)
- Built-in dependency injection (IoC container)
- Native TypeScript support
- Extensive decorator-based programming model
- Out-of-the-box support for REST, GraphQL, WebSockets
- Strong ecosystem (Swagger, Prisma, BullMQ integrations)

**Why PostgreSQL 15?**
- Robust ACID compliance for educational data integrity
- JSONB support for Japan Profile metadata extensions
- Full-text search capabilities (future enhancement)
- Excellent performance with proper indexing
- Proven scalability for educational institutions
- Open-source with strong community support

**Why Prisma 6.19.x?**
- Type-safe ORM with auto-generated TypeScript types
- Declarative schema with automatic migrations
- Query builder prevents SQL injection
- Excellent developer experience (Prisma Studio)
- Performance optimizations (connection pooling, query batching)
- Native support for PostgreSQL JSONB

**Why Redis 7.x?**
- High-performance in-memory data store
- API key validation caching (5-minute TTL)
- Rate limiting with sliding window algorithm
- BullMQ job queue backend
- Pub/Sub support for real-time features (future)

**Why BullMQ 5.63.x?**
- Robust background job processing for CSV imports
- Redis-based queue with persistence
- Retry mechanisms with exponential backoff
- Job status tracking and monitoring
- Supports delayed jobs and job prioritization

**Why Docker?**
- Consistent development, staging, production environments
- Easy deployment and scaling
- Isolated service dependencies (PostgreSQL, Redis, API)
- Multi-stage builds reduce production image size
- Docker Compose for local development

---

## 2. Language and Runtime

### 2.1 Node.js Configuration

**Version**: 20.x LTS (codename: Iron)
**Installation**: Via `nvm` (Node Version Manager)

**Key Features Used**:
- ES Modules (`import`/`export` syntax)
- Native Promise and async/await
- Worker threads (future: parallel CSV processing)
- Native crypto module for API key hashing
- HTTP/2 support via Express

**Environment**:
- Development: Node.js 20.x with `--watch` flag for hot reload
- Production: Node.js 20.x with PM2 process manager (optional)

### 2.2 TypeScript Configuration

**Version**: 5.9.3

**Configuration** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Key TypeScript Features Used**:
- Decorators (`@Injectable()`, `@Controller()`, `@Get()`)
- Interfaces and type aliases for DTOs
- Enums for OneRoster specification types
- Generics for base repository pattern
- Union types for flexible metadata
- `strictNullChecks` for null safety

---

## 3. Framework and Libraries

### 3.1 NestJS Framework

**Version**: 11.1.9

**Core Packages**:
- `@nestjs/core@11.1.9`: Core framework
- `@nestjs/common@11.1.9`: Common utilities (decorators, exceptions, pipes)
- `@nestjs/platform-express@11.1.9`: Express.js integration (default HTTP adapter)
- `@nestjs/config@4.0.2`: Configuration management (environment variables)
- `@nestjs/swagger@11.2.1`: OpenAPI/Swagger documentation generation

**Key NestJS Concepts Used**:
- **Modules**: Organize code into cohesive feature modules
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic layer (injectable providers)
- **Repositories**: Data access layer (custom pattern)
- **Guards**: Authentication and authorization (API key, IP whitelist, rate limit)
- **Interceptors**: AOP for audit logging
- **Pipes**: Request validation using `class-validator`
- **Filters**: Global exception handling

**Dependency Injection**:
- Constructor-based injection
- Custom providers (`PrismaService`, `FilterParserService`)
- Module-scoped providers (singleton pattern)
- Factory providers for dynamic configuration

### 3.2 Validation and Transformation

**Packages**:
- `class-validator` (0.14.2): DTO validation using decorators
- `class-transformer` (0.5.1): Transform plain objects to class instances

**Usage Pattern**:
```typescript
import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  givenName: string;

  @IsString()
  familyName: string;

  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  middleName?: string;
}
```

**Global Validation Pipe** (`main.ts`):
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true,            // Auto-transform to DTO class instances
  })
);
```

### 3.3 API Documentation

**Package**: `@nestjs/swagger` (11.2.1)

**Features**:
- Auto-generated OpenAPI 3.0 specification
- Swagger UI at `/api/docs`
- API key authentication scheme
- DTO schema generation from TypeScript types
- Example request/response generation

**Configuration** (`main.ts`):
```typescript
const config = new DocumentBuilder()
  .setTitle('RosterHub API')
  .setDescription('OneRoster Japan Profile 1.2.2 Integration Hub API')
  .setVersion('1.0')
  .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
  .build();
```

**Decorators Used**:
- `@ApiTags()`: Group endpoints by entity
- `@ApiOperation()`: Endpoint description
- `@ApiResponse()`: Response schema and status codes
- `@ApiProperty()`: DTO property metadata
- `@ApiQuery()`: Query parameter documentation

---

## 4. Database and ORM

### 4.1 PostgreSQL

**Version**: 15.x (Alpine Linux Docker image)

**Key Features Used**:
- **JSONB**: Store Japan Profile metadata extensions
- **UUID**: Primary keys for all entities
- **Indexes**: B-tree, composite, partial indexes
- **Transactions**: Prisma transaction support
- **Full-text search**: Future enhancement for text search
- **Constraints**: Foreign keys, unique constraints, check constraints

**Performance Configuration** (production):
- `max_connections`: 100
- `shared_buffers`: 256MB
- `effective_cache_size`: 1GB
- `work_mem`: 4MB
- `maintenance_work_mem`: 64MB

**Connection Pooling**:
- Prisma connection pool size: 10 connections
- Connection timeout: 10 seconds
- Query timeout: 30 seconds

### 4.2 Prisma ORM

**Version**: 6.19.0 (`prisma` CLI + `@prisma/client`)

**Prisma Components**:
- **Prisma Schema**: Declarative data model (`prisma/schema.prisma`)
- **Prisma Client**: Auto-generated type-safe query builder
- **Prisma Migrate**: Schema migration tool
- **Prisma Studio**: Database GUI (development only)

**Prisma Schema Configuration**:
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Key Prisma Features Used**:
- **Type safety**: Auto-generated TypeScript types from schema
- **Relations**: One-to-many, many-to-many, self-referencing
- **Enums**: OneRoster specification enums
- **JSONB**: Flexible metadata storage
- **Migrations**: Version-controlled schema changes
- **Soft deletes**: Status-based logical deletion
- **Indexes**: Performance optimization

**Prisma Client Usage Pattern**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type-safe query
const users = await prisma.user.findMany({
  where: { status: 'active', role: 'student' },
  orderBy: { dateLastModified: 'desc' },
  take: 100,
  skip: 0,
});
```

### 4.3 Database Migrations

**Strategy**: Prisma Migrate (declarative migrations)

**Migration Workflow**:
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name {migration_name}`
3. Prisma generates SQL migration file
4. Migration applied to development database
5. Commit migration files to Git
6. Deploy to production: `npx prisma migrate deploy`

**Migration Files Location**: `prisma/migrations/`

**Example Migration**:
```sql
-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourcedId" VARCHAR(255) NOT NULL,
    "givenName" VARCHAR(255) NOT NULL,
    "familyName" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_sourcedId_key" ON "users"("sourcedId");
CREATE INDEX "users_dateLastModified_idx" ON "users"("dateLastModified");
```

---

## 5. Caching and Background Jobs

### 5.1 Redis

**Version**: 7.x (Alpine Linux Docker image)

**Use Cases**:
1. **API Key Validation Cache**: 5-minute TTL for validated API keys
2. **Rate Limiting**: Sliding window algorithm with sorted sets
3. **BullMQ Job Queue**: Background job storage
4. **Session Store**: Future enhancement for user sessions

**Connection** (`ioredis` package):
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
```

**Redis Data Structures Used**:
- **Strings**: API key cache (`api-key:{key}`)
- **Sorted Sets**: Rate limiting sliding window
- **Lists**: BullMQ job queues
- **Hashes**: Job metadata

### 5.2 BullMQ

**Version**: 5.63.1

**Features**:
- Redis-based job queue
- Retry mechanisms with exponential backoff
- Job priority and delayed jobs
- Job status tracking (pending, processing, completed, failed)
- Concurrency control
- Event-driven job lifecycle

**Queue Configuration**:
```typescript
import { Queue, Worker } from 'bullmq';

const csvImportQueue = new Queue('csv-import', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
    removeOnFail: { count: 1000 },    // Keep last 1000 failed jobs
  },
});
```

**Worker Configuration**:
```typescript
const csvImportWorker = new Worker('csv-import', async (job) => {
  // Process CSV import job
  await csvImportService.importCsv(job.data);
}, {
  connection: redis,
  concurrency: 5, // Process 5 jobs concurrently
});
```

---

## 6. CSV Processing

### 6.1 CSV Parsing

**Package**: `csv-parse` (6.1.0)

**Features**:
- Streaming parser for large files (100MB+)
- Column header mapping
- Type conversion
- Error handling

**Usage Pattern**:
```typescript
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

const fileStream = createReadStream('users.csv');
const parser = fileStream.pipe(
  parse({
    columns: true,           // Use first row as column names
    skip_empty_lines: true,
    trim: true,
    cast: false,             // Keep all values as strings
    relax_column_count: true,
  })
);

for await (const row of parser) {
  // Process each row
}
```

### 6.2 CSV Generation

**Package**: `csv-stringify` (6.6.0)

**Features**:
- Streaming CSV generation
- Column header customization
- Quote handling
- Delimiter configuration

**Usage Pattern**:
```typescript
import { stringify } from 'csv-stringify';
import { createWriteStream } from 'fs';

const output = createWriteStream('users.csv');
const stringifier = stringify({
  header: true,
  columns: ['sourcedId', 'givenName', 'familyName', 'role', 'status'],
  quoted: true,
});

stringifier.pipe(output);
users.forEach(user => stringifier.write(user));
stringifier.end();
```

### 6.3 File Upload

**Package**: `@types/multer` (2.0.0) + `@nestjs/platform-express`

**Configuration**:
- Max file size: 50MB (configurable via `CSV_UPLOAD_MAX_SIZE`)
- Allowed MIME types: `text/csv`, `application/vnd.ms-excel`
- Storage: Local disk (`uploads/` directory)
- File validation: MIME type, extension, magic number

**Usage**:
```typescript
@Post('import')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: csvFileFilter,
}))
async importCsv(@UploadedFile() file: Express.Multer.File) {
  // Handle CSV file upload
}
```

---

## 7. Security

### 7.1 Authentication

**Package**: `bcryptjs` (3.0.3)

**Use Case**: API key hashing

**Configuration**:
- Salt rounds: 10
- Hash algorithm: bcrypt (Blowfish cipher)

**Usage**:
```typescript
import * as bcrypt from 'bcryptjs';

// Hash API key
const hashedKey = await bcrypt.hash(apiKey, 10);

// Verify API key
const isValid = await bcrypt.compare(apiKey, hashedKey);
```

### 7.2 IP Address Parsing

**Package**: `ipaddr.js` (1.9.1)

**Use Case**: IP whitelist validation, CIDR notation support

**Usage**:
```typescript
import * as ipaddr from 'ipaddr.js';

const ip = ipaddr.parse('192.168.1.100');
const range = ipaddr.parseCIDR('192.168.1.0/24');
const isInRange = ip.match(range);
```

### 7.3 UUID Generation

**Package**: `uuid` (11.1.0)

**Use Case**: Generate unique identifiers for jobs, sessions

**Usage**:
```typescript
import { v4 as uuidv4 } from 'uuid';

const jobId = uuidv4(); // e.g., '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
```

---

## 8. Development Tools

### 8.1 Code Quality

**ESLint** (9.18.0):
- Configuration: `eslint.config.mjs`
- Extends: `@eslint/js`, `typescript-eslint`
- Plugins: `eslint-plugin-prettier`
- Rules: TypeScript recommended + custom rules

**Prettier** (3.4.2):
- Configuration: `.prettierrc`
- Format on save enabled
- Integration with ESLint

**Configuration** (`.prettierrc`):
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

### 8.2 Testing

**Jest** (30.0.0):
- Test framework for unit and E2E tests
- Coverage reporting
- TypeScript support via `ts-jest`

**Supertest** (7.0.0):
- HTTP assertion library for E2E tests

**Configuration** (`package.json`):
```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

**Test Scripts**:
- `npm run test`: Run unit tests
- `npm run test:watch`: Watch mode
- `npm run test:cov`: Coverage report
- `npm run test:e2e`: E2E tests

### 8.3 Build Tools

**NestJS CLI** (11.0.0):
- Scaffold modules, controllers, services
- Build and bundle application
- Development mode with hot reload

**TypeScript Compiler** (`tsc`):
- Transpile TypeScript to JavaScript
- Generate type declaration files
- Source map generation

**Build Configuration** (`nest-cli.json`):
```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["**/*.prisma"],
    "watchAssets": true
  }
}
```

---

## 9. Containerization and Deployment

### 9.1 Docker

**Version**: 24.x

**Dockerfile Strategy**: Multi-stage build

**Stages**:
1. **Dependencies**: Install production dependencies only
2. **Build**: Install all dependencies, build application
3. **Production**: Copy built app and production dependencies

**Dockerfile** (simplified):
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Image Optimization**:
- Alpine Linux base (minimal size)
- Multi-stage build (reduces final image size by 60%)
- Non-root user (`nestjs`) for security
- Health check endpoint
- Dumb-init for proper signal handling

### 9.2 Docker Compose

**Version**: 2.x

**Services**:
- `postgres`: PostgreSQL 15 database
- `redis`: Redis 7 cache and job queue
- `api`: NestJS API application
- `nginx`: Reverse proxy (production profile)
- `adminer`: Database management UI (development profile)

**Network**: Bridge network (`rosterhub-network`)

**Volumes**:
- `postgres_data`: Database persistence
- `redis_data`: Redis persistence
- `./uploads`: CSV file uploads
- `./logs`: Application logs

**Environment Variables** (`.env`):
```bash
# Database
POSTGRES_USER=rosterhub
POSTGRES_PASSWORD=rosterhub_dev_password
POSTGRES_DB=rosterhub_dev

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=rosterhub_redis

# API
API_PORT=3000
NODE_ENV=production
```

### 9.3 Production Deployment

**Deployment Targets**:
- **Docker Swarm**: Multi-node orchestration
- **Kubernetes**: Advanced orchestration (future)
- **Cloud Platforms**: AWS ECS, Google Cloud Run, Azure Container Instances

**Health Checks**:
- HTTP health endpoint: `GET /health`
- Liveness probe: Check if application is running
- Readiness probe: Check if application can accept traffic

**Monitoring** (future):
- Prometheus metrics export
- Grafana dashboards
- Sentry error tracking
- CloudWatch logs (AWS)

---

## 10. CI/CD Pipeline

### 10.1 GitHub Actions

**Workflows**:
1. **CI Pipeline** (`.github/workflows/ci.yml`):
   - Lint code (ESLint + Prettier)
   - Run unit tests (Jest)
   - Run E2E tests (Jest + Supertest)
   - Build Docker image
   - Security scan (Trivy)

2. **CD Pipeline** (`.github/workflows/cd.yml`):
   - Deploy to staging (auto-deploy on `main` branch)
   - Deploy to production (manual approval)
   - Database migrations
   - Health check verification
   - Rollback on failure

**CI Pipeline Stages**:
```yaml
jobs:
  lint:
    - ESLint check
    - Prettier format check

  test:
    - Setup PostgreSQL service
    - Setup Redis service
    - Run Prisma migrations
    - Run unit tests with coverage
    - Upload coverage to Codecov

  build:
    - Build Docker image
    - Push to Docker Hub (main branch only)

  security:
    - Run Trivy vulnerability scanner
    - Upload results to GitHub Security
```

**CD Pipeline Stages**:
```yaml
jobs:
  deploy-staging:
    - Pull latest Docker image
    - SSH to staging server
    - Run docker-compose up
    - Apply Prisma migrations
    - Health check

  deploy-production:
    - Manual approval required
    - Create database backup
    - Pull latest Docker image
    - SSH to production server
    - Run docker-compose up
    - Apply Prisma migrations
    - Health check
    - Rollback on failure
```

### 10.2 Development Workflow

**Branch Strategy**: Git Flow
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `hotfix/*`: Hotfix branches

**Code Review Process**:
1. Create feature branch from `develop`
2. Implement feature with tests
3. Run linter and tests locally
4. Create pull request to `develop`
5. CI pipeline runs automatically
6. Code review by team member
7. Merge to `develop` after approval
8. Release to `main` for production deployment

---

## 11. Environment Configuration

### 11.1 Environment Variables

**Categories**:

**Database**:
- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name

**Redis**:
- `REDIS_HOST`: Redis hostname
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: Redis password

**API**:
- `PORT`: API server port (default: 3000)
- `API_PREFIX`: API path prefix (default: `api/v1`)
- `NODE_ENV`: Environment (`development`, `production`)
- `CORS_ORIGINS`: Allowed CORS origins

**Security**:
- `API_KEY_ENABLED`: Enable API key authentication (default: `true`)
- `IP_WHITELIST_ENABLED`: Enable IP whitelist (default: `false`)
- `RATE_LIMIT_ENABLED`: Enable rate limiting (default: `true`)
- `RATE_LIMIT_TTL`: Rate limit window in seconds (default: 60)
- `RATE_LIMIT_MAX`: Max requests per window (default: 100)

**OneRoster**:
- `ONEROSTER_VERSION`: OneRoster version (default: `1.2`)
- `JAPAN_PROFILE_VERSION`: Japan Profile version (default: `1.2.2`)

**CSV**:
- `CSV_UPLOAD_MAX_SIZE`: Max CSV file size in bytes (default: 52428800 = 50MB)
- `CSV_BATCH_SIZE`: CSV batch insert size (default: 1000)

### 11.2 Configuration Loading

**Package**: `@nestjs/config` (4.0.2)

**Configuration Files**:
- `src/config/app.config.ts`: Application configuration
- `src/config/database.config.ts`: Database configuration

**Loading Strategy**:
```typescript
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}
```

**Type-safe Configuration**:
```typescript
// app.config.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
});
```

---

## 12. Dependencies

### 12.1 Production Dependencies

**Core Framework** (11.x):
```json
{
  "@nestjs/common": "^11.0.1",
  "@nestjs/core": "^11.0.1",
  "@nestjs/platform-express": "^11.1.9",
  "@nestjs/config": "^4.0.2",
  "@nestjs/swagger": "^11.2.1"
}
```

**Database** (6.x):
```json
{
  "@prisma/client": "^6.19.0"
}
```

**Validation**:
```json
{
  "class-validator": "^0.14.2",
  "class-transformer": "^0.5.1"
}
```

**CSV Processing**:
```json
{
  "csv-parse": "^6.1.0",
  "csv-stringify": "^6.6.0"
}
```

**Background Jobs**:
```json
{
  "bullmq": "^5.63.1",
  "ioredis": "^5.8.2"
}
```

**Security**:
```json
{
  "bcryptjs": "^3.0.3",
  "ipaddr.js": "^1.9.1",
  "uuid": "^11.1.0"
}
```

**Utilities**:
```json
{
  "rxjs": "^7.8.1",
  "reflect-metadata": "^0.2.2"
}
```

### 12.2 Development Dependencies

**TypeScript**:
```json
{
  "typescript": "^5.7.3",
  "typescript-eslint": "^8.20.0",
  "@types/node": "^22.19.1",
  "@types/express": "^5.0.0",
  "@types/bcryptjs": "^2.4.6",
  "@types/uuid": "^10.0.0",
  "@types/multer": "^2.0.0"
}
```

**Testing**:
```json
{
  "jest": "^30.0.0",
  "ts-jest": "^29.2.5",
  "supertest": "^7.0.0",
  "@types/jest": "^30.0.0",
  "@types/supertest": "^6.0.2"
}
```

**Build Tools**:
```json
{
  "@nestjs/cli": "^11.0.0",
  "@nestjs/schematics": "^11.0.0",
  "@nestjs/testing": "^11.0.1",
  "ts-node": "^10.9.2",
  "ts-loader": "^9.5.2",
  "tsconfig-paths": "^4.2.0"
}
```

**Code Quality**:
```json
{
  "eslint": "^9.18.0",
  "eslint-config-prettier": "^10.0.1",
  "eslint-plugin-prettier": "^5.2.2",
  "prettier": "^3.4.2"
}
```

**Database**:
```json
{
  "prisma": "^6.19.0"
}
```

---

## 13. Performance Optimization

### 13.1 Application-Level

- **Connection Pooling**: Prisma connection pool (10 connections)
- **Redis Caching**: API key validation cache (5-minute TTL)
- **Query Optimization**: Prisma select/include for efficient queries
- **Batch Processing**: CSV imports use 1000-record batches
- **Streaming**: CSV parsing with streaming for large files

### 13.2 Database-Level

- **Indexes**: All foreign keys, dateLastModified, status fields
- **Composite Indexes**: Multi-column indexes for common queries
- **Partial Indexes**: Future optimization for filtered queries
- **JSONB Indexing**: GIN indexes for metadata queries

### 13.3 Future Optimizations

- **Response Caching**: Cache read-heavy endpoints with Redis
- **Database Read Replicas**: Separate read/write databases
- **GraphQL DataLoader**: Batch and cache database queries
- **CDN**: Cache static assets and API documentation
- **Horizontal Scaling**: Load balancer + multiple API servers

---

## 14. Security Best Practices

### 14.1 Applied Security Measures

- **API Key Authentication**: bcrypt-hashed keys with Redis caching
- **IP Whitelist**: Per-API-key IP restriction
- **Rate Limiting**: Sliding window algorithm with Redis
- **Input Validation**: class-validator for all DTOs
- **SQL Injection Prevention**: Prisma query builder
- **XSS Prevention**: Express.js helmet middleware (future)
- **CORS Configuration**: Configurable allowed origins
- **Audit Logging**: Comprehensive audit trail for all operations

### 14.2 Dependency Security

- **Dependabot**: Automated security updates (GitHub)
- **npm audit**: Regular vulnerability scans
- **Trivy**: Docker image vulnerability scanning
- **OWASP Top 10**: Compliance with OWASP security standards

---

## 15. Technical Constraints

### 15.1 OneRoster Specification Compliance

- **OneRoster v1.2**: REST API specification
- **Japan Profile 1.2.2**: Japan-specific extensions
- **CSV Format**: OneRoster CSV bulk data format
- **Filter Syntax**: OneRoster query filter expressions
- **Pagination**: Offset-based pagination (limit/offset)

### 15.2 Performance Requirements

- **CSV Import**: Handle 200,000+ records in 30 minutes
- **API Response Time**: < 200ms for 95th percentile
- **Concurrent Users**: Support 100+ concurrent API requests
- **Database Queries**: < 100ms for indexed queries

### 15.3 Compatibility Requirements

- **Node.js**: 20.x LTS only (no support for older versions)
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **Docker**: 24.x or higher

---

## Summary

RosterHub uses a modern, enterprise-grade technology stack:

**Core Stack**:
- Node.js 20.x + TypeScript 5.7 + NestJS 11.x
- PostgreSQL 15 + Prisma ORM 6.19
- Redis 7.x + BullMQ 5.63

**Key Technologies**:
- **Framework**: NestJS (modular, dependency injection, TypeScript-first)
- **ORM**: Prisma (type-safe, migrations, excellent DX)
- **Validation**: class-validator + class-transformer
- **Background Jobs**: BullMQ with Redis
- **CSV Processing**: csv-parse + csv-stringify (streaming)
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

**Development Tools**:
- ESLint + Prettier (code quality)
- Jest + Supertest (testing)
- Prisma Studio (database GUI)
- Docker Compose (local development)

This stack provides:
- **Type Safety**: TypeScript + Prisma end-to-end
- **Scalability**: Stateless API, background jobs, caching
- **Developer Experience**: Hot reload, auto-generated types, Swagger UI
- **Production-Ready**: Docker, CI/CD, health checks, monitoring
- **Security**: API key auth, rate limiting, audit logging, vulnerability scanning
