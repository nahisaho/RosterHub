# RosterHub Azure Cloud Optimization Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Target Audience**: Cloud Architects, DevOps Engineers, System Administrators
**Cloud Platform**: Microsoft Azure

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Azure Architecture Overview](#azure-architecture-overview)
3. [Service Selection and Justification](#service-selection-and-justification)
4. [Detailed Architecture Design](#detailed-architecture-design)
5. [Infrastructure as Code (Bicep)](#infrastructure-as-code-bicep)
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

This guide provides comprehensive Azure cloud optimization strategies for **RosterHub**, a OneRoster v1.2 Japan Profile 1.2.2 Integration Hub serving 35,000+ Japanese schools and 15.5M students.

### Key Recommendations

| Category | Recommendation | Rationale |
|----------|---------------|-----------|
| **Compute** | Azure Container Instances (ACI) | Cost-effective, serverless containers for moderate traffic |
| **Database** | Azure Database for PostgreSQL Flexible Server | Managed PostgreSQL with automatic backups and high availability |
| **Cache/Queue** | Azure Cache for Redis Premium | Native Redis compatibility with persistence and clustering |
| **Load Balancer** | Azure Application Gateway v2 | WAF-enabled, autoscaling, zone-redundant |
| **Secrets** | Azure Key Vault | Centralized secrets management with HSM support |
| **Monitoring** | Azure Monitor + Application Insights | Native monitoring with distributed tracing |
| **Storage** | Azure Blob Storage (Hot tier) | CSV file uploads/exports with lifecycle management |
| **Region** | Japan East (Primary), Japan West (DR) | Low latency for Japanese users |

### Cost Summary (Monthly, Tokyo Region)

| Scenario | Monthly Cost (JPY) | Monthly Cost (USD) |
|----------|-------------------|-------------------|
| **Small School** (500 students) | ¥35,000 - ¥50,000 | $235 - $335 |
| **Medium School** (2,000 students) | ¥80,000 - ¥120,000 | $535 - $805 |
| **Large School** (5,000 students) | ¥150,000 - ¥220,000 | $1,005 - $1,475 |
| **Municipality** (50,000 students) | ¥600,000 - ¥900,000 | $4,020 - $6,030 |

*Exchange rate: 1 USD = 149 JPY (as of Nov 2024)*

### Migration Timeline

- **Preparation**: 1-2 weeks
- **Infrastructure Setup**: 1 week
- **Data Migration**: 1-2 days
- **Testing**: 1 week
- **Production Cutover**: 1 day
- **Total**: 4-6 weeks

---

## Azure Architecture Overview

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Azure Cloud (Japan East)                      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Azure Front Door / CDN (Optional)                 │ │
│  └────────────────────────┬───────────────────────────────────────┘ │
│                           │                                           │
│  ┌────────────────────────▼───────────────────────────────────────┐ │
│  │          Azure Application Gateway (WAF v2)                    │ │
│  │     HTTPS, SSL Termination, Web Application Firewall          │ │
│  └────────────────────────┬───────────────────────────────────────┘ │
│                           │                                           │
│  ┌────────────────────────▼───────────────────────────────────────┐ │
│  │                 Virtual Network (VNet)                         │ │
│  │                    10.0.0.0/16                                 │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │         Subnet 1: Application Tier (10.0.1.0/24)        │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Azure Container Instances (ACI)                 │   │  │ │
│  │  │  │  - NestJS API (Node.js 20)                       │   │  │ │
│  │  │  │  - Auto-scaling: 2-10 instances                  │   │  │ │
│  │  │  │  - CPU: 2 vCPU, Memory: 4 GB                     │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │         Subnet 2: Data Tier (10.0.2.0/24)              │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Azure Database for PostgreSQL Flexible Server  │   │  │ │
│  │  │  │  - Version: PostgreSQL 15                        │   │  │ │
│  │  │  │  - SKU: General Purpose D4s v3                   │   │  │ │
│  │  │  │  - Storage: 128 GB SSD (Auto-grow enabled)       │   │  │ │
│  │  │  │  - High Availability: Zone-redundant             │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  │                                                           │  │ │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │ │
│  │  │  │  Azure Cache for Redis Premium                   │   │  │ │
│  │  │  │  - Version: Redis 7.x                            │   │  │ │
│  │  │  │  - SKU: Premium P1 (6 GB)                        │   │  │ │
│  │  │  │  - Clustering: Enabled                           │   │  │ │
│  │  │  │  - Persistence: AOF enabled                      │   │  │ │
│  │  │  └──────────────────────────────────────────────────┘   │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                      Shared Services                            │ │
│  │                                                                  │ │
│  │  - Azure Key Vault (Secrets, certificates, API keys)           │ │
│  │  - Azure Blob Storage (CSV uploads/exports)                     │ │
│  │  - Azure Monitor + Application Insights (Monitoring)            │ │
│  │  - Azure Backup (Automated backups)                             │ │
│  │  - Azure Log Analytics (Centralized logging)                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                  Azure Cloud (Japan West - DR Site)                  │
│                                                                       │
│  - Geo-replicated Azure Database for PostgreSQL                      │
│  - Geo-replicated Azure Blob Storage (RA-GRS)                        │
│  - Standby Application Gateway + ACI (for disaster recovery)         │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Serverless-First Approach**: Use Azure Container Instances for cost-effective, auto-scaling compute
2. **Managed Services**: Leverage Azure-managed PostgreSQL and Redis to minimize operational overhead
3. **Security by Default**: All data encrypted at rest and in transit, secrets in Key Vault
4. **High Availability**: Zone-redundant deployment within Japan East region
5. **Disaster Recovery**: Geo-replication to Japan West region for business continuity
6. **Cost Optimization**: Right-sizing resources, auto-scaling, reserved instances for stable workloads

---

## Service Selection and Justification

### Compute Options Comparison

| Service | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Azure Container Instances (ACI)** | - No VM management<br>- Per-second billing<br>- Fast startup<br>- Ideal for moderate traffic | - Limited customization<br>- No built-in load balancing | **✅ Recommended** for small-medium schools |
| **Azure App Service (Containers)** | - Built-in auto-scaling<br>- Easy deployment<br>- Integrated monitoring | - Higher cost than ACI<br>- VM-based billing | **Alternative** for high-traffic scenarios |
| **Azure Kubernetes Service (AKS)** | - Full orchestration control<br>- Advanced scaling<br>- Multi-container apps | - Complex setup<br>- Higher operational overhead<br>- Overkill for single-app | **Not recommended** unless multi-app ecosystem |

**Selected**: **Azure Container Instances (ACI)** + **Azure Container Apps** (for advanced scenarios)

### Database Options Comparison

| Service | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Azure Database for PostgreSQL Flexible Server** | - Fully managed<br>- Zone-redundant HA<br>- Automatic backups<br>- PITR support<br>- PostgreSQL 15 support | - Slightly higher cost than VM-based | **✅ Recommended** |
| **PostgreSQL on Azure VM** | - Full control<br>- Customizable configuration | - Manual management<br>- Manual backups<br>- Higher TCO | **Not recommended** unless specific requirements |
| **Azure Cosmos DB (PostgreSQL API)** | - Global distribution<br>- Multi-region writes | - Significantly higher cost<br>- Different PostgreSQL flavor | **Not suitable** for this use case |

**Selected**: **Azure Database for PostgreSQL Flexible Server**

### Cache/Queue Options Comparison

| Service | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Azure Cache for Redis (Premium)** | - Native Redis 7.x support<br>- Clustering<br>- Persistence (AOF/RDB)<br>- BullMQ compatibility | - Higher cost than Basic tier | **✅ Recommended** |
| **Azure Cache for Redis (Standard)** | - Lower cost<br>- Good for simple caching | - No persistence<br>- No clustering<br>- Risk of data loss | **Not recommended** (BullMQ needs persistence) |
| **Self-managed Redis on VM** | - Full control<br>- Lower cost | - Manual management<br>- No automatic failover | **Not recommended** |

**Selected**: **Azure Cache for Redis Premium** (with AOF persistence for BullMQ)

---

## Detailed Architecture Design

### Virtual Network Design

#### VNet Configuration

```
Resource Group: rg-rosterhub-prod-japaneast
Virtual Network: vnet-rosterhub-prod
Address Space: 10.0.0.0/16
Region: Japan East
```

#### Subnet Design

| Subnet | CIDR | Purpose | Services |
|--------|------|---------|----------|
| **snet-app** | 10.0.1.0/24 | Application tier | Azure Container Instances, Container Apps |
| **snet-data** | 10.0.2.0/24 | Data tier | PostgreSQL, Redis (delegated subnet) |
| **snet-gateway** | 10.0.3.0/27 | Application Gateway | Application Gateway v2 |
| **snet-private-endpoints** | 10.0.4.0/24 | Private endpoints | Key Vault, Blob Storage private endpoints |

#### Network Security Groups (NSGs)

**NSG: nsg-app**
```
Priority | Direction | Access | Protocol | Source      | Source Port | Destination | Dest Port | Purpose
---------|-----------|--------|----------|-------------|-------------|-------------|-----------|----------
100      | Inbound   | Allow  | TCP      | App Gateway | *           | 10.0.1.0/24 | 3000      | HTTPS from App Gateway
110      | Inbound   | Allow  | TCP      | VNet        | *           | 10.0.1.0/24 | 3000      | Internal VNet
200      | Outbound  | Allow  | TCP      | 10.0.1.0/24 | *           | 10.0.2.0/24 | 5432      | PostgreSQL
210      | Outbound  | Allow  | TCP      | 10.0.1.0/24 | *           | 10.0.2.0/24 | 6379      | Redis
65000    | Inbound   | Deny   | All      | Any         | *           | Any         | *         | Deny all other
```

**NSG: nsg-data**
```
Priority | Direction | Access | Protocol | Source      | Source Port | Destination | Dest Port | Purpose
---------|-----------|--------|----------|-------------|-------------|-------------|-----------|----------
100      | Inbound   | Allow  | TCP      | 10.0.1.0/24 | *           | 10.0.2.0/24 | 5432      | PostgreSQL from app
110      | Inbound   | Allow  | TCP      | 10.0.1.0/24 | *           | 10.0.2.0/24 | 6379      | Redis from app
65000    | Inbound   | Deny   | All      | Any         | *           | Any         | *         | Deny all other
```

### Application Gateway Configuration

**SKU**: Standard_v2 (with WAF)

**Key Features**:
- **SSL Termination**: Manage SSL certificates centrally
- **Web Application Firewall**: OWASP Top 10 protection
- **Auto-scaling**: 2-10 instances based on traffic
- **Health Probes**: Monitor backend health
- **URL Routing**: Route to appropriate backend pools

**Listener Configuration**:
```
Frontend IP: Public IP (Japan East)
Protocol: HTTPS (Port 443)
SSL Certificate: Azure Key Vault managed certificate
HTTP Settings:
  - Backend Protocol: HTTP (internal traffic)
  - Port: 3000
  - Request Timeout: 30 seconds
  - Cookie-based affinity: Enabled
```

**Backend Pool**:
```
Target: Azure Container Instances (ACI)
Health Probe:
  - Protocol: HTTP
  - Host: localhost
  - Path: /health
  - Interval: 30 seconds
  - Timeout: 30 seconds
  - Unhealthy threshold: 3
```

**WAF Configuration**:
```
Mode: Prevention
Rule Set: OWASP 3.2
Exclusions:
  - Path: /ims/oneroster/v1p2/csv/import (for CSV uploads)
Custom Rules:
  - Rate Limiting: 1000 requests/5 minutes per IP
  - Geo-filtering: Allow Japan, Block high-risk countries (optional)
```

### Container Instances Configuration

**Container Group**: aci-rosterhub-api

**Container Specification**:
```yaml
Name: rosterhub-api
Image: <your-acr>.azurecr.io/rosterhub-api:latest
CPU: 2 cores
Memory: 4 GB
Port: 3000
Restart Policy: Always
```

**Environment Variables** (stored in Key Vault):
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=@Microsoft.KeyVault(SecretUri=https://<keyvault>.vault.azure.net/secrets/database-url)
REDIS_HOST=<redis-name>.redis.cache.windows.net
REDIS_PASSWORD=@Microsoft.KeyVault(SecretUri=https://<keyvault>.vault.azure.net/secrets/redis-password)
JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://<keyvault>.vault.azure.net/secrets/jwt-secret)
```

**Auto-scaling Configuration**:
```
Minimum Instances: 2
Maximum Instances: 10
Scale-out Rule: CPU > 70% for 5 minutes
Scale-in Rule: CPU < 30% for 10 minutes
Cooldown Period: 5 minutes
```

### PostgreSQL Flexible Server Configuration

**Server Name**: psql-rosterhub-prod-japaneast

**SKU**:
```
Tier: General Purpose
Compute: Standard_D4s_v3 (4 vCores, 16 GB RAM)
Storage: 128 GB SSD (Auto-grow enabled, max 1 TB)
PostgreSQL Version: 15
```

**High Availability**:
```
Mode: Zone-redundant
Primary Zone: Zone 1
Standby Zone: Zone 2
Automatic Failover: Enabled
Failover Time: < 120 seconds
```

**Backup Configuration**:
```
Backup Retention: 35 days
Geo-redundant Backup: Enabled
Backup Window: 02:00-04:00 JST (daily)
Point-in-Time Restore (PITR): Enabled
```

**Network Configuration**:
```
Connectivity Method: Private access (VNet integration)
Delegated Subnet: snet-data (10.0.2.0/24)
Private DNS Zone: privatelink.postgres.database.azure.com
```

**PostgreSQL Parameters** (optimized for OneRoster workload):
```sql
-- Connection Settings
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 20MB
maintenance_work_mem = 512MB

-- Write-Ahead Logging
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB

-- Query Planning
random_page_cost = 1.1  -- SSD optimization
effective_io_concurrency = 200

-- Performance Monitoring
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
pg_stat_statements.track = all
```

**Firewall Rules**:
```
Rule: Allow Azure Services
Source: Azure Internal Services
Action: Allow

Rule: Allow VNet
Source: 10.0.0.0/16
Action: Allow
```

### Redis Cache Configuration

**Cache Name**: redis-rosterhub-prod

**SKU**:
```
Tier: Premium P1
Capacity: 6 GB
Replicas: 1
Clustering: Enabled (3 shards)
```

**Persistence Configuration** (critical for BullMQ):
```
AOF (Append-Only File): Enabled
Backup Frequency: Every 15 minutes
RDB Snapshot: Daily at 02:00 JST
Backup Retention: 7 days
Backup Storage: Geo-replicated to Japan West
```

**Network Configuration**:
```
Virtual Network: vnet-rosterhub-prod
Subnet: snet-data (10.0.2.0/24)
Private Endpoint: Enabled
Public Network Access: Disabled
```

**Redis Configuration**:
```
maxmemory-policy: allkeys-lru
timeout: 0
tcp-keepalive: 300
maxmemory-reserved: 10% (600 MB)
maxfragmentationmemory-reserved: 10% (600 MB)
```

**Access Control**:
```
Authentication: Azure AD + Access Keys
Minimum TLS Version: 1.2
SSL Only: Enabled
```

### Azure Key Vault Configuration

**Key Vault Name**: kv-rosterhub-prod

**SKU**: Standard (Premium for HSM-backed keys if needed)

**Access Policies**:
```
Application (Managed Identity):
  - Secrets: Get, List

Administrators:
  - Secrets: All permissions
  - Keys: All permissions
  - Certificates: All permissions
```

**Secrets Stored**:
```
database-url: PostgreSQL connection string
redis-password: Redis access key
jwt-secret: JWT signing secret
api-key-salt: API key hashing salt
storage-account-key: Blob storage access key
ssl-certificate: Application Gateway SSL certificate
```

**Network Access**:
```
Allow Azure Services: Yes
Virtual Network Rules: 10.0.0.0/16
Private Endpoint: Enabled (snet-private-endpoints)
Public Network Access: Disabled
```

**Monitoring**:
```
Diagnostic Settings: Enabled
Log Categories: AuditEvent, AllMetrics
Destination: Log Analytics Workspace
Retention: 90 days
```

### Azure Blob Storage Configuration

**Storage Account**: strosterhubprod

**Configuration**:
```
Account Kind: StorageV2 (General Purpose v2)
Performance: Standard
Replication: RA-GRS (Read-Access Geo-Redundant)
Primary Region: Japan East
Secondary Region: Japan West
Access Tier: Hot
```

**Containers**:
```
Container: csv-uploads
  - Public Access: None (Private)
  - Usage: CSV file uploads

Container: csv-exports
  - Public Access: None (Private)
  - Usage: Generated CSV exports

Container: backups
  - Public Access: None (Private)
  - Usage: Application backups
```

**Lifecycle Management Policy**:
```yaml
Rules:
  - name: DeleteOldUploads
    enabled: true
    definition:
      filters:
        blobTypes: [ blockBlob ]
        prefixMatch: [ "csv-uploads/" ]
      actions:
        baseBlob:
          delete:
            daysAfterModificationGreaterThan: 30

  - name: ArchiveOldExports
    enabled: true
    definition:
      filters:
        blobTypes: [ blockBlob ]
        prefixMatch: [ "csv-exports/" ]
      actions:
        baseBlob:
          tierToCool:
            daysAfterModificationGreaterThan: 7
          tierToArchive:
            daysAfterModificationGreaterThan: 90
```

**Security**:
```
Encryption: Microsoft-managed keys (option to use customer-managed keys)
Minimum TLS Version: 1.2
Blob Public Access: Disabled
Shared Key Access: Disabled (use Azure AD authentication)
Network Access: VNet integration via Private Endpoint
```

---

## Infrastructure as Code (Bicep)

### Bicep Project Structure

```
azure-infrastructure/
├── main.bicep                    # Main orchestration file
├── parameters/
│   ├── dev.parameters.json       # Development environment
│   ├── staging.parameters.json   # Staging environment
│   └── prod.parameters.json      # Production environment
├── modules/
│   ├── network.bicep             # VNet, Subnets, NSGs
│   ├── appgateway.bicep          # Application Gateway
│   ├── container.bicep           # Azure Container Instances
│   ├── postgresql.bicep          # PostgreSQL Flexible Server
│   ├── redis.bicep               # Azure Cache for Redis
│   ├── keyvault.bicep            # Azure Key Vault
│   ├── storage.bicep             # Blob Storage
│   ├── monitoring.bicep          # Application Insights, Log Analytics
│   └── backup.bicep              # Azure Backup configuration
└── scripts/
    ├── deploy.sh                 # Deployment script
    └── destroy.sh                # Cleanup script
```

### Main Bicep Template

**File: `main.bicep`**

```bicep
targetScope = 'subscription'

// ============================================
// Parameters
// ============================================

@description('Environment name (dev, staging, prod)')
param environment string = 'prod'

@description('Primary Azure region')
param primaryRegion string = 'japaneast'

@description('Secondary Azure region for DR')
param secondaryRegion string = 'japanwest'

@description('Project name')
param projectName string = 'rosterhub'

@description('PostgreSQL administrator username')
@secure()
param postgresAdminUsername string

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('Redis cache size')
@allowed([
  'P1'
  'P2'
  'P3'
])
param redisCacheSku string = 'P1'

@description('Container instance CPU cores')
param containerCpuCores int = 2

@description('Container instance memory in GB')
param containerMemoryGb int = 4

@description('Minimum container instances')
param containerMinCount int = 2

@description('Maximum container instances')
param containerMaxCount int = 10

// ============================================
// Variables
// ============================================

var resourceGroupName = 'rg-${projectName}-${environment}-${primaryRegion}'
var tags = {
  Environment: environment
  Project: projectName
  ManagedBy: 'Bicep'
  CostCenter: 'Education-IT'
}

// ============================================
// Resource Group
// ============================================

resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: primaryRegion
  tags: tags
}

// ============================================
// Network Module
// ============================================

module network 'modules/network.bicep' = {
  scope: resourceGroup
  name: 'network-deployment'
  params: {
    location: primaryRegion
    environment: environment
    projectName: projectName
    vnetAddressPrefix: '10.0.0.0/16'
    appSubnetPrefix: '10.0.1.0/24'
    dataSubnetPrefix: '10.0.2.0/24'
    gatewaySubnetPrefix: '10.0.3.0/27'
    privateEndpointSubnetPrefix: '10.0.4.0/24'
    tags: tags
  }
}

// ============================================
// Key Vault Module
// ============================================

module keyVault 'modules/keyvault.bicep' = {
  scope: resourceGroup
  name: 'keyvault-deployment'
  params: {
    location: primaryRegion
    environment: environment
    projectName: projectName
    vnetId: network.outputs.vnetId
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    tags: tags
  }
}

// ============================================
// PostgreSQL Module
// ============================================

module postgresql 'modules/postgresql.bicep' = {
  scope: resourceGroup
  name: 'postgresql-deployment'
  params: {
    location: primaryRegion
    environment: environment
    projectName: projectName
    administratorLogin: postgresAdminUsername
    administratorPassword: postgresAdminPassword
    delegatedSubnetId: network.outputs.dataSubnetId
    privateDnsZoneId: network.outputs.postgresPrivateDnsZoneId
    tags: tags
  }
}

// ============================================
// Redis Cache Module
// ============================================

module redis 'modules/redis.bicep' = {
  scope: resourceGroup
  name: 'redis-deployment'
  params: {
    location: primaryRegion
    environment: environment
    projectName: projectName
    sku: redisCacheSku
    vnetId: network.outputs.vnetId
    subnetId: network.outputs.dataSubnetId
    tags: tags
  }
}

// ============================================
// Blob Storage Module
// ============================================

module storage 'modules/storage.bicep' = {
  scope: resourceGroup
  name: 'storage-deployment'
  params: {
    location: primaryRegion
    environment: environment
    projectName: projectName
    vnetId: network.outputs.vnetId
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    tags: tags
  }
}

// ============================================
// Application Gateway Module
// ============================================

module appGateway 'modules/appgateway.bicep' = {
  scope: resourceGroup
  name: 'appgateway-deployment'
  params: {
    location: primaryRegion
    environment: environment
    projectName: projectName
    subnetId: network.outputs.gatewaySubnetId
    keyVaultId: keyVault.outputs.keyVaultId
    tags: tags
  }
}

// ============================================
// Container Instances Module
// ============================================

module container 'modules/container.bicep' = {
  scope: resourceGroup
  name: 'container-deployment'
  params: {
    location: primaryRegion
    environment: environment
    projectName: projectName
    cpuCores: containerCpuCores
    memoryGb: containerMemoryGb
    minCount: containerMinCount
    maxCount: containerMaxCount
    vnetId: network.outputs.vnetId
    subnetId: network.outputs.appSubnetId
    postgresqlConnectionString: postgresql.outputs.connectionString
    redisConnectionString: redis.outputs.connectionString
    keyVaultId: keyVault.outputs.keyVaultId
    storageAccountName: storage.outputs.storageAccountName
    tags: tags
  }
}

// ============================================
// Monitoring Module
// ============================================

module monitoring 'modules/monitoring.bicep' = {
  scope: resourceGroup
  name: 'monitoring-deployment'
  params: {
    location: primaryRegion
    environment: environment
    projectName: projectName
    tags: tags
  }
}

// ============================================
// Outputs
// ============================================

output resourceGroupName string = resourceGroupName
output vnetId string = network.outputs.vnetId
output appGatewayPublicIp string = appGateway.outputs.publicIpAddress
output postgresqlFqdn string = postgresql.outputs.fqdn
output redisFqdn string = redis.outputs.fqdn
output keyVaultUri string = keyVault.outputs.keyVaultUri
output storageAccountName string = storage.outputs.storageAccountName
```

### Network Module

**File: `modules/network.bicep`**

```bicep
// ============================================
// Parameters
// ============================================

param location string
param environment string
param projectName string
param vnetAddressPrefix string
param appSubnetPrefix string
param dataSubnetPrefix string
param gatewaySubnetPrefix string
param privateEndpointSubnetPrefix string
param tags object

// ============================================
// Variables
// ============================================

var vnetName = 'vnet-${projectName}-${environment}'
var appSubnetName = 'snet-app'
var dataSubnetName = 'snet-data'
var gatewaySubnetName = 'snet-gateway'
var privateEndpointSubnetName = 'snet-private-endpoints'

// ============================================
// Virtual Network
// ============================================

resource vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        vnetAddressPrefix
      ]
    }
    subnets: [
      {
        name: appSubnetName
        properties: {
          addressPrefix: appSubnetPrefix
          networkSecurityGroup: {
            id: nsgApp.id
          }
          serviceEndpoints: [
            {
              service: 'Microsoft.Storage'
            }
            {
              service: 'Microsoft.KeyVault'
            }
          ]
        }
      }
      {
        name: dataSubnetName
        properties: {
          addressPrefix: dataSubnetPrefix
          networkSecurityGroup: {
            id: nsgData.id
          }
          delegations: [
            {
              name: 'PostgreSQLFlexibleServerDelegation'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
          serviceEndpoints: [
            {
              service: 'Microsoft.Storage'
            }
          ]
        }
      }
      {
        name: gatewaySubnetName
        properties: {
          addressPrefix: gatewaySubnetPrefix
        }
      }
      {
        name: privateEndpointSubnetName
        properties: {
          addressPrefix: privateEndpointSubnetPrefix
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

// ============================================
// Network Security Groups
// ============================================

resource nsgApp 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: 'nsg-${projectName}-app-${environment}'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowAppGatewayInbound'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: gatewaySubnetPrefix
          sourcePortRange: '*'
          destinationAddressPrefix: appSubnetPrefix
          destinationPortRange: '3000'
          description: 'Allow traffic from Application Gateway'
        }
      }
      {
        name: 'AllowVNetInbound'
        properties: {
          priority: 110
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
          destinationAddressPrefix: appSubnetPrefix
          destinationPortRange: '3000'
          description: 'Allow internal VNet traffic'
        }
      }
      {
        name: 'AllowPostgreSQLOutbound'
        properties: {
          priority: 200
          direction: 'Outbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: appSubnetPrefix
          sourcePortRange: '*'
          destinationAddressPrefix: dataSubnetPrefix
          destinationPortRange: '5432'
          description: 'Allow PostgreSQL access'
        }
      }
      {
        name: 'AllowRedisOutbound'
        properties: {
          priority: 210
          direction: 'Outbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: appSubnetPrefix
          sourcePortRange: '*'
          destinationAddressPrefix: dataSubnetPrefix
          destinationPortRange: '6379'
          description: 'Allow Redis access'
        }
      }
      {
        name: 'AllowInternetOutbound'
        properties: {
          priority: 300
          direction: 'Outbound'
          access: 'Allow'
          protocol: '*'
          sourceAddressPrefix: appSubnetPrefix
          sourcePortRange: '*'
          destinationAddressPrefix: 'Internet'
          destinationPortRange: '*'
          description: 'Allow outbound internet access'
        }
      }
    ]
  }
}

resource nsgData 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: 'nsg-${projectName}-data-${environment}'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowPostgreSQLFromApp'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: appSubnetPrefix
          sourcePortRange: '*'
          destinationAddressPrefix: dataSubnetPrefix
          destinationPortRange: '5432'
          description: 'Allow PostgreSQL from application subnet'
        }
      }
      {
        name: 'AllowRedisFromApp'
        properties: {
          priority: 110
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: appSubnetPrefix
          sourcePortRange: '*'
          destinationAddressPrefix: dataSubnetPrefix
          destinationPortRange: '6379'
          description: 'Allow Redis from application subnet'
        }
      }
      {
        name: 'DenyAllInbound'
        properties: {
          priority: 65000
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '*'
          description: 'Deny all other inbound traffic'
        }
      }
    ]
  }
}

// ============================================
// Private DNS Zones
// ============================================

resource postgresPrivateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.postgres.database.azure.com'
  location: 'global'
  tags: tags
}

resource postgresPrivateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: postgresPrivateDnsZone
  name: '${vnetName}-link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

// ============================================
// Outputs
// ============================================

output vnetId string = vnet.id
output vnetName string = vnet.name
output appSubnetId string = vnet.properties.subnets[0].id
output dataSubnetId string = vnet.properties.subnets[1].id
output gatewaySubnetId string = vnet.properties.subnets[2].id
output privateEndpointSubnetId string = vnet.properties.subnets[3].id
output postgresPrivateDnsZoneId string = postgresPrivateDnsZone.id
```

### PostgreSQL Module

**File: `modules/postgresql.bicep`**

```bicep
// ============================================
// Parameters
// ============================================

param location string
param environment string
param projectName string
param administratorLogin string
@secure()
param administratorPassword string
param delegatedSubnetId string
param privateDnsZoneId string
param tags object

// ============================================
// Variables
// ============================================

var serverName = 'psql-${projectName}-${environment}-${location}'
var skuName = environment == 'prod' ? 'Standard_D4s_v3' : 'Standard_D2s_v3'
var storageSizeGB = environment == 'prod' ? 128 : 32

// ============================================
// PostgreSQL Flexible Server
// ============================================

resource postgresqlServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: 'GeneralPurpose'
  }
  properties: {
    version: '15'
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: environment == 'prod' ? 35 : 7
      geoRedundantBackup: environment == 'prod' ? 'Enabled' : 'Disabled'
    }
    highAvailability: environment == 'prod' ? {
      mode: 'ZoneRedundant'
    } : {
      mode: 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: delegatedSubnetId
      privateDnsZoneArmResourceId: privateDnsZoneId
    }
    maintenanceWindow: {
      customWindow: 'Enabled'
      dayOfWeek: 0  // Sunday
      startHour: 2   // 2:00 AM JST
      startMinute: 0
    }
  }
}

// ============================================
// PostgreSQL Configurations
// ============================================

resource postgresqlConfig 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-03-01-preview' = [
  for config in [
    { name: 'shared_buffers', value: environment == 'prod' ? '4194304' : '1048576' }  // 4GB / 1GB (in 8KB pages)
    { name: 'effective_cache_size', value: environment == 'prod' ? '12582912' : '3145728' }  // 12GB / 3GB
    { name: 'work_mem', value: '20480' }  // 20MB (in KB)
    { name: 'maintenance_work_mem', value: '524288' }  // 512MB (in KB)
    { name: 'max_connections', value: environment == 'prod' ? '200' : '100' }
    { name: 'random_page_cost', value: '1.1' }  // SSD optimization
    { name: 'effective_io_concurrency', value: '200' }
    { name: 'shared_preload_libraries', value: 'pg_stat_statements' }
  ]: {
    parent: postgresqlServer
    name: config.name
    properties: {
      value: config.value
      source: 'user-override'
    }
  }
]

// ============================================
// PostgreSQL Database
// ============================================

resource postgresqlDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresqlServer
  name: 'rosterhub_${environment}'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ============================================
// Outputs
// ============================================

output fqdn string = postgresqlServer.properties.fullyQualifiedDomainName
output serverId string = postgresqlServer.id
output databaseName string = postgresqlDatabase.name
output connectionString string = 'postgresql://${administratorLogin}:${administratorPassword}@${postgresqlServer.properties.fullyQualifiedDomainName}:5432/${postgresqlDatabase.name}?sslmode=require'
```

### Redis Cache Module

**File: `modules/redis.bicep`**

```bicep
// ============================================
// Parameters
// ============================================

param location string
param environment string
param projectName string
param sku string
param vnetId string
param subnetId string
param tags object

// ============================================
// Variables
// ============================================

var cacheName = 'redis-${projectName}-${environment}'
var skuFamily = startsWith(sku, 'P') ? 'P' : 'C'
var skuCapacity = int(substring(sku, 1, 1))

// ============================================
// Azure Cache for Redis
// ============================================

resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: cacheName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'Premium'
      family: skuFamily
      capacity: skuCapacity
    }
    redisVersion: '7.2'
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'maxmemory-reserved': '10'
      'maxfragmentationmemory-reserved': '10'
      'aof-backup-enabled': 'true'  // AOF persistence for BullMQ
      'aof-storage-connection-string-0': ''  // Configure with storage account
      'rdb-backup-enabled': 'true'
      'rdb-backup-frequency': '60'  // 60 minutes
      'rdb-backup-max-snapshot-count': '1'
      'rdb-storage-connection-string': ''  // Configure with storage account
    }
    replicasPerMaster: 1
    replicasPerPrimary: 1
    shardCount: environment == 'prod' ? 3 : 1
    subnetId: subnetId
  }
  zones: environment == 'prod' ? [
    '1'
    '2'
    '3'
  ] : []
}

// ============================================
// Private Endpoint (if not using subnet injection)
// ============================================

// Note: When using subnet injection, private endpoint is not needed
// Uncomment below if using private endpoint instead

/*
resource redisPrivateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: '${cacheName}-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: subnetId
    }
    privateLinkServiceConnections: [
      {
        name: '${cacheName}-plsc'
        properties: {
          privateLinkServiceId: redisCache.id
          groupIds: [
            'redisCache'
          ]
        }
      }
    ]
  }
}
*/

// ============================================
// Outputs
// ============================================

output fqdn string = redisCache.properties.hostName
output sslPort int = redisCache.properties.sslPort
output primaryKey string = redisCache.listKeys().primaryKey
output connectionString string = '${redisCache.properties.hostName}:${redisCache.properties.sslPort},password=${redisCache.listKeys().primaryKey},ssl=True,abortConnect=False'
```

### Deployment Script

**File: `scripts/deploy.sh`**

```bash
#!/bin/bash

# ============================================
# RosterHub Azure Deployment Script
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
LOCATION=${2:-japaneast}
PROJECT_NAME="rosterhub"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RosterHub Azure Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Location: ${YELLOW}${LOCATION}${NC}"
echo ""

# ============================================
# Prerequisites Check
# ============================================

echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo -e "${RED}ERROR: Azure CLI is not installed${NC}"
    echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check login status
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Azure. Please login...${NC}"
    az login
fi

# Check Bicep CLI
if ! az bicep version &> /dev/null; then
    echo -e "${YELLOW}Installing Bicep CLI...${NC}"
    az bicep install
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# ============================================
# Set Subscription (if needed)
# ============================================

echo -e "${YELLOW}Current subscription:${NC}"
az account show --query "{Name:name, SubscriptionId:id}" -o table

read -p "Continue with this subscription? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set the correct subscription using: az account set --subscription <subscription-id>"
    exit 1
fi

# ============================================
# Parameter Input
# ============================================

echo ""
echo -e "${YELLOW}Please provide deployment parameters:${NC}"

read -sp "PostgreSQL Admin Username: " POSTGRES_USERNAME
echo
read -sp "PostgreSQL Admin Password: " POSTGRES_PASSWORD
echo
echo ""

# ============================================
# Create Parameters File
# ============================================

PARAMS_FILE="parameters/${ENVIRONMENT}.parameters.json"

if [ ! -f "$PARAMS_FILE" ]; then
    echo -e "${YELLOW}Creating parameters file: ${PARAMS_FILE}${NC}"
    cat > "$PARAMS_FILE" <<EOF
{
  "\$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "${ENVIRONMENT}"
    },
    "primaryRegion": {
      "value": "${LOCATION}"
    },
    "secondaryRegion": {
      "value": "japanwest"
    },
    "projectName": {
      "value": "${PROJECT_NAME}"
    },
    "postgresAdminUsername": {
      "value": "${POSTGRES_USERNAME}"
    },
    "postgresAdminPassword": {
      "value": "${POSTGRES_PASSWORD}"
    },
    "redisCacheSku": {
      "value": "P1"
    },
    "containerCpuCores": {
      "value": 2
    },
    "containerMemoryGb": {
      "value": 4
    },
    "containerMinCount": {
      "value": 2
    },
    "containerMaxCount": {
      "value": 10
    }
  }
}
EOF
fi

# ============================================
# Validate Bicep Template
# ============================================

echo ""
echo -e "${YELLOW}Validating Bicep template...${NC}"

az deployment sub validate \
  --location "${LOCATION}" \
  --template-file main.bicep \
  --parameters "@${PARAMS_FILE}" \
  --output table

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Template validation passed${NC}"
else
    echo -e "${RED}✗ Template validation failed${NC}"
    exit 1
fi

# ============================================
# Deploy Infrastructure
# ============================================

echo ""
echo -e "${YELLOW}Deploying infrastructure...${NC}"
echo -e "${YELLOW}This may take 15-30 minutes.${NC}"
echo ""

DEPLOYMENT_NAME="${PROJECT_NAME}-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"

az deployment sub create \
  --name "${DEPLOYMENT_NAME}" \
  --location "${LOCATION}" \
  --template-file main.bicep \
  --parameters "@${PARAMS_FILE}" \
  --output table

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
# Retrieve Outputs
# ============================================

echo ""
echo -e "${YELLOW}Retrieving deployment outputs...${NC}"

OUTPUTS=$(az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query 'properties.outputs' \
  -o json)

echo "$OUTPUTS" | jq .

# ============================================
# Save Outputs to File
# ============================================

OUTPUTS_FILE="outputs/${ENVIRONMENT}-outputs.json"
mkdir -p outputs
echo "$OUTPUTS" > "$OUTPUTS_FILE"

echo ""
echo -e "${GREEN}Outputs saved to: ${OUTPUTS_FILE}${NC}"

# ============================================
# Next Steps
# ============================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Next Steps:${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "1. Build and push Docker image to Azure Container Registry"
echo "2. Run database migrations: npx prisma migrate deploy"
echo "3. Configure Application Gateway backend pool with Container Instances"
echo "4. Update DNS records to point to Application Gateway public IP"
echo "5. Test API endpoints"
echo ""
echo -e "${YELLOW}Deployment Name:${NC} ${DEPLOYMENT_NAME}"
echo -e "${YELLOW}Resource Group:${NC} rg-${PROJECT_NAME}-${ENVIRONMENT}-${LOCATION}"
echo ""
```

---

## Cost Estimation

### Monthly Cost Breakdown (Japan East Region)

#### Small School Scenario (500 students, 50 teachers)

| Service | SKU | Quantity | Monthly Cost (JPY) | Notes |
|---------|-----|----------|-------------------|-------|
| **Azure Container Instances** | 2 vCPU, 4 GB | 2 instances × 730h | ¥15,000 | Baseline |
| **Azure Database for PostgreSQL** | General Purpose D2s v3 | 1 instance | ¥18,000 | 2 vCores, 8 GB RAM, 32 GB storage |
| **Azure Cache for Redis** | Premium P1 | 1 cache (6 GB) | ¥12,000 | With persistence |
| **Azure Blob Storage** | Hot tier | 10 GB | ¥300 | CSV uploads/exports |
| **Application Gateway v2** | Standard_v2 | 1 instance | ¥8,000 | WAF disabled for cost savings |
| **Data Transfer** | Outbound | 50 GB | ¥500 | API responses |
| **Azure Monitor** | Basic | - | ¥1,200 | Logs and metrics |
| **Total** | | | **¥35,000 - ¥50,000** | With 20% buffer |

#### Medium School Scenario (2,000 students, 200 teachers)

| Service | SKU | Quantity | Monthly Cost (JPY) | Notes |
|---------|-----|----------|-------------------|-------|
| **Azure Container Instances** | 2 vCPU, 4 GB | 3 instances × 730h | ¥22,500 | Auto-scaled |
| **Azure Database for PostgreSQL** | General Purpose D4s v3 | 1 instance | ¥36,000 | 4 vCores, 16 GB RAM, 128 GB storage |
| **Azure Cache for Redis** | Premium P1 | 1 cache (6 GB) | ¥12,000 | With persistence |
| **Azure Blob Storage** | Hot tier | 50 GB | ¥1,500 | Larger CSV files |
| **Application Gateway v2** | Standard_v2 + WAF | 1 instance | ¥20,000 | WAF enabled |
| **Data Transfer** | Outbound | 200 GB | ¥2,000 | Higher traffic |
| **Azure Monitor** | Standard | - | ¥3,000 | More logs |
| **Azure Backup** | Backup storage | 100 GB | ¥3,000 | Database backups |
| **Total** | | | **¥80,000 - ¥120,000** | With 20% buffer |

#### Large School Scenario (5,000 students, 500 teachers)

| Service | SKU | Quantity | Monthly Cost (JPY) | Notes |
|---------|-----|----------|-------------------|-------|
| **Azure Container Instances** | 2 vCPU, 4 GB | 5 instances × 730h | ¥37,500 | Peak load handling |
| **Azure Database for PostgreSQL** | General Purpose D8s v3 | 1 instance (zone-redundant) | ¥72,000 | 8 vCores, 32 GB RAM, 256 GB storage |
| **Azure Cache for Redis** | Premium P2 | 1 cache (13 GB) | ¥24,000 | Higher capacity |
| **Azure Blob Storage** | Hot tier | 100 GB | ¥3,000 | Large CSV files |
| **Application Gateway v2** | Standard_v2 + WAF | 1 instance (auto-scaled) | ¥25,000 | WAF with custom rules |
| **Data Transfer** | Outbound | 500 GB | ¥5,000 | High traffic |
| **Azure Monitor** | Premium | - | ¥5,000 | Advanced monitoring |
| **Azure Backup** | Backup storage | 250 GB | ¥7,500 | Comprehensive backups |
| **Azure Key Vault** | Standard | - | ¥1,000 | Secrets management |
| **Total** | | | **¥150,000 - ¥220,000** | With 20% buffer |

#### Municipality Scenario (50,000 students, 5,000 teachers, 100 schools)

| Service | SKU | Quantity | Monthly Cost (JPY) | Notes |
|---------|-----|----------|-------------------|-------|
| **Azure Container Apps** | 4 vCPU, 8 GB | 10 instances × 730h | ¥120,000 | High availability |
| **Azure Database for PostgreSQL** | Memory Optimized E16s v3 | 1 instance (zone-redundant) | ¥250,000 | 16 vCores, 128 GB RAM, 1 TB storage |
| **Azure Cache for Redis** | Premium P3 | 1 cache (26 GB, clustered) | ¥50,000 | High performance |
| **Azure Blob Storage** | Hot + Cool tier | 500 GB | ¥10,000 | Lifecycle management |
| **Application Gateway v2** | WAF_v2 | 2 instances (multi-zone) | ¥60,000 | High availability |
| **Data Transfer** | Outbound | 2 TB | ¥20,000 | Heavy traffic |
| **Azure Monitor** | Enterprise | - | ¥15,000 | Full observability |
| **Azure Backup** | Backup storage | 1 TB | ¥30,000 | Enterprise backups |
| **Azure Front Door** | Standard | - | ¥45,000 | Global load balancing |
| **Total** | | | **¥600,000 - ¥900,000** | With 20% buffer |

### Cost Optimization Strategies

#### 1. Reserved Instances (1-year commitment)

| Service | Savings | Recommended For |
|---------|---------|----------------|
| Azure Database for PostgreSQL | 30-40% | Production environments |
| Azure Cache for Redis | 25-35% | Stable workloads |
| Azure Container Instances | N/A | Use Azure Container Apps with reserved capacity |

**Estimated Savings**: 20-30% on total cost for production environments

#### 2. Auto-Scaling Configuration

```json
{
  "containerInstances": {
    "minCount": 2,
    "maxCount": 10,
    "scaleOutRule": {
      "metric": "cpu",
      "threshold": 70,
      "duration": "PT5M"
    },
    "scaleInRule": {
      "metric": "cpu",
      "threshold": 30,
      "duration": "PT10M"
    }
  }
}
```

**Benefit**: Pay only for actual usage during off-peak hours

#### 3. Blob Storage Lifecycle Management

```json
{
  "rules": [
    {
      "name": "MoveToCoolAfter7Days",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 7
            }
          }
        }
      }
    },
    {
      "name": "DeleteOldUploads",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "delete": {
              "daysAfterModificationGreaterThan": 90
            }
          }
        }
      }
    }
  ]
}
```

**Benefit**: 50% storage cost reduction for old CSV files

#### 4. Database Storage Auto-Grow

```bicep
storage: {
  storageSizeGB: 128
  autoGrow: 'Enabled'
  storageSizeGBMax: 1024
}
```

**Benefit**: Start small, grow as needed (avoid over-provisioning)

#### 5. Azure Hybrid Benefit (if applicable)

For organizations with existing Windows Server or SQL Server licenses:
- Apply Azure Hybrid Benefit to PostgreSQL (if using Windows VMs for other purposes)
- Potential savings: 20-40% on compute costs

#### 6. Azure Cost Management Alerts

```bash
# Create budget alert
az consumption budget create \
  --budget-name "rosterhub-monthly-budget" \
  --amount 100000 \
  --time-grain Monthly \
  --time-period '{"startDate":"2025-11-01"}' \
  --notification-email "admin@school.jp" \
  --notification-threshold 80
```

**Benefit**: Proactive cost monitoring and alerts

---

## Deployment Procedures

### Step 1: Prerequisites Setup

#### 1.1 Install Azure CLI

**Windows**:
```powershell
# Using winget
winget install -e --id Microsoft.AzureCLI

# Or download MSI installer from:
# https://aka.ms/installazurecliwindows
```

**macOS**:
```bash
brew update && brew install azure-cli
```

**Linux (Ubuntu/Debian)**:
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

**Verification**:
```bash
az --version
# Expected: azure-cli 2.x.x
```

#### 1.2 Login to Azure

```bash
# Interactive browser login
az login

# For service principal authentication (CI/CD)
az login --service-principal \
  --username <app-id> \
  --password <password-or-cert> \
  --tenant <tenant-id>

# Verify current subscription
az account show
```

#### 1.3 Install Bicep CLI

```bash
# Install Bicep (included in Azure CLI 2.20+)
az bicep install

# Upgrade to latest version
az bicep upgrade

# Verify installation
az bicep version
# Expected: Bicep CLI version 0.x.x
```

#### 1.4 Set Subscription

```bash
# List available subscriptions
az account list --output table

# Set active subscription
az account set --subscription "Your Subscription Name"

# Or use subscription ID
az account set --subscription "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 2: Prepare Infrastructure Code

#### 2.1 Clone RosterHub Repository

```bash
# Clone repository
git clone https://github.com/your-org/rosterhub.git
cd rosterhub

# Navigate to Azure infrastructure directory
cd azure-infrastructure
```

#### 2.2 Configure Parameters

**Create/Edit**: `parameters/prod.parameters.json`

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "prod"
    },
    "primaryRegion": {
      "value": "japaneast"
    },
    "secondaryRegion": {
      "value": "japanwest"
    },
    "projectName": {
      "value": "rosterhub"
    },
    "postgresAdminUsername": {
      "value": "rosterhubadmin"
    },
    "postgresAdminPassword": {
      "reference": {
        "keyVault": {
          "id": "/subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.KeyVault/vaults/<keyvault-name>"
        },
        "secretName": "postgres-admin-password"
      }
    },
    "redisCacheSku": {
      "value": "P1"
    },
    "containerCpuCores": {
      "value": 2
    },
    "containerMemoryGb": {
      "value": 4
    },
    "containerMinCount": {
      "value": 2
    },
    "containerMaxCount": {
      "value": 10
    }
  }
}
```

**Note**: For initial deployment, use plain text password temporarily, then move to Key Vault reference

#### 2.3 Validate Bicep Template

```bash
# Validate main template
az deployment sub validate \
  --location japaneast \
  --template-file main.bicep \
  --parameters @parameters/prod.parameters.json

# Expected output: "Validation succeeded"
```

### Step 3: Deploy Infrastructure

#### 3.1 Deploy Using Azure CLI

```bash
# Create deployment with unique name
DEPLOYMENT_NAME="rosterhub-prod-$(date +%Y%m%d-%H%M%S)"

az deployment sub create \
  --name "${DEPLOYMENT_NAME}" \
  --location japaneast \
  --template-file main.bicep \
  --parameters @parameters/prod.parameters.json \
  --output table

# Monitor deployment progress
az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query 'properties.provisioningState' \
  --output tsv

# Expected: Succeeded
```

**Estimated deployment time**: 15-25 minutes

#### 3.2 Deploy Using Deployment Script

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh prod japaneast

# Follow prompts:
# - PostgreSQL Admin Username: rosterhubadmin
# - PostgreSQL Admin Password: [secure-password]
```

#### 3.3 Verify Deployment

```bash
# List all deployed resources
RESOURCE_GROUP="rg-rosterhub-prod-japaneast"

az resource list \
  --resource-group "${RESOURCE_GROUP}" \
  --output table

# Expected resources:
# - Virtual Network
# - Network Security Groups
# - Application Gateway
# - PostgreSQL Flexible Server
# - Azure Cache for Redis
# - Storage Account
# - Key Vault
# - Log Analytics Workspace
# - Application Insights
```

### Step 4: Build and Push Docker Image

#### 4.1 Create Azure Container Registry

```bash
# Create ACR (if not created by Bicep)
ACR_NAME="acrrosterh