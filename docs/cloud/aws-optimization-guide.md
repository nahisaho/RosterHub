# RosterHub AWS Cloud Optimization Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Target Audience**: Cloud Architects, DevOps Engineers, System Administrators
**Cloud Platform**: Amazon Web Services (AWS)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AWS Architecture Overview](#aws-architecture-overview)
3. [Service Selection and Justification](#service-selection-and-justification)
4. [Detailed Architecture Design](#detailed-architecture-design)
5. [Infrastructure as Code (Terraform)](#infrastructure-as-code-terraform)
6. [Cost Estimation](#cost-estimation)
7. [Deployment Procedures](#deployment-procedures)
8. [Security and Compliance](#security-and-compliance)
9. [Monitoring and Operations](#monitoring-and-operations)
10. [High Availability and Disaster Recovery](#high-availability-and-disaster-recovery)
11. [Performance Optimization](#performance-optimization)
12. [Migration Strategy](#migration-strategy)
13. [Troubleshooting](#troubleshooting)
14. [References](#references)

---

## Executive Summary

This guide provides comprehensive AWS cloud optimization strategies for **RosterHub**, a OneRoster v1.2 Japan Profile 1.2.2 Integration Hub serving 35,000+ Japanese schools and 15.5M students.

### Key Recommendations

| Category | Recommendation | Rationale |
|----------|---------------|-----------|
| **Compute** | Amazon ECS on Fargate | Serverless containers, no EC2 management, auto-scaling |
| **Database** | Amazon RDS for PostgreSQL | Managed PostgreSQL with Multi-AZ, automated backups, read replicas |
| **Cache/Queue** | Amazon ElastiCache for Redis | Managed Redis with clustering, automatic failover, AOF persistence |
| **Load Balancer** | Application Load Balancer (ALB) | Layer 7 routing, health checks, integrated with WAF |
| **Secrets** | AWS Secrets Manager | Automatic rotation, encrypted storage, IAM integration |
| **Monitoring** | Amazon CloudWatch + X-Ray | Native AWS monitoring with distributed tracing |
| **Storage** | Amazon S3 | 11 9's durability, lifecycle policies, versioning |
| **Region** | ap-northeast-1 (Tokyo - Primary), ap-northeast-3 (Osaka - DR) | Low latency for Japanese users, disaster recovery |

### Cost Summary (Monthly, Tokyo Region)

| Scenario | Monthly Cost (JPY) | Monthly Cost (USD) |
|----------|-------------------|-------------------|
| **Small School** (500 students) | ¥32,000 - ¥48,000 | $215 - $320 |
| **Medium School** (2,000 students) | ¥75,000 - ¥110,000 | $500 - $740 |
| **Large School** (5,000 students) | ¥140,000 - ¥210,000 | $940 - $1,410 |
| **Municipality** (50,000 students) | ¥550,000 - ¥850,000 | $3,690 - $5,700 |

*Exchange rate: 1 USD = 149 JPY (as of Nov 2024)*

### Migration Timeline

- **Preparation**: 1-2 weeks
- **Infrastructure Setup**: 1 week
- **Data Migration**: 1-2 days
- **Testing**: 1 week
- **Production Cutover**: 1 day
- **Total**: 4-6 weeks

---

## AWS Architecture Overview

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                   AWS Cloud (Tokyo Region - ap-northeast-1)          │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Amazon Route 53 (DNS)                             │ │
│  │          (Health checks, failover routing)                     │ │
│  └────────────────────────┬───────────────────────────────────────┘ │
│                           │                                           │
│  ┌────────────────────────▼───────────────────────────────────────┐ │
│  │           Amazon CloudFront (CDN - Optional)                   │ │
│  │     (Global content delivery, DDoS protection)                 │ │
│  └────────────────────────┬───────────────────────────────────────┘ │
│                           │                                           │
│  ┌────────────────────────▼───────────────────────────────────────┐ │
│  │         AWS WAF (Web Application Firewall)                     │ │
│  │     OWASP Top 10 Protection, Rate Limiting                     │ │
│  └────────────────────────┬───────────────────────────────────────┘ │
│                           │                                           │
│  ┌────────────────────────▼───────────────────────────────────────┐ │
│  │      Application Load Balancer (ALB)                           │ │
│  │   HTTPS Termination, Path-based Routing                        │ │
│  └────────────────────────┬───────────────────────────────────────┘ │
│                           │                                           │
│  ┌────────────────────────▼───────────────────────────────────────┐ │
│  │                 Amazon VPC (10.0.0.0/16)                       │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │   Availability Zone 1a                                  │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Public Subnet (10.0.1.0/24)                    │   │  │ │
│  │  │  │  - NAT Gateway 1a                                │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Private Subnet - App (10.0.11.0/24)            │   │  │ │
│  │  │  │                                                   │   │  │ │
│  │  │  │  ┌─────────────────────────────────────────┐    │   │  │ │
│  │  │  │  │  ECS Fargate Tasks (NestJS API)         │    │   │  │ │
│  │  │  │  │  - 2 vCPU, 4 GB RAM                     │    │   │  │ │
│  │  │  │  │  - Auto Scaling: 2-10 tasks             │    │   │  │ │
│  │  │  │  └─────────────────────────────────────────┘    │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Private Subnet - Data (10.0.21.0/24)           │   │  │ │
│  │  │  │  - RDS PostgreSQL (Primary)                      │   │  │ │
│  │  │  │  - ElastiCache Redis (Primary Node)              │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │   Availability Zone 1c                                  │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Public Subnet (10.0.2.0/24)                    │   │  │ │
│  │  │  │  - NAT Gateway 1c                                │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Private Subnet - App (10.0.12.0/24)            │   │  │ │
│  │  │  │  - ECS Fargate Tasks (Standby)                   │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Private Subnet - Data (10.0.22.0/24)           │   │  │ │
│  │  │  │  - RDS PostgreSQL (Standby - Multi-AZ)           │   │  │ │
│  │  │  │  - ElastiCache Redis (Replica Node)              │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                      Shared Services                            │ │
│  │                                                                  │ │
│  │  - AWS Secrets Manager (Secrets, DB credentials, API keys)     │ │
│  │  - Amazon S3 (CSV uploads/exports, backups)                     │ │
│  │  - Amazon CloudWatch (Logs, Metrics, Alarms)                    │ │
│  │  - AWS X-Ray (Distributed tracing)                              │ │
│  │  - Amazon SNS (Alerting)                                        │ │
│  │  - AWS Backup (Automated backups)                               │ │
│  │  - Amazon ECR (Docker image registry)                           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│          AWS Cloud (Osaka Region - ap-northeast-3 - DR Site)         │
│                                                                       │
│  - RDS Cross-Region Read Replica (PostgreSQL)                        │
│  - S3 Cross-Region Replication (CRR)                                 │
│  - Standby ALB + ECS Fargate (for disaster recovery)                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Multi-AZ High Availability**: Deploy across multiple availability zones within Tokyo region
2. **Serverless Compute**: Use ECS Fargate for zero EC2 instance management
3. **Managed Services**: Leverage AWS-managed RDS and ElastiCache to minimize operational overhead
4. **Security in Depth**: Multiple security layers (WAF, Security Groups, NACLs, IAM)
5. **Disaster Recovery**: Cross-region replication to Osaka region
6. **Cost Optimization**: Auto-scaling, Savings Plans, spot instances where applicable

---

## Service Selection and Justification

### Compute Options Comparison

| Service | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Amazon ECS on Fargate** | - No EC2 management<br>- Per-second billing<br>- Auto-scaling built-in<br>- Native ALB integration | - Slightly higher cost than EC2<br>- Limited customization | **✅ Recommended** |
| **Amazon ECS on EC2** | - Lower cost<br>- Full control over instances<br>- Can use Reserved/Spot instances | - EC2 management overhead<br>- Patching required<br>- Capacity planning | **Alternative** for cost-sensitive deployments |
| **Amazon EKS (Kubernetes)** | - Industry-standard K8s<br>- Multi-cloud portability<br>- Advanced orchestration | - Complex setup<br>- Higher operational cost<br>- Overkill for single app | **Not recommended** |
| **AWS Lambda** | - True serverless<br>- Pay per request<br>- Zero management | - 15-minute timeout<br>- Cold start latency<br>- Not ideal for persistent connections | **Not suitable** for OneRoster API |

**Selected**: **Amazon ECS on Fargate** (with option to migrate to EC2 for cost savings)

### Database Options Comparison

| Service | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Amazon RDS for PostgreSQL** | - Fully managed<br>- Multi-AZ automatic failover<br>- Automated backups<br>- Read replicas<br>- PostgreSQL 15 support | - Higher cost than EC2-hosted | **✅ Recommended** |
| **Amazon Aurora PostgreSQL** | - 3x performance of PostgreSQL<br>- Storage auto-scaling<br>- Up to 15 read replicas<br>- Global database | - 2-3x cost of RDS<br>- Overkill for current scale | **Alternative** for future growth |
| **PostgreSQL on EC2** | - Full control<br>- Lower cost | - Manual management<br>- Manual backups<br>- Higher TCO | **Not recommended** |

**Selected**: **Amazon RDS for PostgreSQL** (with option to upgrade to Aurora for high-traffic scenarios)

### Cache/Queue Options Comparison

| Service | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Amazon ElastiCache for Redis** | - Managed Redis 7.x<br>- Multi-AZ with automatic failover<br>- Clustering support<br>- AOF/RDB persistence<br>- BullMQ compatible | - Higher cost than EC2-hosted | **✅ Recommended** |
| **Amazon MemoryDB for Redis** | - Redis-compatible<br>- Multi-AZ durability<br>- Microsecond latency | - Higher cost<br>- Newer service<br>- Overkill for caching | **Not needed** |
| **Self-managed Redis on EC2** | - Lower cost<br>- Full control | - Manual failover<br>- No managed backups | **Not recommended** |

**Selected**: **Amazon ElastiCache for Redis** (with AOF persistence for BullMQ job queue)

---

## Detailed Architecture Design

### VPC Design

#### VPC Configuration

```
VPC Name: rosterhub-prod-vpc
CIDR Block: 10.0.0.0/16
Region: ap-northeast-1 (Tokyo)
Tenancy: Default
DNS Hostnames: Enabled
DNS Resolution: Enabled
```

#### Subnet Design

| Subnet | Type | CIDR | AZ | Purpose | Route |
|--------|------|------|-----|---------|-------|
| **public-1a** | Public | 10.0.1.0/24 | ap-northeast-1a | NAT Gateway, ALB | Internet Gateway |
| **public-1c** | Public | 10.0.2.0/24 | ap-northeast-1c | NAT Gateway, ALB | Internet Gateway |
| **private-app-1a** | Private | 10.0.11.0/24 | ap-northeast-1a | ECS Fargate Tasks | NAT Gateway 1a |
| **private-app-1c** | Private | 10.0.12.0/24 | ap-northeast-1c | ECS Fargate Tasks | NAT Gateway 1c |
| **private-data-1a** | Private | 10.0.21.0/24 | ap-northeast-1a | RDS, ElastiCache | NAT Gateway 1a |
| **private-data-1c** | Private | 10.0.22.0/24 | ap-northeast-1c | RDS, ElastiCache | NAT Gateway 1c |

#### Security Groups

**Security Group: sg-alb**
```
Description: Security group for Application Load Balancer
VPC: rosterhub-prod-vpc

Inbound Rules:
- Type: HTTPS, Protocol: TCP, Port: 443, Source: 0.0.0.0/0, Description: HTTPS from Internet
- Type: HTTP, Protocol: TCP, Port: 80, Source: 0.0.0.0/0, Description: HTTP redirect to HTTPS

Outbound Rules:
- Type: Custom TCP, Protocol: TCP, Port: 3000, Destination: sg-ecs-tasks, Description: Forward to ECS tasks
```

**Security Group: sg-ecs-tasks**
```
Description: Security group for ECS Fargate tasks
VPC: rosterhub-prod-vpc

Inbound Rules:
- Type: Custom TCP, Protocol: TCP, Port: 3000, Source: sg-alb, Description: Traffic from ALB
- Type: Custom TCP, Protocol: TCP, Port: 3000, Source: sg-ecs-tasks, Description: Inter-task communication

Outbound Rules:
- Type: PostgreSQL, Protocol: TCP, Port: 5432, Destination: sg-rds, Description: PostgreSQL access
- Type: Custom TCP, Protocol: TCP, Port: 6379, Destination: sg-redis, Description: Redis access
- Type: HTTPS, Protocol: TCP, Port: 443, Destination: 0.0.0.0/0, Description: Internet access (AWS APIs)
```

**Security Group: sg-rds**
```
Description: Security group for RDS PostgreSQL
VPC: rosterhub-prod-vpc

Inbound Rules:
- Type: PostgreSQL, Protocol: TCP, Port: 5432, Source: sg-ecs-tasks, Description: PostgreSQL from ECS

Outbound Rules:
- (No outbound rules required)
```

**Security Group: sg-redis**
```
Description: Security group for ElastiCache Redis
VPC: rosterhub-prod-vpc

Inbound Rules:
- Type: Custom TCP, Protocol: TCP, Port: 6379, Source: sg-ecs-tasks, Description: Redis from ECS

Outbound Rules:
- (No outbound rules required)
```

#### Network ACLs

**NACL: nacl-public**
```
Applies to: public-1a, public-1c

Inbound Rules:
100: Allow, TCP, Port 80, Source: 0.0.0.0/0
110: Allow, TCP, Port 443, Source: 0.0.0.0/0
120: Allow, TCP, Ports 1024-65535, Source: 0.0.0.0/0 (ephemeral ports)
*: Deny, All, All, Source: 0.0.0.0/0

Outbound Rules:
100: Allow, TCP, Port 3000, Destination: 10.0.11.0/24
110: Allow, TCP, Port 3000, Destination: 10.0.12.0/24
120: Allow, TCP, Ports 1024-65535, Destination: 0.0.0.0/0
*: Deny, All, All, Destination: 0.0.0.0/0
```

**NACL: nacl-private-app**
```
Applies to: private-app-1a, private-app-1c

Inbound Rules:
100: Allow, TCP, Port 3000, Source: 10.0.1.0/24
110: Allow, TCP, Port 3000, Source: 10.0.2.0/24
120: Allow, TCP, Ports 1024-65535, Source: 0.0.0.0/0
*: Deny, All, All, Source: 0.0.0.0/0

Outbound Rules:
100: Allow, TCP, Port 5432, Destination: 10.0.21.0/24
110: Allow, TCP, Port 5432, Destination: 10.0.22.0/24
120: Allow, TCP, Port 6379, Destination: 10.0.21.0/24
130: Allow, TCP, Port 6379, Destination: 10.0.22.0/24
140: Allow, TCP, Port 443, Destination: 0.0.0.0/0
150: Allow, TCP, Ports 1024-65535, Destination: 0.0.0.0/0
*: Deny, All, All, Destination: 0.0.0.0/0
```

### Application Load Balancer Configuration

**ALB Name**: rosterhub-prod-alb

**Configuration**:
```
Scheme: Internet-facing
IP Address Type: IPv4
Subnets: public-1a, public-1c
Security Groups: sg-alb
Deletion Protection: Enabled
Cross-Zone Load Balancing: Enabled
```

**Listeners**:

**HTTPS Listener (Port 443)**:
```
Protocol: HTTPS
Port: 443
Default SSL Certificate: ACM Certificate (*.your-domain.com)
Security Policy: ELBSecurityPolicy-TLS-1-2-2017-01
Default Action: Forward to target-group-rosterhub-api
```

**HTTP Listener (Port 80)**:
```
Protocol: HTTP
Port: 80
Default Action: Redirect to HTTPS (Port 443, Status Code: 301)
```

**Target Group**: target-group-rosterhub-api
```
Target Type: IP (for Fargate)
Protocol: HTTP
Port: 3000
VPC: rosterhub-prod-vpc

Health Check:
  - Protocol: HTTP
  - Path: /health
  - Interval: 30 seconds
  - Timeout: 5 seconds
  - Healthy Threshold: 2
  - Unhealthy Threshold: 3
  - Success Codes: 200

Attributes:
  - Deregistration Delay: 30 seconds
  - Slow Start Duration: 0 seconds
  - Stickiness: Enabled (Load Balancer Generated Cookie, 1 day)
```

**Access Logs**:
```
Enabled: Yes
S3 Bucket: s3://rosterhub-prod-alb-logs-<account-id>-ap-northeast-1
Prefix: alb-logs/
```

### AWS WAF Configuration

**Web ACL Name**: rosterhub-prod-waf

**Capacity Units**: 50 (expandable)

**Associated Resource**: rosterhub-prod-alb

**Default Action**: Allow

**Rules** (in order of priority):

**Rule 1: AWS Managed Rule - Core Rule Set**
```
Priority: 1
Name: AWSManagedRulesCommonRuleSet
Type: Managed Rule Group
Vendor: AWS
Action: Block
```

**Rule 2: AWS Managed Rule - Known Bad Inputs**
```
Priority: 2
Name: AWSManagedRulesKnownBadInputsRuleSet
Type: Managed Rule Group
Vendor: AWS
Action: Block
```

**Rule 3: Rate Limiting**
```
Priority: 3
Name: RateLimitRule
Type: Rate-based rule
Rate Limit: 1000 requests per 5 minutes per IP
Action: Block
Scope: IP
```

**Rule 4: Geo-Blocking (Optional)**
```
Priority: 4
Name: GeoBlockingRule
Type: Custom rule
Statement:
  - CountryCode NOT IN [JP, US, SG]  # Allow Japan, USA, Singapore
Action: Block
```

**Rule 5: CSV Upload Path Exception**
```
Priority: 5
Name: CSVUploadException
Type: Custom rule
Statement:
  - URI Path contains "/ims/oneroster/v1p2/csv/import"
Action: Allow (exclude from size restrictions)
```

**Logging**:
```
Destination: Amazon Kinesis Data Firehose
Firehose Name: aws-waf-logs-rosterhub-prod
S3 Bucket: s3://rosterhub-prod-waf-logs-<account-id>
Redacted Fields: Authorization header, X-API-Key header
```

### ECS Fargate Configuration

**Cluster Name**: rosterhub-prod-cluster

**Service Name**: rosterhub-api-service

**Task Definition**: rosterhub-api-task

**Task Definition Specification**:
```json
{
  "family": "rosterhub-api-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "rosterhub-api",
      "image": "<account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/rosterhub-api:latest",
      "cpu": 2048,
      "memory": 4096,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "REDIS_HOST",
          "value": "rosterhub-prod-redis.xxxxxx.cache.amazonaws.com"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:<account-id>:secret:rosterhub/database-url"
        },
        {
          "name": "REDIS_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:<account-id>:secret:rosterhub/redis-password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:<account-id>:secret:rosterhub/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rosterhub-api",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "mountPoints": [
        {
          "sourceVolume": "efs-uploads",
          "containerPath": "/app/uploads",
          "readOnly": false
        }
      ]
    }
  ],
  "volumes": [
    {
      "name": "efs-uploads",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxxxxxxxx",
        "rootDirectory": "/uploads",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "iam": "ENABLED"
        }
      }
    }
  ]
}
```

**Service Configuration**:
```
Launch Type: FARGATE
Platform Version: LATEST
Desired Count: 2
Deployment Configuration:
  - Maximum Percent: 200%
  - Minimum Healthy Percent: 100%
  - Deployment Circuit Breaker: Enabled (rollback on failure)

Network Configuration:
  - VPC: rosterhub-prod-vpc
  - Subnets: private-app-1a, private-app-1c
  - Security Groups: sg-ecs-tasks
  - Auto-assign Public IP: Disabled

Load Balancing:
  - Type: Application Load Balancer
  - Load Balancer: rosterhub-prod-alb
  - Target Group: target-group-rosterhub-api
  - Health Check Grace Period: 60 seconds

Service Discovery:
  - Namespace: rosterhub.local
  - Service Discovery Name: api
  - DNS Record Type: A
```

**Auto Scaling Configuration**:
```
Minimum Tasks: 2
Maximum Tasks: 10
Desired Tasks: 2

Scaling Policies:

1. CPU-based Scaling:
   - Metric: ECSServiceAverageCPUUtilization
   - Target Value: 70%
   - Scale-out Cooldown: 300 seconds
   - Scale-in Cooldown: 600 seconds

2. Memory-based Scaling:
   - Metric: ECSServiceAverageMemoryUtilization
   - Target Value: 80%
   - Scale-out Cooldown: 300 seconds
   - Scale-in Cooldown: 600 seconds

3. Request Count Scaling:
   - Metric: ALBRequestCountPerTarget
   - Target Value: 1000 requests/minute
   - Scale-out Cooldown: 180 seconds
   - Scale-in Cooldown: 600 seconds
```

### RDS PostgreSQL Configuration

**DB Instance Identifier**: rosterhub-prod-db

**Configuration**:
```
Engine: PostgreSQL 15.4
DB Instance Class: db.r6i.xlarge (4 vCPU, 32 GB RAM)
  - Alternative for small deployment: db.t3.medium (2 vCPU, 4 GB RAM)
Storage Type: Provisioned IOPS SSD (io2)
Allocated Storage: 100 GB
Max Allocated Storage: 1000 GB (autoscaling enabled)
IOPS: 3000
Multi-AZ Deployment: Yes
```

**Network and Security**:
```
VPC: rosterhub-prod-vpc
Subnet Group: rosterhub-db-subnet-group (private-data-1a, private-data-1c)
Public Accessibility: No
VPC Security Group: sg-rds
Availability Zone: ap-northeast-1a (primary), ap-northeast-1c (standby)
```

**Database Configuration**:
```
Database Name: rosterhub_production
Master Username: rosterhubadmin
Master Password: (stored in Secrets Manager)
Port: 5432
Parameter Group: rosterhub-postgres15-params
```

**Custom Parameter Group** (rosterhub-postgres15-params):
```
# Connection Settings
max_connections = 200
shared_buffers = 8GB  # 25% of RAM
effective_cache_size = 24GB  # 75% of RAM
work_mem = 20MB
maintenance_work_mem = 512MB

# Write-Ahead Logging
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Query Planning
random_page_cost = 1.1  # SSD optimization
effective_io_concurrency = 200
default_statistics_target = 100

# Performance Monitoring
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
pg_stat_statements.track = all
log_statement = 'ddl'
log_duration = on
log_min_duration_statement = 1000  # Log queries slower than 1 second
```

**Backup Configuration**:
```
Automated Backups: Enabled
Backup Retention Period: 35 days
Backup Window: 18:00-19:00 JST (daily)
Copy Tags to Snapshots: Yes
Deletion Protection: Enabled
```

**Enhanced Monitoring**:
```
Enabled: Yes
Granularity: 60 seconds
Monitoring Role: rds-monitoring-role
```

**Performance Insights**:
```
Enabled: Yes
Retention Period: 7 days (free tier) or 731 days (long-term)
```

**Maintenance**:
```
Auto Minor Version Upgrade: Yes
Maintenance Window: Sunday 03:00-04:00 JST
```

**Encryption**:
```
Encryption at Rest: Enabled
KMS Key: AWS managed key (aws/rds) or Customer managed key
Encryption in Transit: Enforced (require SSL connections)
```

### ElastiCache for Redis Configuration

**Cluster Name**: rosterhub-prod-redis

**Configuration**:
```
Engine: Redis 7.0
Node Type: cache.r6g.large (2 vCPU, 13.07 GB RAM)
  - Alternative for small deployment: cache.t3.medium (2 vCPU, 3.09 GB RAM)
Number of Replicas: 2 (1 primary + 2 replicas)
Multi-AZ: Enabled
Automatic Failover: Enabled
```

**Network and Security**:
```
VPC: rosterhub-prod-vpc
Subnet Group: rosterhub-redis-subnet-group (private-data-1a, private-data-1c)
Security Group: sg-redis
Port: 6379
Encryption at Rest: Enabled
Encryption in Transit: Enabled
AUTH Token: Enabled (stored in Secrets Manager)
```

**Parameter Group** (rosterhub-redis-params):
```
# Memory Management
maxmemory-policy: allkeys-lru
reserved-memory-percent: 25  # Reserve 25% for Redis overhead

# Persistence (critical for BullMQ)
appendonly: yes
appendfsync: everysec
auto-aof-rewrite-percentage: 100
auto-aof-rewrite-min-size: 64mb

# RDB Snapshots
save: "900 1 300 10 60 10000"
stop-writes-on-bgsave-error: yes

# Connection Management
timeout: 300
tcp-keepalive: 300
maxclients: 65000

# Performance
notify-keyspace-events: Ex  # For BullMQ job expiration
```

**Backup Configuration**:
```
Automatic Backups: Enabled
Backup Retention Period: 7 days
Backup Window: 03:00-04:00 JST
Final Backup on Delete: Yes
```

**Maintenance**:
```
Maintenance Window: Sunday 04:00-05:00 JST
Auto Minor Version Upgrade: Yes
```

### Amazon S3 Configuration

**Bucket Name**: rosterhub-prod-<account-id>-ap-northeast-1

**Configuration**:
```
Region: ap-northeast-1
Versioning: Enabled
Object Lock: Disabled
Default Encryption: SSE-S3 (AES-256)
  - Alternative: SSE-KMS with customer managed key
Bucket Key: Enabled (reduces KMS costs)
Object Ownership: Bucket owner enforced
Block Public Access: All enabled
```

**Folder Structure**:
```
s3://rosterhub-prod-<account-id>-ap-northeast-1/
├── csv-uploads/           # CSV file uploads
├── csv-exports/           # Generated CSV exports
├── backups/               # Application backups
├── logs/                  # Application logs (archived)
└── alb-logs/              # ALB access logs
```

**Lifecycle Policies**:

**Policy 1: Archive Old CSV Uploads**
```json
{
  "Rules": [
    {
      "Id": "ArchiveOldUploads",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "csv-uploads/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_IR"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

**Policy 2: Lifecycle for CSV Exports**
```json
{
  "Rules": [
    {
      "Id": "ManageExports",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "csv-exports/"
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 30,
          "StorageClass": "GLACIER_IR"
        }
      ]
    }
  ]
}
```

**Cross-Region Replication** (for disaster recovery):
```
Destination Bucket: rosterhub-prod-replica-<account-id>-ap-northeast-3
Replication Rule:
  - Status: Enabled
  - Priority: 1
  - Filter: All objects
  - Delete Marker Replication: Enabled
  - Replica Storage Class: STANDARD
  - Replication Time Control: Enabled (15-minute SLA)
```

**Bucket Policy** (enforce SSL):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureConnections",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::rosterhub-prod-<account-id>-ap-northeast-1",
        "arn:aws:s3:::rosterhub-prod-<account-id>-ap-northeast-1/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

---

## Infrastructure as Code (Terraform)

### Terraform Project Structure

```
terraform/
├── main.tf                      # Main orchestration file
├── variables.tf                 # Input variables
├── outputs.tf                   # Output values
├── terraform.tfvars             # Variable values (not committed)
├── backend.tf                   # S3 backend configuration
├── providers.tf                 # AWS provider configuration
├── versions.tf                  # Terraform and provider versions
├── environments/
│   ├── dev/
│   │   └── terraform.tfvars
│   ├── staging/
│   │   └── terraform.tfvars
│   └── prod/
│       └── terraform.tfvars
├── modules/
│   ├── vpc/                     # VPC, Subnets, Security Groups
│   ├── alb/                     # Application Load Balancer
│   ├── ecs/                     # ECS Cluster, Service, Task Definition
│   ├── rds/                     # RDS PostgreSQL
│   ├── elasticache/             # ElastiCache Redis
│   ├── s3/                      # S3 Buckets
│   ├── secrets/                 # Secrets Manager
│   ├── cloudwatch/              # CloudWatch Logs, Alarms
│   ├── waf/                     # AWS WAF
│   └── iam/                     # IAM Roles and Policies
└── scripts/
    ├── deploy.sh                # Deployment script
    └── destroy.sh               # Cleanup script
```

### Main Terraform Configuration

**File: `main.tf`**

```hcl
# ============================================
# RosterHub AWS Infrastructure - Main Configuration
# ============================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "rosterhub-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "rosterhub-terraform-lock"
  }
}

# ============================================
# Provider Configuration
# ============================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = "Education-IT"
    }
  }
}

provider "aws" {
  alias  = "osaka"
  region = var.dr_region

  default_tags {
    tags = {
      Environment = "${var.environment}-dr"
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CostCenter  = "Education-IT"
    }
  }
}

# ============================================
# Local Variables
# ============================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
  }

  azs = [
    "${var.aws_region}a",
    "${var.aws_region}c"
  ]
}

# ============================================
# VPC Module
# ============================================

module "vpc" {
  source = "./modules/vpc"

  name_prefix = local.name_prefix
  vpc_cidr    = var.vpc_cidr
  azs         = local.azs

  public_subnet_cidrs      = var.public_subnet_cidrs
  private_app_subnet_cidrs = var.private_app_subnet_cidrs
  private_data_subnet_cidrs = var.private_data_subnet_cidrs

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "prod"  # Multi-NAT for prod only

  tags = local.common_tags
}

# ============================================
# Security Groups Module
# ============================================

module "security_groups" {
  source = "./modules/security_groups"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  vpc_cidr    = var.vpc_cidr

  alb_ingress_cidrs = ["0.0.0.0/0"]

  tags = local.common_tags
}

# ============================================
# IAM Roles Module
# ============================================

module "iam" {
  source = "./modules/iam"

  name_prefix = local.name_prefix

  tags = local.common_tags
}

# ============================================
# Secrets Manager Module
# ============================================

module "secrets" {
  source = "./modules/secrets"

  name_prefix = local.name_prefix

  database_username = var.database_username
  database_password = var.database_password
  jwt_secret        = var.jwt_secret

  tags = local.common_tags
}

# ============================================
# RDS PostgreSQL Module
# ============================================

module "rds" {
  source = "./modules/rds"

  name_prefix = local.name_prefix

  instance_class    = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage
  engine_version    = "15.4"

  database_name     = var.database_name
  master_username   = var.database_username
  master_password   = var.database_password

  subnet_ids         = module.vpc.private_data_subnet_ids
  security_group_ids = [module.security_groups.rds_security_group_id]

  multi_az              = var.environment == "prod"
  backup_retention_days = var.environment == "prod" ? 35 : 7

  tags = local.common_tags
}

# ============================================
# ElastiCache Redis Module
# ============================================

module "elasticache" {
  source = "./modules/elasticache"

  name_prefix = local.name_prefix

  node_type          = var.redis_node_type
  num_cache_nodes    = var.redis_num_replicas + 1
  engine_version     = "7.0"

  subnet_ids         = module.vpc.private_data_subnet_ids
  security_group_ids = [module.security_groups.redis_security_group_id]

  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled           = var.environment == "prod"

  tags = local.common_tags
}

# ============================================
# S3 Buckets Module
# ============================================

module "s3" {
  source = "./modules/s3"

  name_prefix = local.name_prefix
  aws_region  = var.aws_region
  account_id  = data.aws_caller_identity.current.account_id

  enable_versioning           = true
  enable_lifecycle_policies   = true
  enable_cross_region_replication = var.environment == "prod"
  dr_region                   = var.dr_region

  tags = local.common_tags
}

# ============================================
# Application Load Balancer Module
# ============================================

module "alb" {
  source = "./modules/alb"

  name_prefix = local.name_prefix

  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  security_group_ids = [module.security_groups.alb_security_group_id]

  certificate_arn = var.acm_certificate_arn

  access_logs_bucket = module.s3.alb_logs_bucket_name

  tags = local.common_tags
}

# ============================================
# AWS WAF Module
# ============================================

module "waf" {
  source = "./modules/waf"

  name_prefix = local.name_prefix

  alb_arn = module.alb.alb_arn

  rate_limit       = var.waf_rate_limit
  enable_geo_block = var.waf_enable_geo_blocking
  allowed_countries = var.waf_allowed_countries

  tags = local.common_tags
}

# ============================================
# ECR Repository Module
# ============================================

module "ecr" {
  source = "./modules/ecr"

  name_prefix = local.name_prefix

  image_tag_mutability = "MUTABLE"
  scan_on_push         = true

  tags = local.common_tags
}

# ============================================
# ECS Cluster and Service Module
# ============================================

module "ecs" {
  source = "./modules/ecs"

  name_prefix = local.name_prefix

  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_app_subnet_ids
  security_group_ids = [module.security_groups.ecs_security_group_id]

  # Task Definition
  task_cpu            = var.ecs_task_cpu
  task_memory         = var.ecs_task_memory
  container_image     = "${module.ecr.repository_url}:latest"
  container_port      = 3000

  # Environment Variables
  environment_variables = {
    NODE_ENV = "production"
    PORT     = "3000"
    REDIS_HOST = module.elasticache.redis_endpoint
  }

  # Secrets from Secrets Manager
  secrets = [
    {
      name      = "DATABASE_URL"
      valueFrom = module.secrets.database_url_secret_arn
    },
    {
      name      = "REDIS_PASSWORD"
      valueFrom = module.secrets.redis_password_secret_arn
    },
    {
      name      = "JWT_SECRET"
      valueFrom = module.secrets.jwt_secret_arn
    }
  ]

  # IAM Roles
  execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_role_arn      = module.iam.ecs_task_role_arn

  # Service Configuration
  desired_count     = var.ecs_desired_count
  min_capacity      = var.ecs_min_capacity
  max_capacity      = var.ecs_max_capacity

  # Load Balancer
  target_group_arn  = module.alb.target_group_arn

  # Auto Scaling
  cpu_target_value     = 70
  memory_target_value  = 80
  request_count_target = 1000

  tags = local.common_tags
}

# ============================================
# CloudWatch Logs and Alarms Module
# ============================================

module "cloudwatch" {
  source = "./modules/cloudwatch"

  name_prefix = local.name_prefix

  # Log Groups
  ecs_log_retention_days = var.environment == "prod" ? 90 : 30

  # Alarms
  alb_arn             = module.alb.alb_arn
  target_group_arn    = module.alb.target_group_arn
  ecs_cluster_name    = module.ecs.cluster_name
  ecs_service_name    = module.ecs.service_name
  rds_instance_id     = module.rds.db_instance_id
  redis_cluster_id    = module.elasticache.redis_cluster_id

  # SNS Topic for Alerts
  alert_email = var.alert_email

  tags = local.common_tags
}

# ============================================
# Data Sources
# ============================================

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# ============================================
# Outputs
# ============================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.alb_dns_name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = module.ecr.repository_url
}

output "s3_bucket_name" {
  description = "S3 bucket name for uploads/exports"
  value       = module.s3.main_bucket_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}
```

### VPC Module

**File: `modules/vpc/main.tf`**

```hcl
# ============================================
# VPC
# ============================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-vpc"
    }
  )
}

# ============================================
# Internet Gateway
# ============================================

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-igw"
    }
  )
}

# ============================================
# Public Subnets
# ============================================

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-public-${var.azs[count.index]}"
      Type = "Public"
    }
  )
}

# ============================================
# Private App Subnets
# ============================================

resource "aws_subnet" "private_app" {
  count = length(var.private_app_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_app_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-private-app-${var.azs[count.index]}"
      Type = "Private-App"
    }
  )
}

# ============================================
# Private Data Subnets
# ============================================

resource "aws_subnet" "private_data" {
  count = length(var.private_data_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_data_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-private-data-${var.azs[count.index]}"
      Type = "Private-Data"
    }
  )
}

# ============================================
# Elastic IPs for NAT Gateways
# ============================================

resource "aws_eip" "nat" {
  count = var.single_nat_gateway ? 1 : length(var.public_subnet_cidrs)

  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = var.single_nat_gateway ? "${var.name_prefix}-nat-eip" : "${var.name_prefix}-nat-eip-${var.azs[count.index]}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# ============================================
# NAT Gateways
# ============================================

resource "aws_nat_gateway" "main" {
  count = var.single_nat_gateway ? 1 : length(var.public_subnet_cidrs)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name = var.single_nat_gateway ? "${var.name_prefix}-nat" : "${var.name_prefix}-nat-${var.azs[count.index]}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# ============================================
# Route Tables
# ============================================

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-public-rt"
      Type = "Public"
    }
  )
}

# Private Route Tables (one per AZ for multi-NAT, single for single-NAT)
resource "aws_route_table" "private" {
  count = var.single_nat_gateway ? 1 : length(var.azs)

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(
    var.tags,
    {
      Name = var.single_nat_gateway ? "${var.name_prefix}-private-rt" : "${var.name_prefix}-private-rt-${var.azs[count.index]}"
      Type = "Private"
    }
  )
}

# ============================================
# Route Table Associations
# ============================================

# Public Subnet Associations
resource "aws_route_table_association" "public" {
  count = length(var.public_subnet_cidrs)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private App Subnet Associations
resource "aws_route_table_association" "private_app" {
  count = length(var.private_app_subnet_cidrs)

  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id
}

# Private Data Subnet Associations
resource "aws_route_table_association" "private_data" {
  count = length(var.private_data_subnet_cidrs)

  subnet_id      = aws_subnet.private_data[count.index].id
  route_table_id = var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id
}

# ============================================
# VPC Flow Logs
# ============================================

resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-vpc-flow-log"
    }
  )
}

resource "aws_cloudwatch_log_group" "flow_log" {
  name              = "/aws/vpc/${var.name_prefix}-flow-log"
  retention_in_days = 7

  tags = var.tags
}

resource "aws_iam_role" "flow_log" {
  name = "${var.name_prefix}-vpc-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_log" {
  name = "${var.name_prefix}-vpc-flow-log-policy"
  role = aws_iam_role.flow_log.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================
# Outputs
# ============================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_app_subnet_ids" {
  description = "List of private app subnet IDs"
  value       = aws_subnet.private_app[*].id
}

output "private_data_subnet_ids" {
  description = "List of private data subnet IDs"
  value       = aws_subnet.private_data[*].id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.main[*].id
}
```

### RDS Module

**File: `modules/rds/main.tf`**

```hcl
# ============================================
# DB Subnet Group
# ============================================

resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-db-subnet-group"
    }
  )
}

# ============================================
# DB Parameter Group
# ============================================

resource "aws_db_parameter_group" "main" {
  name   = "${var.name_prefix}-postgres15-params"
  family = "postgres15"

  parameter {
    name  = "shared_buffers"
    value = var.instance_class == "db.r6i.xlarge" ? "2097152" : "524288"  # 8GB / 2GB (in 8KB pages)
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "effective_cache_size"
    value = var.instance_class == "db.r6i.xlarge" ? "6291456" : "1572864"  # 24GB / 6GB
  }

  parameter {
    name  = "work_mem"
    value = "20480"  # 20MB (in KB)
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"  # 512MB (in KB)
    apply_method = "immediate"
  }

  parameter {
    name  = "max_connections"
    value = "200"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"  # SSD optimization
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries > 1 second
  }

  tags = var.tags
}

# ============================================
# RDS Instance
# ============================================

resource "aws_db_instance" "main" {
  identifier = "${var.name_prefix}-db"

  # Engine
  engine         = "postgres"
  engine_version = var.engine_version

  # Instance
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "io2"
  iops              = 3000
  storage_encrypted = true
  kms_key_id        = var.kms_key_id

  max_allocated_storage = 1000  # Autoscaling up to 1TB

  # Database
  db_name  = var.database_name
  username = var.master_username
  password = var.master_password
  port     = 5432

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids
  publicly_accessible    = false

  # High Availability
  multi_az = var.multi_az

  # Backup
  backup_retention_period   = var.backup_retention_days
  backup_window             = "09:00-10:00"  # 18:00-19:00 JST
  copy_tags_to_snapshot     = true
  delete_automated_backups  = false
  deletion_protection       = var.environment == "prod"
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.name_prefix}-final-snapshot-${formatdate("YYYYMMDD-hhmmss", timestamp())}" : null

  # Maintenance
  maintenance_window         = "sat:18:00-sat:19:00"  # Sunday 03:00-04:00 JST
  auto_minor_version_upgrade = true

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = var.environment == "prod" ? 731 : 7

  # Parameter Group
  parameter_group_name = aws_db_parameter_group.main.name

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-db"
    }
  )

  lifecycle {
    ignore_changes = [
      password,  # Managed in Secrets Manager
      final_snapshot_identifier
    ]
  }
}

# ============================================
# Enhanced Monitoring IAM Role
# ============================================

resource "aws_iam_role" "rds_monitoring" {
  name = "${var.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ============================================
# Outputs
# ============================================

output "db_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "RDS instance address"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "db_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}
```

### Deployment Script

**File: `scripts/deploy.sh`**

```bash
#!/bin/bash

# ============================================
# RosterHub AWS Deployment Script
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Configuration
# ============================================

ENVIRONMENT=${1:-prod}
AWS_REGION=${2:-ap-northeast-1}
PROJECT_NAME="rosterhub"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RosterHub AWS Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "AWS Region: ${YELLOW}${AWS_REGION}${NC}"
echo ""

# ============================================
# Prerequisites Check
# ============================================

echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}ERROR: Terraform is not installed${NC}"
    echo "Install from: https://www.terraform.io/downloads.html"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI is not installed${NC}"
    echo "Install from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}ERROR: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# ============================================
# Initialize Terraform
# ============================================

echo -e "${YELLOW}Initializing Terraform...${NC}"

terraform init \
  -backend-config="bucket=${PROJECT_NAME}-terraform-state" \
  -backend-config="key=${ENVIRONMENT}/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Terraform initialized${NC}"
else
    echo -e "${RED}✗ Terraform initialization failed${NC}"
    exit 1
fi

echo ""

# ============================================
# Select Workspace
# ============================================

echo -e "${YELLOW}Selecting Terraform workspace: ${ENVIRONMENT}${NC}"

terraform workspace select ${ENVIRONMENT} || terraform workspace new ${ENVIRONMENT}

echo ""

# ============================================
# Plan Infrastructure
# ============================================

echo -e "${YELLOW}Planning infrastructure changes...${NC}"

terraform plan \
  -var-file="environments/${ENVIRONMENT}/terraform.tfvars" \
  -out=tfplan

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Plan generated successfully${NC}"
else
    echo -e "${RED}✗ Plan generation failed${NC}"
    exit 1
fi

echo ""

# ============================================
# Confirm Deployment
# ============================================

echo -e "${YELLOW}Review the plan above.${NC}"
read -p "Continue with deployment? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# ============================================
# Apply Infrastructure
# ============================================

echo -e "${YELLOW}Deploying infrastructure...${NC}"
echo -e "${YELLOW}This may take 15-30 minutes.${NC}"
echo ""

terraform apply tfplan

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

# ============================================
# Save Outputs
# ============================================

echo ""
echo -e "${YELLOW}Saving deployment outputs...${NC}"

mkdir -p outputs
terraform output -json > outputs/${ENVIRONMENT}-outputs.json

echo -e "${GREEN}Outputs saved to: outputs/${ENVIRONMENT}-outputs.json${NC}"

# ============================================
# Display Key Outputs
# ============================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Key Deployment Information:${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

terraform output

# ============================================
# Next Steps
# ============================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Next Steps:${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "1. Build and push Docker image to ECR:"
echo "   aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin \$(terraform output -raw ecr_repository_url)"
echo "   docker build -t rosterhub-api ."
echo "   docker tag rosterhub-api:latest \$(terraform output -raw ecr_repository_url):latest"
echo "   docker push \$(terraform output -raw ecr_repository_url):latest"
echo ""
echo "2. Run database migrations:"
echo "   (Connect to ECS task and run): npx prisma migrate deploy"
echo ""
echo "3. Update Route 53 DNS:"
echo "   Point your domain to ALB: \$(terraform output -raw alb_dns_name)"
echo ""
echo "4. Test API endpoints:"
echo "   curl https://your-domain.com/health"
echo ""
echo -e "${YELLOW}Environment:${NC} ${ENVIRONMENT}"
echo -e "${YELLOW}Region:${NC} ${AWS_REGION}"
echo ""
```

---

## Cost Estimation

### Detailed Monthly Cost Breakdown (Tokyo Region)

#### Small School Scenario (500 students, 50 teachers)

| Service | Configuration | Monthly Hours | Unit Cost (JPY) | Monthly Cost (JPY) |
|---------|--------------|---------------|-----------------|-------------------|
| **ECS Fargate** | 2 tasks × 2 vCPU × 4 GB | 1,460 task-hours | ¥8/task-hour | ¥11,680 |
| **RDS PostgreSQL** | db.t3.medium (Multi-AZ) | 730 hours | ¥18/hour | ¥13,140 |
| **ElastiCache Redis** | cache.t3.medium | 730 hours | ¥10/hour | ¥7,300 |
| **Application Load Balancer** | Standard ALB | 730 hours + 5 LCU | ¥3,300 + ¥1,500 | ¥4,800 |
| **NAT Gateway** | 1 gateway + 50 GB data | 730 hours + 50 GB | ¥5,000 + ¥750 | ¥5,750 |
| **S3 Storage** | 10 GB Standard | 10 GB | ¥3/GB | ¥30 |
| **S3 Requests** | 10,000 requests | 10,000 requests | ¥0.05/1000 | ¥5 |
| **Data Transfer** | 50 GB outbound | 50 GB | ¥15/GB (tiered) | ¥500 |
| **CloudWatch** | Logs + Metrics | Basic tier | - | ¥1,000 |
| **Secrets Manager** | 5 secrets | 5 secrets | ¥60/secret | ¥300 |
| **AWS WAF** | 1 Web ACL + 5 rules | - | - | ¥800 |
| **Route 53** | 1 hosted zone | 1 zone | ¥75/zone | ¥75 |
| **Total** | | | | **¥45,380** |
| **With 20% buffer** | | | | **¥54,456** (~¥55,000) |

**Optimizations**:
- Use single NAT Gateway: Save ¥5,750/month
- Use Standard tier instead of Multi-AZ RDS: Save ¥6,570/month
- Reserved Instances (1-year): Save 30% on RDS/ElastiCache (~¥6,000/month)

**Optimized Cost**: ¥32,000 - ¥40,000/month

#### Medium School Scenario (2,000 students, 200 teachers)

| Service | Configuration | Monthly Cost (JPY) |
|---------|--------------|-------------------|
| **ECS Fargate** | 3 tasks avg × 2 vCPU × 4 GB | ¥17,520 |
| **RDS PostgreSQL** | db.r6i.large (Multi-AZ) | ¥35,000 |
| **ElastiCache Redis** | cache.r6g.large | ¥18,000 |
| **Application Load Balancer** | Standard ALB + 20 LCU | ¥9,300 |
| **NAT Gateway** | 2 gateways + 200 GB data | ¥13,500 |
| **S3 Storage** | 50 GB Standard + Lifecycle | ¥1,200 |
| **Data Transfer** | 200 GB outbound | ¥2,500 |
| **CloudWatch** | Enhanced monitoring | ¥2,500 |
| **Secrets Manager** | 5 secrets | ¥300 |
| **AWS WAF** | 1 Web ACL + 10 rules | ¥1,500 |
| **Route 53** | 1 hosted zone | ¥75 |
| **Total** | | **¥101,395** |
| **With buffer** | | **¥110,000** |

**Optimizations**:
- Reserved Instances (1-year): Save ¥15,000/month
- Savings Plans for Fargate: Save ¥5,000/month
- Optimized Cost**: ¥75,000 - ¥90,000/month

#### Large School Scenario (5,000 students, 500 teachers)

| Service | Configuration | Monthly Cost (JPY) |
|---------|--------------|-------------------|
| **ECS Fargate** | 5 tasks avg × 2 vCPU × 4 GB | ¥29,200 |
| **RDS PostgreSQL** | db.r6i.xlarge (Multi-AZ) | ¥70,000 |
| **ElastiCache Redis** | cache.r6g.xlarge (clustered) | ¥36,000 |
| **Application Load Balancer** | WAF-enabled ALB + 50 LCU | ¥15,000 |
| **NAT Gateway** | 2 gateways + 500 GB data | ¥18,750 |
| **S3 Storage** | 100 GB + Intelligent-Tiering | ¥2,500 |
| **Data Transfer** | 500 GB outbound | ¥6,250 |
| **CloudWatch** | Premium monitoring | ¥5,000 |
| **Secrets Manager** | 5 secrets | ¥300 |
| **AWS WAF** | Advanced rules | ¥3,000 |
| **Route 53** | 1 hosted zone | ¥75 |
| **AWS Backup** | 250 GB backups | ¥3,750 |
| **Total** | | **¥189,825** |
| **With buffer** | | **¥210,000** |

**Optimizations**:
- Reserved Instances (3-year): Save ¥35,000/month
- Savings Plans: Save ¥10,000/month
- **Optimized Cost**: ¥140,000 - ¥165,000/month

---

## Deployment Procedures

### Prerequisites

#### 1. Install AWS CLI

**Windows**:
```powershell
# Using MSI installer
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Or using Chocolatey
choco install awscli
```

**macOS**:
```bash
# Using Homebrew
brew install awscli

# Or using official installer
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Linux (Ubuntu/Debian)**:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Verification**:
```bash
aws --version
# Expected: aws-cli/2.x.x Python/3.x.x
```

#### 2. Configure AWS Credentials

```bash
# Interactive configuration
aws configure

# Provide:
AWS Access Key ID: AKIA...
AWS Secret Access Key: ...
Default region name: ap-northeast-1
Default output format: json

# Verify configuration
aws sts get-caller-identity

# Expected output:
{
  "UserId": "AIDA...",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

#### 3. Install Terraform

**Windows**:
```powershell
# Using Chocolatey
choco install terraform

# Or download from: https://www.terraform.io/downloads
```

**macOS**:
```bash
# Using Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

**Linux (Ubuntu/Debian)**:
```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

**Verification**:
```bash
terraform --version
# Expected: Terraform v1.6.x
```

### Step 1: Prepare Terraform Backend

Create S3 bucket and DynamoDB table for Terraform state:

```bash
# Set variables
PROJECT_NAME="rosterhub"
AWS_REGION="ap-northeast-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket "${PROJECT_NAME}-terraform-state" \
  --region "${AWS_REGION}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "${PROJECT_NAME}-terraform-state" \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket "${PROJECT_NAME}-terraform-state" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket "${PROJECT_NAME}-terraform-state" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name "${PROJECT_NAME}-terraform-lock" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${AWS_REGION}"
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/rosterhub.git
cd rosterhub/terraform

# Create terraform.tfvars file
cat > environments/prod/terraform.tfvars <<EOF
# Environment
environment = "prod"
project_name = "rosterhub"
aws_region = "ap-northeast-1"
dr_region = "ap-northeast-3"

# VPC
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
private_app_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
private_data_subnet_cidrs = ["10.0.21.0/24", "10.0.22.0/24"]

# RDS
database_name = "rosterhub_production"
database_username = "rosterhubadmin"
database_password = "CHANGE_ME_IN_SECRETS_MANAGER"
rds_instance_class = "db.r6i.xlarge"
rds_allocated_storage = 100

# ElastiCache
redis_node_type = "cache.r6g.large"
redis_num_replicas = 2

# ECS
ecs_task_cpu = "2048"
ecs_task_memory = "4096"
ecs_desired_count = 2
ecs_min_capacity = 2
ecs_max_capacity = 10

# ACM Certificate ARN (create manually or via ACM)
acm_certificate_arn = "arn:aws:acm:ap-northeast-1:${AWS_ACCOUNT_ID}:certificate/xxxxxx"

# Alerting
alert_email = "admin@yourschool.jp"

# WAF
waf_rate_limit = 1000
waf_enable_geo_blocking = false
waf_allowed_countries = ["JP", "US"]
EOF
```

### Step 3: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan -var-file="environments/prod/terraform.tfvars" -out=tfplan

# Review plan and apply
terraform apply tfplan
```

**Expected deployment time**: 20-30 minutes

### Step 4: Build and Push Docker Image

```bash
# Get ECR repository URL
ECR_REPOSITORY=$(terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin ${ECR_REPOSITORY}

# Build Docker image
cd ../apps/api
docker build -t rosterhub-api:latest .

# Tag image
docker tag rosterhub-api:latest ${ECR_REPOSITORY}:latest

# Push to ECR
docker push ${ECR_REPOSITORY}:latest

# Verify image
aws ecr describe-images \
  --repository-name rosterhub-api \
  --region ap-northeast-1
```

### Step 5: Run Database Migrations

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DATABASE_URL="postgresql://rosterhubadmin:${DB_PASSWORD}@${RDS_ENDPOINT}/rosterhub_production"

# Option 1: Run from local machine (if VPN/bastion configured)
cd ../apps/api
DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy

# Option 2: Run from ECS task
aws ecs execute-command \
  --cluster rosterhub-prod-cluster \
  --task <task-id> \
  --container rosterhub-api \
  --interactive \
  --command "/bin/sh"

# Inside container:
npx prisma migrate deploy
```

### Step 6: Update DNS

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Create Route 53 record (if using Route 53)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.yourschool.jp",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'"${ALB_DNS}"'"}]
      }
    }]
  }'
```

### Step 7: Verify Deployment

```bash
# Test health endpoint
curl https://api.yourschool.jp/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-15T10:30:00.000Z"
}

# Test OneRoster API
curl -H "X-API-Key: your-api-key" \
  https://api.yourschool.jp/ims/oneroster/v1p2/users?limit=10

# Check ECS task status
aws ecs list-tasks --cluster rosterhub-prod-cluster

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier rosterhub-prod-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Check Redis status
aws elasticache describe-replication-groups \
  --replication-group-id rosterhub-prod-redis \
  --query 'ReplicationGroups[0].Status'
```

---

## Security and Compliance

### IAM Policies

**ECS Task Execution Role** (for pulling images, secrets):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/ecs/rosterhub-api:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:rosterhub/*"
      ]
    }
  ]
}
```

**ECS Task Role** (for application runtime):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::rosterhub-prod-*",
        "arn:aws:s3:::rosterhub-prod-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:rosterhub/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:kms:*:*:key/*"
      ],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": [
            "secretsmanager.ap-northeast-1.amazonaws.com",
            "s3.ap-northeast-1.amazonaws.com"
          ]
        }
      }
    }
  ]
}
```

### Secrets Management

```bash
# Store database password
aws secretsmanager create-secret \
  --name rosterhub/database-password \
  --description "RDS PostgreSQL password" \
  --secret-string "your-secure-password" \
  --region ap-northeast-1

# Store Redis password
aws secretsmanager create-secret \
  --name rosterhub/redis-password \
  --description "ElastiCache Redis AUTH token" \
  --secret-string "your-redis-auth-token" \
  --region ap-northeast-1

# Store JWT secret
aws secretsmanager create-secret \
  --name rosterhub/jwt-secret \
  --description "JWT signing secret" \
  --secret-string "your-jwt-secret" \
  --region ap-northeast-1

# Rotate secrets (every 90 days)
aws secretsmanager rotate-secret \
  --secret-id rosterhub/database-password \
  --rotation-lambda-arn arn:aws:lambda:ap-northeast-1:123456789012:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=90
```

### SSL/TLS Certificates

```bash
# Request ACM certificate
aws acm request-certificate \
  --domain-name api.yourschool.jp \
  --subject-alternative-names "*.yourschool.jp" \
  --validation-method DNS \
  --region ap-northeast-1

# Get validation records
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:ap-northeast-1:123456789012:certificate/xxxxx \
  --region ap-northeast-1

# Add DNS validation records to Route 53
# (automated if using Route 53)
```

---

This AWS Optimization Guide provides comprehensive deployment instructions for RosterHub on AWS. The total document is **1,800+ lines** covering all aspects from architecture design to deployment procedures.

