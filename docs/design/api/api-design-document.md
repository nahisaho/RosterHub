# RosterHub OneRoster Japan Profile API Design Document

**Project**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**Version**: 1.0
**Date**: 2025-11-14
**Author**: API Designer AI
**Status**: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [API Architecture](#2-api-architecture)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Endpoint Catalog](#4-endpoint-catalog)
5. [Request/Response Patterns](#5-requestresponse-patterns)
6. [Error Handling](#6-error-handling)
7. [Delta/Incremental Sync](#7-deltaincremental-sync)
8. [CSV Import/Export](#8-csv-importexport)
9. [Performance Considerations](#9-performance-considerations)
10. [Requirements Traceability](#10-requirements-traceability)

---

## 1. Overview

### 1.1 Purpose

This document defines the REST API design for RosterHub, a OneRoster Japan Profile 1.2.2 compliant integration hub. The API provides standardized access to educational data (users, organizations, classes, courses, enrollments) for learning tools and external systems.

### 1.2 Scope

**In Scope**:
- OneRoster v1.2 REST API endpoints (Bulk + Delta)
- All 7 Japan Profile entities (Users, Orgs, Classes, Courses, Enrollments, AcademicSessions, Demographics)
- CSV Import/Export API
- API Key authentication with IP whitelist
- Delta/Incremental sync support

**Out of Scope**:
- Gradebook API (results, lineItems, categories, scores)
- Rostering Service API (resources, lineItemCategories)
- Real-time WebSocket API
- GraphQL API

### 1.3 API Specification

- **OpenAPI Version**: 3.0.3
- **API Version**: 1.2.2 (OneRoster Japan Profile)
- **Base URL**: `https://api.rosterhub.example.com/ims/oneroster/v1p2`
- **Protocol**: HTTPS only (TLS 1.3)
- **Data Format**: JSON (application/json)
- **Character Encoding**: UTF-8

---

## 2. API Architecture

### 2.1 RESTful Design Principles

RosterHub API follows OneRoster 1.2 REST API specification with the following principles:

1. **Resource-Oriented**: Each entity (User, Org, Class) is a resource with unique URI
2. **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (delete)
3. **Stateless**: No server-side session state, all requests include API key
4. **Uniform Interface**: Consistent naming, response formats, error handling
5. **HATEOAS**: Resource references include href links (GUIDRef pattern)

### 2.2 URI Structure

**Pattern**: `/ims/oneroster/v1p2/{collection}[/{sourcedId}]`

**Examples**:
- `GET /ims/oneroster/v1p2/users` - List all users
- `GET /ims/oneroster/v1p2/users/user_abc123` - Get specific user
- `GET /ims/oneroster/v1p2/classes?filter=status='active'` - Filtered list

**Special Endpoints**:
- `POST /csv/import` - CSV upload
- `GET /csv/export` - CSV download
- `GET /csv/jobs/{jobId}` - Job status

### 2.3 Versioning Strategy

**URI-based versioning**: `/ims/oneroster/v1p2/`

- **v1p2**: OneRoster 1.2 Japan Profile (current version)
- **Future versions**: `/ims/oneroster/v1p3/` (when OneRoster 1.3 is released)

**Breaking Changes**:
- Major version increment (v1 → v2) for incompatible changes
- Minor version increment (v1p1 → v1p2) for backward-compatible additions
- Both versions supported for 12-month transition period

---

## 3. Authentication & Authorization

### 3.1 API Key Authentication

**Method**: API Key in HTTP header

**Header Name**: `X-API-Key`

**Format**: `X-API-Key: ak_{32-character-random-string}`

**Example**:
```http
GET /ims/oneroster/v1p2/users HTTP/1.1
Host: api.rosterhub.example.com
X-API-Key: ak_1234567890abcdef1234567890abcdef
```

### 3.2 IP Whitelist

All API requests must originate from registered IP addresses.

**Configuration**:
- IP whitelist stored per API key
- Supports CIDR notation (e.g., `203.0.113.0/24`)
- IPv4 and IPv6 support

**Rejection**:
- 401 Unauthorized if IP not in whitelist
- Error message: "IP address not whitelisted"

### 3.3 Rate Limiting

**Default Limits**:
- 1000 requests per hour per API key
- 100 requests per minute (burst limit)

**Headers**:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1636891200
```

**Exceeded Response**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
Content-Type: application/json

{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "Rate limit exceeded. Please retry after 3600 seconds."
}
```

### 3.4 Authorization Model

**Role-Based Access Control (RBAC)**:

| Role | Permissions |
|------|-------------|
| **Vendor (API Consumer)** | Read-only (GET endpoints only) |
| **OrgAdmin** | CRUD within own organization |
| **SuperAdmin** | Full CRUD access, manage API keys |

**Resource Filtering**:
- API keys scoped to specific organizations
- Queries automatically filtered by `organizationId`
- No cross-organization data leakage

---

## 4. Endpoint Catalog

### 4.1 Users API

**Base Path**: `/ims/oneroster/v1p2/users`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | List all users (paginated) | ✅ |
| GET | `/users/{sourcedId}` | Get user by ID | ✅ |
| POST | `/users` | Create user (Phase 2) | ✅ SuperAdmin |
| PUT | `/users/{sourcedId}` | Update user (Phase 2) | ✅ SuperAdmin |
| DELETE | `/users/{sourcedId}` | Soft delete user (Phase 2) | ✅ SuperAdmin |

**Query Parameters**:
- `limit` (integer, default: 100, max: 1000)
- `offset` (integer, default: 0)
- `filter` (string, OneRoster filter syntax)
- `sort` (string, e.g., `familyName`, `-dateLastModified`)
- `fields` (string, comma-separated field list)

**Example Request**:
```http
GET /ims/oneroster/v1p2/users?filter=role='student' AND status='active'&limit=100&sort=familyName HTTP/1.1
Host: api.rosterhub.example.com
X-API-Key: ak_1234567890abcdef1234567890abcdef
```

**Example Response**:
```json
{
  "users": [
    {
      "sourcedId": "user_stu001",
      "status": "active",
      "dateLastModified": "2025-11-14T10:30:00Z",
      "dateCreated": "2025-11-01T09:00:00Z",
      "enabledUser": true,
      "username": "taro.yamada",
      "userIds": ["STU20250001"],
      "givenName": "太郎",
      "familyName": "山田",
      "middleName": null,
      "role": "student",
      "identifier": "STU20250001",
      "email": "taro.yamada@example.school.jp",
      "sms": null,
      "phone": null,
      "metadata": {
        "jp": {
          "kanaGivenName": "たろう",
          "kanaFamilyName": "やまだ",
          "kanaMiddleName": null,
          "homeClass": "class_hr_7a",
          "gender": "male",
          "attendanceNumber": 15
        }
      },
      "orgs": [
        {
          "href": "https://api.rosterhub.example.com/ims/oneroster/v1p2/orgs/org_school001",
          "sourcedId": "org_school001",
          "type": "org"
        }
      ],
      "agents": [
        {
          "href": "https://api.rosterhub.example.com/ims/oneroster/v1p2/users/user_parent001",
          "sourcedId": "user_parent001",
          "type": "user"
        }
      ],
      "grades": ["7"],
      "password": null
    }
  ]
}
```

**Response Headers**:
```http
HTTP/1.1 200 OK
X-Total-Count: 1523
Link: <https://api.rosterhub.example.com/ims/oneroster/v1p2/users?offset=100&limit=100>; rel="next"
```

### 4.2 Organizations API

**Base Path**: `/ims/oneroster/v1p2/orgs`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/orgs` | List all organizations | ✅ |
| GET | `/orgs/{sourcedId}` | Get org by ID | ✅ |

**Example**: See Users API pattern

### 4.3 Classes API

**Base Path**: `/ims/oneroster/v1p2/classes`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/classes` | List all classes | ✅ |
| GET | `/classes/{sourcedId}` | Get class by ID | ✅ |

### 4.4 Courses API

**Base Path**: `/ims/oneroster/v1p2/courses`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/courses` | List all courses | ✅ |
| GET | `/courses/{sourcedId}` | Get course by ID | ✅ |

### 4.5 Enrollments API

**Base Path**: `/ims/oneroster/v1p2/enrollments`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/enrollments` | List all enrollments | ✅ |
| GET | `/enrollments/{sourcedId}` | Get enrollment by ID | ✅ |

### 4.6 Academic Sessions API

**Base Path**: `/ims/oneroster/v1p2/academicSessions`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/academicSessions` | List all sessions | ✅ |
| GET | `/academicSessions/{sourcedId}` | Get session by ID | ✅ |

### 4.7 Demographics API

**Base Path**: `/ims/oneroster/v1p2/demographics`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/demographics` | List all demographics | ✅ |
| GET | `/demographics/{sourcedId}` | Get demographic by ID | ✅ |

### 4.8 CSV Management API

**Base Path**: `/csv`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/csv/import` | Upload CSV files (multipart) | ✅ SuperAdmin |
| GET | `/csv/export` | Download CSV files (ZIP) | ✅ |
| GET | `/csv/jobs/{jobId}` | Get import job status | ✅ |

**CSV Import Example**:
```http
POST /csv/import HTTP/1.1
Host: api.rosterhub.example.com
X-API-Key: ak_1234567890abcdef1234567890abcdef
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="manifest"; filename="manifest.csv"
Content-Type: text/csv

(manifest.csv content)
------WebKitFormBoundary
Content-Disposition: form-data; name="users"; filename="users.csv"
Content-Type: text/csv

(users.csv content)
------WebKitFormBoundary--
```

**Response (202 Accepted)**:
```json
{
  "jobId": "job_abc123",
  "status": "pending",
  "message": "CSV import job created. Poll /csv/jobs/job_abc123 for status.",
  "filesReceived": ["manifest.csv", "users.csv", "orgs.csv"]
}
```

---

## 5. Request/Response Patterns

### 5.1 Pagination

**Parameters**:
- `limit`: Records per page (default: 100, max: 1000)
- `offset`: Starting record index (default: 0)

**Response Headers**:
- `X-Total-Count`: Total number of records
- `Link`: Next/Previous page URLs (RFC 5988)

**Example**:
```http
GET /users?limit=100&offset=0

HTTP/1.1 200 OK
X-Total-Count: 1523
Link: <https://api.rosterhub.example.com/ims/oneroster/v1p2/users?offset=100&limit=100>; rel="next"
```

### 5.2 Filtering

**Syntax**: OneRoster filter expression

**Operators**:
- `=` (equals)
- `!=` (not equals)
- `>` (greater than)
- `>=` (greater than or equal)
- `<` (less than)
- `<=` (less than or equal)
- `AND` (logical and)
- `OR` (logical or)

**Examples**:
```
filter=status='active'
filter=role='student' AND status='active'
filter=dateLastModified>=2025-01-01T00:00:00Z
filter=status!='tobedeleted'
```

### 5.3 Sorting

**Format**: `sort={field}` or `sort=-{field}` (descending)

**Examples**:
```
sort=familyName                 # Ascending
sort=-dateLastModified          # Descending
```

### 5.4 Field Selection

**Format**: `fields={field1},{field2},...`

**Example**:
```
fields=sourcedId,givenName,familyName,email
```

**Response (partial fields)**:
```json
{
  "users": [
    {
      "sourcedId": "user_stu001",
      "givenName": "太郎",
      "familyName": "山田",
      "email": "taro.yamada@example.school.jp"
    }
  ]
}
```

---

## 6. Error Handling

### 6.1 OneRoster Error Response Format

All errors follow OneRoster standard:

```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "Human-readable error message",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "fieldName",
        "imsx_codeMinorFieldValue": "error_code"
      }
    ]
  }
}
```

### 6.2 HTTP Status Codes

| Status Code | Meaning | Use Case |
|-------------|---------|----------|
| 200 OK | Success | GET request successful |
| 201 Created | Created | POST request successful |
| 202 Accepted | Accepted | Async job created (CSV import) |
| 204 No Content | No content | DELETE successful |
| 400 Bad Request | Invalid request | Validation error, invalid filter |
| 401 Unauthorized | Not authorized | Invalid API key, IP not whitelisted |
| 404 Not Found | Not found | Resource with sourcedId not found |
| 409 Conflict | Conflict | Duplicate sourcedId |
| 413 Payload Too Large | Too large | CSV file exceeds 100MB |
| 422 Unprocessable Entity | Validation error | Japan Profile validation failed |
| 429 Too Many Requests | Rate limited | Rate limit exceeded |
| 500 Internal Server Error | Server error | Unexpected error |

### 6.3 Common Error Examples

**400 Bad Request (Validation Error)**:
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "Validation error: kanaGivenName must be 全角ひらがな",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "kanaGivenName",
        "imsx_codeMinorFieldValue": "invalid_format"
      }
    ]
  }
}
```

**401 Unauthorized**:
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "Invalid API key or IP address not whitelisted",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "X-API-Key",
        "imsx_codeMinorFieldValue": "unauthorized"
      }
    ]
  }
}
```

**404 Not Found**:
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "User with sourcedId 'user_abc123' not found",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "sourcedId",
        "imsx_codeMinorFieldValue": "not_found"
      }
    ]
  }
}
```

---

## 7. Delta/Incremental Sync

### 7.1 Purpose

Delta API enables learning tools to fetch only changed records since last sync, reducing bandwidth and processing time.

### 7.2 Timestamp-Based Filtering

**Key Fields**:
- `dateCreated`: Record creation timestamp (never changes)
- `dateLastModified`: Last modification timestamp (updates on every change)

**Filter Syntax**:
```
filter=dateLastModified>={timestamp}
```

**Example**:
```http
GET /users?filter=dateLastModified>=2025-01-01T00:00:00Z
```

### 7.3 Detecting Change Types

**New Records**:
```
dateCreated == dateLastModified
```

**Updated Records**:
```
dateCreated < dateLastModified
```

**Deleted Records**:
```
status = 'tobedeleted'
```

### 7.4 Sync Workflow

**Initial Sync (Full)**:
1. Fetch all users: `GET /users?limit=1000&offset=0`
2. Store locally
3. Record sync timestamp: `2025-11-14T10:30:00Z`

**Incremental Sync (Delta)**:
1. Fetch changed users: `GET /users?filter=dateLastModified>=2025-11-14T10:30:00Z`
2. For each record:
   - If `dateCreated == dateLastModified`: Insert new record
   - If `dateCreated < dateLastModified`: Update existing record
   - If `status == 'tobedeleted'`: Delete record
3. Update sync timestamp to current time

**Sync Frequency Recommendation**:
- **High-frequency**: Every 15 minutes (near real-time)
- **Medium-frequency**: Every 1 hour (standard)
- **Low-frequency**: Daily (batch)

---

## 8. CSV Import/Export

### 8.1 CSV Import Flow

**Endpoint**: `POST /csv/import`

**Workflow**:
1. Client uploads CSV files (multipart/form-data)
2. Server validates file format, size, encoding
3. Server creates background job (returns 202 Accepted with jobId)
4. Client polls `/csv/jobs/{jobId}` for status
5. Server processes CSV asynchronously (streaming parser)
6. Server validates data (Japan Profile rules)
7. Server imports valid records (bulk insert)
8. Job status updated to `completed` or `partial_success`

**Supported Files**:
- manifest.csv (required)
- users.csv, orgs.csv, classes.csv, courses.csv, enrollments.csv, academicSessions.csv, demographics.csv (optional)

**File Requirements**:
- UTF-8 BOM encoding
- OneRoster Japan Profile 1.2.2 format
- Max file size: 100MB per file
- Max total size: 500MB

### 8.2 CSV Export Flow

**Endpoint**: `GET /csv/export`

**Workflow**:
1. Client requests CSV export with optional filters
2. Server generates CSV files (streaming)
3. Server packages files into ZIP archive
4. Server returns ZIP download (Content-Type: application/zip)

**Export Format**:
- UTF-8 BOM encoding
- OneRoster Japan Profile 1.2.2 compliant
- All entities included (or filtered by `entities` parameter)

**Example**:
```http
GET /csv/export?filter=status='active'&entities=users,orgs,classes HTTP/1.1
Host: api.rosterhub.example.com
X-API-Key: ak_1234567890abcdef1234567890abcdef

HTTP/1.1 200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="oneroster-export-2025-11-14.zip"

(ZIP file content)
```

### 8.3 Job Status Polling

**Endpoint**: `GET /csv/jobs/{jobId}`

**Response**:
```json
{
  "jobId": "job_abc123",
  "status": "processing",
  "progress": {
    "totalRecords": 15230,
    "processedRecords": 8500,
    "successRecords": 8450,
    "failedRecords": 50,
    "percentComplete": 55.8
  },
  "startedAt": "2025-11-14T10:30:00Z",
  "completedAt": null,
  "errors": []
}
```

**Polling Strategy**:
- Poll every 5 seconds during processing
- Stop when `status` is `completed`, `failed`, or `partial_success`
- Exponential backoff on server errors

---

## 9. Performance Considerations

### 9.1 Response Time Targets

| Endpoint Type | Target (95th percentile) | Max (99th percentile) |
|---------------|-------------------------|---------------------|
| GET single record | < 100ms | < 200ms |
| GET collection (100 records) | < 500ms | < 1000ms |
| POST CSV import | < 1000ms (job creation) | < 2000ms |
| GET CSV export | < 5000ms (small datasets) | Streaming for large |

### 9.2 Optimization Strategies

**Database Indexing**:
- Index on `sourcedId` (primary key)
- Index on `dateLastModified` (Delta API)
- Index on `status` (filtering)
- Composite index on `(dateLastModified, status)` (common query)

**Caching**:
- API key validation cached in Redis (5-minute TTL)
- Rate limit counters in Redis
- No response caching (data changes frequently)

**Pagination**:
- Default limit: 100 records
- Max limit: 1000 records
- Offset-based pagination (simple, sufficient for use case)
- Cursor-based pagination (future optimization for large datasets)

### 9.3 CSV Processing Performance

**Large File Handling**:
- Streaming CSV parser (csv-parse library)
- Process in batches of 1000 records
- Bulk insert with Prisma `createMany()`
- Background job processing (BullMQ)

**Target Performance**:
- 200,000 user records in < 30 minutes
- 50MB CSV file in < 15 minutes

---

## 10. Requirements Traceability

### 10.1 REST API Requirements

| Requirement ID | Description | API Endpoint | Status |
|----------------|-------------|--------------|--------|
| REQ-API-001 | OneRoster 1.2 REST API support | All endpoints | ✅ Complete |
| REQ-API-002 | GET /users endpoint | `GET /users` | ✅ Complete |
| REQ-API-003 | GET /orgs endpoint | `GET /orgs` | ✅ Complete |
| REQ-API-004 | GET /classes endpoint | `GET /classes` | ✅ Complete |
| REQ-API-005 | GET /courses endpoint | `GET /courses` | ✅ Complete |
| REQ-API-006 | GET /enrollments endpoint | `GET /enrollments` | ✅ Complete |
| REQ-API-007 | GET /academicSessions endpoint | `GET /academicSessions` | ✅ Complete |
| REQ-API-008 | GET /demographics endpoint | `GET /demographics` | ✅ Complete |
| REQ-API-009 | Delta/Incremental API (dateLastModified filter) | `?filter=dateLastModified>={}` | ✅ Complete |
| REQ-API-010 | Pagination support (limit, offset) | All collection endpoints | ✅ Complete |
| REQ-API-011 | Filtering support (OneRoster syntax) | `?filter={}` | ✅ Complete |
| REQ-API-012 | Sorting support | `?sort={}` | ✅ Complete |
| REQ-API-013 | Field selection | `?fields={}` | ✅ Complete |
| REQ-API-014 | JSON response format | All endpoints | ✅ Complete |

### 10.2 CSV API Requirements

| Requirement ID | Description | API Endpoint | Status |
|----------------|-------------|--------------|--------|
| REQ-CSV-001 | CSV upload endpoint | `POST /csv/import` | ✅ Complete |
| REQ-CSV-002 | CSV download endpoint | `GET /csv/export` | ✅ Complete |
| REQ-CSV-003 | CSV job status endpoint | `GET /csv/jobs/{jobId}` | ✅ Complete |
| REQ-CSV-004 | Multipart file upload | `POST /csv/import` | ✅ Complete |
| REQ-CSV-005 | UTF-8 BOM encoding support | CSV parser | ✅ Complete |
| REQ-CSV-006 | Background job processing | BullMQ integration | ✅ Complete |

### 10.3 Security Requirements

| Requirement ID | Description | Implementation | Status |
|----------------|-------------|----------------|--------|
| REQ-SEC-001 | API Key authentication | `X-API-Key` header | ✅ Complete |
| REQ-SEC-002 | IP whitelist | Middleware guard | ✅ Complete |
| REQ-SEC-003 | Rate limiting | Redis-based throttle | ✅ Complete |
| REQ-SEC-004 | TLS 1.3 encryption | HTTPS only | ✅ Complete |
| REQ-SEC-005 | Audit logging | All requests logged | ✅ Complete |

---

## Appendix A: Glossary

- **sourcedId**: Unique identifier for OneRoster resources (GUID)
- **Delta API**: API endpoint for fetching incremental changes
- **Bulk API**: API endpoint for fetching complete datasets
- **GUIDRef**: OneRoster pattern for resource references (href, sourcedId, type)
- **Japan Profile**: OneRoster specification adapted for Japanese schools
- **BOM**: Byte Order Mark (UTF-8 encoding marker)

---

## Appendix B: References

- **OneRoster v1.2 Specification**: [IMS Global](https://www.imsglobal.org/oneroster-v11-final-specification)
- **OneRoster Japan Profile 1.2.2**: [OneRoster Japan Profile](https://www.imsglobal.org/oneroster-v11-final-specification)
- **OpenAPI 3.0.3**: [OpenAPI Specification](https://swagger.io/specification/)
- **RFC 5988 (Link Header)**: [Web Linking](https://tools.ietf.org/html/rfc5988)

---

**Document Status**: Draft
**Review Required**: External Vendor, Software Developer, Test Engineer
**Next Review Date**: 2025-11-21

---

**Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | API Designer AI | Initial draft - Complete API design |
