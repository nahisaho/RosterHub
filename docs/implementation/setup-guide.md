# RosterHub - Developer Setup Guide

## 📋 Overview

This guide will help you set up your development environment for RosterHub (OneRoster Japan Profile 1.2.2 Integration Hub).

**Tech Stack**:
- Backend: NestJS 10.x, TypeScript 5.3+
- Database: PostgreSQL 15+, Prisma 5.x
- Cache/Queue: Redis 7.x, BullMQ 4.x
- CSV Processing: csv-parse 5.x

---

## 🛠️ Prerequisites

Ensure you have the following installed:

- **Node.js**: v20.x LTS or later
- **npm**: v9.0.0 or later
- **Docker**: For running PostgreSQL and Redis
- **Git**: For version control

### Install Node.js (via nvm recommended)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20.x
nvm install 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 9.x.x or higher
```

### Install Docker

Download and install Docker Desktop:
- **macOS/Windows**: https://www.docker.com/products/docker-desktop
- **Linux**: Follow official Docker Engine installation guide

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/RosterHub.git
cd RosterHub
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd apps/api
npm install
cd ../..
```

### 3. Start Docker Services

Start PostgreSQL and Redis using Docker Compose:

```bash
# Start services in background
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME                   STATUS
# rosterhub-postgres     Up (healthy)
# rosterhub-redis        Up (healthy)
```

### 4. Set Up Environment Variables

```bash
# Copy example environment file
cp apps/api/.env.example apps/api/.env

# Edit .env if needed (default values work for local development)
nano apps/api/.env
```

**Default .env configuration** (already suitable for local development):
```bash
DATABASE_URL="postgresql://rosterhub:rosterhub_dev_password@localhost:5432/rosterhub_dev?schema=public"
REDIS_URL="redis://localhost:6379"
NODE_ENV="development"
PORT=4000
```

### 5. Run Database Migrations

Initialize the database schema using Prisma:

```bash
cd apps/api

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed the database with sample data
npx prisma db seed
```

### 6. Start the Development Server

```bash
# From apps/api directory
npm run start:dev

# Or from root directory
npm run dev --workspace=apps/api
```

**Expected output**:
```
[Nest] 12345  - 11/14/2025, 11:30:00 PM     LOG [Bootstrap] Application is running on: http://localhost:4000
[Nest] 12345  - 11/14/2025, 11:30:00 PM     LOG [Bootstrap] API documentation available at: http://localhost:4000/api/docs
```

### 7. Verify Installation

Open your browser and navigate to:
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **Health Check**: http://localhost:4000/api/v1/health (if implemented)

---

## 📁 Project Structure

```
RosterHub/
├── apps/
│   └── api/                    # NestJS API server
│       ├── src/
│       │   ├── main.ts         # Application entry point
│       │   ├── app.module.ts   # Root module
│       │   ├── config/         # Configuration files
│       │   ├── database/       # Prisma service & base repository
│       │   ├── common/         # Shared utilities (guards, pipes, filters)
│       │   └── oneroster/      # OneRoster domain modules
│       │       ├── entities/   # Entity modules (users, orgs, classes, etc.)
│       │       ├── auth/       # API authentication
│       │       ├── validation/ # Data validation
│       │       ├── csv/        # CSV import/export
│       │       └── api/        # REST API (Bulk + Delta)
│       ├── prisma/
│       │   ├── schema.prisma   # Database schema
│       │   ├── migrations/     # Database migrations
│       │   └── seed.ts         # Seed data
│       ├── test/               # E2E tests
│       └── package.json
├── docs/                       # Documentation
├── steering/                   # Project memory (structure, tech, product)
├── docker-compose.yml          # Docker services (PostgreSQL + Redis)
├── package.json                # Root workspace configuration
└── README.md
```

---

## 🧪 Running Tests

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

**Target Coverage**: 80%+ (unit tests + integration tests)

---

## 🐘 Database Management

### Prisma Commands

```bash
cd apps/api

# Generate Prisma Client (after schema changes)
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration-name

# Apply migrations to production
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Reset Database (Development Only)

```bash
cd apps/api

# WARNING: This will delete all data!
npx prisma migrate reset
```

---

## 🔧 Common Development Tasks

### Add a New Entity Module

1. **Create module directory**:
   ```bash
   mkdir -p apps/api/src/oneroster/entities/new-entity/{dto,entities}
   ```

2. **Create repository** (extend BaseRepository):
   ```typescript
   // apps/api/src/oneroster/entities/new-entity/new-entity.repository.ts
   export class NewEntityRepository extends BaseRepository<NewEntity> {
     constructor(prisma: PrismaService) {
       super(prisma, 'newEntity');
     }
   }
   ```

3. **Create DTOs** (create, update, response):
   ```typescript
   // apps/api/src/oneroster/entities/new-entity/dto/create-new-entity.dto.ts
   export class CreateNewEntityDto {
     // Define fields with validation decorators
   }
   ```

4. **Create controller, service, module**:
   - Follow the pattern in `users/` or `orgs/` modules

### Run Database Migrations

```bash
cd apps/api

# After modifying schema.prisma
npx prisma migrate dev --name describe-your-change
```

### Format Code

```bash
# Format all TypeScript files
npm run format

# Or use Prettier directly
npx prettier --write "apps/api/src/**/*.ts"
```

### Lint Code

```bash
cd apps/api
npm run lint
```

---

## 🐋 Docker Commands

### Start Services

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Stop Services

```bash
# Stop services (keep data)
docker-compose stop

# Stop and remove containers (keep data)
docker-compose down

# Stop and remove containers + volumes (DELETE ALL DATA)
docker-compose down -v
```

### Inspect Services

```bash
# Check service status
docker-compose ps

# Connect to PostgreSQL
docker exec -it rosterhub-postgres psql -U rosterhub -d rosterhub_dev

# Connect to Redis
docker exec -it rosterhub-redis redis-cli
```

---

## 🚨 Troubleshooting

### Issue: Port 5432 already in use

**Cause**: Another PostgreSQL instance is running.

**Solution**:
```bash
# Option 1: Stop local PostgreSQL
sudo service postgresql stop  # Linux
brew services stop postgresql  # macOS

# Option 2: Change port in docker-compose.yml
# Edit docker-compose.yml and change "5432:5432" to "5433:5432"
# Then update DATABASE_URL in .env to use port 5433
```

### Issue: Port 6379 already in use

**Cause**: Another Redis instance is running.

**Solution**:
```bash
# Option 1: Stop local Redis
sudo service redis stop  # Linux
brew services stop redis  # macOS

# Option 2: Change port in docker-compose.yml and .env
```

### Issue: Prisma Client not generated

**Cause**: Missing Prisma Client generation after schema changes.

**Solution**:
```bash
cd apps/api
npx prisma generate
```

### Issue: Migration errors

**Cause**: Database schema out of sync with migrations.

**Solution**:
```bash
cd apps/api

# Development: Reset database (deletes data!)
npx prisma migrate reset

# Production: Apply migrations manually
npx prisma migrate deploy
```

### Issue: Module not found errors

**Cause**: Missing dependencies.

**Solution**:
```bash
# Reinstall dependencies
cd apps/api
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Additional Resources

- **OneRoster Specification**: https://www.imsglobal.org/activity/onerosterlis
- **NestJS Documentation**: https://docs.nestjs.com
- **Prisma Documentation**: https://www.prisma.io/docs
- **BullMQ Documentation**: https://docs.bullmq.io

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `npm run test`
4. Commit: `git commit -m "feat: add your feature"`
5. Push: `git push origin feature/your-feature-name`
6. Create Pull Request

---

## ✅ Next Steps

After completing this setup:

1. ✅ Verify API is running: http://localhost:4000/api/docs
2. ✅ Explore Swagger documentation
3. ✅ Review project structure in `apps/api/src/`
4. ✅ Read implementation plan: `docs/planning/implementation-plan.md`
5. ✅ Check steering context: `steering/structure.md`, `steering/tech.md`, `steering/product.md`
6. ✅ Start implementing tasks from Sprint 1-2 onwards

**Happy Coding! 🚀**
