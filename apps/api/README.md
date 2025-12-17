# RosterHub API

**OneRoster v1.2 Japan Profile 1.2.2 Compliant REST API**

RosterHub is a production-ready OneRoster API implementation that provides standardized roster data management for Japanese K-12 educational institutions, supporting 35,000+ schools and 15.5 million students.

[![CI Status](https://github.com/nahisaho/RosterHub/workflows/CI/badge.svg)](https://github.com/nahisaho/RosterHub/actions)
[![Coverage](https://codecov.io/gh/nahisaho/RosterHub/branch/main/graph/badge.svg)](https://codecov.io/gh/nahisaho/RosterHub)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Features

### OneRoster v1.2 Compliance
- **7 Core Entities**: users, orgs, classes, courses, enrollments, academicSessions, demographics
- **Delta/Incremental API**: Efficient synchronization with `dateLastModified` filters
- **Bulk CSV Import/Export**: Handle 200,000+ records with streaming parser
- **Advanced Filtering**: Complex filter expressions with AND/OR/parentheses support
- **Pagination & Sorting**: Efficient data retrieval with limit/offset/sort
- **Field Selection**: Reduce payload size with selective field returns

### Japan Profile 1.2.2 Extensions
- **Kana Names**: `kanaGivenName`, `kanaFamilyName` for phonetic representation
- **Japan-specific Metadata**: Organization codes, student numbers, homeroom designations
- **Character Encoding**: Full UTF-8 support for Japanese text

### Enterprise-Grade Security
- **API Key Authentication**: Request-level authentication with revocable keys
- **IP Whitelisting**: Network-level access control
- **Rate Limiting**: Sliding window algorithm to prevent abuse (default: 1000 requests/hour)
- **Audit Logging**: Complete request/response logging for compliance

### High Performance
- **Database**: PostgreSQL 15 with JSONB for flexible metadata storage
- **Caching**: Redis 7 for API key validation (5-minute TTL)
- **Async Processing**: BullMQ for background CSV import jobs
- **Optimized Queries**: Indexed fields for sub-50ms response times

---

## Quick Start

### Prerequisites

- **Node.js**: 20.x LTS
- **Docker**: 20.10+ & Docker Compose 2.0+
- **PostgreSQL**: 15+ (or use Docker Compose)
- **Redis**: 7+ (or use Docker Compose)

### Installation

```bash
# Clone repository
git clone https://github.com/nahisaho/RosterHub.git
cd RosterHub/apps/api

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Required environment variables**:
```env
# Database
DATABASE_URL=postgresql://rosterhub:password@localhost:5432/rosterhub?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Security
JWT_SECRET=your_very_long_random_secret_string
API_KEY_ENABLED=true
RATE_LIMIT_ENABLED=true

# Application
NODE_ENV=production
API_PORT=3000
```

### Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# (Optional) Seed test data
npm run seed
```

### Start Development Server

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

**API will be available at**: `http://localhost:3000`

**API Documentation (Swagger)**: `http://localhost:3000/api/docs`

---

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# Run database migrations
docker-compose exec api npx prisma migrate deploy

# Check service health
docker-compose ps
curl http://localhost:3000/health
```

### Production Deployment

```bash
# Start with production profile (includes Nginx)
docker-compose --profile production up -d

# Verify deployment
curl -f https://rosterhub.yourdomain.com/health
```

For detailed Docker deployment instructions, see [Docker Deployment Guide](docs/deployment/docker-deployment-guide.md).

---

## API Usage

### Authentication

All OneRoster API requests require an API key:

```bash
# Create API key in database
INSERT INTO api_keys (key, name, is_active, rate_limit)
VALUES (gen_random_uuid(), 'School LMS Integration', true, 1000);
```

Include API key in request header:
```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/ims/oneroster/v1p2/users
```

### Common API Operations

**Get all users with pagination**:
```bash
GET /ims/oneroster/v1p2/users?limit=100&offset=0
```

**Filter active students**:
```bash
GET /ims/oneroster/v1p2/users?filter=role='student' AND status='active'
```

**Delta sync (get users modified after timestamp)**:
```bash
GET /ims/oneroster/v1p2/users?filter=dateLastModified>='2025-01-01T00:00:00Z'
```

**Get single user**:
```bash
GET /ims/oneroster/v1p2/users/:sourcedId
```

**CSV Import**:
```bash
curl -X POST \
  -H "X-API-Key: your-api-key-here" \
  -F "file=@users.csv" \
  -F "entityType=users" \
  http://localhost:3000/ims/oneroster/v1p2/csv/import
```

**CSV Export**:
```bash
GET /ims/oneroster/v1p2/csv/export/users
```

For complete API documentation, visit the Swagger UI at `/api/docs` or see the [API Specification](docs/api/oneroster-v1.2-spec.md).

---

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage report
npm run test:cov

# Run specific test file
npm test -- users.service.spec.ts

# Watch mode for development
npm run test:watch
```

**Current Test Coverage**: 126 tests passing (100% success rate)

### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e
```

E2E tests cover:
- OneRoster API endpoints (users, orgs, classes, etc.)
- CSV import/export workflows
- Authentication and authorization
- Filter query parsing
- Japan Profile metadata

---

## Project Structure

```
apps/api/
├── src/
│   ├── oneroster/              # OneRoster v1.2 implementation
│   │   ├── entities/           # 7 OneRoster entities
│   │   │   ├── users/
│   │   │   ├── orgs/
│   │   │   ├── classes/
│   │   │   ├── courses/
│   │   │   ├── enrollments/
│   │   │   ├── academic-sessions/
│   │   │   └── demographics/
│   │   ├── csv/                # CSV import/export
│   │   └── common/             # Shared services (filter parser, field selection)
│   ├── common/                 # Guards, interceptors, decorators
│   │   ├── guards/             # ApiKey, IpWhitelist, RateLimit
│   │   └── interceptors/       # Audit logging
│   ├── database/               # Prisma configuration
│   └── config/                 # Application configuration
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── test/                       # E2E tests
├── docs/                       # Documentation
│   ├── deployment/             # Deployment guides
│   ├── api/                    # API specifications
│   └── cloud/                  # Cloud architecture
├── docker-compose.yml          # Docker orchestration
├── Dockerfile                  # Multi-stage Docker build
└── README.md                   # This file
```

---

## Performance

### Benchmarks

| Operation | Records | Time | Throughput |
|-----------|---------|------|------------|
| GET /users (paginated) | 100 | <50ms | 2,000 req/s |
| GET /users/:id | 1 | <10ms | 10,000 req/s |
| CSV Import | 200,000 | <30min | 111 records/s |
| CSV Export | 100,000 | <2min | 833 records/s |
| Complex filter query | 10,000 | <100ms | 100 queries/s |

### Optimization Strategies

- **Database Indexing**: All filterable fields indexed
- **Redis Caching**: API key validation cached (5-minute TTL)
- **Batch Processing**: CSV imports use 1000-record batches
- **Connection Pooling**: PostgreSQL connection pool (max 20 connections)
- **Streaming**: Large CSV files processed with streaming parser

---

## Production Deployment

### Deployment Options

1. **Docker Compose** (Recommended for small-medium deployments)
   - See [Docker Deployment Guide](docs/deployment/docker-deployment-guide.md)
   - Single-server deployment with all services

2. **Kubernetes** (For large-scale deployments)
   - See [Kubernetes Deployment Guide](docs/deployment/kubernetes-deployment-guide.md)
   - Horizontal scaling, high availability

3. **Cloud Platforms**
   - **AWS**: [AWS Deployment Guide](docs/cloud/aws-optimization-guide.md)
   - **Azure**: [Azure Deployment Guide](docs/cloud/azure-optimization-guide.md)
   - **GCP**: [GCP Deployment Guide](docs/cloud/gcp-optimization-guide.md)

### CI/CD Pipeline

GitHub Actions workflows:
- **CI**: Lint, test, build, security scan
- **CD**: Automated deployment to staging/production
- **Triggers**: Push to `main` or manual workflow dispatch

See `.github/workflows/ci.yml` and `.github/workflows/cd.yml` for details.

---

## Monitoring & Operations

### Health Checks

```bash
# API health status
GET /health

# Database and Redis status
GET /health/db
GET /health/redis
```

### Logging

- **Application Logs**: Structured JSON logging via NestJS Logger
- **Audit Logs**: All API requests logged to `audit_logs` table
- **Error Tracking**: Automatic error logging with stack traces

### Metrics

- Rate limit headers in every response
- BullMQ job queue metrics
- Database connection pool statistics

---

## Security

### Authentication & Authorization
- API key authentication (revocable keys)
- IP whitelist filtering (optional)
- Rate limiting (sliding window algorithm)

### Data Protection
- HTTPS required in production
- PostgreSQL SSL connections
- Redis password authentication
- Environment variable encryption

### Compliance
- Complete audit trail of all API requests
- GDPR-compliant data handling
- Japan APPI (Act on Protection of Personal Information) compliance

For security audit checklist, see [Security Documentation](docs/security/security-audit.md).

---

## Troubleshooting

### Common Issues

**Database connection errors**:
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Verify connection
docker-compose exec postgres pg_isready -U rosterhub

# Check DATABASE_URL in .env
```

**Redis connection errors**:
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli -a your_password ping
```

**API key authentication failing**:
```sql
-- Verify API key exists and is active
SELECT * FROM api_keys WHERE key = 'your-api-key' AND is_active = true;
```

For more troubleshooting, see [Troubleshooting Guide](docs/troubleshooting.md).

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: See [docs/](docs/) directory
- **Issues**: [GitHub Issues](https://github.com/nahisaho/RosterHub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nahisaho/RosterHub/discussions)

---

## References

- [OneRoster v1.2 Specification](https://www.imsglobal.org/oneroster-v12-final-specification)
- [OneRoster Japan Profile 1.2.2](docs/api/japan-profile-1.2.2.md)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)

---

**Last Updated**: 2025-12-17
**Version**: 1.0.0
**Maintained By**: RosterHub Development Team
