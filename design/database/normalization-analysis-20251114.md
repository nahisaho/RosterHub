# Normalization Analysis Report - RosterHub

**Project Name**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**Created Date**: 2025-11-14
**Author**: Database Schema Designer AI
**Database**: PostgreSQL 15+
**Target Tables**: All OneRoster entities and system tables

---

## Executive Summary

This document evaluates the RosterHub database schema against normalization forms (1NF through BCNF) and identifies strategic denormalization opportunities for performance optimization.

### Key Findings

- **1NF Compliance**: ✅ All tables conform (with exception of `userIds[]` array - justified)
- **2NF Compliance**: ✅ All tables conform (no partial dependencies)
- **3NF Compliance**: ✅ All tables conform (no transitive dependencies)
- **BCNF Compliance**: ✅ All tables conform (all determinants are candidate keys)

### Denormalization Recommendations

1. **Computed Fields**: Add cached counts for frequently accessed aggregates
2. **Materialized Views**: Create pre-aggregated views for reporting queries
3. **Redundant Foreign Keys**: Add denormalized school reference in enrollments
4. **JSONB Metadata**: Maintain flexible structure for Japan Profile extensions

---

## 1. First Normal Form (1NF)

### Definition
Each column contains atomic (single) values, and there are no repeating groups.

### Evaluation Result: ✅ Conformant (with exceptions)

### Analysis

#### Conformant Tables
All tables store atomic values in individual columns:

**Example: USER table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  sourcedId VARCHAR(255) UNIQUE NOT NULL,
  givenName VARCHAR(255) NOT NULL,      -- Atomic
  familyName VARCHAR(255) NOT NULL,     -- Atomic
  email VARCHAR(255) NOT NULL,          -- Atomic
  ...
);
```

#### Exceptions (Justified)

**1. userIds[] Array Column**
```sql
-- USER table
userIds TEXT[] -- Array of multiple identifiers
```

**Justification**:
- **OneRoster Specification Requirement**: `userIds` is defined as an array in the standard
- **Use Case**: Multiple identifiers per user (student ID, national ID, local ID)
- **PostgreSQL Native Support**: Arrays are first-class citizens in PostgreSQL
- **Performance**: Avoids separate `user_identifiers` junction table
- **Query Support**: Efficient array operations (`ANY`, `@>`)

**Alternative (Normalized)**:
```sql
CREATE TABLE user_identifiers (
  id UUID PRIMARY KEY,
  userSourcedId VARCHAR(255) REFERENCES users(sourcedId),
  identifierType VARCHAR(50),
  identifierValue VARCHAR(255)
);
```

**Decision**: Keep array format for OneRoster compliance and performance.

**2. ipWhitelist[] Array Column (API_KEY table)**
```sql
ipWhitelist TEXT[] -- Array of allowed IP addresses
```

**Justification**:
- Simple data structure (no need for separate table)
- Low cardinality (typically 1-10 IPs)
- Performance: Fast array membership checks

**3. JSONB metadata Column**
```sql
metadata JSONB -- Japan Profile extensions
```

**Justification**:
- **Flexibility**: Supports evolving Japan Profile specification without schema migrations
- **Performance**: PostgreSQL JSONB is binary format (fast queries)
- **Standard Compliance**: OneRoster allows arbitrary metadata extensions
- **Indexable**: GIN indexes support efficient JSONB queries

---

## 2. Second Normal Form (2NF)

### Definition
Must be in 1NF, and all non-key attributes are fully functionally dependent on the entire primary key (no partial dependencies).

### Evaluation Result: ✅ Conformant

### Analysis

All tables use single-column primary keys (`id` UUID), eliminating the possibility of partial dependencies.

#### Composite Unique Constraints (Not Primary Keys)

**ENROLLMENT table**:
```sql
UNIQUE (userSourcedId, classSourcedId)
```

**Analysis**:
- All non-key columns depend on the full composite key
- `role`, `primary`, `beginDate`, `endDate` require both `userSourcedId` AND `classSourcedId`
- No partial dependency exists (no column depends only on `userSourcedId` or only on `classSourcedId`)

**Verification**:
- ❌ `role` depends only on `userSourcedId`? No (role is per-enrollment, not per-user)
- ❌ `role` depends only on `classSourcedId`? No (different users have different roles in same class)
- ✅ `role` depends on `(userSourcedId, classSourcedId)` Yes (valid)

**Conclusion**: No 2NF violations.

---

## 3. Third Normal Form (3NF)

### Definition
Must be in 2NF, and no transitive dependencies exist (non-key attributes must not depend on other non-key attributes).

### Evaluation Result: ✅ Conformant

### Analysis

#### Verified Tables

**USER table**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  sourcedId VARCHAR(255),
  givenName VARCHAR(255),
  familyName VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50),
  ...
);
```

**Dependency Analysis**:
- `givenName` → `sourcedId` ❌ (Not dependent)
- `familyName` → `givenName` ❌ (Not dependent)
- `email` → `givenName` ❌ (Not dependent)
- `role` → `givenName` ❌ (Not dependent)

All non-key attributes depend directly on `id` (primary key), not on each other.

**ORG table (Hierarchical Structure)**:
```sql
CREATE TABLE orgs (
  id UUID PRIMARY KEY,
  sourcedId VARCHAR(255),
  name VARCHAR(255),
  type VARCHAR(50),
  parentSourcedId VARCHAR(255),  -- Foreign key to self
  ...
);
```

**Potential Transitive Dependency Check**:
- Does `type` depend on `parentSourcedId`? ❌ No
  - Example: School (type=school) can have parent District (type=district)
  - Example: Department (type=department) can have parent School (type=school)
  - `type` is independent of parent's type

**Conclusion**: No transitive dependencies.

---

## 4. Boyce-Codd Normal Form (BCNF)

### Definition
Must be in 3NF, and for every functional dependency X → Y, X must be a superkey (candidate key).

### Evaluation Result: ✅ Conformant

### Analysis

#### All Determinants are Superkeys

**USER table**:
- Candidate keys: `id` (PK), `sourcedId` (UK), `identifier` (UK)
- All functional dependencies:
  - `id` → all columns ✅ (id is superkey)
  - `sourcedId` → all columns ✅ (sourcedId is superkey)
  - `identifier` → all columns ✅ (identifier is superkey)

**ORG table**:
- Candidate keys: `id` (PK), `sourcedId` (UK), `identifier` (UK)
- All functional dependencies have superkeys as determinants ✅

**ENROLLMENT table**:
- Candidate keys: `id` (PK), `(userSourcedId, classSourcedId)` (composite UK)
- All functional dependencies:
  - `id` → all columns ✅ (id is superkey)
  - `(userSourcedId, classSourcedId)` → all columns ✅ (composite key is superkey)

**Conclusion**: No BCNF violations. All determinants are candidate keys.

---

## 5. Denormalization Opportunities

### Strategic Denormalization for Performance

While the schema is fully normalized (BCNF compliant), certain denormalizations can improve query performance for OneRoster API workloads.

---

### 5.1 Computed Count Fields

**Problem**: Frequent COUNT queries for class enrollments and organization members.

**Example Queries**:
```sql
-- Count students in a class (frequent API query)
SELECT COUNT(*) FROM enrollments
WHERE classSourcedId = 'class123'
  AND role = 'primary'
  AND status = 'active';

-- Count users in an organization (frequent dashboard query)
SELECT COUNT(*) FROM user_org_members
WHERE orgSourcedId = 'org456';
```

**Proposed Denormalization**:
```sql
-- Add cached count columns
ALTER TABLE classes ADD COLUMN enrollmentCount INT DEFAULT 0;
ALTER TABLE orgs ADD COLUMN memberCount INT DEFAULT 0;

-- Update via trigger or application logic
CREATE OR REPLACE FUNCTION update_class_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE classes
  SET enrollmentCount = (
    SELECT COUNT(*) FROM enrollments
    WHERE classSourcedId = NEW.classSourcedId
      AND status = 'active'
  )
  WHERE sourcedId = NEW.classSourcedId;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrollment_count
AFTER INSERT OR UPDATE OR DELETE ON enrollments
FOR EACH ROW EXECUTE FUNCTION update_class_enrollment_count();
```

**Trade-offs**:
| Aspect | Benefits | Drawbacks |
|--------|----------|-----------|
| Performance | Instant COUNT queries (no aggregation) | Write overhead (trigger execution) |
| Accuracy | Eventual consistency (trigger-based) | Risk of count drift (must recompute periodically) |
| Complexity | Simple SELECT queries | Complex trigger logic |

**Recommendation**: ✅ **Implement with safeguards**
- Add `enrollmentCount` to CLASS table
- Add `memberCount` to ORG table
- Implement triggers for automatic updates
- Add cron job for nightly count recalculation (detect drift)
- Monitor count accuracy via alerts

---

### 5.2 Materialized Views for Reporting

**Problem**: Complex reporting queries with multiple JOINs (dashboard analytics, compliance reports).

**Example Query**:
```sql
-- Student roster report with organization hierarchy
SELECT
  u.sourcedId,
  u.givenName,
  u.familyName,
  u.role,
  o.name AS schoolName,
  parent_org.name AS districtName,
  c.title AS className,
  e.beginDate,
  e.endDate
FROM users u
JOIN enrollments e ON e.userSourcedId = u.sourcedId
JOIN classes c ON c.sourcedId = e.classSourcedId
JOIN orgs o ON o.sourcedId = c.schoolSourcedId
LEFT JOIN orgs parent_org ON parent_org.sourcedId = o.parentSourcedId
WHERE u.status = 'active'
  AND e.status = 'active'
  AND u.role = 'student';
```

**Proposed Materialized View**:
```sql
CREATE MATERIALIZED VIEW student_roster_report AS
SELECT
  u.sourcedId AS userSourcedId,
  u.givenName,
  u.familyName,
  u.identifier,
  u.email,
  o.sourcedId AS schoolSourcedId,
  o.name AS schoolName,
  o.identifier AS schoolIdentifier,
  parent_org.sourcedId AS districtSourcedId,
  parent_org.name AS districtName,
  c.sourcedId AS classSourcedId,
  c.title AS className,
  c.classCode,
  e.sourcedId AS enrollmentSourcedId,
  e.beginDate,
  e.endDate,
  e.primary AS isPrimaryEnrollment
FROM users u
JOIN enrollments e ON e.userSourcedId = u.sourcedId
JOIN classes c ON c.sourcedId = e.classSourcedId
JOIN orgs o ON o.sourcedId = c.schoolSourcedId
LEFT JOIN orgs parent_org ON parent_org.sourcedId = o.parentSourcedId
WHERE u.status = 'active'
  AND e.status = 'active'
  AND u.role = 'student';

-- Refresh strategy
CREATE UNIQUE INDEX idx_student_roster_enrollment ON student_roster_report(enrollmentSourcedId);
REFRESH MATERIALIZED VIEW CONCURRENTLY student_roster_report;
```

**Refresh Strategy**:
- **Option 1**: Nightly refresh (3:00 AM) - Simple, eventual consistency
- **Option 2**: On-demand refresh (after CSV import) - Triggered by import job completion
- **Option 3**: Incremental refresh (PostgreSQL 13+) - Refresh only changed rows

**Trade-offs**:
| Aspect | Benefits | Drawbacks |
|--------|----------|-----------|
| Performance | Fast complex queries (pre-computed JOINs) | Storage overhead (duplicate data) |
| Freshness | Stale data (refresh interval) | Must manage refresh schedule |
| Complexity | Simple SELECT queries for reports | Complex view definition and refresh logic |

**Recommendation**: ✅ **Implement for reporting dashboards**
- Create materialized views for common report queries
- Refresh nightly (3:00 AM) or after CSV imports
- Monitor view staleness (last refresh timestamp)

---

### 5.3 Redundant Foreign Key (ENROLLMENT table)

**Problem**: Enrollment queries often need school information, requiring JOIN through CLASS.

**Current Schema**:
```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY,
  userSourcedId VARCHAR(255),
  classSourcedId VARCHAR(255),
  schoolSourcedId VARCHAR(255),  -- Already present (denormalized)
  ...
);
```

**Analysis**:
The schema **already includes** `schoolSourcedId` in ENROLLMENT table, which is redundant (can be derived from CLASS).

**Functional Dependency**:
```
classSourcedId → schoolSourcedId (via CLASS table)
```

**Why This Denormalization Exists**:
1. **OneRoster Specification**: ENROLLMENT entity includes `school` reference
2. **Query Performance**: Avoid JOIN to CLASS table for school-level enrollment queries
3. **Common Query Pattern**: "Find all enrollments for a school" (frequent API query)

**Query Comparison**:

**Normalized (No Redundant schoolSourcedId)**:
```sql
-- Requires JOIN to CLASS
SELECT e.*
FROM enrollments e
JOIN classes c ON c.sourcedId = e.classSourcedId
WHERE c.schoolSourcedId = 'school123';
```

**Denormalized (With Redundant schoolSourcedId)**:
```sql
-- Direct query (no JOIN)
SELECT e.*
FROM enrollments e
WHERE e.schoolSourcedId = 'school123';
```

**Trade-offs**:
| Aspect | Benefits | Drawbacks |
|--------|----------|-----------|
| Performance | No JOIN required for school queries | Redundant data storage |
| Consistency | Must ensure schoolSourcedId matches CLASS.schoolSourcedId | Risk of inconsistency |
| Complexity | Simple queries | Must maintain redundancy (trigger or application logic) |

**Consistency Safeguard**:
```sql
-- Database constraint to enforce consistency
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollment_school_consistency
  CHECK (
    schoolSourcedId = (
      SELECT schoolSourcedId FROM classes WHERE sourcedId = classSourcedId
    )
  );

-- Or use trigger for updates
CREATE OR REPLACE FUNCTION validate_enrollment_school()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.schoolSourcedId != (SELECT schoolSourcedId FROM classes WHERE sourcedId = NEW.classSourcedId) THEN
    RAISE EXCEPTION 'Enrollment schoolSourcedId does not match class schoolSourcedId';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_enrollment_school
BEFORE INSERT OR UPDATE ON enrollments
FOR EACH ROW EXECUTE FUNCTION validate_enrollment_school();
```

**Recommendation**: ✅ **Keep denormalized schoolSourcedId with safeguards**
- Maintain redundant `schoolSourcedId` in ENROLLMENT (OneRoster compliance + performance)
- Add trigger to validate consistency
- Add foreign key constraint: `schoolSourcedId REFERENCES orgs(sourcedId)`

---

### 5.4 JSONB Metadata Flexibility

**Current Schema**:
```sql
-- All OneRoster entities
metadata JSONB
```

**Analysis**:
JSONB columns violate strict normalization (contain nested structures), but this is **justified and necessary**.

**Justification**:
1. **OneRoster Specification**: Allows arbitrary metadata extensions
2. **Japan Profile Extensions**: Custom fields in `metadata.jp.*` namespace
3. **Schema Evolution**: New Japan Profile fields without database migrations
4. **Performance**: PostgreSQL JSONB is optimized for queries (GIN indexes)

**Example Japan Profile Fields**:
```json
{
  "jp": {
    "kanaGivenName": "タロウ",
    "kanaFamilyName": "ヤマダ",
    "homeClass": "1-A",
    "attendanceNumber": 12
  }
}
```

**Indexing Strategy**:
```sql
-- Full JSONB column index (GIN)
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

-- Specific path index (for frequent queries)
CREATE INDEX idx_users_metadata_kana_family
  ON users USING GIN ((metadata->'jp'->>'kanaFamilyName') gin_trgm_ops);
```

**Trade-offs**:
| Aspect | Benefits | Drawbacks |
|--------|----------|-----------|
| Flexibility | No schema changes for new Japan Profile fields | Complex queries (JSONB operators) |
| Performance | GIN indexes support fast queries | Slower than regular columns |
| Maintainability | Self-documenting (JSON keys are field names) | No database-level validation |

**Recommendation**: ✅ **Keep JSONB metadata with strategic indexing**
- Maintain JSONB for OneRoster compliance and flexibility
- Add GIN indexes on frequently queried Japan Profile fields
- Validate JSONB structure in application layer (JSON Schema validation)

---

## 6. Summary Table

### Normalization Compliance

| Normal Form | Status | Notes |
|-------------|--------|-------|
| 1NF | ✅ Conformant | Exceptions: `userIds[]`, `ipWhitelist[]`, `metadata` (justified) |
| 2NF | ✅ Conformant | No partial dependencies |
| 3NF | ✅ Conformant | No transitive dependencies |
| BCNF | ✅ Conformant | All determinants are candidate keys |

### Denormalization Recommendations

| Strategy | Table | Status | Priority | Implementation |
|----------|-------|--------|----------|----------------|
| Computed counts | CLASS, ORG | Recommended | High | Triggers + nightly recalculation |
| Materialized views | N/A (reporting) | Recommended | Medium | Nightly refresh or post-import |
| Redundant FK | ENROLLMENT | Existing | N/A | Add consistency trigger |
| JSONB metadata | All entities | Existing | N/A | Add GIN indexes |

---

## 7. Recommendations

### Immediate Actions

1. **Add Consistency Triggers**:
   - ENROLLMENT.schoolSourcedId validation (matches CLASS.schoolSourcedId)
   - Computed count updates (CLASS.enrollmentCount, ORG.memberCount)

2. **Add Indexes**:
   - GIN indexes on JSONB metadata paths (Japan Profile fields)
   - Composite indexes for frequent JOIN patterns

3. **Create Materialized Views**:
   - `student_roster_report` (student enrollments with org hierarchy)
   - `teacher_assignment_report` (teacher class assignments)
   - `enrollment_summary_by_school` (school-level enrollment counts)

### Monitoring and Maintenance

1. **Count Drift Detection**:
   - Daily cron job to recompute counts and detect drift
   - Alert if drift exceeds 1% (indicates trigger failure)

2. **Materialized View Freshness**:
   - Monitor last refresh timestamp
   - Alert if view is stale (>24 hours)

3. **JSONB Query Performance**:
   - Monitor slow query log for JSONB queries
   - Add indexes on frequently accessed paths

---

## 8. Conclusion

The RosterHub database schema is **fully normalized (BCNF compliant)** with justified exceptions for OneRoster specification compliance:
- `userIds[]` array (OneRoster requirement)
- `ipWhitelist[]` array (simple data structure)
- `metadata` JSONB (Japan Profile extensions)

Strategic denormalization recommendations focus on **performance optimization** without sacrificing data integrity:
- Computed count fields (with consistency safeguards)
- Materialized views (with refresh strategies)
- Redundant foreign keys (with validation triggers)

All denormalizations maintain data consistency through triggers, constraints, and periodic validation jobs.

---

## References

- **OneRoster 1.2.2 Specification**: [IMS Global OneRoster](https://www.imsglobal.org/oneroster-v11-final-specification)
- **PostgreSQL JSONB Documentation**: [PostgreSQL JSONB](https://www.postgresql.org/docs/15/datatype-json.html)
- **Database Normalization Theory**: Codd, E.F. "Further Normalization of the Data Base Relational Model"
- **System Requirements**: `docs/requirements/oneroster-system-requirements.md`
- **ER Diagram**: `design/database/er-diagram-rosterhub-20251114.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Status**: Ready for Review
