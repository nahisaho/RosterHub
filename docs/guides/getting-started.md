# Getting Started with RosterHub

This guide will help you set up and run RosterHub locally for development or testing.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20.x** or higher ([download](https://nodejs.org/))
- **npm 9.x** or higher (included with Node.js)
- **Docker & Docker Compose** ([download](https://www.docker.com/products/docker-desktop/))
- **Git** ([download](https://git-scm.com/))

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/nahisaho/RosterHub.git
cd RosterHub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rosterhub?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API Configuration
PORT=3000
API_PREFIX=ims/oneroster/v1p2

# Security
API_KEY_SALT_ROUNDS=10
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=debug
```

### 4. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
# From the project root directory
cd /path/to/RosterHub
docker-compose up -d postgres redis
```

Verify services are running:

```bash
docker-compose ps
```

### 5. Initialize the Database

```bash
cd apps/api

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed with test data (~1000 records)
npm run prisma:seed
```

### 6. Start the API Server

```bash
# Development mode with hot reload
npm run dev

# Or production mode
npm run build
npm run start:prod
```

The API will be available at: **http://localhost:3000**

## Verify Installation

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### API Documentation

Open your browser and navigate to:

- **Swagger UI**: http://localhost:3000/api
- **OpenAPI JSON**: http://localhost:3000/api-json

## Create Your First API Key

To access the OneRoster API, you need an API key:

```bash
# Using the CLI tool
cd apps/api
npm run cli:create-api-key -- --name "Test Client" --description "Development testing"
```

Or create directly in the database:

```sql
INSERT INTO "ApiKey" ("sourcedId", "name", "description", "keyHash", "status", "createdAt", "updatedAt")
VALUES (
  'api-key-001',
  'Test Client',
  'Development testing',
  '$2b$10$...', -- bcrypt hash of your key
  'active',
  NOW(),
  NOW()
);
```

## Make Your First API Request

### List Users

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/ims/oneroster/v1p2/users
```

### Get a Single User

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/ims/oneroster/v1p2/users/user-student-001
```

### Filter Users by Role

```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/ims/oneroster/v1p2/users?filter=role='student'"
```

### Paginate Results

```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/ims/oneroster/v1p2/users?limit=10&offset=0"
```

## Running Tests

### Unit Tests

```bash
cd apps/api
npm run test
```

### E2E Tests

```bash
cd apps/api
npm run test:e2e
```

### Test Coverage

```bash
cd apps/api
npm run test:cov
```

## Project Structure

```
RosterHub/
├── apps/
│   └── api/                    # NestJS API Server
│       ├── src/
│       │   ├── oneroster/      # OneRoster modules
│       │   │   ├── entities/   # Users, Orgs, Classes, etc.
│       │   │   ├── csv/        # CSV import/export
│       │   │   └── common/     # Shared services
│       │   ├── common/         # Guards, interceptors
│       │   ├── database/       # Prisma service
│       │   └── caching/        # Redis cache
│       ├── prisma/             # Database schema
│       └── test/               # E2E tests
├── docs/                       # Documentation
├── steering/                   # Project memory (AI context)
└── docker-compose.yml          # Infrastructure services
```

## Common Issues

### Database Connection Error

**Error**: `Can't reach database server at localhost:5432`

**Solution**: Ensure PostgreSQL container is running:
```bash
docker-compose up -d postgres
```

### Redis Connection Error

**Error**: `Redis connection to localhost:6379 failed`

**Solution**: Ensure Redis container is running:
```bash
docker-compose up -d redis
```

### Prisma Client Not Generated

**Error**: `@prisma/client did not initialize yet`

**Solution**: Generate the Prisma client:
```bash
cd apps/api
npm run prisma:generate
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**: Either stop the existing process or change the port in `.env`:
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or change the port
PORT=3001
```

## Next Steps

- **[API Reference](../design/api/)** - Complete API documentation
- **[CSV Import Guide](./csv-upload-implementation.md)** - Bulk data import
- **[Architecture Overview](../design/architecture/)** - System design
- **[Security Guide](../security/)** - Authentication & authorization

## Support

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/nahisaho/RosterHub/issues)
- **Documentation**: [Full documentation](../README.md)

---

**RosterHub** - OneRoster Japan Profile 1.2.2 Integration Hub
