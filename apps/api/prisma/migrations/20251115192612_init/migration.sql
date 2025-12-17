-- CreateEnum
CREATE TYPE "StatusType" AS ENUM ('active', 'tobedeleted', 'inactive');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'teacher', 'staff', 'administrator');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('department', 'school', 'district', 'local', 'state', 'national');

-- CreateEnum
CREATE TYPE "ClassType" AS ENUM ('homeroom', 'scheduled');

-- CreateEnum
CREATE TYPE "EnrollmentRole" AS ENUM ('primary', 'secondary', 'aide');

-- CreateEnum
CREATE TYPE "AcademicSessionType" AS ENUM ('gradingPeriod', 'semester', 'schoolYear', 'term');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ');

-- CreateEnum
CREATE TYPE "CsvImportStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "sourcedId" VARCHAR(255) NOT NULL,
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "enabledUser" BOOLEAN NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "userIds" VARCHAR(255)[],
    "givenName" VARCHAR(255) NOT NULL,
    "familyName" VARCHAR(255) NOT NULL,
    "middleName" VARCHAR(255),
    "role" "UserRole" NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "sms" VARCHAR(50),
    "phone" VARCHAR(50),
    "metadata" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_agents" (
    "id" UUID NOT NULL,
    "userSourcedId" VARCHAR(255) NOT NULL,
    "agentSourcedId" VARCHAR(255) NOT NULL,

    CONSTRAINT "user_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orgs" (
    "id" UUID NOT NULL,
    "sourcedId" VARCHAR(255) NOT NULL,
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "name" VARCHAR(255) NOT NULL,
    "type" "OrgType" NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "parentSourcedId" VARCHAR(255),
    "metadata" JSONB,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_orgs" (
    "id" UUID NOT NULL,
    "userSourcedId" VARCHAR(255) NOT NULL,
    "orgSourcedId" VARCHAR(255) NOT NULL,

    CONSTRAINT "user_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "sourcedId" VARCHAR(255) NOT NULL,
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "title" VARCHAR(255) NOT NULL,
    "courseCode" VARCHAR(255) NOT NULL,
    "schoolYear" VARCHAR(50),
    "schoolSourcedId" VARCHAR(255) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "sourcedId" VARCHAR(255) NOT NULL,
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "title" VARCHAR(255) NOT NULL,
    "classCode" VARCHAR(255) NOT NULL,
    "classType" "ClassType" NOT NULL,
    "location" VARCHAR(255),
    "courseSourcedId" VARCHAR(255) NOT NULL,
    "schoolSourcedId" VARCHAR(255) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "sourcedId" VARCHAR(255) NOT NULL,
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "role" "EnrollmentRole" NOT NULL,
    "primary" BOOLEAN NOT NULL,
    "beginDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "userSourcedId" VARCHAR(255) NOT NULL,
    "classSourcedId" VARCHAR(255) NOT NULL,
    "schoolSourcedId" VARCHAR(255) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_sessions" (
    "id" UUID NOT NULL,
    "sourcedId" VARCHAR(255) NOT NULL,
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "title" VARCHAR(255) NOT NULL,
    "type" "AcademicSessionType" NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "schoolYear" VARCHAR(50) NOT NULL,
    "parentSourcedId" VARCHAR(255),
    "metadata" JSONB,

    CONSTRAINT "academic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_academic_sessions" (
    "id" UUID NOT NULL,
    "classSourcedId" VARCHAR(255) NOT NULL,
    "academicSessionSourcedId" VARCHAR(255) NOT NULL,

    CONSTRAINT "class_academic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demographics" (
    "id" UUID NOT NULL,
    "sourcedId" VARCHAR(255) NOT NULL,
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "birthDate" TIMESTAMPTZ,
    "sex" "Sex",
    "userSourcedId" VARCHAR(255) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "demographics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "hashedKey" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "organizationId" VARCHAR(255) NOT NULL,
    "ipWhitelist" VARCHAR(50)[],
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entitySourcedId" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255),
    "apiKeyId" UUID,
    "ipAddress" VARCHAR(50) NOT NULL,
    "requestMethod" VARCHAR(10) NOT NULL,
    "requestPath" VARCHAR(500) NOT NULL,
    "requestBody" JSONB,
    "responseStatus" INTEGER NOT NULL,
    "changes" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csv_import_jobs" (
    "id" UUID NOT NULL,
    "status" "CsvImportStatus" NOT NULL DEFAULT 'pending',
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "totalRecords" INTEGER,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "successRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(255) NOT NULL,

    CONSTRAINT "csv_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_sourcedId_key" ON "users"("sourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "users_identifier_key" ON "users"("identifier");

-- CreateIndex
CREATE INDEX "users_dateLastModified_idx" ON "users"("dateLastModified");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_identifier_idx" ON "users"("identifier");

-- CreateIndex
CREATE INDEX "user_agents_userSourcedId_idx" ON "user_agents"("userSourcedId");

-- CreateIndex
CREATE INDEX "user_agents_agentSourcedId_idx" ON "user_agents"("agentSourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_agents_userSourcedId_agentSourcedId_key" ON "user_agents"("userSourcedId", "agentSourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "orgs_sourcedId_key" ON "orgs"("sourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "orgs_identifier_key" ON "orgs"("identifier");

-- CreateIndex
CREATE INDEX "orgs_dateLastModified_idx" ON "orgs"("dateLastModified");

-- CreateIndex
CREATE INDEX "orgs_status_idx" ON "orgs"("status");

-- CreateIndex
CREATE INDEX "orgs_type_idx" ON "orgs"("type");

-- CreateIndex
CREATE INDEX "orgs_parentSourcedId_idx" ON "orgs"("parentSourcedId");

-- CreateIndex
CREATE INDEX "user_orgs_userSourcedId_idx" ON "user_orgs"("userSourcedId");

-- CreateIndex
CREATE INDEX "user_orgs_orgSourcedId_idx" ON "user_orgs"("orgSourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_orgs_userSourcedId_orgSourcedId_key" ON "user_orgs"("userSourcedId", "orgSourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_sourcedId_key" ON "courses"("sourcedId");

-- CreateIndex
CREATE INDEX "courses_dateLastModified_idx" ON "courses"("dateLastModified");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_schoolSourcedId_idx" ON "courses"("schoolSourcedId");

-- CreateIndex
CREATE INDEX "courses_courseCode_idx" ON "courses"("courseCode");

-- CreateIndex
CREATE UNIQUE INDEX "classes_sourcedId_key" ON "classes"("sourcedId");

-- CreateIndex
CREATE INDEX "classes_dateLastModified_idx" ON "classes"("dateLastModified");

-- CreateIndex
CREATE INDEX "classes_status_idx" ON "classes"("status");

-- CreateIndex
CREATE INDEX "classes_courseSourcedId_idx" ON "classes"("courseSourcedId");

-- CreateIndex
CREATE INDEX "classes_schoolSourcedId_idx" ON "classes"("schoolSourcedId");

-- CreateIndex
CREATE INDEX "classes_classType_idx" ON "classes"("classType");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_sourcedId_key" ON "enrollments"("sourcedId");

-- CreateIndex
CREATE INDEX "enrollments_dateLastModified_idx" ON "enrollments"("dateLastModified");

-- CreateIndex
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");

-- CreateIndex
CREATE INDEX "enrollments_userSourcedId_idx" ON "enrollments"("userSourcedId");

-- CreateIndex
CREATE INDEX "enrollments_classSourcedId_idx" ON "enrollments"("classSourcedId");

-- CreateIndex
CREATE INDEX "enrollments_schoolSourcedId_idx" ON "enrollments"("schoolSourcedId");

-- CreateIndex
CREATE INDEX "enrollments_role_idx" ON "enrollments"("role");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_userSourcedId_classSourcedId_key" ON "enrollments"("userSourcedId", "classSourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "academic_sessions_sourcedId_key" ON "academic_sessions"("sourcedId");

-- CreateIndex
CREATE INDEX "academic_sessions_dateLastModified_idx" ON "academic_sessions"("dateLastModified");

-- CreateIndex
CREATE INDEX "academic_sessions_status_idx" ON "academic_sessions"("status");

-- CreateIndex
CREATE INDEX "academic_sessions_type_idx" ON "academic_sessions"("type");

-- CreateIndex
CREATE INDEX "academic_sessions_parentSourcedId_idx" ON "academic_sessions"("parentSourcedId");

-- CreateIndex
CREATE INDEX "academic_sessions_startDate_endDate_idx" ON "academic_sessions"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "academic_sessions_schoolYear_idx" ON "academic_sessions"("schoolYear");

-- CreateIndex
CREATE INDEX "class_academic_sessions_classSourcedId_idx" ON "class_academic_sessions"("classSourcedId");

-- CreateIndex
CREATE INDEX "class_academic_sessions_academicSessionSourcedId_idx" ON "class_academic_sessions"("academicSessionSourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "class_academic_sessions_classSourcedId_academicSessionSourc_key" ON "class_academic_sessions"("classSourcedId", "academicSessionSourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "demographics_sourcedId_key" ON "demographics"("sourcedId");

-- CreateIndex
CREATE UNIQUE INDEX "demographics_userSourcedId_key" ON "demographics"("userSourcedId");

-- CreateIndex
CREATE INDEX "demographics_dateLastModified_idx" ON "demographics"("dateLastModified");

-- CreateIndex
CREATE INDEX "demographics_status_idx" ON "demographics"("status");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

-- CreateIndex
CREATE INDEX "api_keys_isActive_idx" ON "api_keys"("isActive");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entitySourcedId_idx" ON "audit_logs"("entityType", "entitySourcedId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_apiKeyId_idx" ON "audit_logs"("apiKeyId");

-- CreateIndex
CREATE INDEX "csv_import_jobs_status_idx" ON "csv_import_jobs"("status");

-- CreateIndex
CREATE INDEX "csv_import_jobs_createdAt_idx" ON "csv_import_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "csv_import_jobs_createdBy_idx" ON "csv_import_jobs"("createdBy");

-- AddForeignKey
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_userSourcedId_fkey" FOREIGN KEY ("userSourcedId") REFERENCES "users"("sourcedId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_agentSourcedId_fkey" FOREIGN KEY ("agentSourcedId") REFERENCES "users"("sourcedId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_parentSourcedId_fkey" FOREIGN KEY ("parentSourcedId") REFERENCES "orgs"("sourcedId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_orgs" ADD CONSTRAINT "user_orgs_userSourcedId_fkey" FOREIGN KEY ("userSourcedId") REFERENCES "users"("sourcedId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_orgs" ADD CONSTRAINT "user_orgs_orgSourcedId_fkey" FOREIGN KEY ("orgSourcedId") REFERENCES "orgs"("sourcedId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_schoolSourcedId_fkey" FOREIGN KEY ("schoolSourcedId") REFERENCES "orgs"("sourcedId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_courseSourcedId_fkey" FOREIGN KEY ("courseSourcedId") REFERENCES "courses"("sourcedId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolSourcedId_fkey" FOREIGN KEY ("schoolSourcedId") REFERENCES "orgs"("sourcedId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userSourcedId_fkey" FOREIGN KEY ("userSourcedId") REFERENCES "users"("sourcedId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classSourcedId_fkey" FOREIGN KEY ("classSourcedId") REFERENCES "classes"("sourcedId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_schoolSourcedId_fkey" FOREIGN KEY ("schoolSourcedId") REFERENCES "orgs"("sourcedId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_parentSourcedId_fkey" FOREIGN KEY ("parentSourcedId") REFERENCES "academic_sessions"("sourcedId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_academic_sessions" ADD CONSTRAINT "class_academic_sessions_classSourcedId_fkey" FOREIGN KEY ("classSourcedId") REFERENCES "classes"("sourcedId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_academic_sessions" ADD CONSTRAINT "class_academic_sessions_academicSessionSourcedId_fkey" FOREIGN KEY ("academicSessionSourcedId") REFERENCES "academic_sessions"("sourcedId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demographics" ADD CONSTRAINT "demographics_userSourcedId_fkey" FOREIGN KEY ("userSourcedId") REFERENCES "users"("sourcedId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
