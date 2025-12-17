-- Performance Optimization Migration
-- Adds composite indexes and optimizations for frequently executed queries

-- ============================================
-- User Indexes - Optimize user queries and joins
-- ============================================

-- Composite index for user search by status + role (common filter)
CREATE INDEX IF NOT EXISTS "users_status_role_idx" ON "users"("status", "role");

-- Composite index for Delta API queries (dateLastModified + status)
CREATE INDEX IF NOT EXISTS "users_dateLastModified_status_idx" ON "users"("dateLastModified" DESC, "status");

-- Full-text search index for user names (givenName, familyName)
CREATE INDEX IF NOT EXISTS "users_fullname_search_idx" ON "users" USING gin(to_tsvector('english', "givenName" || ' ' || "familyName"));

-- ============================================
-- Org Indexes - Optimize org hierarchy queries
-- ============================================

-- Composite index for org hierarchy navigation (parentSourcedId + status + type)
CREATE INDEX IF NOT EXISTS "orgs_parent_status_type_idx" ON "orgs"("parentSourcedId", "status", "type") WHERE "parentSourcedId" IS NOT NULL;

-- Composite index for Delta API queries
CREATE INDEX IF NOT EXISTS "orgs_dateLastModified_status_idx" ON "orgs"("dateLastModified" DESC, "status");

-- ============================================
-- Enrollment Indexes - Optimize enrollment lookups
-- ============================================

-- Composite index for student enrollments (userSourcedId + status + beginDate)
CREATE INDEX IF NOT EXISTS "enrollments_user_status_date_idx" ON "enrollments"("userSourcedId", "status", "beginDate" DESC);

-- Composite index for class roster queries (classSourcedId + status + role)
CREATE INDEX IF NOT EXISTS "enrollments_class_status_role_idx" ON "enrollments"("classSourcedId", "status", "role");

-- Composite index for school enrollments (schoolSourcedId + status)
CREATE INDEX IF NOT EXISTS "enrollments_school_status_idx" ON "enrollments"("schoolSourcedId", "status");

-- Composite index for Delta API queries
CREATE INDEX IF NOT EXISTS "enrollments_dateLastModified_status_idx" ON "enrollments"("dateLastModified" DESC, "status");

-- Covering index for active enrollments with role (avoid table lookups)
CREATE INDEX IF NOT EXISTS "enrollments_active_with_role_idx" ON "enrollments"("userSourcedId", "classSourcedId", "role") WHERE "status" = 'active';

-- ============================================
-- Class Indexes - Optimize class queries
-- ============================================

-- Composite index for school classes (schoolSourcedId + status + classType)
CREATE INDEX IF NOT EXISTS "classes_school_status_type_idx" ON "classes"("schoolSourcedId", "status", "classType");

-- Composite index for course classes (courseSourcedId + status)
CREATE INDEX IF NOT EXISTS "classes_course_status_idx" ON "classes"("courseSourcedId", "status");

-- Composite index for Delta API queries
CREATE INDEX IF NOT EXISTS "classes_dateLastModified_status_idx" ON "classes"("dateLastModified" DESC, "status");

-- ============================================
-- Course Indexes - Optimize course queries
-- ============================================

-- Composite index for school courses (schoolSourcedId + status + schoolYear)
CREATE INDEX IF NOT EXISTS "courses_school_status_year_idx" ON "courses"("schoolSourcedId", "status", "schoolYear");

-- Composite index for Delta API queries
CREATE INDEX IF NOT EXISTS "courses_dateLastModified_status_idx" ON "courses"("dateLastModified" DESC, "status");

-- Index for course code searches
CREATE INDEX IF NOT EXISTS "courses_courseCode_status_idx" ON "courses"("courseCode", "status");

-- ============================================
-- Academic Session Indexes - Optimize session queries
-- ============================================

-- Composite index for session hierarchy (parentSourcedId + type)
CREATE INDEX IF NOT EXISTS "academic_sessions_parent_type_idx" ON "academic_sessions"("parentSourcedId", "type") WHERE "parentSourcedId" IS NOT NULL;

-- Composite index for current sessions (startDate, endDate, status)
CREATE INDEX IF NOT EXISTS "academic_sessions_date_range_status_idx" ON "academic_sessions"("startDate", "endDate", "status");

-- Composite index for Delta API queries
CREATE INDEX IF NOT EXISTS "academic_sessions_dateLastModified_status_idx" ON "academic_sessions"("dateLastModified" DESC, "status");

-- Index for school year queries (schoolYear + type)
CREATE INDEX IF NOT EXISTS "academic_sessions_year_type_idx" ON "academic_sessions"("schoolYear", "type");

-- ============================================
-- Demographic Indexes - Optimize demographic queries
-- ============================================

-- Composite index for Delta API queries
CREATE INDEX IF NOT EXISTS "demographics_dateLastModified_status_idx" ON "demographics"("dateLastModified" DESC, "status");

-- ============================================
-- Audit Log Indexes - Optimize audit queries
-- ============================================

-- Composite index for entity audit trail (entityType + entitySourcedId + timestamp)
CREATE INDEX IF NOT EXISTS "audit_logs_entity_timestamp_idx" ON "audit_logs"("entityType", "entitySourcedId", "timestamp" DESC);

-- Composite index for user audit trail (userId + timestamp)
CREATE INDEX IF NOT EXISTS "audit_logs_user_timestamp_idx" ON "audit_logs"("userId", "timestamp" DESC) WHERE "userId" IS NOT NULL;

-- Composite index for action type queries (action + timestamp)
CREATE INDEX IF NOT EXISTS "audit_logs_action_timestamp_idx" ON "audit_logs"("action", "timestamp" DESC);

-- Index for recent audit logs ordered by timestamp
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_desc_idx" ON "audit_logs"("timestamp" DESC);

-- ============================================
-- CSV Import Job Indexes - Optimize import queries
-- ============================================

-- Composite index for user imports (createdBy + status + createdAt)
CREATE INDEX IF NOT EXISTS "csv_import_jobs_user_status_date_idx" ON "csv_import_jobs"("createdBy", "status", "createdAt" DESC);

-- Partial index for pending/processing jobs (active jobs only)
CREATE INDEX IF NOT EXISTS "csv_import_jobs_active_idx" ON "csv_import_jobs"("status", "createdAt" DESC) WHERE "status" IN ('pending', 'processing');

-- ============================================
-- Webhook Indexes - Optimize webhook queries
-- ============================================

-- Composite index for active webhooks by org (organizationId + isActive)
CREATE INDEX IF NOT EXISTS "webhooks_org_active_idx" ON "webhooks"("organizationId", "isActive") WHERE "isActive" = true;

-- Index for webhook delivery retry queries (status + nextRetryAt)
CREATE INDEX IF NOT EXISTS "webhook_deliveries_retry_idx" ON "webhook_deliveries"("status", "nextRetryAt") WHERE "status" IN ('pending', 'retrying') AND "nextRetryAt" IS NOT NULL;

-- Composite index for webhook delivery history (webhookId + createdAt)
CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhook_date_idx" ON "webhook_deliveries"("webhookId", "createdAt" DESC);

-- ============================================
-- Field Mapping Indexes - Optimize mapping queries
-- ============================================

-- Composite index for default configs (organizationId + entityType + isDefault)
CREATE INDEX IF NOT EXISTS "field_mapping_configs_org_entity_default_idx" ON "field_mapping_configs"("organizationId", "entityType", "isDefault") WHERE "isActive" = true;

-- Composite index for lookup table searches (organizationId + name)
CREATE INDEX IF NOT EXISTS "mapping_lookup_tables_org_name_idx" ON "mapping_lookup_tables"("organizationId", "name") WHERE "isActive" = true;

-- ============================================
-- Junction Table Indexes - Optimize many-to-many queries
-- ============================================

-- Reverse lookup index for UserOrg (org to users)
CREATE INDEX IF NOT EXISTS "user_orgs_org_user_idx" ON "user_orgs"("orgSourcedId", "userSourcedId");

-- Reverse lookup index for UserAgent (agent to users)
CREATE INDEX IF NOT EXISTS "user_agents_agent_user_idx" ON "user_agents"("agentSourcedId", "userSourcedId");

-- Reverse lookup index for ClassAcademicSession (session to classes)
CREATE INDEX IF NOT EXISTS "class_academic_sessions_session_class_idx" ON "class_academic_sessions"("academicSessionSourcedId", "classSourcedId");

-- ============================================
-- Performance Notes
-- ============================================
-- 1. Composite indexes ordered by: equality filters -> range filters -> sort columns
-- 2. Partial indexes (WHERE clause) reduce index size for common filter patterns
-- 3. Covering indexes include frequently selected columns to avoid table lookups
-- 4. DESC indexes for timestamp columns match common sorting patterns
-- 5. Full-text search indexes (GIN) for text search operations
-- 6. All indexes consider PostgreSQL query planner statistics and typical query patterns