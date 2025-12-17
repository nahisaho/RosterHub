# RosterHub System Architecture Diagrams

## C4 Model Architecture Diagrams

This document contains Mermaid-based architecture diagrams for the RosterHub system following the C4 model approach.

### Level 1: System Context Diagram

```mermaid
C4Context
    title System Context Diagram - RosterHub

    Person(admin, "System Admin", "Manages API keys, monitors system health")
    Person(developer, "SIS Developer", "Integrates with OneRoster API")
    Person(teacher, "Teacher", "Views student roster data")

    System(rosterhub, "RosterHub", "OneRoster Japan Profile 1.2.2 compliant data integration platform")

    System_Ext(sis, "Student Information System", "Source system for student data")
    System_Ext(lms, "Learning Management System", "Consumes roster data")
    System_Ext(external_api, "External APIs", "Third-party integrations")

    Rel(admin, rosterhub, "Manages", "HTTPS")
    Rel(developer, rosterhub, "Integrates via API", "REST/JSON")
    Rel(teacher, rosterhub, "Views data", "HTTPS")
    
    Rel(sis, rosterhub, "Exports data", "CSV/API")
    Rel(rosterhub, lms, "Provides roster data", "REST API")
    Rel(rosterhub, external_api, "Syncs data", "Webhooks")
```

### Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram - RosterHub

    Person(user, "API Consumer", "SIS, LMS, or admin user")

    Container_Boundary(rosterhub, "RosterHub Platform") {
        Container(nginx, "Nginx", "Reverse Proxy", "Load balancer, SSL termination, static files")
        Container(api, "API Server", "NestJS 11.x", "OneRoster v1.2 REST API endpoints")
        Container(queue, "Job Queue", "BullMQ", "Async CSV processing, webhooks, cleanup")
        ContainerDb(db, "Database", "PostgreSQL 15", "Stores all OneRoster entities")
        ContainerDb(cache, "Cache", "Redis 7", "Session cache, rate limiting, job queue backend")
        Container(storage, "File Storage", "Local/S3", "CSV uploads, exports, temporary files")
    }

    Rel(user, nginx, "HTTPS requests", "443")
    Rel(nginx, api, "Proxy requests", "HTTP/3000")
    Rel(api, db, "Queries/Writes", "TCP/5432")
    Rel(api, cache, "Cache ops", "TCP/6379")
    Rel(api, queue, "Queue jobs", "Redis")
    Rel(queue, db, "Process data", "TCP/5432")
    Rel(api, storage, "Read/Write files", "File I/O")
```

### Level 3: Component Diagram (API Server)

```mermaid
C4Component
    title Component Diagram - API Server

    Container_Boundary(api, "API Server (NestJS)") {
        Component(auth, "Auth Module", "Guard/Strategy", "API Key authentication, rate limiting")
        Component(oneroster, "OneRoster Module", "Controllers/Services", "REST endpoints for 7 entities")
        Component(csv, "CSV Module", "Service/Processor", "Import/Export with BullMQ jobs")
        Component(webhook, "Webhook Module", "Service", "Event notifications to external systems")
        Component(health, "Health Module", "Controller", "Liveness, readiness, metrics")
        Component(prisma, "Prisma Module", "Service", "Database ORM layer")
        Component(common, "Common Module", "Utils/Pipes", "Shared utilities, validation, filters")
    }

    Rel(auth, oneroster, "Protects")
    Rel(auth, csv, "Protects")
    Rel(oneroster, prisma, "Uses")
    Rel(csv, prisma, "Uses")
    Rel(csv, webhook, "Triggers events")
    Rel(oneroster, common, "Uses")
    Rel(csv, common, "Uses")
```

### Data Flow Diagram

```mermaid
flowchart TB
    subgraph Input["Data Input"]
        CSV[CSV Upload]
        API_IN[API POST/PUT]
    end

    subgraph Processing["Data Processing"]
        VAL[Validation Layer]
        TRANS[Transformation]
        JP[Japan Profile Enrichment]
    end

    subgraph Storage["Data Storage"]
        PG[(PostgreSQL)]
        REDIS[(Redis Cache)]
    end

    subgraph Output["Data Output"]
        API_OUT[REST API]
        EXPORT[CSV Export]
        WH[Webhooks]
    end

    CSV --> VAL
    API_IN --> VAL
    VAL --> TRANS
    TRANS --> JP
    JP --> PG
    PG --> REDIS
    REDIS --> API_OUT
    PG --> EXPORT
    PG --> WH

    style Input fill:#e1f5fe
    style Processing fill:#fff3e0
    style Storage fill:#e8f5e9
    style Output fill:#fce4ec
```

### Entity Relationship Diagram

```mermaid
erDiagram
    Org ||--o{ User : "has"
    Org ||--o{ AcademicSession : "has"
    Org ||--o{ Class : "has"
    Org ||--o{ Course : "offers"
    
    User ||--o{ Enrollment : "enrolled"
    User }o--o{ Class : "teaches (userProfiles)"
    
    Class ||--o{ Enrollment : "contains"
    Class }o--|| Course : "implements"
    Class }o--o| AcademicSession : "during"
    
    Course ||--o{ Class : "implemented by"

    Org {
        uuid sourcedId PK
        string name
        enum type
        enum status
        json metadata
    }

    User {
        uuid sourcedId PK
        string username
        string givenName
        string familyName
        enum role
        json metadata
    }

    Class {
        uuid sourcedId PK
        string title
        enum classType
        string classCode
        json metadata
    }

    Course {
        uuid sourcedId PK
        string title
        string courseCode
        json metadata
    }

    AcademicSession {
        uuid sourcedId PK
        string title
        date startDate
        date endDate
        enum type
    }

    Enrollment {
        uuid sourcedId PK
        enum role
        boolean primary
    }
```

### Deployment Architecture (Kubernetes)

```mermaid
flowchart TB
    subgraph Internet
        LB[Cloud Load Balancer]
    end

    subgraph K8s["Kubernetes Cluster"]
        subgraph Ingress
            NG[Nginx Ingress Controller]
        end

        subgraph API["API Pods (HPA: 2-10)"]
            A1[rosterhub-api-1]
            A2[rosterhub-api-2]
            AN[rosterhub-api-n]
        end

        subgraph Data["Data Layer"]
            PG_STS[(PostgreSQL<br/>StatefulSet)]
            REDIS_STS[(Redis<br/>StatefulSet)]
        end

        subgraph Storage["Persistent Storage"]
            PVC1[PVC: postgres-data]
            PVC2[PVC: redis-data]
            PVC3[PVC: uploads]
        end

        subgraph Config["Configuration"]
            CM[ConfigMap]
            SEC[Secrets]
        end
    end

    subgraph Monitoring
        PROM[Prometheus]
        GRAF[Grafana]
    end

    LB --> NG
    NG --> A1
    NG --> A2
    NG --> AN
    A1 --> PG_STS
    A2 --> PG_STS
    AN --> PG_STS
    A1 --> REDIS_STS
    A2 --> REDIS_STS
    AN --> REDIS_STS
    PG_STS --> PVC1
    REDIS_STS --> PVC2
    A1 --> PVC3
    A1 -.-> CM
    A1 -.-> SEC
    PROM --> A1
    PROM --> A2
    PROM --> AN
    GRAF --> PROM

    style API fill:#bbdefb
    style Data fill:#c8e6c9
    style Monitoring fill:#fff9c4
```

### Request Flow Sequence

```mermaid
sequenceDiagram
    participant Client
    participant Nginx as Nginx LB
    participant Auth as Auth Guard
    participant Controller
    participant Service
    participant Prisma
    participant DB as PostgreSQL
    participant Cache as Redis

    Client->>Nginx: HTTPS Request
    Nginx->>Auth: Forward (X-API-Key)
    Auth->>Auth: Validate API Key
    
    alt Invalid Key
        Auth-->>Client: 401 Unauthorized
    end

    Auth->>Controller: Authorized Request
    Controller->>Service: Process Request
    
    Service->>Cache: Check Cache
    alt Cache Hit
        Cache-->>Service: Cached Data
        Service-->>Controller: Response
        Controller-->>Client: 200 OK (cached)
    else Cache Miss
        Service->>Prisma: Query
        Prisma->>DB: SQL Query
        DB-->>Prisma: Result Set
        Prisma-->>Service: Entity Objects
        Service->>Cache: Store in Cache
        Service-->>Controller: Response
        Controller-->>Client: 200 OK
    end
```

### CSV Import Job Flow

```mermaid
stateDiagram-v2
    [*] --> Uploaded: CSV File Received
    Uploaded --> Queued: Job Created
    Queued --> Processing: Worker Picks Up
    
    Processing --> Validating: Start Validation
    Validating --> Validated: All Rows Valid
    Validating --> PartialError: Some Rows Invalid
    
    Validated --> Importing: Begin DB Insert
    PartialError --> Importing: Continue with Valid
    
    Importing --> Completed: All Inserted
    Importing --> Failed: Critical Error
    
    Completed --> [*]: Success
    Failed --> [*]: Error Logged
    
    note right of Processing
        BullMQ Worker
        Max 3 concurrent jobs
    end note
    
    note right of Importing
        Batch insert: 1000 rows
        Transaction per batch
    end note
```

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20.x LTS |
| Framework | NestJS | 11.x |
| Language | TypeScript | 5.7 |
| ORM | Prisma | 6.x |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7.x |
| Queue | BullMQ | 5.x |
| Testing | Jest | 30.x |
| Container | Docker | 24.x |
| Orchestration | Kubernetes | 1.28+ |

## Related Documents

- [System Architecture Design Part 1](system-architecture-design-part1-20251114.md)
- [System Architecture Design Part 2](system-architecture-design-part2-20251114.md)
- [Database Design](../../database/database-design-rosterhub-20251114.md)
- [API Documentation](../api/)

---
Last Updated: 2025-01-13
