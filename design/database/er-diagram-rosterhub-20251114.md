# Entity-Relationship Diagram - RosterHub

**Project Name**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**Created Date**: 2025-11-14
**Author**: Database Schema Designer AI
**Database**: PostgreSQL 15+
**ORM**: Prisma 5.x
**Specification**: OneRoster Japan Profile 1.2.2

---

## Overview

This document presents the Entity-Relationship (ER) diagram for RosterHub, a OneRoster Japan Profile 1.2.2 compliant data integration hub. The schema supports CSV import/export and REST API access for educational data synchronization between school information systems and learning tools.

### Key Features
- **OneRoster Compliance**: All entities follow OneRoster 1.2.2 Japan Profile specification
- **Japan Profile Extensions**: Custom fields in `metadata.jp.*` namespace (JSONB columns)
- **Delta/Incremental Sync**: Timestamp-based change tracking via `dateLastModified`
- **Soft Deletes**: `status='tobedeleted'` instead of physical deletes
- **Audit Trail**: Complete data access and modification logging
- **Large Scale Support**: Optimized for 10,000-200,000 users

---

## ER Diagram (Mermaid)

```mermaid
erDiagram
    %% Core OneRoster Entities

    USER ||--o{ ENROLLMENT : creates
    USER ||--o{ USER : "agent relationship"
    USER }o--o{ ORG : "belongs to"
    USER ||--o| DEMOGRAPHIC : has

    ORG ||--o{ ORG : "parent-child hierarchy"
    ORG ||--o{ CLASS : hosts
    ORG ||--o{ COURSE : offers

    COURSE ||--o{ CLASS : "instantiated as"

    CLASS ||--o{ ENROLLMENT : contains
    CLASS }o--o{ ACADEMIC_SESSION : "scheduled in"

    ACADEMIC_SESSION ||--o{ ACADEMIC_SESSION : "parent-child hierarchy"

    %% System Entities (non-OneRoster)
    API_KEY ||--o{ AUDIT_LOG : authenticated
    CSV_IMPORT_JOB ||--o{ AUDIT_LOG : triggers

    %% Entity Details

    USER {
        uuid id PK "Primary key (internal)"
        string sourcedId UK "OneRoster unique identifier"
        datetime dateCreated "Creation timestamp"
        datetime dateLastModified "Last update timestamp (indexed)"
        enum status "active|tobedeleted|inactive"
        boolean enabledUser "User account enabled flag"
        string username "Login username"
        string[] userIds "Multiple identifiers (student ID, etc.)"
        string givenName "First name"
        string familyName "Last name"
        string middleName "Middle name (optional)"
        enum role "student|teacher|staff|administrator"
        string identifier UK "National/local unique identifier"
        string email "Email address"
        string sms "SMS phone number (optional)"
        string phone "Phone number (optional)"
        jsonb metadata "Japan Profile extensions (metadata.jp.*)"
    }

    ORG {
        uuid id PK "Primary key (internal)"
        string sourcedId UK "OneRoster unique identifier"
        datetime dateCreated "Creation timestamp"
        datetime dateLastModified "Last update timestamp (indexed)"
        enum status "active|tobedeleted|inactive"
        string name "Organization name"
        enum type "department|school|district|local|state|national"
        string identifier UK "National/local unique identifier"
        string parentSourcedId FK "Parent organization (hierarchy)"
        jsonb metadata "Japan Profile extensions (metadata.jp.*)"
    }

    CLASS {
        uuid id PK "Primary key (internal)"
        string sourcedId UK "OneRoster unique identifier"
        datetime dateCreated "Creation timestamp"
        datetime dateLastModified "Last update timestamp (indexed)"
        enum status "active|tobedeleted|inactive"
        string title "Class title"
        string classCode "Class identifier code"
        enum classType "homeroom|scheduled"
        string location "Physical location (optional)"
        string courseSourcedId FK "Related course"
        string schoolSourcedId FK "Related school (org)"
        jsonb metadata "Japan Profile extensions (metadata.jp.*)"
    }

    COURSE {
        uuid id PK "Primary key (internal)"
        string sourcedId UK "OneRoster unique identifier"
        datetime dateCreated "Creation timestamp"
        datetime dateLastModified "Last update timestamp (indexed)"
        enum status "active|tobedeleted|inactive"
        string title "Course title"
        string courseCode "Course identifier code"
        string schoolYear "Academic year (optional)"
        string schoolSourcedId FK "Related school (org)"
        jsonb metadata "Japan Profile extensions (metadata.jp.*)"
    }

    ENROLLMENT {
        uuid id PK "Primary key (internal)"
        string sourcedId UK "OneRoster unique identifier"
        datetime dateCreated "Creation timestamp"
        datetime dateLastModified "Last update timestamp (indexed)"
        enum status "active|tobedeleted|inactive"
        enum role "primary|secondary|aide"
        boolean primary "Primary enrollment flag"
        datetime beginDate "Enrollment start date (optional)"
        datetime endDate "Enrollment end date (optional)"
        string userSourcedId FK "Related user"
        string classSourcedId FK "Related class"
        string schoolSourcedId FK "Related school (org)"
        jsonb metadata "Japan Profile extensions (metadata.jp.*)"
    }

    ACADEMIC_SESSION {
        uuid id PK "Primary key (internal)"
        string sourcedId UK "OneRoster unique identifier"
        datetime dateCreated "Creation timestamp"
        datetime dateLastModified "Last update timestamp (indexed)"
        enum status "active|tobedeleted|inactive"
        string title "Session title"
        enum type "gradingPeriod|semester|schoolYear|term"
        datetime startDate "Session start date"
        datetime endDate "Session end date"
        string schoolYear "Academic year"
        string parentSourcedId FK "Parent session (hierarchy)"
        jsonb metadata "Japan Profile extensions (metadata.jp.*)"
    }

    DEMOGRAPHIC {
        uuid id PK "Primary key (internal)"
        string sourcedId UK "OneRoster unique identifier"
        datetime dateCreated "Creation timestamp"
        datetime dateLastModified "Last update timestamp (indexed)"
        enum status "active|tobedeleted|inactive"
        datetime birthDate "Date of birth (optional)"
        enum sex "male|female|other|unknown"
        string userSourcedId FK UK "Related user (1:1)"
        jsonb metadata "Japan Profile extensions (metadata.jp.*)"
    }

    API_KEY {
        uuid id PK "Primary key (internal)"
        string key UK "API key (visible)"
        string hashedKey "Hashed API key (bcrypt)"
        string name "API key name"
        string organizationId "Organization identifier"
        string[] ipWhitelist "Allowed IP addresses"
        int rateLimit "Requests per hour limit"
        boolean isActive "Key active flag"
        datetime expiresAt "Expiration timestamp (optional)"
        datetime createdAt "Creation timestamp"
        datetime lastUsedAt "Last usage timestamp (optional)"
    }

    AUDIT_LOG {
        uuid id PK "Primary key (internal)"
        datetime timestamp "Log timestamp (indexed)"
        enum action "CREATE|UPDATE|DELETE|READ"
        string entityType "Entity type (User, Org, etc.)"
        string entitySourcedId "Entity identifier"
        string userId "User performing action (optional)"
        string ipAddress "Request IP address"
        string requestMethod "HTTP method"
        string requestPath "Request URL path"
        jsonb requestBody "Request payload (optional)"
        int responseStatus "HTTP status code"
        jsonb changes "Before/after values (optional)"
    }

    CSV_IMPORT_JOB {
        uuid id PK "Primary key (internal)"
        enum status "pending|processing|completed|failed"
        string fileName "Uploaded file name"
        int fileSize "File size in bytes"
        int totalRecords "Total record count (optional)"
        int processedRecords "Processed record count"
        int successRecords "Successfully imported count"
        int failedRecords "Failed record count"
        jsonb errors "Error details (optional)"
        datetime startedAt "Job start timestamp (optional)"
        datetime completedAt "Job completion timestamp (optional)"
        datetime createdAt "Job creation timestamp"
        string createdBy "User who initiated job"
    }
```

---

## Entity Descriptions

### OneRoster Core Entities

#### 1. USER (users)
**Purpose**: Represents students, teachers, staff, and administrators.

**OneRoster Specification**: Section 4.3 Users
**Japan Profile Extensions**:
- `metadata.jp.kanaGivenName`: Phonetic first name (カナ姓)
- `metadata.jp.kanaFamilyName`: Phonetic last name (カナ名)
- `metadata.jp.kanaMiddleName`: Phonetic middle name (カナミドルネーム)
- `metadata.jp.homeClass`: Home class identifier (ホームクラス)

**Key Features**:
- Multiple identifiers via `userIds[]` array (student ID, national ID, etc.)
- Agent relationships (e.g., parent-child) via self-referencing foreign key
- Many-to-many relationship with ORG (user can belong to multiple organizations)
- One-to-one relationship with DEMOGRAPHIC

**Scale**: 10,000-200,000 records

---

#### 2. ORG (orgs)
**Purpose**: Represents organizational hierarchy (schools, districts, departments).

**OneRoster Specification**: Section 4.4 Orgs
**Japan Profile Extensions**:
- `metadata.jp.localCode`: Local organization code (自治体コード)
- `metadata.jp.prefectureCode`: Prefecture code (都道府県コード)

**Key Features**:
- Self-referencing hierarchy (parent-child relationships)
- Types: department, school, district, local, state, national
- Many-to-many relationship with USER

**Scale**: 100-1,000 records

---

#### 3. CLASS (classes)
**Purpose**: Represents class instances (course + term + period).

**OneRoster Specification**: Section 4.5 Classes
**Japan Profile Extensions**:
- `metadata.jp.classGrade`: Class grade level (学年)
- `metadata.jp.curriculum`: Curriculum type (カリキュラムタイプ)

**Key Features**:
- Links to COURSE (many-to-one)
- Links to SCHOOL via ORG (many-to-one)
- Links to ACADEMIC_SESSION (many-to-many)
- Contains ENROLLMENT records (one-to-many)

**Scale**: 5,000-50,000 records

---

#### 4. COURSE (courses)
**Purpose**: Represents course catalog (course definitions, not instances).

**OneRoster Specification**: Section 4.6 Courses
**Japan Profile Extensions**:
- `metadata.jp.subject`: Subject classification (教科区分)
- `metadata.jp.credits`: Credit count (単位数)

**Key Features**:
- Links to SCHOOL via ORG (many-to-one)
- Instantiated as CLASS records (one-to-many)

**Scale**: 500-5,000 records

---

#### 5. ENROLLMENT (enrollments)
**Purpose**: Represents user-class relationships (student enrollments, teacher assignments).

**OneRoster Specification**: Section 4.7 Enrollments
**Japan Profile Extensions**:
- `metadata.jp.attendanceNumber`: Attendance number (出席番号)
- `metadata.jp.role`: Detailed role classification (詳細役割)

**Key Features**:
- Links USER to CLASS (many-to-many bridge table)
- Role types: primary (student primary enrollment), secondary (cross-listed), aide (teacher assistant)
- Supports begin/end dates for time-bounded enrollments
- Unique constraint: (userSourcedId, classSourcedId)

**Scale**: 100,000-2,000,000 records (largest table)

---

#### 6. ACADEMIC_SESSION (academic_sessions)
**Purpose**: Represents academic time periods (terms, semesters, school years).

**OneRoster Specification**: Section 4.8 Academic Sessions
**Japan Profile Extensions**:
- `metadata.jp.termName`: Japanese term name (学期名)

**Key Features**:
- Self-referencing hierarchy (e.g., schoolYear → semester → gradingPeriod)
- Types: gradingPeriod, semester, schoolYear, term
- Many-to-many relationship with CLASS

**Scale**: 50-500 records

---

#### 7. DEMOGRAPHIC (demographics)
**Purpose**: Represents user demographic information (Japan Profile extension).

**OneRoster Specification**: Section 4.9 Demographics
**Japan Profile Extensions**:
- `metadata.jp.nationality`: Nationality (国籍)
- `metadata.jp.residentStatus`: Resident status (在留資格)

**Key Features**:
- One-to-one relationship with USER
- Optional fields (birthDate, sex)
- Japan Profile extensions for additional demographic data

**Scale**: Same as USER (10,000-200,000 records)

---

### System Entities (Non-OneRoster)

#### 8. API_KEY (api_keys)
**Purpose**: API authentication and authorization.

**Key Features**:
- API key management (creation, revocation, expiration)
- IP whitelist for additional security
- Rate limiting per key (default: 1000 requests/hour)
- Tracks last usage for audit and cleanup

**Scale**: 10-100 records

---

#### 9. AUDIT_LOG (audit_logs)
**Purpose**: Audit trail for all data access and modifications.

**Key Features**:
- Logs all CRUD operations on OneRoster entities
- Captures before/after values for UPDATE operations
- Required for GDPR, MEXT guidelines, and Personal Information Protection Act compliance
- Retention: 3 years minimum

**Scale**: Millions of records (high volume, partitioned by date)

---

#### 10. CSV_IMPORT_JOB (csv_import_jobs)
**Purpose**: Background job tracking for CSV import operations.

**Key Features**:
- Tracks import progress (processed/success/failed counts)
- Error details in JSONB column for debugging
- Status tracking: pending → processing → completed/failed

**Scale**: 100-10,000 records

---

## Relationships Summary

### OneRoster Entity Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| USER ↔ ORG | Many-to-Many | Users belong to multiple organizations |
| USER → DEMOGRAPHIC | One-to-One | Each user has one demographic record |
| USER → USER (agent) | One-to-Many | Parent-child relationships |
| USER → ENROLLMENT | One-to-Many | User enrollments in classes |
| ORG → ORG (parent) | One-to-Many | Organizational hierarchy |
| ORG → CLASS | One-to-Many | Organization hosts classes |
| ORG → COURSE | One-to-Many | Organization offers courses |
| COURSE → CLASS | One-to-Many | Course instantiated as classes |
| CLASS → ENROLLMENT | One-to-Many | Class contains enrollments |
| CLASS ↔ ACADEMIC_SESSION | Many-to-Many | Classes scheduled in sessions |
| ACADEMIC_SESSION → ACADEMIC_SESSION | One-to-Many | Session hierarchy |

### System Entity Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| API_KEY → AUDIT_LOG | One-to-Many | API key usage tracking |
| CSV_IMPORT_JOB → AUDIT_LOG | One-to-Many | Import job audit trail |

---

## Indexes Strategy

### Primary Indexes
All entities have:
- **Primary Key**: `id` (UUID, clustered index)
- **Unique Index**: `sourcedId` (OneRoster identifier, for API queries)

### Performance Indexes
Optimized for common query patterns:

**User Entity**:
- `idx_users_dateLastModified` - Delta API queries
- `idx_users_status` - Active user filtering
- `idx_users_role` - Role-based queries
- `idx_users_identifier` - National ID lookups
- `idx_users_email` - Email-based search

**Org Entity**:
- `idx_orgs_dateLastModified` - Delta API queries
- `idx_orgs_status` - Active org filtering
- `idx_orgs_type` - Organization type filtering
- `idx_orgs_parent` - Hierarchy traversal

**Class Entity**:
- `idx_classes_dateLastModified` - Delta API queries
- `idx_classes_courseSourcedId` - Course-class lookups
- `idx_classes_schoolSourcedId` - School-class lookups

**Enrollment Entity** (largest table):
- `idx_enrollments_dateLastModified` - Delta API queries (critical)
- `idx_enrollments_userSourcedId` - User enrollment lookups
- `idx_enrollments_classSourcedId` - Class roster queries
- `idx_enrollments_schoolSourcedId` - School enrollment reports
- `idx_enrollments_unique` - Unique constraint (userSourcedId, classSourcedId)

**Audit Log Entity**:
- `idx_audit_logs_timestamp` - Time-based queries
- `idx_audit_logs_entity` - Entity-based audit trail
- `idx_audit_logs_userId` - User activity tracking

**Composite Indexes** (for complex queries):
- `idx_enrollments_user_class` - (userSourcedId, classSourcedId) for enrollment checks
- `idx_classes_school_course` - (schoolSourcedId, courseSourcedId) for class listings

---

## Japan Profile Metadata Schema

### JSONB Structure (metadata.jp.*)

All OneRoster entities support Japan Profile extensions in the `metadata` JSONB column.

**User Metadata Example**:
```json
{
  "jp": {
    "kanaGivenName": "タロウ",
    "kanaFamilyName": "ヤマダ",
    "kanaMiddleName": null,
    "homeClass": "1-A"
  }
}
```

**Org Metadata Example**:
```json
{
  "jp": {
    "localCode": "13101",
    "prefectureCode": "13"
  }
}
```

**Class Metadata Example**:
```json
{
  "jp": {
    "classGrade": "1",
    "curriculum": "standard"
  }
}
```

**Demographic Metadata Example**:
```json
{
  "jp": {
    "nationality": "JP",
    "residentStatus": "permanent"
  }
}
```

### JSONB Indexing
For high-performance queries on Japan Profile fields:
```sql
-- Example: Search users by kana family name
CREATE INDEX idx_users_metadata_kana_family ON users
  USING GIN ((metadata->'jp'->'kanaFamilyName'));

-- Example: Search orgs by prefecture code
CREATE INDEX idx_orgs_metadata_prefecture ON orgs
  USING GIN ((metadata->'jp'->'prefectureCode'));
```

---

## Delta/Incremental Sync Design

### Timestamp-Based Change Tracking

**Key Field**: `dateLastModified` (indexed on all entities)

**Query Pattern**:
```sql
-- Fetch all users modified since last sync
SELECT * FROM users
WHERE dateLastModified > '2025-11-13T12:00:00Z'
ORDER BY dateLastModified ASC;
```

**API Endpoint**:
```
GET /oneroster/v1/users?filter=dateLastModified>2025-11-13T12:00:00Z
```

### Soft Delete Handling

**Instead of physical deletes**:
```sql
-- Soft delete user
UPDATE users
SET status = 'tobedeleted', dateLastModified = NOW()
WHERE sourcedId = 'abc123';
```

**Consumer systems detect soft deletes**:
```sql
-- Fetch deleted users
SELECT * FROM users
WHERE status = 'tobedeleted'
  AND dateLastModified > '2025-11-13T12:00:00Z';
```

---

## Performance Considerations

### Scale Targets
- **Users**: 10,000-200,000 records
- **Enrollments**: 100,000-2,000,000 records (largest table)
- **Classes**: 5,000-50,000 records
- **Audit Logs**: Millions of records (partitioned by month)

### Optimization Strategies

#### 1. Partitioning
- **Audit Logs**: Partitioned by month for time-range queries
  ```sql
  CREATE TABLE audit_logs (
    ...
  ) PARTITION BY RANGE (timestamp);

  CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
  ```

#### 2. Connection Pooling
- **PgBouncer**: Max 100 connections (production)
- **Prisma Client**: Connection pool size 20

#### 3. Query Optimization
- All foreign key columns indexed
- `dateLastModified` indexed on all entities (critical for Delta API)
- Composite indexes for common JOIN patterns

#### 4. Bulk Insert Optimization
- **CSV Import**: Batch inserts (1000 records per transaction)
- **Transaction Strategy**: Per-batch commits (not per-record)
- **COPY FROM**: Use PostgreSQL COPY for maximum performance

---

## Next Steps

1. **Normalization Analysis**: Verify 3NF compliance and identify denormalization opportunities
2. **DDL Generation**: Create Prisma schema and PostgreSQL DDL
3. **Index Design**: Detailed index sizing and performance testing
4. **Migration Planning**: Schema versioning and rollback strategy
5. **Testing**: Load testing with 200,000-user dataset

---

## References

- **OneRoster 1.2.2 Specification**: [IMS Global OneRoster](https://www.imsglobal.org/oneroster-v11-final-specification)
- **OneRoster Japan Profile 1.2.2**: Japanese education data extensions
- **System Requirements**: `docs/requirements/oneroster-system-requirements.md`
- **Steering Context**:
  - `steering/structure.md` - Architecture patterns
  - `steering/tech.md` - PostgreSQL 15+, Prisma 5.x
  - `steering/product.md` - RosterHub product context

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Status**: Ready for Review
