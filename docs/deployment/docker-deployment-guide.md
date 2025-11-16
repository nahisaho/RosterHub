# RosterHub Docker Deployment Guide

**Version**: 1.0.0
**Date**: 2025-11-15
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Production Deployment](#production-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Management](#database-management)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

---

## Overview

RosterHub uses Docker and Docker Compose for containerized deployment. The application consists of three main services:

- **PostgreSQL 15**: Database for OneRoster entities
- **Redis 7**: Cache and message queue (BullMQ)
- **NestJS API**: REST API application

Optional services:
- **Nginx**: Reverse proxy for production (HTTPS, rate limiting)
- **Adminer**: Database management UI (development only)

---

## Prerequisites

### Required Software

- **Docker**: 20.10+ ([Install Guide](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.0+ (included with Docker Desktop)
- **Git**: For cloning the repository

### System Requirements

**Minimum** (Development):
- CPU: 2 cores
- RAM: 4 GB
- Disk: 20 GB

**Recommended** (Production):
- CPU: 4+ cores
- RAM: 8+ GB
- Disk: 100+ GB (for CSV storage and database)

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/RosterHub.git
cd RosterHub
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.docker.example .env

# Edit environment variables
nano .env
```

**Minimum required changes**:
```env
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=your_very_long_random_secret_string
```

### 3. Start Services

**Development mode** (with Adminer):
```bash
docker-compose --profile development up -d
```

**Production mode** (with Nginx):
```bash
docker-compose --profile production up -d
```

**Basic mode** (API, PostgreSQL, Redis only):
```bash
docker-compose up -d
```

### 4. Run Database Migrations

```bash
docker-compose exec api npx prisma migrate deploy
```

### 5. Verify Deployment

```bash
# Check service health
docker-compose ps

# Check API health endpoint
curl http://localhost:3000/health

# Check logs
docker-compose logs -f api
```

---

## Production Deployment

### Step 1: Server Preparation

**Install Docker on Ubuntu/Debian**:
```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Setup Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 2: Configure Firewall

```bash
# Allow HTTP, HTTPS, SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### Step 3: SSL Certificate Setup

**Option A: Let's Encrypt (Recommended)**:
```bash
# Install Certbot
sudo apt-get install -y certbot

# Obtain certificate
sudo certbot certonly --standalone -d rosterhub.yourdomain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/rosterhub.yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/rosterhub.yourdomain.com/privkey.pem nginx/ssl/key.pem
```

**Option B: Self-Signed Certificate (Development)**:
```bash
# Create ssl directory
mkdir -p nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### Step 4: Production Environment Variables

Create `.env` with production settings:

```env
# ============================================
# Production Environment
# ============================================
NODE_ENV=production
API_PORT=3000

# ============================================
# Database (Use strong passwords)
# ============================================
POSTGRES_USER=rosterhub
POSTGRES_PASSWORD=<GENERATE_STRONG_PASSWORD>
POSTGRES_DB=rosterhub
POSTGRES_PORT=5432

# ============================================
# Redis (Use strong password)
# ============================================
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>

# ============================================
# JWT (Generate random 64-character string)
# ============================================
JWT_SECRET=<GENERATE_RANDOM_SECRET>
JWT_EXPIRATION=1h

# ============================================
# Security (Enable all in production)
# ============================================
API_KEY_ENABLED=true
IP_WHITELIST_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# ============================================
# Audit Logging
# ============================================
AUDIT_LOG_ENABLED=true

# ============================================
# CSV Processing
# ============================================
CSV_UPLOAD_MAX_SIZE=52428800
CSV_BATCH_SIZE=1000

# ============================================
# OneRoster
# ============================================
ONEROSTER_VERSION=1.2
JAPAN_PROFILE_VERSION=1.2.2

# ============================================
# Nginx
# ============================================
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

### Step 5: Deploy with Production Profile

```bash
# Build and start services
docker-compose --profile production up -d --build

# Run database migrations
docker-compose exec api npx prisma migrate deploy

# Verify health
curl -f https://rosterhub.yourdomain.com/health
```

### Step 6: Setup Automated Backups

Create backup script `/opt/rosterhub/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/rosterhub/backups"
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U rosterhub rosterhub > $BACKUP_DIR/db-backup-$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db-backup-$DATE.sql

# Delete backups older than 30 days
find $BACKUP_DIR -name "db-backup-*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db-backup-$DATE.sql.gz"
```

Add to crontab:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/rosterhub/backup.sh >> /var/log/rosterhub-backup.log 2>&1
```

---

## Environment Configuration

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment (development/production) |
| `API_PORT` | `3000` | API server port |
| `POSTGRES_USER` | `rosterhub` | PostgreSQL username |
| `POSTGRES_PASSWORD` | **Required** | PostgreSQL password |
| `POSTGRES_DB` | `rosterhub` | PostgreSQL database name |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `REDIS_PASSWORD` | **Required** | Redis password |
| `JWT_SECRET` | **Required** | JWT signing secret (64+ characters) |
| `JWT_EXPIRATION` | `1h` | JWT token expiration |
| `API_KEY_ENABLED` | `true` | Enable API key authentication |
| `IP_WHITELIST_ENABLED` | `false` | Enable IP whitelist filtering |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_TTL` | `60` | Rate limit time window (seconds) |
| `RATE_LIMIT_MAX` | `100` | Max requests per time window |
| `AUDIT_LOG_ENABLED` | `true` | Enable audit logging |
| `CSV_UPLOAD_MAX_SIZE` | `52428800` | Max CSV file size (50 MB) |
| `CSV_BATCH_SIZE` | `1000` | CSV batch processing size |
| `ONEROSTER_VERSION` | `1.2` | OneRoster specification version |
| `JAPAN_PROFILE_VERSION` | `1.2.2` | Japan Profile version |

---

## Database Management

### Manual Migrations

```bash
# Create migration
docker-compose exec api npx prisma migrate dev --name migration_name

# Deploy migrations
docker-compose exec api npx prisma migrate deploy

# Reset database (WARNING: Deletes all data)
docker-compose exec api npx prisma migrate reset
```

### Database Backup

```bash
# Backup database
docker-compose exec -T postgres pg_dump -U rosterhub rosterhub > backup.sql

# Compress backup
gzip backup.sql
```

### Database Restore

```bash
# Stop API to prevent writes
docker-compose stop api

# Restore from backup
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U rosterhub rosterhub

# Restart API
docker-compose start api
```

### Access Database Shell

```bash
# PostgreSQL shell
docker-compose exec postgres psql -U rosterhub rosterhub

# Redis CLI
docker-compose exec redis redis-cli -a <REDIS_PASSWORD>
```

### Adminer (Development Only)

Access database management UI:
```bash
# Start with development profile
docker-compose --profile development up -d

# Open in browser
http://localhost:8080

# Login credentials:
# System: PostgreSQL
# Server: postgres
# Username: rosterhub
# Password: <POSTGRES_PASSWORD>
# Database: rosterhub
```

---

## Monitoring & Health Checks

### Health Check Endpoints

```bash
# API health check
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "info": {
#     "database": { "status": "up" },
#     "redis": { "status": "up" }
#   }
# }
```

### Docker Container Status

```bash
# View running containers
docker-compose ps

# View container logs
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis

# View resource usage
docker stats
```

### Application Metrics

```bash
# View API metrics (if implemented)
curl http://localhost:3000/metrics

# View BullMQ queue status
docker-compose exec redis redis-cli -a <REDIS_PASSWORD> LLEN bull:csv-import:wait
```

---

## Troubleshooting

### Common Issues

#### 1. API Container Won't Start

**Symptom**: `api` container exits immediately

**Solutions**:
```bash
# Check logs
docker-compose logs api

# Common causes:
# - Database connection failure (check DATABASE_URL)
# - Missing Prisma Client (run: docker-compose exec api npx prisma generate)
# - Port already in use (change API_PORT in .env)
```

#### 2. Database Connection Errors

**Symptom**: `Error: Can't reach database server`

**Solutions**:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres pg_isready -U rosterhub

# Verify DATABASE_URL matches PostgreSQL credentials
```

#### 3. High Memory Usage

**Symptom**: Server running out of memory

**Solutions**:
```bash
# Limit container memory in docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 2G

# Clear unused Docker resources
docker system prune -a --volumes
```

#### 4. Slow CSV Import

**Symptom**: CSV import taking too long

**Solutions**:
- Increase `CSV_BATCH_SIZE` (default: 1000)
- Check PostgreSQL performance (indexes, autovacuum)
- Increase PostgreSQL shared_buffers
- Use faster storage (SSD)

### Reset Everything (Nuclear Option)

```bash
# WARNING: This deletes ALL data
docker-compose down -v
docker system prune -a --volumes -f
docker-compose up -d --build
docker-compose exec api npx prisma migrate deploy
```

---

## Security Considerations

### 1. Change Default Passwords

**Never use default passwords in production**:
- PostgreSQL: Generate strong password (16+ characters)
- Redis: Generate strong password (16+ characters)
- JWT Secret: Generate random 64+ character string

```bash
# Generate secure passwords
openssl rand -base64 32
```

### 2. Enable IP Whitelist

Edit `.env`:
```env
IP_WHITELIST_ENABLED=true
```

Configure allowed IPs in database:
```sql
INSERT INTO ip_whitelist (ip_address, description, is_active)
VALUES ('192.168.1.100', 'School Server', true);
```

### 3. Enable API Key Authentication

All OneRoster API requests require `X-API-Key` header.

Generate API key in database:
```sql
INSERT INTO api_keys (key, name, is_active)
VALUES (gen_random_uuid(), 'School LMS Integration', true);
```

### 4. HTTPS Only

**Production must use HTTPS**:
- Use Let's Encrypt for free SSL certificates
- Nginx configuration forces HTTPS redirect
- Enable HSTS headers

### 5. Regular Updates

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update system packages
sudo apt-get update && sudo apt-get upgrade -y
```

### 6. Audit Logging

All API requests are logged when `AUDIT_LOG_ENABLED=true`.

View audit logs:
```sql
SELECT * FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

---

## Additional Resources

- **OneRoster v1.2 Specification**: https://www.imsglobal.org/oneroster-v12-final-specification
- **OneRoster Japan Profile 1.2.2**: (Internal documentation)
- **Docker Documentation**: https://docs.docker.com/
- **NestJS Documentation**: https://docs.nestjs.com/
- **Prisma Documentation**: https://www.prisma.io/docs/

---

**Last Updated**: 2025-11-15
**Maintained By**: RosterHub Development Team
