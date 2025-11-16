# Sprint 3-4: Core Domain Entity Modules - README

## Quick Summary

**Status**: ✅ COMPLETED (2025-11-15)
**Files Created**: 37 files
**Lines of Code**: ~2,400 lines
**API Endpoints**: 14 endpoints (7 entities × 2 endpoints each)

---

## What Was Built

Sprint 3-4 delivered complete NestJS modules for all 7 OneRoster entities:

### Entity Modules (5 files each)
1. **Users** - Students, teachers, staff, administrators
2. **Orgs** - Schools, districts, departments
3. **Classes** - Course instances (course + term + period)
4. **Courses** - Course catalog definitions
5. **Enrollments** - User-class relationships
6. **AcademicSessions** - Terms, semesters, school years
7. **Demographics** - User demographic information (Japan Profile)

### Common Infrastructure (2 files)
- **ApiKeyGuard** - API authentication with IP whitelist
- **AuditInterceptor** - Request/response logging for compliance

---

## File Structure

```
apps/api/src/
├── common/
│   ├── guards/
│   │   └── api-key.guard.ts
│   └── interceptors/
│       └── audit.interceptor.ts
│
└── oneroster/entities/
    ├── users/
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   ├── users.module.ts
    │   └── dto/
    │       ├── user-response.dto.ts
    │       └── query-users.dto.ts
    │
    ├── orgs/                    [same structure]
    ├── classes/                 [same structure]
    ├── courses/                 [same structure]
    ├── enrollments/             [same structure]
    ├── academic-sessions/       [same structure]
    └── demographics/            [same structure]
```

---

## API Endpoints

All endpoints are available under `/ims/oneroster/v1p2/`:

| Entity | Collection Endpoint | Single Resource Endpoint |
|--------|---------------------|-------------------------|
| Users | `GET /users` | `GET /users/:sourcedId` |
| Orgs | `GET /orgs` | `GET /orgs/:sourcedId` |
| Classes | `GET /classes` | `GET /classes/:sourcedId` |
| Courses | `GET /courses` | `GET /courses/:sourcedId` |
| Enrollments | `GET /enrollments` | `GET /enrollments/:sourcedId` |
| AcademicSessions | `GET /academicSessions` | `GET /academicSessions/:sourcedId` |
| Demographics | `GET /demographics` | `GET /demographics/:sourcedId` |

**Authentication**: All endpoints require `X-API-Key` header

---

## Key Features

### OneRoster 1.2.2 Compliance
- ✅ All entity fields match OneRoster specification
- ✅ camelCase naming (sourcedId, dateLastModified)
- ✅ Status enumeration (active, tobedeleted, inactive)
- ✅ Pagination (limit: 1-1000, offset: >=0)

### Japan Profile 1.2.2 Compliance
- ✅ metadata.jp.* namespace for Japan-specific fields
- ✅ kanaGivenName, kanaFamilyName (Users)
- ✅ homeClass field (Users)
- ✅ schoolCode, establishmentType (Orgs)
- ✅ Demographic entity support

### Delta/Incremental API
- ✅ `filter=dateLastModified>=timestamp` query parameter
- ✅ Fetch only changed records since last sync
- ✅ Supports soft deletes (status='tobedeleted')

### Security & Audit
- ✅ API Key authentication on all endpoints
- ✅ Audit logging for all requests/responses
- ✅ Sensitive data sanitization in logs

---

## Usage Examples

### Get All Users (with pagination)
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:4000/ims/oneroster/v1p2/users?limit=100&offset=0"
```

### Get Active Students Only
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:4000/ims/oneroster/v1p2/users?role=student&status=active"
```

### Delta Sync (changed records since timestamp)
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:4000/ims/oneroster/v1p2/users?filter=dateLastModified>=2025-01-01T00:00:00Z"
```

### Get Single User by sourcedId
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:4000/ims/oneroster/v1p2/users/user-abc123"
```

---

## Testing

### Run the API Server
```bash
cd apps/api
npm run start:dev
```

### Access Swagger Documentation
```
http://localhost:4000/api
```

### Test Endpoints
```bash
# Install dependencies (if not done)
cd apps/api
npm install

# Run server
npm run start:dev

# Test endpoint (in another terminal)
curl -H "X-API-Key: test-api-key-12345" \
  http://localhost:4000/ims/oneroster/v1p2/users
```

---

## Next Steps

### Sprint 5: API Testing & Validation (Recommended)
- [ ] Create unit tests for all services (80% coverage)
- [ ] Create E2E tests for all endpoints
- [ ] Implement comprehensive input validation
- [ ] Full OneRoster filter syntax parser
- [ ] Implement field selection (fields parameter)

### Sprint 6: CRUD Completion
- [ ] Implement POST (create) operations
- [ ] Implement PUT (update) operations
- [ ] Implement DELETE operations (soft delete)
- [ ] Add batch operations
- [ ] Implement OneRoster error response format

### Sprint 7: CSV & Background Jobs
- [ ] CSV import module (streaming parser)
- [ ] CSV export module (OneRoster format)
- [ ] BullMQ job queue integration
- [ ] Background job status tracking

---

## Known Limitations

**Current Implementation**:
1. **API Key Validation**: Currently accepts any non-empty API key (TODO: database lookup)
2. **IP Whitelist**: IP extraction implemented but validation not enforced
3. **Audit Log Storage**: Logs to console only (TODO: database storage)
4. **Filter Parsing**: Simple regex-based (TODO: full OneRoster filter syntax)
5. **Field Selection**: `fields` parameter not yet implemented
6. **Read-Only**: Only GET operations (POST/PUT/DELETE in Sprint 6)

---

## Documentation

- **Detailed Summary**: [sprint-3-4-entity-modules-summary.md](./sprint-3-4-entity-modules-summary.md)
- **Japanese Version**: [sprint-3-4-entity-modules-summary.ja.md](./sprint-3-4-entity-modules-summary.ja.md)
- **OpenAPI Spec**: `docs/design/api/openapi-rosterhub-v1.2.2.yaml`
- **Database Design**: `docs/design/database/database-design-rosterhub-20251114.md`

---

## Related Work

**Previous Sprints**:
- Sprint 0: Project Setup ✅ COMPLETED
- Sprint 1-2: Database Layer (Repositories) ✅ COMPLETED

**Upcoming Sprints**:
- Sprint 5: API Testing & Validation
- Sprint 6: CRUD Completion
- Sprint 7: CSV & Background Jobs

---

## Files Created (37 total)

### Common Infrastructure (2)
- `apps/api/src/common/guards/api-key.guard.ts`
- `apps/api/src/common/interceptors/audit.interceptor.ts`

### Users Module (5)
- `apps/api/src/oneroster/entities/users/users.controller.ts`
- `apps/api/src/oneroster/entities/users/users.service.ts`
- `apps/api/src/oneroster/entities/users/users.module.ts`
- `apps/api/src/oneroster/entities/users/dto/user-response.dto.ts`
- `apps/api/src/oneroster/entities/users/dto/query-users.dto.ts`

### Orgs Module (5)
- `apps/api/src/oneroster/entities/orgs/orgs.controller.ts`
- `apps/api/src/oneroster/entities/orgs/orgs.service.ts`
- `apps/api/src/oneroster/entities/orgs/orgs.module.ts`
- `apps/api/src/oneroster/entities/orgs/dto/org-response.dto.ts`
- `apps/api/src/oneroster/entities/orgs/dto/query-orgs.dto.ts`

### Classes Module (5)
- `apps/api/src/oneroster/entities/classes/classes.controller.ts`
- `apps/api/src/oneroster/entities/classes/classes.service.ts`
- `apps/api/src/oneroster/entities/classes/classes.module.ts`
- `apps/api/src/oneroster/entities/classes/dto/class-response.dto.ts`
- `apps/api/src/oneroster/entities/classes/dto/query-classes.dto.ts`

### Courses Module (5)
- `apps/api/src/oneroster/entities/courses/courses.controller.ts`
- `apps/api/src/oneroster/entities/courses/courses.service.ts`
- `apps/api/src/oneroster/entities/courses/courses.module.ts`
- `apps/api/src/oneroster/entities/courses/dto/course-response.dto.ts`
- `apps/api/src/oneroster/entities/courses/dto/query-courses.dto.ts`

### Enrollments Module (5)
- `apps/api/src/oneroster/entities/enrollments/enrollments.controller.ts`
- `apps/api/src/oneroster/entities/enrollments/enrollments.service.ts`
- `apps/api/src/oneroster/entities/enrollments/enrollments.module.ts`
- `apps/api/src/oneroster/entities/enrollments/dto/enrollment-response.dto.ts`
- `apps/api/src/oneroster/entities/enrollments/dto/query-enrollments.dto.ts`

### AcademicSessions Module (5)
- `apps/api/src/oneroster/entities/academic-sessions/academic-sessions.controller.ts`
- `apps/api/src/oneroster/entities/academic-sessions/academic-sessions.service.ts`
- `apps/api/src/oneroster/entities/academic-sessions/academic-sessions.module.ts`
- `apps/api/src/oneroster/entities/academic-sessions/dto/academic-session-response.dto.ts`
- `apps/api/src/oneroster/entities/academic-sessions/dto/query-academic-sessions.dto.ts`

### Demographics Module (5)
- `apps/api/src/oneroster/entities/demographics/demographics.controller.ts`
- `apps/api/src/oneroster/entities/demographics/demographics.service.ts`
- `apps/api/src/oneroster/entities/demographics/demographics.module.ts`
- `apps/api/src/oneroster/entities/demographics/dto/demographic-response.dto.ts`
- `apps/api/src/oneroster/entities/demographics/dto/query-demographics.dto.ts`

### Updated Files (1)
- `apps/api/src/app.module.ts` - Imported all entity modules

---

**Sprint 3-4 Status**: ✅ COMPLETED
**Next Sprint**: Sprint 5 - API Testing & Validation
**Last Updated**: 2025-11-15
