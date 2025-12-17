# RosterHub

**OneRoster Japan Profile 1.2.2 Integration Hub**

A standardized educational data integration platform designed for Board of Education (教育委員会) deployments managing 10,000 to 200,000 users across multiple schools.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)

[日本語版 README](./README.ja.md)

---

## Overview

RosterHub is a **OneRoster Japan Profile 1.2.2** compliant integration hub that standardizes and automates educational data exchange between school information systems (校務支援システム) and learning platforms. Built for large-scale deployments at the Board of Education level.

### Key Features

- **OneRoster Japan Profile 1.2.2 Compliant**: Full support for Japanese educational data standards
- **CSV Import/Export**: Bulk data operations with streaming processing (100MB+ files, 200,000+ users)
- **REST API**: Full CRUD operations with pagination, filtering, sorting, and field selection
- **Delta/Incremental API**: Efficient synchronization with timestamp-based change tracking
- **Enterprise Security**: API key authentication, IP whitelisting, rate limiting, audit logging
- **Large-Scale Performance**: Optimized for 10,000-200,000 user organizations
- **Background Processing**: Asynchronous CSV import jobs with BullMQ
- **GDPR Compliance**: Comprehensive audit logging with data sanitization and retention policies

---

## Architecture

RosterHub is built as a **monorepo** using npm workspaces:

```
RosterHub/
├── apps/                    # Applications
│   └── api/                 # NestJS API server (primary application)
├── packages/                # Shared packages (future)
├── docs/                    # Documentation
│   ├── research/            # Research documents
│   ├── requirements/        # Requirements specifications (EARS format)
│   ├── design/              # Architecture and design documents
│   └── guides/              # Developer guides
├── steering/                # Project memory (AI agent context)
│   ├── structure.md         # Architecture patterns and conventions
│   ├── tech.md              # Technology stack
│   └── product.md           # Product context
├── .claude/                 # Musuhi SDD AI agents (20 specialized agents)
├── docker-compose.yml       # Docker services (PostgreSQL, Redis)
└── package.json             # Root workspace configuration
```

### Technology Stack

**Backend (API)**:
- **Framework**: NestJS 11.x (TypeScript 5.7, Node.js 20.x)
- **Database**: PostgreSQL 15 with Prisma ORM 6.x
- **Cache & Queue**: Redis 7 with BullMQ for background jobs
- **Authentication**: API Key with bcryptjs hashing
- **API Documentation**: OpenAPI/Swagger
- **Testing**: Jest with Supertest for E2E tests

**Infrastructure**:
- **Containerization**: Docker & Docker Compose
- **Environment**: Node.js 20.x, npm 9.x
- **Development**: WSL2 (Windows Subsystem for Linux)

---

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- Docker & Docker Compose
- PostgreSQL 15 (via Docker or local)
- Redis 7 (via Docker or local)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nahisaho/RosterHub.git
   cd RosterHub
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cd apps/api
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure services**:
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   ```

5. **Run database migrations**:
   ```bash
   cd apps/api
   npm run prisma:migrate
   ```

6. **Start the API server**:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`.

Access the API documentation at `http://localhost:3000/api`.

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## Project Structure

### Applications

#### **API Server** (`apps/api/`)

The primary application - a NestJS-based OneRoster API server.

**Key Features**:
- OneRoster v1.2 REST API endpoints
- CSV import/export with streaming processing
- API key authentication with IP whitelisting
- Rate limiting (token bucket & sliding window algorithms)
- Comprehensive audit logging
- Background job processing with BullMQ

**Documentation**: [apps/api/README.md](apps/api/README.md)

---

## OneRoster Entities

RosterHub supports all OneRoster Japan Profile 1.2.2 entities:

| Entity | Description | Japan Profile Extensions |
|--------|-------------|--------------------------|
| **Users** | Students, teachers, staff | `metadata.jp.kanaGivenName`, `metadata.jp.kanaFamilyName` |
| **Orgs** | Schools, districts, departments | `metadata.jp.kanaName`, `metadata.jp.orgCode` |
| **Classes** | Course instances with periods | `metadata.jp.classCode` |
| **Courses** | Course catalog | `metadata.jp.courseCode` |
| **Enrollments** | Student-class relationships | `metadata.jp.enrollmentType` |
| **AcademicSessions** | Terms, semesters, school years | `metadata.jp.sessionType` |
| **Demographics** | Student demographic data | `metadata.jp.*` extensions |

---

## API Overview

### Authentication

All API requests require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" \
  https://api.rosterhub.example.com/ims/oneroster/v1p2/users
```

### Endpoints

#### Bulk API (Full Data Access)
- `GET /ims/oneroster/v1p2/users` - List all users
- `GET /ims/oneroster/v1p2/users/:sourcedId` - Get single user
- `GET /ims/oneroster/v1p2/orgs` - List all organizations
- `GET /ims/oneroster/v1p2/classes` - List all classes
- `GET /ims/oneroster/v1p2/enrollments` - List all enrollments

#### Delta API (Incremental Sync)
- `GET /ims/oneroster/v1p2/users?filter=dateLastModified>='2025-01-01T00:00:00Z'`
- Fetch only records changed since a specific timestamp

#### CSV Import/Export
- `POST /ims/oneroster/v1p2/csv/import` - Upload CSV file
- `GET /ims/oneroster/v1p2/csv/export/:entityType` - Download CSV file

**Full API Documentation**: [apps/api/README.md#api-reference](apps/api/README.md#api-reference)

---

## Development Workflow

### Using Musuhi SDD Agents

This project uses **Musuhi** with 20 specialized AI agents for Specification Driven Development:

```bash
# Generate/update project memory
@steering

# Create requirements for new features
@requirements-analyst Create requirements for [feature]

# Design architecture
@system-architect Design architecture based on requirements.md

# Implement features
@software-developer Implement [component] following design.md

# Generate tests
@test-engineer Generate tests from requirements.md

# Review code
@code-reviewer Review recent changes

# Full orchestration for complex tasks
@orchestrator [describe your complete task]
```

**Available Agents**: See [CLAUDE.md](CLAUDE.md) for complete list.

### Specification Driven Development (SDD)

RosterHub follows an 8-stage SDD workflow:

```
Research → Requirements → Design → Tasks → Implementation → Testing → Deployment → Monitoring
```

**Documentation Templates**: `steering/templates/`
- `research.md` - Technical research and options analysis
- `requirements.md` - EARS-format requirements
- `design.md` - Technical design documents
- `tasks.md` - Implementation plans

**Workflow Guide**: `steering/rules/workflow.md`

---

## Documentation

### Project Documentation

- [Project Structure](steering/structure.md) - Architecture patterns and conventions
- [Technology Stack](steering/tech.md) - Detailed tech stack documentation
- [Product Context](steering/product.md) - Business context and product vision
- [API Documentation](apps/api/README.md) - Complete API reference

### Developer Guides

- [Getting Started](docs/guides/getting-started.md) - Setup and development guide
- [CSV Upload Implementation Guide](docs/guides/csv-upload-implementation.md) - Complete CSV import implementation guide
- [API Integration Guide](docs/guides/api-integration.md) - How to integrate with RosterHub API

### Requirements & Design

- [Research Documents](docs/research/) - OneRoster specification analysis
- [Requirements](docs/requirements/) - EARS-format requirements specifications
- [Design Documents](docs/design/) - Architecture and design decisions

---

## Deployment

### Docker Deployment

RosterHub includes Docker Compose configuration for easy deployment:

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down
```

**Services**:
- `api` - NestJS API server (port 3000)
- `postgres` - PostgreSQL 15 (port 5432)
- `redis` - Redis 7 (port 6379)

### Environment Variables

Key environment variables for the API:

```env
NODE_ENV=production
API_PORT=3000
DATABASE_URL=postgresql://user:password@postgres:5432/rosterhub
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-jwt-secret
API_KEY_ENABLED=true
RATE_LIMIT_ENABLED=true
```

See [apps/api/.env.example](apps/api/.env.example) for complete configuration.

### Cloud Deployment

RosterHub supports deployment to major cloud platforms:

- **[Azure Deployment Guide](docs/cloud/azure-optimization-guide.md)** - Complete guide for deploying to Azure (App Service, Container Apps, AKS)
- **[AWS Deployment Guide](docs/cloud/aws-optimization-guide.md)** - Complete guide for deploying to AWS (ECS, EKS, Elastic Beanstalk)
- **[Cloud Migration Plan](docs/cloud/cloud-migration-plan.md)** - Migration strategy and planning guide

### Deployment Manuals

- **[Deployment Manual](docs/deployment/deployment-manual.md)** - Comprehensive deployment guide for production environments
- **[Docker Deployment Guide](docs/deployment/docker-deployment-guide.md)** - Detailed Docker and Docker Compose deployment
- **[Operation Manual](docs/deployment/operation-manual.md)** - Day-to-day operations and maintenance guide

---

## Testing

### Test Coverage

- **Unit Tests**: 26+ tests (guards, services, repositories)
- **E2E Tests**: 33/33 tests (100% passing - Phase 1 Complete ✅)
  - Users API: 15 tests
  - Orgs API: 6 tests
  - CSV Import: 11 tests
  - Health Check: 1 test

### Running Tests

```bash
# All tests
npm run test

# E2E tests only
npm run test:e2e

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:cov
```

---

## Security

### Authentication & Authorization

- **API Key Authentication**: Cryptographically secure 256-bit keys
- **Key Storage**: Bcrypt hashing with 12 salt rounds
- **IP Whitelisting**: IPv4, IPv6, and CIDR range support
- **Rate Limiting**: Sliding window algorithm (1000 req/hour default)
- **Redis Caching**: 5-minute TTL for API key validation

### Audit Logging

- All API requests logged to database (AuditLog table)
- Request/response capture with sensitive data sanitization
- Entity context tracking (type, action, sourcedId)
- GDPR compliance features (data access logging, retention policies)

### Security Best Practices

- TLS 1.3 for all API communications (infrastructure level)
- Environment variables for sensitive configuration
- No secrets in version control
- Regular dependency updates

---

## Roadmap

### Phase 1: Core Integration Platform - ✅ COMPLETE (100%)

**Status**: Production Ready (2025-11-16)

**Completed Features**:
- ✅ OneRoster v1.2 REST API (all 7 entities with CRUD operations)
- ✅ CSV Import/Export with streaming processing (100MB+ files)
- ✅ Delta/Incremental API with timestamp-based filtering
- ✅ Advanced filtering (all OneRoster operators: =, !=, >, <, >=, <=, ~)
- ✅ Field selection and pagination
- ✅ Security (API key auth, IP whitelist, rate limiting, audit logging)
- ✅ Background job processing with BullMQ
- ✅ Japan Profile 1.2.2 extensions (kana validation, metadata)
- ✅ Docker infrastructure with PostgreSQL and Redis
- ✅ CI/CD pipeline with GitHub Actions
- ✅ 100% E2E test coverage (33/33 tests passing)

**Documentation**:
- [Phase 1 Completion Report](orchestrator/reports/phase1-completion-report-20251116.md)
- [CSV Upload Implementation Guide](docs/guides/csv-upload-implementation.md)
- [Deployment Manual](docs/deployment/deployment-manual.md)

### Phase 2: Enhanced Operations (Months 7-12)

- Web-based CSV import UI
- Advanced monitoring dashboard
- Data mapping configuration
- Webhook notifications
- Performance optimization

### Phase 3: Enterprise Features (Months 13-18)

- Multi-tenancy architecture
- Custom SLA support
- Advanced analytics
- On-premise deployment option
- SSO integration

---

## Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(users): add Japan Profile validation
fix(delta-api): correct dateLastModified filter
docs(api): update OpenAPI spec
test(users): add E2E tests for CRUD operations
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [docs/](docs/)
- **API Reference**: [apps/api/README.md](apps/api/README.md)
- **Issues**: [GitHub Issues](https://github.com/nahisaho/RosterHub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nahisaho/RosterHub/discussions)

---

## Acknowledgments

- **OneRoster Specification**: [IMS Global Learning Consortium](https://www.imsglobal.org/activity/onerosterlis)
- **Japan Profile**: OneRoster Japan Profile 1.2.2
- **NestJS**: [https://nestjs.com/](https://nestjs.com/)
- **Prisma**: [https://www.prisma.io/](https://www.prisma.io/)

---

**Built with ❤️ for Japanese Education**
