-- ============================================
-- PostgreSQL DDL - RosterHub
-- OneRoster Japan Profile 1.2.2 Integration Hub
-- ============================================
-- Database: PostgreSQL 15+
-- Created: 2025-11-14
-- Specification: OneRoster Japan Profile 1.2.2
-- ============================================

-- ============================================
-- Database and Schema Setup
-- ============================================

-- Create database (run as superuser)
-- CREATE DATABASE rosterhub
--   WITH ENCODING = 'UTF8'
--   LC_COLLATE = 'en_US.UTF-8'
--   LC_CTYPE = 'en_US.UTF-8'
--   TEMPLATE = template0;

-- Connect to database
\c rosterhub;

-- Create schema
CREATE SCHEMA IF NOT EXISTS app;
SET search_path TO app, public;

-- ============================================
-- Extensions
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================
-- Enums (OneRoster Specification)
-- ============================================

CREATE TYPE status_type AS ENUM ('active', 'tobedeleted', 'inactive');
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'staff', 'administrator');
CREATE TYPE org_type AS ENUM ('department', 'school', 'district', 'local', 'state', 'national');
CREATE TYPE class_type AS ENUM ('homeroom', 'scheduled');
CREATE TYPE enrollment_role AS ENUM ('primary', 'secondary', 'aide');
CREATE TYPE academic_session_type AS ENUM ('gradingPeriod', 'semester', 'schoolYear', 'term');
CREATE TYPE sex_type AS ENUM ('male', 'female', 'other', 'unknown');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ');
CREATE TYPE csv_import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================
-- OneRoster Core Tables
-- ============================================

-- Users table
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status             status_type DEFAULT 'active' NOT NULL,

  -- OneRoster required fields
  enabled_user       BOOLEAN NOT NULL,
  username           VARCHAR(255) NOT NULL,
  user_ids           VARCHAR(255)[] NOT NULL,
  given_name         VARCHAR(255) NOT NULL,
  family_name        VARCHAR(255) NOT NULL,
  middle_name        VARCHAR(255),
  role               user_role NOT NULL,
  identifier         VARCHAR(255) UNIQUE NOT NULL,
  email              VARCHAR(255) NOT NULL,
  sms                VARCHAR(50),
  phone              VARCHAR(50),

  -- Japan Profile extensions (metadata.jp.*)
  metadata           JSONB,

  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE users IS 'User entity (students, teachers, staff, administrators) - OneRoster Section 4.3';
COMMENT ON COLUMN users.sourced_id IS 'OneRoster unique identifier';
COMMENT ON COLUMN users.date_last_modified IS 'Last update timestamp (indexed for Delta API)';
COMMENT ON COLUMN users.user_ids IS 'Multiple identifiers (student ID, national ID, etc.)';
COMMENT ON COLUMN users.metadata IS 'Japan Profile extensions (metadata.jp.kanaGivenName, metadata.jp.kanaFamilyName, metadata.jp.homeClass)';

-- Organizations table
CREATE TABLE orgs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status             status_type DEFAULT 'active' NOT NULL,

  -- OneRoster required fields
  name               VARCHAR(255) NOT NULL,
  type               org_type NOT NULL,
  identifier         VARCHAR(255) UNIQUE NOT NULL,

  -- Hierarchical structure
  parent_sourced_id  VARCHAR(255),

  -- Japan Profile extensions
  metadata           JSONB,

  CONSTRAINT fk_orgs_parent FOREIGN KEY (parent_sourced_id) REFERENCES orgs(sourced_id) ON DELETE RESTRICT
);

COMMENT ON TABLE orgs IS 'Organization entity (schools, districts, departments) - OneRoster Section 4.4';
COMMENT ON COLUMN orgs.parent_sourced_id IS 'Parent organization (hierarchy support)';
COMMENT ON COLUMN orgs.metadata IS 'Japan Profile extensions (metadata.jp.localCode, metadata.jp.prefectureCode)';

-- User-Organization membership (many-to-many)
CREATE TABLE user_orgs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_sourced_id    VARCHAR(255) NOT NULL,
  org_sourced_id     VARCHAR(255) NOT NULL,

  CONSTRAINT fk_user_orgs_user FOREIGN KEY (user_sourced_id) REFERENCES users(sourced_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_orgs_org FOREIGN KEY (org_sourced_id) REFERENCES orgs(sourced_id) ON DELETE CASCADE,
  CONSTRAINT unique_user_org UNIQUE (user_sourced_id, org_sourced_id)
);

COMMENT ON TABLE user_orgs IS 'User-Organization membership junction table';

-- User-Agent relationships (many-to-many, e.g., parent-child)
CREATE TABLE user_agents (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_sourced_id    VARCHAR(255) NOT NULL,
  agent_sourced_id   VARCHAR(255) NOT NULL,

  CONSTRAINT fk_user_agents_user FOREIGN KEY (user_sourced_id) REFERENCES users(sourced_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_agents_agent FOREIGN KEY (agent_sourced_id) REFERENCES users(sourced_id) ON DELETE CASCADE,
  CONSTRAINT unique_user_agent UNIQUE (user_sourced_id, agent_sourced_id)
);

COMMENT ON TABLE user_agents IS 'User-Agent relationships (e.g., parent-child relationships)';

-- Courses table
CREATE TABLE courses (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status             status_type DEFAULT 'active' NOT NULL,

  -- OneRoster required fields
  title              VARCHAR(255) NOT NULL,
  course_code        VARCHAR(255) NOT NULL,
  school_year        VARCHAR(50),

  -- Relationships
  school_sourced_id  VARCHAR(255) NOT NULL,

  -- Japan Profile extensions
  metadata           JSONB,

  CONSTRAINT fk_courses_school FOREIGN KEY (school_sourced_id) REFERENCES orgs(sourced_id) ON DELETE RESTRICT
);

COMMENT ON TABLE courses IS 'Course entity (course catalog definitions) - OneRoster Section 4.6';
COMMENT ON COLUMN courses.metadata IS 'Japan Profile extensions (metadata.jp.subject, metadata.jp.credits)';

-- Classes table
CREATE TABLE classes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status             status_type DEFAULT 'active' NOT NULL,

  -- OneRoster required fields
  title              VARCHAR(255) NOT NULL,
  class_code         VARCHAR(255) NOT NULL,
  class_type         class_type NOT NULL,
  location           VARCHAR(255),

  -- Relationships
  course_sourced_id  VARCHAR(255) NOT NULL,
  school_sourced_id  VARCHAR(255) NOT NULL,

  -- Japan Profile extensions
  metadata           JSONB,

  CONSTRAINT fk_classes_course FOREIGN KEY (course_sourced_id) REFERENCES courses(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT fk_classes_school FOREIGN KEY (school_sourced_id) REFERENCES orgs(sourced_id) ON DELETE RESTRICT
);

COMMENT ON TABLE classes IS 'Class entity (course instances with specific terms/periods) - OneRoster Section 4.5';
COMMENT ON COLUMN classes.metadata IS 'Japan Profile extensions (metadata.jp.classGrade, metadata.jp.curriculum)';

-- Enrollments table
CREATE TABLE enrollments (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status             status_type DEFAULT 'active' NOT NULL,

  -- OneRoster required fields
  role               enrollment_role NOT NULL,
  "primary"          BOOLEAN NOT NULL,
  begin_date         TIMESTAMPTZ,
  end_date           TIMESTAMPTZ,

  -- Relationships
  user_sourced_id    VARCHAR(255) NOT NULL,
  class_sourced_id   VARCHAR(255) NOT NULL,

  -- Denormalized school reference (performance optimization)
  school_sourced_id  VARCHAR(255) NOT NULL,

  -- Japan Profile extensions
  metadata           JSONB,

  CONSTRAINT fk_enrollments_user FOREIGN KEY (user_sourced_id) REFERENCES users(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_class FOREIGN KEY (class_sourced_id) REFERENCES classes(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_school FOREIGN KEY (school_sourced_id) REFERENCES orgs(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT unique_user_class UNIQUE (user_sourced_id, class_sourced_id),
  CONSTRAINT enrollments_dates_check CHECK (end_date IS NULL OR end_date >= begin_date)
);

COMMENT ON TABLE enrollments IS 'Enrollment entity (user-class relationships) - OneRoster Section 4.7';
COMMENT ON COLUMN enrollments.school_sourced_id IS 'Denormalized school reference for performance (avoid JOIN to classes)';
COMMENT ON COLUMN enrollments.metadata IS 'Japan Profile extensions (metadata.jp.attendanceNumber, metadata.jp.role)';

-- Academic Sessions table
CREATE TABLE academic_sessions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status             status_type DEFAULT 'active' NOT NULL,

  -- OneRoster required fields
  title              VARCHAR(255) NOT NULL,
  type               academic_session_type NOT NULL,
  start_date         TIMESTAMPTZ NOT NULL,
  end_date           TIMESTAMPTZ NOT NULL,
  school_year        VARCHAR(50) NOT NULL,

  -- Hierarchical structure
  parent_sourced_id  VARCHAR(255),

  -- Japan Profile extensions
  metadata           JSONB,

  CONSTRAINT fk_academic_sessions_parent FOREIGN KEY (parent_sourced_id) REFERENCES academic_sessions(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT academic_sessions_dates_check CHECK (end_date > start_date)
);

COMMENT ON TABLE academic_sessions IS 'Academic Session entity (terms, semesters, school years) - OneRoster Section 4.8';
COMMENT ON COLUMN academic_sessions.parent_sourced_id IS 'Parent session (hierarchy support: schoolYear → semester → gradingPeriod)';
COMMENT ON COLUMN academic_sessions.metadata IS 'Japan Profile extensions (metadata.jp.termName)';

-- Class-AcademicSession relationship (many-to-many)
CREATE TABLE class_academic_sessions (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_sourced_id             VARCHAR(255) NOT NULL,
  academic_session_sourced_id  VARCHAR(255) NOT NULL,

  CONSTRAINT fk_class_academic_sessions_class FOREIGN KEY (class_sourced_id) REFERENCES classes(sourced_id) ON DELETE CASCADE,
  CONSTRAINT fk_class_academic_sessions_session FOREIGN KEY (academic_session_sourced_id) REFERENCES academic_sessions(sourced_id) ON DELETE CASCADE,
  CONSTRAINT unique_class_session UNIQUE (class_sourced_id, academic_session_sourced_id)
);

COMMENT ON TABLE class_academic_sessions IS 'Class-AcademicSession junction table';

-- Demographics table
CREATE TABLE demographics (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status             status_type DEFAULT 'active' NOT NULL,

  -- OneRoster optional fields
  birth_date         TIMESTAMPTZ,
  sex                sex_type,

  -- Relationships (1:1 with User)
  user_sourced_id    VARCHAR(255) UNIQUE NOT NULL,

  -- Japan Profile extensions
  metadata           JSONB,

  CONSTRAINT fk_demographics_user FOREIGN KEY (user_sourced_id) REFERENCES users(sourced_id) ON DELETE CASCADE
);

COMMENT ON TABLE demographics IS 'Demographic entity (user demographic information) - OneRoster Section 4.9 (Japan Profile extension)';
COMMENT ON COLUMN demographics.metadata IS 'Japan Profile extensions (metadata.jp.nationality, metadata.jp.residentStatus)';

-- ============================================
-- System Tables (Non-OneRoster)
-- ============================================

-- API Keys table
CREATE TABLE api_keys (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key                VARCHAR(255) UNIQUE NOT NULL,
  hashed_key         VARCHAR(255) NOT NULL,
  name               VARCHAR(255) NOT NULL,
  organization_id    VARCHAR(255) NOT NULL,
  ip_whitelist       VARCHAR(50)[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],
  rate_limit         INT NOT NULL DEFAULT 1000,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_used_at       TIMESTAMPTZ
);

COMMENT ON TABLE api_keys IS 'API Key entity (API authentication and authorization)';
COMMENT ON COLUMN api_keys.hashed_key IS 'bcrypt hashed API key (for secure storage)';
COMMENT ON COLUMN api_keys.ip_whitelist IS 'Allowed IP addresses (additional security layer)';
COMMENT ON COLUMN api_keys.rate_limit IS 'Requests per hour limit (default: 1000)';

-- Audit Logs table
CREATE TABLE audit_logs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  action             audit_action NOT NULL,
  entity_type        VARCHAR(50) NOT NULL,
  entity_sourced_id  VARCHAR(255) NOT NULL,
  user_id            VARCHAR(255),
  api_key_id         UUID,
  ip_address         VARCHAR(50) NOT NULL,
  request_method     VARCHAR(10) NOT NULL,
  request_path       VARCHAR(500) NOT NULL,
  request_body       JSONB,
  response_status    INT NOT NULL,
  changes            JSONB,

  CONSTRAINT fk_audit_logs_api_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

COMMENT ON TABLE audit_logs IS 'Audit Log entity (data access and modification tracking)';
COMMENT ON COLUMN audit_logs.changes IS 'Before/after values for UPDATE operations (JSONB)';

-- CSV Import Jobs table
CREATE TABLE csv_import_jobs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status             csv_import_status DEFAULT 'pending' NOT NULL,
  file_name          VARCHAR(255) NOT NULL,
  file_size          INT NOT NULL,
  total_records      INT,
  processed_records  INT DEFAULT 0 NOT NULL,
  success_records    INT DEFAULT 0 NOT NULL,
  failed_records     INT DEFAULT 0 NOT NULL,
  errors             JSONB,
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by         VARCHAR(255) NOT NULL
);

COMMENT ON TABLE csv_import_jobs IS 'CSV Import Job entity (background job tracking)';
COMMENT ON COLUMN csv_import_jobs.errors IS 'Error details for debugging (JSONB)';

-- ============================================
-- Indexes
-- ============================================

-- Users indexes
CREATE INDEX idx_users_date_last_modified ON users(date_last_modified);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_identifier ON users(identifier);
CREATE INDEX idx_users_metadata_kana_family ON users USING GIN ((metadata->'jp'->>'kanaFamilyName') gin_trgm_ops);

-- User-Org indexes
CREATE INDEX idx_user_orgs_user ON user_orgs(user_sourced_id);
CREATE INDEX idx_user_orgs_org ON user_orgs(org_sourced_id);

-- User-Agent indexes
CREATE INDEX idx_user_agents_user ON user_agents(user_sourced_id);
CREATE INDEX idx_user_agents_agent ON user_agents(agent_sourced_id);

-- Orgs indexes
CREATE INDEX idx_orgs_date_last_modified ON orgs(date_last_modified);
CREATE INDEX idx_orgs_status ON orgs(status);
CREATE INDEX idx_orgs_type ON orgs(type);
CREATE INDEX idx_orgs_parent ON orgs(parent_sourced_id);
CREATE INDEX idx_orgs_metadata_prefecture ON orgs USING GIN ((metadata->'jp'->>'prefectureCode'));

-- Courses indexes
CREATE INDEX idx_courses_date_last_modified ON courses(date_last_modified);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_school ON courses(school_sourced_id);
CREATE INDEX idx_courses_code ON courses(course_code);

-- Classes indexes
CREATE INDEX idx_classes_date_last_modified ON classes(date_last_modified);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_course ON classes(course_sourced_id);
CREATE INDEX idx_classes_school ON classes(school_sourced_id);
CREATE INDEX idx_classes_type ON classes(class_type);
CREATE INDEX idx_classes_school_course ON classes(school_sourced_id, course_sourced_id);

-- Enrollments indexes (most critical for performance - largest table)
CREATE INDEX idx_enrollments_date_last_modified ON enrollments(date_last_modified);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_user ON enrollments(user_sourced_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_sourced_id);
CREATE INDEX idx_enrollments_school ON enrollments(school_sourced_id);
CREATE INDEX idx_enrollments_role ON enrollments(role);

-- Academic Sessions indexes
CREATE INDEX idx_academic_sessions_date_last_modified ON academic_sessions(date_last_modified);
CREATE INDEX idx_academic_sessions_status ON academic_sessions(status);
CREATE INDEX idx_academic_sessions_type ON academic_sessions(type);
CREATE INDEX idx_academic_sessions_parent ON academic_sessions(parent_sourced_id);
CREATE INDEX idx_academic_sessions_dates ON academic_sessions(start_date, end_date);
CREATE INDEX idx_academic_sessions_school_year ON academic_sessions(school_year);

-- Class-AcademicSession indexes
CREATE INDEX idx_class_academic_sessions_class ON class_academic_sessions(class_sourced_id);
CREATE INDEX idx_class_academic_sessions_session ON class_academic_sessions(academic_session_sourced_id);

-- Demographics indexes
CREATE INDEX idx_demographics_date_last_modified ON demographics(date_last_modified);
CREATE INDEX idx_demographics_status ON demographics(status);

-- API Keys indexes
CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_organization ON api_keys(organization_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Audit Logs indexes
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_sourced_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_api_key ON audit_logs(api_key_id);

-- CSV Import Jobs indexes
CREATE INDEX idx_csv_import_jobs_status ON csv_import_jobs(status);
CREATE INDEX idx_csv_import_jobs_created_at ON csv_import_jobs(created_at);
CREATE INDEX idx_csv_import_jobs_created_by ON csv_import_jobs(created_by);

-- ============================================
-- Triggers and Functions
-- ============================================

-- Update date_last_modified automatically
CREATE OR REPLACE FUNCTION update_date_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_last_modified = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all OneRoster entities
CREATE TRIGGER trigger_update_users_date_last_modified
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_orgs_date_last_modified
  BEFORE UPDATE ON orgs
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_courses_date_last_modified
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_classes_date_last_modified
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_enrollments_date_last_modified
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_academic_sessions_date_last_modified
  BEFORE UPDATE ON academic_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_demographics_date_last_modified
  BEFORE UPDATE ON demographics
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

-- Validate enrollment school consistency (denormalized FK)
CREATE OR REPLACE FUNCTION validate_enrollment_school()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_sourced_id != (SELECT school_sourced_id FROM classes WHERE sourced_id = NEW.class_sourced_id) THEN
    RAISE EXCEPTION 'Enrollment school_sourced_id does not match class school_sourced_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_enrollment_school
  BEFORE INSERT OR UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION validate_enrollment_school();

-- ============================================
-- Views
-- ============================================

-- Active users view (non-deleted)
CREATE VIEW active_users AS
SELECT
  id,
  sourced_id,
  date_created,
  date_last_modified,
  enabled_user,
  username,
  given_name,
  family_name,
  role,
  identifier,
  email,
  metadata
FROM users
WHERE status = 'active';

COMMENT ON VIEW active_users IS 'Active users (status = active)';

-- Materialized view: Student roster report with organization hierarchy
CREATE MATERIALIZED VIEW student_roster_report AS
SELECT
  u.sourced_id AS user_sourced_id,
  u.given_name,
  u.family_name,
  u.identifier,
  u.email,
  o.sourced_id AS school_sourced_id,
  o.name AS school_name,
  o.identifier AS school_identifier,
  parent_org.sourced_id AS district_sourced_id,
  parent_org.name AS district_name,
  c.sourced_id AS class_sourced_id,
  c.title AS class_name,
  c.class_code,
  e.sourced_id AS enrollment_sourced_id,
  e.begin_date,
  e.end_date,
  e."primary" AS is_primary_enrollment
FROM users u
JOIN enrollments e ON e.user_sourced_id = u.sourced_id
JOIN classes c ON c.sourced_id = e.class_sourced_id
JOIN orgs o ON o.sourced_id = c.school_sourced_id
LEFT JOIN orgs parent_org ON parent_org.sourced_id = o.parent_sourced_id
WHERE u.status = 'active'
  AND e.status = 'active'
  AND u.role = 'student';

CREATE UNIQUE INDEX idx_student_roster_enrollment ON student_roster_report(enrollment_sourced_id);

COMMENT ON MATERIALIZED VIEW student_roster_report IS 'Pre-computed student roster with organization hierarchy (refresh nightly)';

-- ============================================
-- Grants (adjust as needed for production)
-- ============================================

-- Example: Create application user and grant permissions
-- CREATE USER app_user WITH PASSWORD 'secure_password_change_in_production';
-- GRANT USAGE ON SCHEMA app TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;

-- ============================================
-- Sample Data (for development/testing)
-- ============================================

-- Uncomment to insert sample data

-- INSERT INTO orgs (sourced_id, name, type, identifier, status) VALUES
-- ('org-district-001', 'Tokyo Metropolitan Board of Education', 'district', 'DISTRICT-TOKYO', 'active'),
-- ('org-school-001', 'Shinjuku High School', 'school', 'SCHOOL-SHINJUKU-001', 'active');

-- UPDATE orgs SET parent_sourced_id = 'org-district-001' WHERE sourced_id = 'org-school-001';

-- INSERT INTO users (sourced_id, enabled_user, username, user_ids, given_name, family_name, role, identifier, email, status, metadata) VALUES
-- ('user-student-001', TRUE, 'tanaka.taro', ARRAY['STU001', 'NAT12345'], 'Taro', 'Tanaka', 'student', 'STUDENT-001', 'tanaka.taro@example.com', 'active', '{"jp": {"kanaGivenName": "タロウ", "kanaFamilyName": "タナカ", "homeClass": "1-A"}}'),
-- ('user-teacher-001', TRUE, 'suzuki.hanako', ARRAY['TCH001'], 'Hanako', 'Suzuki', 'teacher', 'TEACHER-001', 'suzuki.hanako@example.com', 'active', '{"jp": {"kanaGivenName": "ハナコ", "kanaFamilyName": "スズキ"}}');

-- ============================================
-- Maintenance Queries
-- ============================================

-- Refresh materialized view (run nightly at 3:00 AM)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY student_roster_report;

-- Recompute enrollment counts (detect drift)
-- UPDATE classes SET enrollment_count = (
--   SELECT COUNT(*) FROM enrollments WHERE class_sourced_id = classes.sourced_id AND status = 'active'
-- );

-- Vacuum and analyze (weekly maintenance)
-- VACUUM ANALYZE users;
-- VACUUM ANALYZE enrollments;
-- VACUUM ANALYZE classes;
-- VACUUM ANALYZE audit_logs;

-- ============================================
-- End of DDL
-- ============================================
