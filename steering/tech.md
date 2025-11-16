# Technology Stack - RosterHub

## Overview
This document defines the technology choices, framework decisions, and technical constraints for RosterHub. All development must align with these technical decisions to ensure consistency, maintainability, and optimal performance.

**Last Updated**: 2025-11-15 (Updated by Steering Agent - Sprint 5 Security Implementation)

---

## Core Technologies

### OneRoster-Specific Requirements

This section documents technologies specifically chosen for OneRoster Japan Profile 1.2.2 compliance:

**CSV Processing**:
- **Library**: csv-parse 5.x
- **Justification**:
  - Streaming parser handles large CSV files (200,000+ records) efficiently
  - Built-in BOM (Byte Order Mark) handling for UTF-8 Japanese files
  - Memory-efficient processing (no need to load entire file into memory)
  - Automatic column header parsing
  - Handles quoted fields with Japanese characters
- **Configuration**:
  - `encoding: 'utf8'`
  - `bom: true` (detect and strip UTF-8 BOM)
  - `columns: true` (use first row as column names)
  - `skip_empty_lines: true`

**Background Job Processing**:
- **Library**: BullMQ 4.x (Redis-based job queue)
- **Justification**:
  - CSV import jobs can take 5-10 minutes for large files
  - Job progress tracking (processed records count)
  - Retry logic for failed record batches
  - Job prioritization (urgent imports first)
  - Redis-backed persistence (jobs survive server restarts)
- **Use Cases**:
  - CSV import processing (asynchronous, non-blocking)
  - CSV export generation (large datasets)
  - Bulk API data exports

**Database JSON Storage**:
- **Feature**: PostgreSQL JSONB columns
- **Justification**:
  - Japan Profile extensions stored in `metadata.jp.*` namespace
  - JSONB allows efficient querying of Japanese-specific fields (e.g., `metadata.jp.kanaGivenName`)
  - Schema flexibility for future Japan Profile updates without migrations
  - Indexable JSON fields for performance
- **Usage**:
  - User.metadata: `{ jp: { kanaGivenName, kanaFamilyName, kanaMiddleName, homeClass } }`
  - Org.metadata: `{ jp: { ... } }`
  - All OneRoster entities support metadata.jp extensions

**API Authentication**:
- **Method**: API Key + IP Whitelist
- **Justification**:
  - OneRoster specification recommends API key-based authentication
  - IP whitelist provides additional security layer (school network restrictions)
  - Simpler than OAuth 2.0 for system-to-system integration
- **Implementation**:
  - API keys stored in database (bcrypt hashed)
  - Per-organization API keys with scope restrictions
  - Rate limiting per API key (1000 requests/hour default)

**Audit Logging**:
- **Requirements**: GDPR/Japanese privacy law compliance
- **Implementation**:
  - NestJS Interceptors for automatic logging
  - Winston or Pino for structured JSON logs
  - Logs stored in PostgreSQL `AuditLog` table
- **Logged Data**:
  - All CRUD operations on OneRoster entities
  - API key used, IP address, timestamp
  - Before/after values for UPDATE operations
  - CSV import/export operations

**Delta Sync Implementation**:
- **Strategy**: `dateLastModified` timestamp-based filtering
- **Database Indexes**:
  - `@@index([dateLastModified])` on all OneRoster entities
  - Composite index: `@@index([dateLastModified, status])` for performance
- **API Endpoint**: `GET /oneroster/v1/{entity}?filter=dateLastModified>2025-01-01T00:00:00Z`
- **Justification**: OneRoster Delta API pattern for incremental sync

---

### Sprint 5: Security Technologies (Completed ✅)

This section documents security-specific technologies implemented in Sprint 5.

**IP Address Validation**:
- **Library**: ipaddr.js 1.9+
- **Justification**:
  - Robust IPv4 and IPv6 address parsing
  - CIDR range matching support (e.g., `192.168.1.0/24`, `2001:db8::/32`)
  - Handles IPv4-mapped IPv6 addresses (`::ffff:192.168.1.100`)
  - Well-tested, production-ready library
- **Usage**: IP whitelist validation in `IpWhitelistGuard`

**Cryptography**:
- **Library**: Node.js crypto (built-in) + bcryptjs 3.0+
- **API Key Generation**: `crypto.randomBytes(32).toString('hex')` (64 hex characters)
- **Password Hashing**: bcryptjs with 12 salt rounds
- **Justification**:
  - crypto module provides cryptographically secure random generation
  - bcryptjs is slower than bcrypt (native), but pure JS (no compilation issues)
  - 12 salt rounds balances security and performance (~200-300ms)
- **Security Standards**:
  - OWASP-compliant password hashing
  - Secure API key generation (256-bit entropy)

**Redis for Security**:
- **Use Cases** (Sprint 5):
  - **API Key Caching**: 5-minute TTL for validated API keys (reduces database load)
  - **Rate Limiting**: Sliding window implementation with sorted sets
  - **Fail-Open Strategy**: Allow requests if Redis is unavailable (prioritize availability)
- **Configuration**:
  - Host: `REDIS_HOST` (default: localhost)
  - Port: `REDIS_PORT` (default: 6379)
  - Key Prefix: `rosterhub:` (namespace for all keys)
  - Connection Retry: Exponential backoff (max 2 seconds)

**NestJS Security Guards** (Execution Order):
1. **ApiKeyGuard** (`common/guards/api-key.guard.ts`)
   - Validates X-API-Key header
   - Redis cache lookup → database validation fallback
   - Attaches API key metadata to request object

2. **IpWhitelistGuard** (`common/guards/ip-whitelist.guard.ts`)
   - Validates client IP against API key's whitelist
   - Supports IPv4, IPv6, CIDR ranges
   - Uses `ipaddr.js` for parsing

3. **RateLimitGuard** / **RateLimitSlidingWindowGuard** (`common/guards/rate-limit*.guard.ts`)
   - Token bucket (simple) or sliding window (advanced) algorithms
   - Default: 1000 requests/hour per API key
   - Sets rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

**Audit Logging**:
- **Implementation**: NestJS Interceptor (`common/interceptors/audit.interceptor.ts`)
- **Storage**: PostgreSQL (AuditLog table) + Console (structured JSON)
- **Features**:
  - Request/response capture (method, path, body, status, duration)
  - Entity context extraction (entity type, action, sourcedId)
  - Data sanitization (remove passwords, tokens, API keys)
  - GDPR compliance (data access logging, retention policy)

**Security Testing**:
- **Unit Tests**: 26 tests across guards (15 IP whitelist + 11 rate limit)
- **Test Coverage**:
  - IPv4/IPv6 exact match and CIDR ranges
  - Rate limit enforcement and window reset
  - Header extraction (X-Forwarded-For, X-Real-IP)
  - Error handling (invalid IPs, cache failures)

---

## Core Technologies

### Programming Languages

**Primary Language**: TypeScript
- **Version**: TypeScript 5.3+
- **Justification**:
  - Type safety reduces runtime errors and improves code quality
  - Excellent IDE support with IntelliSense and refactoring tools
  - Shared language across frontend and backend enables code reuse
  - Large ecosystem and community support
  - Modern ECMAScript features with backward compatibility

**Additional Languages**:
- **SQL**: Database queries and Prisma migrations
- **Bash/Shell**: Build scripts, deployment automation, CI/CD tasks

---

## Framework & Libraries

### Frontend

**Primary Framework**: React 18.3+
- **Justification**: Industry-standard, large ecosystem, excellent performance with concurrent features
- **Key Features Used**:
  - React Server Components (via Next.js)
  - Concurrent rendering
  - Suspense for data fetching
  - Error boundaries

**Meta Framework**: Next.js 14+
- **Version**: 14.x (App Router)
- **Justification**:
  - Built-in SSR/SSG for better SEO and initial page load
  - App Router provides better developer experience and performance
  - API routes for backend-for-frontend (BFF) patterns if needed
  - Automatic code splitting and optimization
  - Vercel deployment integration
- **Configuration**: App Router (not Pages Router)

**UI Component Library**: shadcn/ui + Radix UI
- **Justification**:
  - Copy-paste components provide full control and customization
  - Built on Radix UI primitives (accessible, unstyled)
  - Integrates seamlessly with Tailwind CSS
  - No runtime overhead, components become part of your codebase
- **Key Components**: Button, Dialog, Form, Card, Calendar, Dropdown, Toast

**Styling**: Tailwind CSS 3.4+
- **Justification**:
  - Utility-first approach for rapid development
  - Consistent design system via configuration
  - Small bundle size (unused styles purged)
  - Excellent dark mode support
  - Mobile-first responsive design
- **Plugins**:
  - @tailwindcss/forms (form styling)
  - @tailwindcss/typography (rich text content)
  - tailwindcss-animate (animations for shadcn/ui)

**State Management**: Zustand 4.x
- **Justification**:
  - Simpler API than Redux, less boilerplate
  - Hook-based API fits React patterns
  - Small bundle size (~1KB)
  - No Context Provider wrapper needed
  - TypeScript support out of the box
- **Use Cases**: Global UI state, user preferences, cached data

**Server State**: TanStack Query (React Query) 5.x
- **Justification**:
  - Declarative data fetching with automatic caching
  - Built-in loading/error states
  - Automatic background refetching
  - Optimistic updates for better UX
  - Request deduplication
- **Use Cases**: API data fetching, server state synchronization

**Forms**: React Hook Form 7.x + Zod
- **Justification**:
  - Performant (uncontrolled components)
  - Minimal re-renders
  - Built-in validation with Zod schema
  - TypeScript type inference from schemas
  - Small bundle size
- **Validation**: Zod for schema-based validation

**Date/Time**: date-fns 3.x
- **Justification**:
  - Modular (tree-shakeable)
  - Immutable date operations
  - Consistent API
  - Better timezone handling than moment.js
  - Smaller bundle size than moment.js

**Calendar/Scheduler UI**:
- **Primary**: Custom-built calendar component using shadcn/ui Calendar
- **Alternative (if needed)**: FullCalendar or React Big Calendar
- **Justification**: Full control over scheduling UI is critical for core product experience

---

### Backend

**Primary Framework**: NestJS 10.x
- **Justification**:
  - Enterprise-grade architecture out of the box
  - TypeScript-first framework
  - Modular structure aligns with domain-driven design
  - Built-in dependency injection
  - Excellent testing support
  - GraphQL and WebSocket support if needed later
  - Extensive ecosystem (Passport, Swagger, etc.)

**API Style**: REST (RESTful APIs)
- **Version**: API v1 (`/api/v1/...`)
- **Documentation**: OpenAPI 3.0 (Swagger)
- **Justification**:
  - Simple, well-understood by all developers
  - Easy to cache with HTTP caching
  - Better browser compatibility than GraphQL
  - Sufficient for RosterHub's data fetching patterns

**ORM**: Prisma 5.x
- **Justification**:
  - Type-safe database client
  - Excellent TypeScript integration
  - Intuitive schema definition language
  - Auto-generated migrations
  - Built-in connection pooling
  - Excellent performance
- **Features Used**:
  - Migrations
  - Prisma Client for queries
  - Prisma Studio for database GUI

**Authentication**: Passport.js + JWT
- **Strategy**: JWT (JSON Web Tokens)
- **Passport Strategies**:
  - `passport-local` for email/password
  - `passport-google-oauth20` for Google SSO (future)
  - `passport-jwt` for token validation
- **Justification**:
  - Stateless authentication (scales horizontally)
  - Standard JWT format
  - Passport provides consistent authentication API

**Validation**: class-validator + class-transformer
- **Justification**:
  - Decorator-based validation fits NestJS patterns
  - Automatic DTO validation with ValidationPipe
  - TypeScript support
- **Use Cases**: Request DTO validation, data transformation

**Task Queue**: Bull 4.x (Redis-based)
- **Justification**:
  - Reliable job processing
  - Built on Redis (already in stack)
  - Job scheduling and retries
  - Priority queues
- **Use Cases**:
  - Schedule notifications (email, push)
  - Compliance report generation
  - Data export jobs

---

### Database

**Primary Database**: PostgreSQL 15+
- **Justification**:
  - ACID compliance for critical scheduling data
  - Complex queries and joins (schedules with employees)
  - JSON support for flexible metadata
  - Excellent performance for OLTP workloads
  - Row-level security for multi-tenant architecture
  - Mature, battle-tested, open-source
- **Hosting**:
  - Development: Docker container
  - Production: AWS RDS PostgreSQL or Supabase

**Cache Layer**: Redis 7.x
- **Justification**:
  - Fast in-memory cache for frequently accessed data
  - Session storage
  - Bull queue backend
  - Pub/Sub for real-time notifications (if needed)
- **Use Cases**:
  - Session storage
  - API response caching
  - Rate limiting
  - Bull job queue
- **Hosting**:
  - Development: Docker container
  - Production: AWS ElastiCache or Upstash Redis

**Database Schema Versioning**: Prisma Migrations
- **Strategy**: Forward-only migrations
- **Backup**: Automated daily backups with 30-day retention

---

## Development Tools

### Package Management
- **Package Manager**: pnpm 8.x
- **Justification**:
  - Faster than npm/yarn (disk space efficient with symlinks)
  - Better monorepo support
  - Strict dependency resolution prevents phantom dependencies
- **Lock File**: `pnpm-lock.yaml`
- **Workspace**: Monorepo with `pnpm-workspace.yaml`

### Monorepo Management
- **Tool**: Turborepo 1.x
- **Justification**:
  - Incremental builds (only rebuild changed packages)
  - Remote caching for CI/CD
  - Task pipelines
  - Excellent monorepo performance
- **Configuration**: `turbo.json`

### Build Tools

**Frontend Bundler**: Next.js built-in (Turbopack in future)
- **Current**: Webpack 5 (Next.js default)
- **Future**: Turbopack (when stable)
- **Justification**: Next.js handles bundling, no additional configuration needed

**Backend Bundler**: TypeScript Compiler (tsc) + NestJS CLI
- **Justification**: Simple, standard, works well with NestJS

**Code Transpilation**:
- **Frontend**: SWC (Next.js default, 20x faster than Babel)
- **Backend**: TypeScript compiler (tsc)

---

### Testing

**Unit Testing**: Vitest
- **Justification**:
  - Vite-powered (extremely fast)
  - Jest-compatible API (easy migration)
  - Native ESM support
  - Better TypeScript support than Jest
- **Coverage Target**: 80% minimum
- **Configuration**: `vitest.config.ts`

**Component Testing**: React Testing Library
- **Justification**:
  - Encourages testing user behavior, not implementation
  - Accessibility-first queries
  - Works seamlessly with Vitest
- **Principles**: Test components as users interact with them

**E2E Testing**: Playwright
- **Justification**:
  - Modern, fast, reliable E2E testing
  - Multi-browser support (Chromium, Firefox, WebKit)
  - Better debugging experience than Cypress
  - Excellent documentation
  - Built-in auto-waiting (no flaky tests)
- **Use Cases**: Critical user flows (login, schedule creation, shift swaps)

**API Testing**: Supertest (NestJS E2E)
- **Justification**: Standard for NestJS testing, simple HTTP assertion library

**Test Coverage Target**: 80% overall
- Unit tests: 85%
- Integration tests: 75%
- E2E tests: Critical user paths only

---

### Code Quality

**Linter**: ESLint 8.x
- **Configurations**:
  - `eslint:recommended`
  - `plugin:@typescript-eslint/recommended`
  - `plugin:react/recommended` (frontend)
  - `plugin:react-hooks/recommended` (frontend)
  - `next/core-web-vitals` (Next.js)
- **Custom Rules**: Project-specific rules in `.eslintrc.js`

**Formatter**: Prettier 3.x
- **Configuration**: `.prettierrc`
- **Settings**:
  - Single quotes
  - 2-space indentation
  - Semicolons
  - Trailing commas (es5)
  - Line width: 100 characters
- **Integration**: ESLint + Prettier via `eslint-config-prettier`

**Type Checker**: TypeScript 5.3+
- **Strict Mode**: Enabled (`strict: true`)
- **Additional Checks**:
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `strictFunctionTypes: true`

**Pre-commit Hooks**: Husky 8.x + lint-staged
- **Hooks**:
  - Pre-commit: Run lint-staged (lint + format staged files)
  - Pre-push: Run tests
- **Configuration**: `.husky/` directory
- **lint-staged**: `.lintstagedrc.js`

**Commit Linting**: Commitlint
- **Convention**: Conventional Commits
- **Format**: `type(scope): subject`
- **Types**: feat, fix, docs, style, refactor, test, chore

---

## Deployment & Infrastructure

### Hosting

**Frontend Hosting**: Vercel
- **Justification**:
  - Built by Next.js creators (optimal Next.js hosting)
  - Automatic deployments from Git
  - Preview deployments for PRs
  - Edge network (fast global delivery)
  - Zero-config deployments
  - Generous free tier
- **Environment**: Serverless (Vercel Edge Functions)
- **Region**: Auto (multi-region)
- **Custom Domain**: `app.rosterhub.com`

**Backend Hosting**: AWS ECS (Elastic Container Service) or Railway
- **Option 1: AWS ECS Fargate** (for enterprise scale)
  - Containerized NestJS app
  - Auto-scaling
  - Load balancer (ALB)
  - VPC with private subnets
- **Option 2: Railway** (for MVP/early stage)
  - Simple deployment from Git
  - Built-in PostgreSQL and Redis
  - Cost-effective for small-medium scale
  - Easy scaling when needed
- **Region**: us-east-1 (primary), us-west-2 (failover)

**Database Hosting**:
- **Option 1: Supabase** (for MVP)
  - Managed PostgreSQL
  - Built-in auth (can replace custom auth later)
  - Real-time subscriptions
  - Free tier for development
- **Option 2: AWS RDS PostgreSQL** (for scale)
  - Multi-AZ deployment
  - Automated backups
  - Read replicas for scaling

**Redis Hosting**:
- **Option 1: Upstash Redis** (for MVP)
  - Serverless Redis
  - Global replication
  - Generous free tier
- **Option 2: AWS ElastiCache** (for scale)
  - Managed Redis
  - Multi-AZ replication

**CDN**: Vercel Edge Network (frontend), CloudFront (API assets if needed)

---

### CI/CD

**Pipeline**: GitHub Actions
- **Workflows**:
  - `ci.yml`: Lint, type-check, test on every push
  - `deploy-frontend.yml`: Deploy to Vercel on main branch
  - `deploy-backend.yml`: Deploy to Railway/AWS on main branch
  - `preview.yml`: Deploy preview environments for PRs
- **Caching**: npm/pnpm cache, Docker layer cache
- **Secrets**: Managed via GitHub Secrets

**Deployment Strategy**:
- **Frontend**: Automatic deployment on merge to `main` (Vercel)
- **Backend**: Automatic deployment on merge to `main` (Railway/ECS)
- **Database Migrations**: Run automatically before backend deployment
- **Rollback**: Git revert + redeploy (or Vercel rollback button)

**Environments**:
- **Development**: Local (Docker Compose)
- **Staging**: Vercel preview + Railway staging environment
- **Production**: Vercel production + Railway/ECS production

---

### Monitoring & Logging

**Application Monitoring**: Sentry
- **Justification**:
  - Excellent error tracking and debugging
  - Performance monitoring
  - Release tracking
  - Alerts for errors
  - Generous free tier
- **Scope**: Frontend + Backend

**Logging**:
- **Development**: Console logs
- **Production**:
  - Vercel logs (frontend)
  - AWS CloudWatch or Railway logs (backend)
  - Structured JSON logging with NestJS Logger

**Uptime Monitoring**: Better Uptime or UptimeRobot
- **Checks**: Every 5 minutes
- **Alerts**: Email + Slack (if downtime > 5 minutes)

**Analytics**: Vercel Analytics + PostHog
- **Vercel Analytics**: Core Web Vitals, page performance
- **PostHog**: User behavior analytics, feature flags
- **Justification**: Privacy-friendly, self-hostable, comprehensive feature set

**Metrics & Dashboards**:
- **Option 1**: Vercel Dashboard + Railway Dashboard (simple)
- **Option 2**: Grafana + Prometheus (advanced, if needed)

---

## Technical Constraints

### Performance Requirements

**Page Load Time**:
- First Contentful Paint (FCP): < 1.5 seconds
- Largest Contentful Paint (LCP): < 2.5 seconds
- Time to Interactive (TTI): < 3.5 seconds
- First Input Delay (FID): < 100ms

**API Response Time**:
- 95th percentile: < 200ms
- 99th percentile: < 500ms
- Average: < 100ms

**Concurrent Users**:
- Phase 1 (MVP): Support 100 concurrent users
- Phase 2: Support 1,000 concurrent users
- Phase 3: Support 10,000 concurrent users

**Database Query Performance**:
- Simple queries: < 50ms
- Complex queries (with joins): < 200ms
- Use database indexes for frequently queried fields

---

### Browser/Platform Support

**Desktop Browsers**:
- Chrome 100+ (primary)
- Firefox 100+
- Safari 15+
- Edge 100+

**Mobile Browsers**:
- iOS Safari 15+ (iPhone/iPad)
- Chrome Mobile 100+ (Android)

**Mobile Platforms** (for native apps in Phase 2):
- iOS 14+
- Android 10+

**Node.js Version**:
- Development: Node.js 20.x LTS
- Production: Node.js 20.x LTS

**Screen Sizes**:
- Mobile: 375px - 767px (primary: employees)
- Tablet: 768px - 1023px
- Desktop: 1024px+ (primary: managers)

---

### Security Requirements

**Authentication**:
- JWT tokens with 15-minute expiration
- Refresh tokens with 7-day expiration
- Secure HTTP-only cookies for refresh tokens
- OAuth 2.0 for Google/Microsoft SSO (future)

**Authorization**:
- Role-Based Access Control (RBAC)
- Roles: SuperAdmin, OrgAdmin, Manager, Employee
- Resource-level permissions (can only edit own organization's data)

**Data Encryption**:
- TLS 1.3 for all communications
- At-rest encryption for database (AWS RDS encryption)
- Environment variables for secrets (never commit to Git)
- Password hashing: bcrypt with 12 salt rounds

**Secret Management**:
- Development: `.env.local` (gitignored)
- Production: Vercel Environment Variables + AWS Secrets Manager (or Railway)

**Rate Limiting**:
- API: 100 requests per minute per IP
- Authentication: 5 failed login attempts = 15-minute lockout
- Implementation: Redis + NestJS Throttler

**Security Headers**:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)

**OWASP Top 10 Protection**:
- SQL Injection: Prisma parameterized queries
- XSS: React auto-escaping + Content Security Policy
- CSRF: SameSite cookies + CSRF tokens
- Sensitive Data Exposure: TLS + encryption at rest

---

## Third-Party Services

### Required Services (MVP)

**Email**: SendGrid or Resend
- **Purpose**: Transactional emails (welcome, schedule published, password reset)
- **Plan**: Free tier initially (100 emails/day)

**Push Notifications**:
- **Web**: Web Push API (native browser)
- **Mobile**: Firebase Cloud Messaging (FCM) or OneSignal
- **Purpose**: Schedule changes, shift swap requests, time-off approvals

**SMS** (optional): Twilio
- **Purpose**: Critical notifications (last-minute shift changes)
- **Plan**: Pay-as-you-go (phase 2)

---

### Optional Services (Future)

**Payment Processing**: Stripe
- **Purpose**: Subscription billing
- **Plan**: Standard plan (2.9% + $0.30 per transaction)

**File Storage**: AWS S3 or Vercel Blob
- **Purpose**: Profile pictures, exported reports, uploaded documents
- **Plan**: S3 Standard or Vercel Blob storage

**Search** (if needed): Algolia or PostgreSQL full-text search
- **Purpose**: Employee search, schedule search
- **Initial**: PostgreSQL full-text search (sufficient for MVP)
- **Later**: Algolia if search becomes complex

**Calendar Integration**: Google Calendar API, Microsoft Graph API
- **Purpose**: Sync schedules to employee calendars
- **Phase**: Phase 2

---

## Technology Decisions & ADRs

### Architecture Decision Records

**ADR-001: Monorepo with pnpm + Turborepo**
- **Decision**: Use monorepo structure with pnpm workspaces and Turborepo
- **Reason**: Share types and utilities across frontend/backend, better CI/CD caching
- **Alternatives Considered**: Separate repos (harder to maintain shared code), Lerna (slower)
- **Date**: 2025-11-13

**ADR-002: Next.js App Router over Pages Router**
- **Decision**: Use Next.js 14 with App Router
- **Reason**: React Server Components improve performance, simpler data fetching, better caching
- **Alternatives Considered**: Pages Router (outdated), Remix (less mature ecosystem)
- **Date**: 2025-11-13

**ADR-003: NestJS over Express**
- **Decision**: Use NestJS as backend framework
- **Reason**: Built-in structure, TypeScript-first, excellent DI, easier to scale and maintain
- **Alternatives Considered**: Express (too minimal), Fastify (less features), tRPC (couples frontend/backend too tightly)
- **Date**: 2025-11-13

**ADR-004: PostgreSQL over MongoDB**
- **Decision**: Use PostgreSQL as primary database
- **Reason**: Relational data model fits scheduling domain, ACID compliance critical, complex queries
- **Alternatives Considered**: MongoDB (no transactions in MVP, weak consistency), MySQL (PostgreSQL has better JSON and array support)
- **Date**: 2025-11-13

**ADR-005: Zustand over Redux**
- **Decision**: Use Zustand for client state management
- **Reason**: Simpler API, less boilerplate, smaller bundle size, sufficient for RosterHub's needs
- **Alternatives Considered**: Redux Toolkit (too much boilerplate), Context API (performance issues), Jotai (less mature)
- **Date**: 2025-11-13

**ADR-006: TanStack Query for Server State**
- **Decision**: Use TanStack Query (React Query) for server state
- **Reason**: Best-in-class data fetching, caching, and synchronization
- **Alternatives Considered**: SWR (less features), Apollo Client (overkill for REST), native fetch (too low-level)
- **Date**: 2025-11-13

**ADR-007: JWT Authentication**
- **Decision**: Use JWT tokens for authentication
- **Reason**: Stateless, scales horizontally, standard format, works with Passport
- **Alternatives Considered**: Session-based (requires sticky sessions), Auth0 (added cost and dependency)
- **Date**: 2025-11-13

**ADR-008: Tailwind CSS over CSS-in-JS**
- **Decision**: Use Tailwind CSS for styling
- **Reason**: Faster development, consistent design system, better performance (no runtime), smaller bundle
- **Alternatives Considered**: Styled Components (runtime overhead), CSS Modules (verbose), Emotion (slower)
- **Date**: 2025-11-13

---

## Development Environment Setup

### Prerequisites

Install these tools before starting:

```bash
# Node.js 20.x LTS (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# pnpm 8.x
npm install -g pnpm@8

# Docker Desktop (for PostgreSQL, Redis)
# Download from https://www.docker.com/products/docker-desktop

# Git
# (Usually pre-installed on macOS/Linux)
```

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/your-org/RosterHub.git
cd RosterHub

# 2. Install dependencies
pnpm install

# 3. Start Docker services (PostgreSQL + Redis)
docker-compose up -d

# 4. Set up environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# 5. Run database migrations
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed

# 6. Start development servers (from root)
cd ../..
pnpm dev

# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# API Docs: http://localhost:4000/api
```

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "ms-playwright.playwright",
    "unifiedjs.vscode-mdx"
  ]
}
```

### Environment Variables

**Frontend (apps/web/.env.local)**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Backend (apps/api/.env)**:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/rosterhub
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d
```

---

## Sprint 5 Dependencies Summary

**New Production Dependencies**:
```json
{
  "ipaddr.js": "^1.9.1",    // IP address parsing and CIDR validation
  "bcryptjs": "^3.0.3",     // Password/API key hashing
  "ioredis": "^5.8.2"       // Redis client for rate limiting
}
```

**Existing Dependencies (Used in Sprint 5)**:
```json
{
  "@nestjs/cache-manager": "^2.x",  // Redis caching for API keys
  "class-validator": "^0.14.2",     // DTO validation
  "class-transformer": "^0.5.1"     // DTO transformation
}
```

**Development Dependencies (Testing)**:
```json
{
  "@nestjs/testing": "^11.0.1",     // NestJS testing utilities
  "jest": "^30.0.0"                 // Unit testing framework
}
```

**Total New Code (Sprint 5)**:
- Production Files: 14 files (~3,257 lines)
- Test Files: 2 files (~661 lines)
- Unit Tests: 26 tests (15 IP whitelist + 11 rate limit)

---

## Deprecated Technologies

No deprecated technologies yet.

Future deprecations will be documented here with migration plans.

---

**Note**: This document reflects the current technology stack for RosterHub. Update this document when:
- Technology versions are upgraded
- New libraries/frameworks are adopted
- Tools are deprecated or replaced
- Performance/security requirements change
- Deployment infrastructure changes

Always document the **reason** for technology decisions to maintain institutional knowledge.

**Last Updated**: 2025-11-15 (Sprint 5 Security Implementation complete - API Key management, IP whitelist, rate limiting, audit logging)
