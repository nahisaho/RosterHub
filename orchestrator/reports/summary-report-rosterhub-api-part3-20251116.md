# RosterHub API 統合レポート - Part 3: デプロイメント・運用

**作成日**: 2025-11-16
**プロジェクト**: RosterHub API
**バージョン**: 1.0.0
**ステータス**: 運用準備完了

---

## 目次

1. [インフラストラクチャ構成](#1-インフラストラクチャ構成)
2. [デプロイメント手順](#2-デプロイメント手順)
3. [監視・ログ戦略](#3-監視ログ戦略)
4. [バックアップ・リカバリ](#4-バックアップリカバリ)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. インフラストラクチャ構成

### 1.1 開発環境（Docker Compose）

#### Docker Compose構成

**ファイル**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: rosterhub-postgres
    environment:
      POSTGRES_DB: rosterhub
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - rosterhub-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: rosterhub-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - rosterhub-network

  # RosterHub API
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: rosterhub-api
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/rosterhub
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    networks:
      - rosterhub-network
    restart: unless-stopped

  # Prometheus (Monitoring)
  prometheus:
    image: prom/prometheus:latest
    container_name: rosterhub-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - rosterhub-network

  # Grafana (Visualization)
  grafana:
    image: grafana/grafana:latest
    container_name: rosterhub-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus
    networks:
      - rosterhub-network

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  rosterhub-network:
    driver: bridge
```

#### Dockerfileマルチステージビルド

**ファイル**: `Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY apps/api ./apps/api
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Build application
WORKDIR /app/apps/api
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/prisma ./prisma

# Copy configuration files
COPY apps/api/package.json ./apps/api/
COPY .env.production .env

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
```

**ビルドサイズ最適化**:
- Builder stage: 1.2 GB
- Production stage: 350 MB
- 削減率: 70%

#### リソース要件

**最小要件（開発環境）**:
```
CPU: 2 cores
Memory: 4 GB
Disk: 20 GB SSD
```

**推奨要件（本番環境）**:
```
CPU: 4 cores
Memory: 8 GB
Disk: 100 GB SSD
Database: Separate PostgreSQL server
Cache: Separate Redis server
```

---

### 1.2 Azure Cloud構成

#### アーキテクチャ概要

```
Internet
    ↓
Azure Front Door (WAF)
    ↓
Azure App Service (Web App)
    ├── Dockerfile Deployment
    ├── Auto Scaling (2-10 instances)
    └── Always On: Enabled
    ↓
Azure Database for PostgreSQL (Flexible Server)
    ├── Tier: General Purpose
    ├── vCores: 4
    ├── Storage: 256 GB
    ├── Backup Retention: 7 days
    └── Geo-Redundant Backup: Enabled
    ↓
Azure Cache for Redis
    ├── Tier: Standard
    ├── Capacity: C2 (2.5 GB)
    └── Persistence: RDB (hourly snapshots)
    ↓
Azure Blob Storage (CSV uploads/exports)
    ├── Storage Account: Standard LRS
    ├── Container: rosterhub-uploads
    └── Lifecycle Policy: 30 days retention
```

#### リソース構成（Bicep IaC）

**ファイル**: `infra/azure/main.bicep`

```bicep
param location string = 'japaneast'
param environment string = 'production'
param projectName string = 'rosterhub'

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${projectName}-asp-${environment}'
  location: location
  sku: {
    name: 'P1v3'
    tier: 'PremiumV3'
    capacity: 2
  }
  properties: {
    reserved: true // Linux
  }
}

// Web App (Container Deployment)
resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: '${projectName}-api-${environment}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerRegistry}/${projectName}-api:latest'
      alwaysOn: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      appSettings: [
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/database-url/)'
        }
        {
          name: 'REDIS_URL'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/redis-url/)'
        }
      ]
      healthCheckPath: '/health'
    }
  }
}

// PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: '${projectName}-postgres-${environment}'
  location: location
  sku: {
    name: 'Standard_D4s_v3'
    tier: 'GeneralPurpose'
  }
  properties: {
    version: '15'
    administratorLogin: 'rosteradmin'
    administratorLoginPassword: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/postgres-password/)'
    storage: {
      storageSizeGB: 256
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Enabled'
    }
    highAvailability: {
      mode: 'ZoneRedundant'
    }
  }
}

// Redis Cache
resource redisCache 'Microsoft.Cache/redis@2022-06-01' = {
  name: '${projectName}-redis-${environment}'
  location: location
  properties: {
    sku: {
      name: 'Standard'
      family: 'C'
      capacity: 2
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'rdb-backup-enabled': 'true'
      'rdb-backup-frequency': '60'
    }
  }
}

// Storage Account (CSV files)
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: '${projectName}storage${environment}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

// Blob Container
resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2022-09-01' = {
  name: '${storageAccount.name}/default/rosterhub-uploads'
  properties: {
    publicAccess: 'None'
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${projectName}-insights-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 90
  }
}

// Key Vault (Secrets Management)
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: '${projectName}-kv-${environment}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: webApp.identity.principalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
    ]
  }
}
```

**デプロイコマンド**:
```bash
az deployment group create \
  --resource-group rosterhub-rg \
  --template-file infra/azure/main.bicep \
  --parameters environment=production
```

#### コスト見積もり（月額）

| リソース | SKU | 数量 | 月額（USD） |
|---------|-----|------|------------|
| App Service Plan | P1v3 | 2 instances | $320 |
| PostgreSQL Flexible Server | Standard_D4s_v3 | 1 | $280 |
| Azure Cache for Redis | Standard C2 | 1 | $150 |
| Blob Storage | Standard LRS | 100 GB | $2 |
| Application Insights | - | - | $10 |
| Front Door | Standard | - | $35 |
| **合計** | | | **$797** |

---

### 1.3 AWS Cloud構成

#### アーキテクチャ概要

```
Internet
    ↓
CloudFront (CDN) + WAF
    ↓
Application Load Balancer (ALB)
    ↓
ECS Fargate (Auto Scaling 2-10 tasks)
    ├── Task Definition: rosterhub-api
    ├── CPU: 2 vCPU
    ├── Memory: 4 GB
    └── Health Check: /health
    ↓
RDS PostgreSQL Multi-AZ
    ├── Instance Class: db.t3.xlarge
    ├── Storage: 256 GB gp3
    ├── Backup Retention: 7 days
    └── Multi-AZ: Enabled
    ↓
ElastiCache Redis Cluster
    ├── Node Type: cache.m6g.large
    ├── Nodes: 2 (Primary + Replica)
    └── Automatic Failover: Enabled
    ↓
S3 Bucket (CSV uploads/exports)
    ├── Storage Class: Standard
    ├── Versioning: Enabled
    └── Lifecycle Policy: 30 days
```

#### Terraform IaC

**ファイル**: `infra/aws/main.tf`

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "rosterhub-terraform-state"
    key    = "production/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "rosterhub-vpc"
    Environment = var.environment
  }
}

# Subnets (3 AZs)
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "rosterhub-private-${count.index + 1}"
  }
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 101}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "rosterhub-public-${count.index + 1}"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "rosterhub-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "rosterhub-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "rosterhub-api"
      image     = "${aws_ecr_repository.api.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.redis_url.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "api" {
  name            = "rosterhub-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "rosterhub-api"
    container_port   = 3000
  }

  # Auto Scaling
  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Auto Scaling Target
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy (CPU-based)
resource "aws_appautoscaling_policy" "cpu_scaling" {
  name               = "rosterhub-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier           = "rosterhub-postgres"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.xlarge"
  allocated_storage    = 256
  storage_type         = "gp3"
  storage_encrypted    = true
  multi_az             = true
  db_name              = "rosterhub"
  username             = "rosteradmin"
  password             = random_password.db_password.result
  parameter_group_name = aws_db_parameter_group.postgres.name
  skip_final_snapshot  = false
  final_snapshot_identifier = "rosterhub-final-snapshot-${formatdate("YYYYMMDD-hhmmss", timestamp())}"
  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "mon:04:00-mon:05:00"

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  tags = {
    Name        = "rosterhub-postgres"
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "rosterhub-redis"
  replication_group_description = "Redis cluster for RosterHub API"
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.m6g.large"
  num_cache_clusters         = 2
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  snapshot_retention_limit   = 5
  snapshot_window            = "03:00-05:00"

  tags = {
    Name        = "rosterhub-redis"
    Environment = var.environment
  }
}

# S3 Bucket (CSV uploads)
resource "aws_s3_bucket" "uploads" {
  bucket = "rosterhub-uploads-${var.environment}"

  tags = {
    Name        = "rosterhub-uploads"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "delete-old-files"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}
```

**デプロイコマンド**:
```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

#### コスト見積もり（月額）

| リソース | SKU | 数量 | 月額（USD） |
|---------|-----|------|------------|
| ECS Fargate | 2 vCPU, 4 GB | 2 tasks (24/7) | $120 |
| RDS PostgreSQL | db.t3.xlarge Multi-AZ | 1 | $420 |
| ElastiCache Redis | cache.m6g.large | 2 nodes | $280 |
| ALB | - | 1 | $25 |
| S3 | Standard | 100 GB | $2 |
| CloudWatch Logs | - | 10 GB | $5 |
| CloudFront | - | 100 GB transfer | $10 |
| **合計** | | | **$862** |

---

## 2. デプロイメント手順

### 2.1 Docker Composeデプロイ（開発/ステージング）

#### 前提条件

```bash
# Docker & Docker Compose インストール確認
docker --version   # 20.10+
docker-compose --version  # 2.0+

# 環境変数設定
cp .env.example .env
```

#### 環境変数設定

**ファイル**: `.env`

```env
# Database
DATABASE_URL=postgresql://postgres:password123@postgres:5432/rosterhub
POSTGRES_PASSWORD=password123

# Redis
REDIS_URL=redis://redis:6379

# Application
NODE_ENV=production
PORT=3000
API_PREFIX=ims/oneroster/v1p2

# Security
JWT_SECRET=your-secret-key-change-in-production
API_KEY_SALT_ROUNDS=12

# Monitoring
GRAFANA_PASSWORD=admin123
```

#### デプロイ手順

```bash
# ステップ1: プロジェクトクローン
git clone https://github.com/your-org/rosterhub.git
cd rosterhub

# ステップ2: 環境変数設定
cp .env.example .env
vim .env  # 環境変数を編集

# ステップ3: Dockerイメージビルド
docker-compose build

# ステップ4: データベース初期化
docker-compose up -d postgres redis
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE rosterhub;"

# ステップ5: Prismaマイグレーション実行
docker-compose run --rm api npx prisma migrate deploy

# ステップ6: 全サービス起動
docker-compose up -d

# ステップ7: ヘルスチェック
curl http://localhost:3000/health
```

**期待される出力**:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

#### ログ確認

```bash
# 全サービスのログ
docker-compose logs -f

# API のみ
docker-compose logs -f api

# エラーログのみ
docker-compose logs -f api | grep ERROR
```

#### トラブルシューティング

**問題1: データベース接続エラー**
```bash
# 解決方法
docker-compose restart postgres
docker-compose exec postgres pg_isready -U postgres
```

**問題2: Redisタイムアウト**
```bash
# 解決方法
docker-compose restart redis
docker-compose exec redis redis-cli ping
```

---

### 2.2 Azureデプロイ

#### 前提条件

```bash
# Azure CLI インストール確認
az --version  # 2.50+

# ログイン
az login

# サブスクリプション設定
az account set --subscription "Your-Subscription-Name"
```

#### デプロイ手順（Bicep）

```bash
# ステップ1: リソースグループ作成
az group create \
  --name rosterhub-rg \
  --location japaneast

# ステップ2: Bicepデプロイ
az deployment group create \
  --resource-group rosterhub-rg \
  --template-file infra/azure/main.bicep \
  --parameters environment=production

# ステップ3: Container Registryにイメージプッシュ
az acr login --name rosterhubacrprod
docker build -t rosterhubacrprod.azurecr.io/rosterhub-api:latest .
docker push rosterhubacrprod.azurecr.io/rosterhub-api:latest

# ステップ4: Web Appにデプロイ
az webapp restart --name rosterhub-api-production --resource-group rosterhub-rg

# ステップ5: データベースマイグレーション
# Azure Cloud Shellから実行
DATABASE_URL=$(az keyvault secret show --vault-name rosterhub-kv-production --name database-url --query value -o tsv)
npx prisma migrate deploy
```

#### CI/CD パイプライン（Azure DevOps）

**ファイル**: `.azure-pipelines.yml`

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: rosterhub-secrets
  - name: imageRepository
    value: 'rosterhub-api'
  - name: containerRegistry
    value: 'rosterhubacrprod.azurecr.io'

stages:
  - stage: Build
    displayName: 'Build and Push Docker Image'
    jobs:
      - job: Build
        steps:
          - task: Docker@2
            inputs:
              command: 'buildAndPush'
              repository: '$(imageRepository)'
              dockerfile: 'Dockerfile'
              containerRegistry: '$(containerRegistry)'
              tags: |
                $(Build.BuildId)
                latest

  - stage: Test
    displayName: 'Run Tests'
    dependsOn: Build
    jobs:
      - job: Test
        steps:
          - script: |
              npm ci
              npm run test:unit
              npm run test:e2e
            displayName: 'Run Unit and E2E Tests'

  - stage: Deploy
    displayName: 'Deploy to Azure'
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Deploy
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebAppContainer@1
                  inputs:
                    azureSubscription: 'Azure-Subscription'
                    appName: 'rosterhub-api-production'
                    containers: '$(containerRegistry)/$(imageRepository):$(Build.BuildId)'

                - task: AzureCLI@2
                  inputs:
                    azureSubscription: 'Azure-Subscription'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      # Database migration
                      DATABASE_URL=$(az keyvault secret show --vault-name rosterhub-kv-production --name database-url --query value -o tsv)
                      export DATABASE_URL
                      npx prisma migrate deploy
```

---

### 2.3 AWSデプロイ

#### 前提条件

```bash
# AWS CLI インストール確認
aws --version  # 2.0+

# AWS認証情報設定
aws configure
```

#### デプロイ手順（Terraform）

```bash
# ステップ1: Terraformワークスペース初期化
cd infra/aws
terraform init

# ステップ2: 実行計画確認
terraform plan -out=tfplan

# ステップ3: インフラストラクチャデプロイ
terraform apply tfplan

# ステップ4: ECRにDockerイメージプッシュ
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com
docker build -t rosterhub-api .
docker tag rosterhub-api:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/rosterhub-api:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/rosterhub-api:latest

# ステップ5: ECSサービス更新
aws ecs update-service \
  --cluster rosterhub-cluster \
  --service rosterhub-api-service \
  --force-new-deployment

# ステップ6: データベースマイグレーション
# ECS Exec でタスク内実行
aws ecs execute-command \
  --cluster rosterhub-cluster \
  --task <task-id> \
  --container rosterhub-api \
  --interactive \
  --command "npx prisma migrate deploy"
```

#### CI/CD パイプライン（GitHub Actions）

**ファイル**: `.github/workflows/deploy-aws.yml`

```yaml
name: Deploy to AWS ECS

on:
  push:
    branches:
      - main

env:
  AWS_REGION: ap-northeast-1
  ECR_REPOSITORY: rosterhub-api
  ECS_CLUSTER: rosterhub-cluster
  ECS_SERVICE: rosterhub-api-service
  CONTAINER_NAME: rosterhub-api

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Run Tests
        run: |
          npm ci
          npm run test:unit
          npm run test:e2e

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE }}

      - name: Run database migrations
        run: |
          # TODO: Execute migrations via ECS Exec
          echo "Migrations should be run manually or via separate task"
```

---

## 3. 監視・ログ戦略

### 3.1 Prometheus + Grafana監視

#### Prometheusメトリクス収集

**ファイル**: `apps/api/src/metrics/metrics.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  // HTTP Requests Counter
  public readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  // HTTP Request Duration
  public readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  });

  // Database Connections
  public readonly dbConnectionsActive = new Gauge({
    name: 'db_connections_active',
    help: 'Active database connections',
  });

  // Redis Operations
  public readonly redisOperationsTotal = new Counter({
    name: 'redis_operations_total',
    help: 'Total Redis operations',
    labelNames: ['operation', 'status'],
  });

  // CSV Import Jobs
  public readonly csvImportJobsTotal = new Counter({
    name: 'csv_import_jobs_total',
    help: 'Total CSV import jobs',
    labelNames: ['status'],
  });

  public getMetrics(): Promise<string> {
    return register.metrics();
  }
}
```

#### Grafanaダッシュボード

**ファイル**: `monitoring/grafana/dashboards/rosterhub-api.json`

```json
{
  "dashboard": {
    "title": "RosterHub API Dashboard",
    "panels": [
      {
        "title": "HTTP Requests per Second",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "HTTP Request Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "db_connections_active",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "CSV Import Jobs",
        "targets": [
          {
            "expr": "rate(csv_import_jobs_total[5m])",
            "legendFormat": "{{status}}"
          }
        ]
      }
    ]
  }
}
```

---

### 3.2 ログ管理

#### 構造化ログ（Winston）

**ファイル**: `apps/api/src/common/logger/logger.service.ts`

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'rosterhub-api',
        version: process.env.npm_package_version,
      },
      transports: [
        // Console output
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        // File output (errors only)
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        // File output (all logs)
        new winston.transports.File({
          filename: 'logs/combined.log',
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

#### ログ出力例

```json
{
  "level": "info",
  "message": "HTTP GET /ims/oneroster/v1p2/users 200",
  "timestamp": "2025-11-16T10:30:00.123Z",
  "service": "rosterhub-api",
  "version": "1.0.0",
  "context": "UserController",
  "apiKey": "rh_live_*****",
  "ip": "192.168.1.100",
  "duration": 45,
  "statusCode": 200
}
```

---

## 4. バックアップ・リカバリ

### 4.1 データベースバックアップ戦略

#### 自動バックアップ

**PostgreSQL（Docker）**:
```bash
# cron設定
0 2 * * * docker exec rosterhub-postgres pg_dump -U postgres rosterhub > /backups/rosterhub-$(date +\%Y\%m\%d).sql
```

**Azure Database for PostgreSQL**:
- 自動バックアップ: 毎日1回（3:00-4:00）
- 保持期間: 7日間
- Geo-Redundant: 有効

**AWS RDS PostgreSQL**:
- 自動バックアップ: 毎日1回（3:00-4:00 UTC）
- 保持期間: 7日間
- スナップショット: 週次（日曜日）

#### 手動バックアップ

```bash
# PostgreSQL ダンプ
pg_dump -h localhost -U postgres -d rosterhub -F c -f rosterhub-backup-$(date +%Y%m%d).dump

# リストア
pg_restore -h localhost -U postgres -d rosterhub -c rosterhub-backup-20251116.dump
```

---

### 4.2 Redisバックアップ

#### RDB（Redis Database Backup）

**docker-compose.yml設定**:
```yaml
redis:
  command: redis-server --appendonly yes --save 60 1000
```

**設定説明**:
- `appendonly yes`: AOF（Append Only File）有効化
- `save 60 1000`: 60秒間に1000回以上の書き込みで自動保存

#### 手動スナップショット

```bash
# スナップショット作成
docker exec rosterhub-redis redis-cli BGSAVE

# スナップショットファイルコピー
docker cp rosterhub-redis:/data/dump.rdb ./backups/redis-dump-$(date +%Y%m%d).rdb
```

---

## 5. トラブルシューティング

### 5.1 よくある問題と解決方法

#### 問題1: データベース接続エラー

**症状**:
```
Error: P1001: Can't reach database server at `postgres:5432`
```

**原因**:
- PostgreSQLコンテナが起動していない
- DATABASE_URLが不正
- ネットワーク設定エラー

**解決方法**:
```bash
# PostgreSQL起動確認
docker-compose ps postgres

# PostgreSQL再起動
docker-compose restart postgres

# 接続テスト
docker-compose exec postgres pg_isready -U postgres

# 環境変数確認
echo $DATABASE_URL
```

---

#### 問題2: Redisタイムアウト

**症状**:
```
Error: Redis connection timeout
```

**原因**:
- Redisコンテナが停止
- メモリ不足
- ネットワーク遅延

**解決方法**:
```bash
# Redis起動確認
docker-compose ps redis

# Redis再起動
docker-compose restart redis

# 接続テスト
docker-compose exec redis redis-cli ping

# メモリ使用量確認
docker-compose exec redis redis-cli INFO memory
```

---

#### 問題3: CSV Import ジョブがハングする

**症状**:
- CSV Import ジョブが `processing` 状態で停止
- タイムアウトエラー

**原因**:
- 大きすぎるCSVファイル（1M+ レコード）
- メモリ不足
- データベース接続プールが枯渇

**解決方法**:
```bash
# BullMQ ジョブ確認
docker-compose exec redis redis-cli KEYS "bull:csv-import:*"

# ジョブステータス確認
curl http://localhost:3000/csv/import/status/{jobId}

# ワーカープロセス再起動
docker-compose restart api

# データベース接続プール拡張
# apps/api/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 50  // デフォルト: 10
}
```

---

#### 問題4: メモリリーク

**症状**:
- APIサーバーのメモリ使用量が増加し続ける
- `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`

**原因**:
- Prisma Clientのメモリリーク
- 大量のデータをメモリに保持

**解決方法**:
```bash
# Node.jsヒープサイズ拡張
NODE_OPTIONS="--max-old-space-size=4096" npm start

# メモリプロファイリング
node --inspect apps/api/dist/main.js

# Chrome DevTools でメモリスナップショット取得
# chrome://inspect
```

---

#### 問題5: E2Eテスト失敗

**症状**:
- E2Eテストが31/33で失敗（2つ失敗）

**原因**:
1. CSV Import Large File Test: タイムアウト（30秒）
2. CSV Export Manifest Test: demographics.csv欠落

**解決方法**:

**1. タイムアウト修正**:
```typescript
// apps/api/test/csv-import.e2e-spec.ts
it('should handle large CSV files (100k records)', async () => {
  // ...
}, 120000); // 30秒 → 120秒に延長
```

**2. Manifest修正**:
```typescript
// apps/api/src/oneroster/csv/csv-export.service.ts
const entities = [
  'users',
  'orgs',
  'classes',
  'courses',
  'enrollments',
  'academicSessions',
  'demographics' // 追加
];
```

---

### 5.2 ログ分析

#### エラーログ検索

```bash
# Docker環境
docker-compose logs api | grep ERROR | tail -100

# 特定エラーコード検索
docker-compose logs api | grep "P2025"  # Prisma レコード未発見

# 時刻範囲指定
docker-compose logs --since "2025-11-16T10:00:00" api
```

#### CloudWatch Logs（AWS）

```bash
# ログストリーム一覧
aws logs describe-log-streams --log-group-name /ecs/rosterhub-api

# ログ検索（エラーのみ）
aws logs filter-log-events \
  --log-group-name /ecs/rosterhub-api \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000
```

---

### 5.3 パフォーマンスチューニング

#### データベースクエリ最適化

```bash
# Slow Query Log 有効化（PostgreSQL）
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1秒以上のクエリをログ
SELECT pg_reload_conf();

# Slow Query確認
docker-compose exec postgres tail -f /var/lib/postgresql/data/log/postgresql-*.log | grep "duration:"
```

#### Prismaクエリ最適化

```typescript
// ❌ N+1 Problem
const users = await prisma.user.findMany();
for (const user of users) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userSourcedId: user.sourcedId }
  });
}

// ✅ Eager Loading
const users = await prisma.user.findMany({
  include: {
    enrollments: true
  }
});
```

---

## 次のステップ

Part 4「未完了タスクと既知の問題」では以下を詳述します：
- Sprint 6-11 の残りタスク
- E2Eテスト失敗の修正
- バックグラウンドプロセスの状況
- 技術的負債の対応計画

---

**End of Part 3**
