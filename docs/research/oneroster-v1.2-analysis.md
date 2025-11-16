# OneRoster v1.2 Base Specification - Research & Analysis

**Document Version**: 1.0
**Date**: 2025-11-13
**Author**: Orchestrator AI
**Status**: Draft

---

## Executive Summary

This document provides a comprehensive analysis of the **OneRoster v1.2 specification** published by IMS Global Learning Consortium (now 1EdTech Consortium). OneRoster is a standard for securely exchanging class rosters and educational data between Student Information Systems (SIS) and other educational applications (LMS, content platforms, etc.).

**Key Findings:**
- OneRoster v1.2 supports **22 CSV files** and **81 REST API endpoints**
- Includes 8 new files compared to v1.1 (roles, scoreScales, userProfiles, etc.)
- **OAuth 2.0** is required for REST APIs (OAuth 1.0 deprecated)
- Supports both **bulk** and **delta** data synchronization
- UTF-8 encoding required, follows RFC 4180 CSV format
- Three service categories: **Rostering**, **Gradebook**, **Resources**

---

## 1. Core Data Models (Entities)

### 1.1 Rostering Service Entities

#### Users (users.csv)
**Purpose**: People in the education system (students, teachers, administrators)

**Key Required Fields:**
- `sourcedId` (GUID): Unique identifier
- `enabledUser` (true/false): Account status
- `username` (String): Login username
- `givenName` (String): First name
- `familyName` (String): Last name

**New in v1.2:**
- `userMasterIdentifier`: Master ID across systems
- `preferredGivenName`, `preferredMiddleName`, `preferredFamilyName`: Preferred names
- `pronouns`: User pronouns (e.g., he/him, she/her, they/them)
- `primaryOrgSourcedId`: Primary organization reference

**PII Fields:**
- `email`, `sms`, `phone` (contact information)
- `givenName`, `familyName`, `middleName` (identity)
- `grades` (student grade level)

#### Organizations (orgs.csv)
**Purpose**: Educational institutions hierarchy (district, school, department)

**Key Required Fields:**
- `sourcedId` (GUID)
- `name` (String): Organization name
- `type` (Enumeration): district | school | department | local | state | national

**Structure**: Hierarchical parent-child relationship
- Example: District → School → Department

#### Academic Sessions (academicSessions.csv)
**Purpose**: Time periods (school year, semester, grading period)

**Key Required Fields:**
- `sourcedId` (GUID)
- `title` (String): Session name
- `type` (Enumeration): gradingPeriod | semester | schoolYear | term
- `startDate` (Date): Start date
- `endDate` (Date): End date
- `schoolYear` (Year): Academic year (e.g., 2024)

**Hierarchy Example:**
```
SchoolYear 2024-2025
├── Semester 1 (Fall 2024)
│   ├── Grading Period 1
│   └── Grading Period 2
└── Semester 2 (Spring 2025)
    ├── Grading Period 3
    └── Grading Period 4
```

#### Courses (courses.csv)
**Purpose**: Course catalog definitions

**Key Required Fields:**
- `sourcedId` (GUID)
- `title` (String): Course name
- `orgSourcedId` (GUID Reference): School/organization offering course

**Optional Fields:**
- `courseCode` (String): Course identifier code
- `grades` (List of Strings): Grade levels
- `subjects` (List of Strings): Subject areas (e.g., "Mathematics", "English")
- `subjectCodes` (List of Strings): Standard subject codes

#### Classes (classes.csv)
**Purpose**: Class instances (sections) of courses

**Key Required Fields:**
- `sourcedId` (GUID)
- `title` (String): Class name
- `courseSourcedId` (GUID Reference): Course this class instantiates
- `classType` (Enumeration): homeroom | scheduled
- `schoolSourcedId` (GUID Reference): School offering class
- `termSourcedIds` (List of GUID References): Terms/semesters class meets

**Optional Fields:**
- `classCode` (String): Class section code
- `location` (String): Room/building
- `periods` (List of Strings): Period numbers (e.g., "1", "3", "5A")
- `grades` (List of Strings): Grade levels
- `subjects`, `subjectCodes`: Subject classification

#### Enrollments (enrollments.csv)
**Purpose**: User-class memberships (who is in which class)

**Key Required Fields:**
- `sourcedId` (GUID)
- `classSourcedId` (GUID Reference): Class
- `schoolSourcedId` (GUID Reference): School
- `userSourcedId` (GUID Reference): User (student or teacher)
- `role` (Enumeration): administrator | proctor | student | teacher

**Optional Fields:**
- `primary` (true/false): Primary teacher/enrollment
- `beginDate`, `endDate` (Date): Enrollment period

**PII**: `role` field is marked as PII (identifies student/teacher status)

#### Demographics (demographics.csv)
**Purpose**: Student demographic information (highly sensitive PII)

**Key Field:**
- `sourcedId` (GUID): Links to user

**PII Fields (all optional):**
- `birthDate` (Date)
- `sex` (Enumeration): male | female | unspecified | other
- `americanIndianOrAlaskaNative`, `asian`, `blackOrAfricanAmerican`, etc. (Race/ethnicity)
- `hispanicOrLatinoEthnicity` (true/false)
- `countryOfBirthCode`, `stateOfBirthAbbreviation`, `cityOfBirth`

**Note**: All fields in demographics.csv are marked as PII

#### Roles (roles.csv) - NEW in v1.2
**Purpose**: User roles within organizations (beyond class enrollments)

**Key Required Fields:**
- `sourcedId` (GUID)
- `userSourcedId` (GUID Reference): User
- `roleType` (Enumeration): primary | secondary
- `role` (Enumeration): aide | counselor | districtAdministrator | guardian | parent | principal | proctor | relative | siteAdministrator | student | systemAdministrator | teacher
- `orgSourcedId` (GUID Reference): Organization

**Optional Fields:**
- `beginDate`, `endDate` (Date): Role period
- `userProfileSourcedId` (GUID Reference): Authentication profile

---

### 1.2 Gradebook Service Entities

#### Categories (categories.csv)
**Purpose**: Groupings of assignments (e.g., homework, essays, exams)

**Key Required Fields:**
- `sourcedId` (GUID)
- `title` (String): Category name

**Optional Fields:**
- `weight` (Integer): Category weight in grade calculation

#### Line Items (lineItems.csv)
**Purpose**: Individual assignments/assessments

**Key Required Fields:**
- `sourcedId` (GUID)
- `title` (String): Assignment title
- `assignDate` (Date): Date assigned
- `dueDate` (Date): Due date
- `classSourcedId` (GUID Reference): Class
- `categorySourcedId` (GUID Reference): Category
- `academicSessionSourcedId` (GUID Reference): Grading period
- `schoolSourcedId` (GUID Reference): School

**Optional Fields:**
- `description` (String): Assignment description
- `resultValueMin`, `resultValueMax` (Float): Score range (e.g., 0-100)

#### Results (results.csv)
**Purpose**: Student grades/submissions for assignments

**Key Required Fields:**
- `sourcedId` (GUID)
- `lineItemSourcedId` (GUID Reference): Assignment
- `studentSourcedId` (GUID Reference): Student (PII)
- `scoreStatus` (Enumeration): exempt | fully graded | not submitted | partially graded | submitted
- `scoreDate` (Date): Date scored

**Optional Fields:**
- `score` (Float): Numeric score
- `textScore` (String): Letter grade or text representation
- `comment` (String): Teacher feedback
- `classSourcedId` (GUID Reference): Class
- `inProgress`, `incomplete`, `late`, `missing` (true/false): Status flags

**PII**: `studentSourcedId` links to student identity

#### Score Scales (scoreScales.csv) - NEW in v1.2
**Purpose**: Grade conversion scales (e.g., numeric to letter grade mappings)

**Key Required Fields:**
- `sourcedId` (GUID)
- `title` (String): Scale name
- `type` (String): Scale type
- `orgSourcedId`, `courseSourcedId`, `classSourcedId`: Scope references
- `scoreScaleValue` (List of Strings): Scale values (e.g., "90-100:A", "80-89:B")

#### Line Item Score Scales (lineItemScoreScales.csv) - NEW in v1.2
**Purpose**: Mapping score scales to line items

**Key Required Fields:**
- `sourcedId` (GUID)
- `lineItemSourcedId` (GUID Reference): Assignment
- `scoreScaleSourcedId` (GUID Reference): Score scale

#### Result Score Scales (resultScoreScales.csv) - NEW in v1.2
**Purpose**: Mapping score scales to results

**Key Required Fields:**
- `sourcedId` (GUID)
- `resultSourcedId` (GUID Reference): Student result
- `scoreScaleSourcedId` (GUID Reference): Score scale

#### Learning Objective IDs - NEW in v1.2
**Purpose**: Standards alignment and competency tracking

**Two files:**
- `lineItemLearningObjectiveIds.csv`: Standards aligned to assignments
- `resultLearningObjectiveIds.csv`: Competency mastery tracking

**Key Required Fields:**
- `sourcedId` (GUID)
- `lineItemSourcedId` or `resultSourcedId` (GUID Reference)
- `source` (Enumeration): case | unknown (CASE = 1EdTech Competency and Academic Standards Exchange)
- `learningObjectiveId` (String): Standard identifier

---

### 1.3 Resource Service Entities

#### Resources (resources.csv)
**Purpose**: Learning tools and content (LTI tools, digital textbooks, etc.)

**Key Required Fields:**
- `sourcedId` (GUID)
- `vendorResourceId` (ID): Vendor's resource identifier

**Optional Fields:**
- `title` (String): Resource name
- `roles` (Enumeration List): administrator | aide | guardian | parent | proctor | relative | student | teacher
- `importance` (Enumeration): primary | secondary
- `vendorId`, `applicationId` (ID): Vendor/application identifiers

#### Class Resources (classResources.csv)
**Purpose**: Assign resources to classes

**Key Required Fields:**
- `sourcedId` (GUID)
- `classSourcedId` (GUID Reference): Class
- `resourceSourcedId` (GUID Reference): Resource

#### Course Resources (courseResources.csv)
**Purpose**: Assign resources to courses

**Key Required Fields:**
- `sourcedId` (GUID)
- `courseSourcedId` (GUID Reference): Course
- `resourceSourcedId` (GUID Reference): Resource

#### User Resources (userResources.csv) - NEW in v1.2
**Purpose**: Individual resource access

**Key Required Fields:**
- `sourcedId` (GUID)
- `userSourcedId` (GUID Reference): User
- `resourceSourcedId` (GUID Reference): Resource

**Optional Fields:**
- `orgSourcedId`, `classSourcedId` (GUID Reference): Scope

---

### 1.4 Authentication/Profile Entities

#### User Profiles (userProfiles.csv) - NEW in v1.2
**Purpose**: User credentials and system access profiles

**Key Required Fields:**
- `sourcedId` (GUID)
- `userSourcedId` (GUID Reference): User
- `profileType` (String): Profile type
- `vendorId` (String): System vendor
- `credentialType` (String): Credential type
- `username` (String): Login username

**Credential Fields (PII):**
- `password` (String): Hashed password (optional)

**Optional Fields:**
- `applicationId` (String): Application identifier
- `description` (String): Profile description

---

## 2. REST API Endpoints

### 2.1 Base URL Structure

All OneRoster v1.2 REST endpoints use the base path:
```
/ims/oneroster/rostering/v1p2
```

**Example Full URL:**
```
https://example.com/ims/oneroster/rostering/v1p2/academicSessions
```

### 2.2 Endpoint Patterns

OneRoster v1.2 defines **81 REST endpoints** across three services:

#### Rostering Service (41 Endpoints)

**Collection Endpoints (GET):**
- `GET /academicSessions` - All academic sessions
- `GET /classes` - All classes
- `GET /courses` - All courses
- `GET /demographics` - All demographics (requires demographics scope)
- `GET /enrollments` - All enrollments
- `GET /orgs` - All organizations
- `GET /roles` - All roles (NEW in v1.2)
- `GET /users` - All users

**Single Resource Endpoints (GET):**
- `GET /academicSessions/{id}` - Specific session
- `GET /classes/{id}` - Specific class
- `GET /courses/{id}` - Specific course
- `GET /demographics/{id}` - Specific demographics
- `GET /enrollments/{id}` - Specific enrollment
- `GET /orgs/{id}` - Specific organization
- `GET /roles/{id}` - Specific role (NEW in v1.2)
- `GET /users/{id}` - Specific user

**Relationship Endpoints (GET):**
- `GET /schools/{schoolId}/classes` - Classes in school
- `GET /schools/{schoolId}/courses` - Courses offered by school
- `GET /schools/{schoolId}/enrollments` - Enrollments in school
- `GET /schools/{schoolId}/students` - Students enrolled in school
- `GET /schools/{schoolId}/teachers` - Teachers at school
- `GET /schools/{schoolId}/terms` - Terms/sessions for school
- `GET /classes/{classId}/students` - Students in class
- `GET /classes/{classId}/teachers` - Teachers for class
- `GET /courses/{courseId}/classes` - Classes for course
- `GET /students/{studentId}/classes` - Classes student is enrolled in
- `GET /teachers/{teacherId}/classes` - Classes teacher teaches
- `GET /terms/{termId}/classes` - Classes in term
- `GET /users/{userId}/classes` - Classes user is enrolled in

**Demographics Endpoints:**
- `GET /students/{studentId}/demographics` - Student demographics

#### Gradebook Service (Approximately 20 Endpoints)

**Collection Endpoints:**
- `GET /categories` - All categories
- `GET /lineItems` - All line items (assignments)
- `GET /results` - All results (grades)
- `GET /scoreScales` - All score scales (NEW in v1.2)

**Single Resource Endpoints:**
- `GET /categories/{id}`
- `GET /lineItems/{id}`
- `GET /results/{id}`
- `GET /scoreScales/{id}` (NEW in v1.2)

**Relationship Endpoints:**
- `GET /classes/{classId}/lineItems` - Assignments for class
- `GET /classes/{classId}/results` - Grades for class
- `GET /lineItems/{lineItemId}/results` - Grades for assignment
- `GET /students/{studentId}/results` - Student's grades

**PUT Endpoints** (Writing Grades):
- `PUT /lineItems/{id}` - Update line item
- `PUT /results/{id}` - Update result (grade)

**DELETE Endpoints**:
- `DELETE /lineItems/{id}` - Delete line item
- `DELETE /results/{id}` - Delete result

#### Resource Service (Approximately 20 Endpoints)

**Collection Endpoints:**
- `GET /resources` - All resources
- `GET /classResources` - All class-resource assignments
- `GET /courseResources` - All course-resource assignments
- `GET /userResources` - All user-resource assignments (NEW in v1.2)

**Single Resource Endpoints:**
- `GET /resources/{id}`
- `GET /classResources/{id}`
- `GET /courseResources/{id}`
- `GET /userResources/{id}` (NEW in v1.2)

**Relationship Endpoints:**
- `GET /classes/{classId}/resources` - Resources assigned to class
- `GET /courses/{courseId}/resources` - Resources assigned to course
- `GET /users/{userId}/resources` - Resources assigned to user (NEW in v1.2)

---

### 2.3 Query Parameters

#### Pagination
- `limit` (Integer): Maximum records per response (default: 100)
- `offset` (Integer): Starting record position (default: 0)

**Example:**
```
GET /users?limit=50&offset=100
```
Returns users 101-150.

#### Filtering
- `filter` (String): Filter expression

**Filter Syntax:**
```
GET /users?filter=givenName='John'
GET /classes?filter=termSourcedIds~'term-123'
GET /results?filter=score>=90
```

**Operators:**
- `=` : Equals
- `!=` : Not equals
- `<`, `>`, `<=`, `>=` : Comparison
- `~` : Contains/in (for lists)

#### Sorting
- `sort` (String): Field to sort by
- `orderBy` (Enumeration): `asc` (ascending, default) or `desc` (descending)

**Example:**
```
GET /users?sort=familyName&orderBy=asc
```

#### Field Selection
- `fields` (String): Comma-separated list of fields to return

**Example:**
```
GET /users?fields=sourcedId,givenName,familyName,email
```
Returns only specified fields, reducing payload size.

---

### 2.4 HTTP Methods

OneRoster v1.2 supports:

| Method | Purpose | Scope |
|--------|---------|-------|
| GET | Retrieve data | All services |
| PUT | Update data | Gradebook only |
| DELETE | Delete data | Gradebook only |

**Note**: POST (create) is not standardized in OneRoster REST API. Data creation typically happens via CSV import.

---

## 3. Authentication Methods

### 3.1 OAuth 2.0 (Required)

OneRoster v1.2 **requires OAuth 2.0 Bearer Tokens** using the **Client Credentials Grant** flow.

**OAuth 1.0 is deprecated** and no longer supported in v1.2.

#### Client Credentials Flow

1. **Client** sends credentials to Authorization Server:
   ```
   POST /oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=client_credentials
   &client_id=YOUR_CLIENT_ID
   &client_secret=YOUR_CLIENT_SECRET
   &scope=https://purl.imsglobal.org/spec/or/v1p2/scope/roster.readonly
   ```

2. **Authorization Server** responds with access token:
   ```json
   {
     "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "Bearer",
     "expires_in": 3600,
     "scope": "https://purl.imsglobal.org/spec/or/v1p2/scope/roster.readonly"
   }
   ```

3. **Client** uses token in API requests:
   ```
   GET /ims/oneroster/rostering/v1p2/users
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 3.2 OAuth 2.0 Scopes

OneRoster defines granular scopes for access control:

**Rostering Scopes:**
- `https://purl.imsglobal.org/spec/or/v1p2/scope/roster-core.readonly` - Core rostering data (users, classes, enrollments)
- `https://purl.imsglobal.org/spec/or/v1p2/scope/roster-demographics.readonly` - Demographics data (highly sensitive)
- `https://purl.imsglobal.org/spec/or/v1p2/scope/roster.readonly` - All rostering data (includes demographics)

**Gradebook Scopes:**
- `https://purl.imsglobal.org/spec/or/v1p2/scope/gradebook.readonly` - Read gradebook data
- `https://purl.imsglobal.org/spec/or/v1p2/scope/gradebook.readwrite` - Read and write gradebook data

**Resource Scopes:**
- `https://purl.imsglobal.org/spec/or/v1p2/scope/resource.readonly` - Read resource assignments

**Best Practice**: Request minimum necessary scopes for principle of least privilege.

### 3.3 Transport Security

**TLS 1.2+ Required**: All OneRoster API communications must use HTTPS with TLS 1.2 or higher.

---

## 4. CSV Format Specifications

### 4.1 File Structure

#### Encoding
- **UTF-8** encoding required
- **BOM** (Byte Order Mark) optional but recommended

#### Format
- **RFC 4180** Comma Separated Values format
- Header row required with case-sensitive field names
- Fields must appear in specification-defined order
- Carriage returns not permitted within fields
- Fields containing commas or quotes must be enclosed in double-quotes
- Internal double-quotes escaped by doubling (`""`)

#### Data Types

| Type | Format | Example |
|------|--------|---------|
| GUID | Max 256 chars, alphanumeric + `._-/@` | `user-12345` |
| UUID | 128-bit UUID | `550e8400-e29b-41d4-a716-446655440000` |
| String | Human-readable text (max 255 chars minimum) | `John Doe` |
| Float | Floating point number | `95.5` |
| Date | ISO 8601: `YYYY-MM-DD` | `2024-09-01` |
| DateTime | W3C ISO 8601: `YYYY-MM-DDTHH:MM:SS.sssZ` | `2024-09-01T14:30:00.000Z` |
| Year | ISO 8601: `YYYY` | `2024` |
| Enumeration | Predefined value | `active`, `student`, `homeroom` |
| List | Comma-separated values (no internal commas) | `grade1,grade2,grade3` |

### 4.2 Processing Modes

#### Bulk Mode
- **Purpose**: Full dataset replacement
- **Status Field**: Must be blank
- **dateLastModified Field**: Must be blank
- **Behavior**: All records treated as current state; missing records marked as deleted
- **Use Case**: Initial sync, full refresh

**Example (users.csv):**
```csv
sourcedId,status,dateLastModified,username,givenName,familyName,email
user1,,,john.doe,John,Doe,john.doe@example.com
user2,,,jane.smith,Jane,Smith,jane.smith@example.com
```

#### Delta Mode
- **Purpose**: Incremental updates
- **Status Field**: Required (`active` or `tobedeleted`)
- **dateLastModified Field**: Required (timestamp of last change)
- **Behavior**: Only changed records included; `tobedeleted` marks records for deletion
- **Use Case**: Daily syncs, real-time updates

**Example (users.csv):**
```csv
sourcedId,status,dateLastModified,username,givenName,familyName,email
user1,active,2024-11-01T10:30:00.000Z,john.doe,John,Doe,john.doe@example.com
user3,tobedeleted,2024-11-02T14:15:00.000Z,,,,
```

### 4.3 Manifest File (manifest.csv)

**Purpose**: Control file indicating which CSVs are included and processing mode

**Required Fields:**
- `manifest.version` - Always "1.0"
- `oneroster.version` - "1.2"
- `file.[name]` - Processing mode for each file (absent | bulk | delta)

**Optional Fields:**
- `source.systemName` - Source system name
- `source.systemCode` - Source system identifier

**Example:**
```csv
propertyName,value
manifest.version,1.0
oneroster.version,1.2
file.academicSessions,bulk
file.orgs,bulk
file.courses,bulk
file.classes,bulk
file.users,delta
file.enrollments,delta
file.demographics,absent
file.categories,absent
file.lineItems,absent
file.results,absent
source.systemName,SchoolSIS Pro
source.systemCode,SIS-2024
```

**Interpretation:**
- Academic sessions, orgs, courses, classes: Full bulk replacement
- Users, enrollments: Incremental delta updates
- Demographics, gradebook data: Not included in this export

### 4.4 ZIP Package Structure

**Delivery Format**: CSV files must be packaged as a ZIP file (RFC 1951 DEFLATE compression)

**Package Contents:**
- `manifest.csv` (required)
- Data CSV files (as indicated in manifest)

**Example ZIP Structure:**
```
roster-export-2024-11-13.zip
├── manifest.csv
├── academicSessions.csv
├── orgs.csv
├── courses.csv
├── classes.csv
├── users.csv
└── enrollments.csv
```

---

## 5. Data Relationships

### 5.1 Entity Relationship Diagram (Conceptual)

```
┌─────────────────┐
│   Organization  │
│   (Org)         │
└────────┬────────┘
         │
         ├─────────────────────────┐
         │                         │
┌────────▼────────┐       ┌────────▼────────┐
│ Academic        │       │   Course        │
│ Session         │       │                 │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │                 ┌───────▼───────┐
         │                 │   Class       │
         │                 └───────┬───────┘
         │                         │
         │         ┌───────────────┼───────────────┐
         │         │               │               │
┌────────▼─────────▼───┐   ┌───────▼────┐  ┌──────▼──────┐
│   Enrollment         │   │   User     │  │  LineItem   │
│   (User-Class Link)  │───┤            │  │  (Assignment)│
└──────────────────────┘   └────────────┘  └──────┬──────┘
                                   │               │
                           ┌───────▼──────┐ ┌──────▼──────┐
                           │ Demographics │ │   Result    │
                           │   (PII)      │ │   (Grade)   │
                           └──────────────┘ └─────────────┘
```

### 5.2 Key Relationships

#### Organization Hierarchy
- **Organization** → `parentSourcedId` → **Parent Organization**
- Supports multi-level hierarchy: National → State → District → School → Department

#### Academic Calendar
- **Academic Session** → `parentSourcedId` → **Parent Academic Session**
- Example: SchoolYear → Semester → GradingPeriod

#### Course-Class-User
- **Class** → `courseSourcedId` → **Course** (class is an instance of course)
- **Class** → `schoolSourcedId` → **Organization** (which school offers class)
- **Class** → `termSourcedIds` → **Academic Session(s)** (when class meets)
- **Enrollment** → `classSourcedId` → **Class** (which class)
- **Enrollment** → `userSourcedId` → **User** (which person)
- **Enrollment** → `role` → student | teacher (person's role in class)

#### Gradebook
- **LineItem** → `classSourcedId` → **Class** (assignment for which class)
- **LineItem** → `categorySourcedId` → **Category** (assignment type)
- **LineItem** → `academicSessionSourcedId` → **Academic Session** (grading period)
- **Result** → `lineItemSourcedId` → **LineItem** (grade for which assignment)
- **Result** → `studentSourcedId` → **User** (which student)

#### Resources
- **ClassResource** → `classSourcedId` → **Class**
- **ClassResource** → `resourceSourcedId` → **Resource**
- **CourseResource** → `courseSourcedId` → **Course**
- **CourseResource** → `resourceSourcedId` → **Resource**
- **UserResource** → `userSourcedId` → **User**
- **UserResource** → `resourceSourcedId` → **Resource**

### 5.3 Referential Integrity

**Requirements:**
- All `sourcedId` references must exist in the referenced CSV file
- For bulk processing, all references must be satisfied within the same CSV bundle
- For delta processing, references must exist in current state (bulk + previous deltas)
- Orphaned records (references to non-existent sourcedIds) should be rejected or flagged

---

## 6. Enumeration Values

### 6.1 Status Enumeration
**Used in**: All entities (for delta mode)
- `active` - Record is current and active
- `tobedeleted` - Record should be deleted

### 6.2 Academic Session Type
- `gradingPeriod` - Grading/marking period
- `semester` - Half-year term
- `schoolYear` - Full academic year
- `term` - Quarter or trimester
- `ext:[custom]` - Custom extension (e.g., `ext:summerSession`)

### 6.3 Organization Type
- `department` - Department within school
- `school` - Individual school
- `district` - School district
- `local` - Local education agency
- `state` - State/provincial education agency
- `national` - National education agency
- `ext:[custom]` - Custom extension

### 6.4 Class Type
- `homeroom` - Homeroom/advisory class
- `scheduled` - Regular scheduled class
- `ext:[custom]` - Custom extension

### 6.5 User Enabled
- `true` - User account is enabled
- `false` - User account is disabled

### 6.6 Enrollment Role
- `administrator` - School/district administrator
- `proctor` - Test proctor
- `student` - Student enrolled in class
- `teacher` - Teacher of class
- `ext:[custom]` - Custom extension (e.g., `ext:teachingAssistant`)

### 6.7 Enrollment Primary
- `true` - Primary enrollment/teacher
- `false` - Secondary enrollment/co-teacher

### 6.8 Demographics Sex
- `male` - Male
- `female` - Female
- `unspecified` - Unspecified (NEW in v1.2)
- `other` - Other (NEW in v1.2)
- `ext:[custom]` - Custom extension

### 6.9 Demographics Race/Ethnicity
**Fields**: `americanIndianOrAlaskaNative`, `asian`, `blackOrAfricanAmerican`, `nativeHawaiianOrOtherPacificIslander`, `white`, `demographicRaceTwoOrMoreRaces`, `hispanicOrLatinoEthnicity`
- `true` - Person identifies with this race/ethnicity
- `false` - Person does not identify with this race/ethnicity

### 6.10 Role Type (roles.csv)
- `primary` - Primary role
- `secondary` - Secondary role

### 6.11 Role (roles.csv)
- `aide` - Classroom aide
- `counselor` - School counselor
- `districtAdministrator` - District administrator
- `guardian` - Legal guardian
- `parent` - Parent
- `principal` - School principal
- `proctor` - Test proctor
- `relative` - Family member
- `siteAdministrator` - School administrator
- `student` - Student
- `systemAdministrator` - System administrator
- `teacher` - Teacher
- `ext:[custom]` - Custom extension

### 6.12 Score Status (results.csv)
- `exempt` - Student exempt from assignment
- `fully graded` - Assignment fully graded
- `not submitted` - Student has not submitted
- `partially graded` - Assignment partially graded
- `submitted` - Student submitted but not graded
- `ext:[custom]` - Custom extension

### 6.13 Result Boolean Flags
**Fields**: `inProgress`, `incomplete`, `late`, `missing`
- `true` - Flag is set
- `false` - Flag is not set

### 6.14 Resource Importance
- `primary` - Primary resource
- `secondary` - Secondary resource

### 6.15 Resource Roles
- `administrator` - Administrator access
- `aide` - Classroom aide access
- `guardian` - Guardian access
- `parent` - Parent access
- `proctor` - Proctor access
- `relative` - Family member access
- `student` - Student access
- `teacher` - Teacher access
- `ext:[custom]` - Custom extension

### 6.16 Learning Objective Source
- `case` - 1EdTech CASE (Competency and Academic Standards Exchange)
- `unknown` - Unknown source
- `ext:[custom]` - Custom extension

### 6.17 Manifest File Status
- `absent` - File not included in export
- `bulk` - File contains bulk data
- `delta` - File contains delta data

### 6.18 Extensibility
**All enumerations support custom extensions** using the `ext:` prefix:
- Example: `ext:teachingAssistant` for enrollment role
- Example: `ext:summerSchool` for academic session type
- Example: `ext:privateSchool` for organization type

---

## 7. Implementation Recommendations

### 7.1 CSV Upload API Design

**Endpoint**: `POST /api/v1/oneroster/csv/upload`

**Request**:
- **Content-Type**: `multipart/form-data`
- **Body**: ZIP file containing manifest.csv and data CSVs

**Processing Steps**:
1. Validate ZIP structure (manifest.csv present)
2. Parse manifest.csv (determine processing mode for each file)
3. Validate CSV format (UTF-8, RFC 4180, headers)
4. Validate required fields for each CSV
5. Validate referential integrity (sourcedId references)
6. Parse data into internal data models
7. Apply bulk or delta processing logic
8. Persist to database (transaction)
9. Return processing report (success/errors)

**Response**:
```json
{
  "status": "success",
  "processedFiles": {
    "manifest.csv": {"status": "success", "records": 1},
    "users.csv": {"status": "success", "records": 150},
    "enrollments.csv": {"status": "warning", "records": 300, "warnings": ["Enrollment enr-999 references non-existent user user-999"]}
  },
  "errors": []
}
```

### 7.2 Database Schema Design

**Recommended Approach**: Create PostgreSQL tables matching OneRoster entities

**Core Tables**:
- `oneroster_orgs`
- `oneroster_academic_sessions`
- `oneroster_courses`
- `oneroster_classes`
- `oneroster_users`
- `oneroster_enrollments`
- `oneroster_demographics`
- `oneroster_roles`

**Gradebook Tables**:
- `oneroster_categories`
- `oneroster_line_items`
- `oneroster_results`
- `oneroster_score_scales`

**Resource Tables**:
- `oneroster_resources`
- `oneroster_class_resources`
- `oneroster_course_resources`
- `oneroster_user_resources`

**Key Design Principles**:
- Use `sourcedId` as primary key (VARCHAR(256))
- Add `status` (active/tobedeleted) and `date_last_modified` for delta processing
- Add foreign keys for referential integrity
- Index frequently queried fields (e.g., `username`, `email`, `classSourcedId`)
- Consider partitioning large tables (e.g., `results` by academic year)

### 7.3 REST API Implementation

**Framework**: NestJS with TypeScript

**Architecture**:
- **Controllers**: Handle HTTP requests, validation
- **Services**: Business logic, data transformation
- **Repositories**: Data access layer (Prisma ORM)
- **DTOs**: Request/response validation (class-validator)

**Authentication**: OAuth 2.0 (Passport.js + JWT)

**Pagination**: Implement limit/offset with default limit=100

**Filtering**: Use query parser to convert filter expressions to Prisma queries

**Example Endpoint**:
```typescript
@Controller('/ims/oneroster/rostering/v1p2')
export class RosteringController {
  @Get('/users')
  @UseGuards(OAuth2Guard)
  @Scopes('roster-core.readonly')
  async getUsers(
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
    @Query('filter') filter?: string,
    @Query('sort') sort?: string,
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'asc'
  ) {
    return this.rosteringService.getUsers({ limit, offset, filter, sort, orderBy });
  }
}
```

### 7.4 Security Considerations

**PII Protection**:
- Encrypt demographics data at rest (PostgreSQL pgcrypto)
- Implement field-level access control (demographics require special scope)
- Log all access to PII fields (audit trail)
- Mask PII in logs (never log email, phone, birthdate)

**Authentication**:
- Require OAuth 2.0 for all API requests
- Implement token expiration (15-30 minutes)
- Rate limit token requests (prevent brute force)
- Rotate client secrets regularly

**Transport Security**:
- Enforce TLS 1.2+ (reject older protocols)
- Use HSTS headers (Strict-Transport-Security)
- Implement Content Security Policy (CSP)

**Input Validation**:
- Validate all CSV inputs (schema validation)
- Sanitize filter expressions (prevent SQL injection)
- Limit CSV file size (e.g., 100 MB max)
- Validate ZIP file integrity (prevent zip bombs)

**Rate Limiting**:
- API rate limit: 100 requests/minute per client
- CSV upload rate limit: 10 uploads/hour per client
- Implement 429 Too Many Requests responses

### 7.5 Performance Optimization

**CSV Processing**:
- Stream CSV parsing (avoid loading entire file in memory)
- Batch database inserts (e.g., 1000 records per transaction)
- Use database COPY for bulk inserts (PostgreSQL)
- Parallelize CSV processing (process multiple files concurrently)

**API Performance**:
- Cache frequently accessed data (Redis)
- Implement ETag for conditional requests (HTTP 304)
- Use database connection pooling (Prisma default)
- Add indexes on frequently filtered fields

**Expected Performance**:
- CSV upload: 10,000 records/second
- API response time: <200ms (95th percentile)
- Support 100 concurrent API requests

---

## 8. Compliance & Validation

### 8.1 OneRoster Conformance

**Certification Levels**:
- **Rostering Service**: Core conformance requires supporting all mandatory endpoints
- **Gradebook Service**: Optional, but if implemented must support full spec
- **Resource Service**: Optional, but if implemented must support full spec

**Conformance Testing**: IMS Global provides certification testing suite

### 8.2 Data Privacy Compliance

**FERPA** (Family Educational Rights and Privacy Act - US):
- Student records are protected
- Implement access controls
- Log all access to student data

**GDPR** (General Data Protection Regulation - EU):
- Right to access (provide data export)
- Right to erasure (implement user deletion)
- Data minimization (only collect necessary data)
- Consent management (track user consent)

**COPPA** (Children's Online Privacy Protection Act - US):
- Parental consent for users under 13
- Limit data collection for minors

### 8.3 Character Encoding

**UTF-8 Required**: All CSV files and API responses must use UTF-8 encoding

**Japanese Support**: OneRoster v1.2 fully supports Japanese characters (UTF-8)
- User names: `田中 太郎` (Tanaka Taro)
- Class titles: `数学IA` (Mathematics IA)
- Organization names: `東京都立高等学校` (Tokyo Metropolitan High School)

---

## 9. Version History & Changes

### 9.1 OneRoster v1.2 Changes from v1.1

**New CSV Files** (8 total):
1. `roles.csv` - User roles within organizations
2. `scoreScales.csv` - Grade conversion scales
3. `lineItemScoreScales.csv` - Scale mappings to assignments
4. `resultScoreScales.csv` - Scale mappings to results
5. `lineItemLearningObjectiveIds.csv` - Standards alignment
6. `resultLearningObjectiveIds.csv` - Competency tracking
7. `userProfiles.csv` - Authentication profiles
8. `userResources.csv` - Individual resource access

**New Fields in Existing Entities**:
- **users.csv**: `userMasterIdentifier`, `preferredGivenName`, `preferredMiddleName`, `preferredFamilyName`, `primaryOrgSourcedId`, `pronouns`
- **demographics.csv**: `sex` enum expanded with `unspecified` and `other`

**Authentication Changes**:
- **OAuth 2.0** is now required (OAuth 1.0 deprecated)
- New granular OAuth scopes

**API Changes**:
- 81 endpoints (up from ~60 in v1.1)
- New relationship endpoints for roles

**Backward Compatibility**:
- v1.2 is largely backward compatible with v1.1
- Manifest file indicates version (systems can handle both)
- New fields are optional (existing v1.1 implementations continue to work)

---

## 10. References & Resources

### 10.1 Official Specification Documents

**Primary Specifications**:
- OneRoster v1.2 Overview: https://www.imsglobal.org/spec/oneroster/v1p2
- CSV Binding v1.2.1: https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv
- Rostering Service REST Binding: https://www.imsglobal.org/sites/default/files/spec/oneroster/v1p2/rostering-restbinding/
- Conformance & Certification: https://www.imsglobal.org/spec/oneroster/v1p2/cert
- Implementation Guide: https://www.imsglobal.org/spec/oneroster/v1p2/impl

**Data Models**:
- Rostering Service Information Model: https://www.imsglobal.org/sites/default/files/spec/oneroster/v1p2/rostering-informationmodel/
- Gradebook Service Information Model: (separate document)
- Resources Service Information Model: https://www.imsglobal.org/sites/default/files/spec/oneroster/v1p2/resources-informationmodel/

### 10.2 Standards & Protocols

- **RFC 4180**: Common Format and MIME Type for Comma-Separated Values (CSV) Files
- **RFC 1951**: DEFLATE Compressed Data Format Specification (ZIP)
- **ISO 8601**: Date and time format
- **W3C ISO 8601 Profile**: DateTime format
- **OAuth 2.0 RFC 6749**: The OAuth 2.0 Authorization Framework
- **TLS 1.2+**: Transport Layer Security

### 10.3 Related Technologies

**IMS/1EdTech Standards**:
- **LTI** (Learning Tools Interoperability): Launch external tools
- **Caliper Analytics**: Learning analytics
- **CASE** (Competency and Academic Standards Exchange): Standards alignment
- **QTI** (Question and Test Interoperability): Assessments

**Complementary Standards**:
- **Ed-Fi**: Education data standard (alternative to OneRoster)
- **SIF** (Schools Interoperability Framework): Another rostering standard

---

## 11. Next Steps

### 11.1 For RosterHub Implementation

1. **Research Japan Profile v1.2.2** (next document)
   - Identify Japan-specific extensions
   - Document additional fields/requirements
   - Analyze compliance needs

2. **Gap Analysis** (compare base vs Japan Profile)
   - Create side-by-side comparison
   - Identify implementation deltas
   - Prioritize features

3. **Requirements Definition** (EARS format)
   - CSV Upload API requirements
   - REST API endpoint requirements
   - Data model requirements
   - Authentication/authorization requirements
   - Validation requirements
   - Performance requirements
   - Security requirements

4. **System Design**
   - Database schema (Prisma)
   - API architecture (NestJS)
   - Authentication flow (OAuth 2.0)
   - CSV processing pipeline
   - Error handling strategy

5. **Implementation Planning**
   - Task breakdown
   - Sprint planning
   - Resource allocation

### 11.2 Open Questions

**For Japan Profile Research**:
- What additional fields does Japan Profile require?
- Are there Japan-specific enumerations?
- Are there localization requirements (date formats, character encoding)?
- Are there Japan-specific validation rules (e.g., school codes)?
- Are there additional CSV files in Japan Profile?

**For RosterHub Integration**:
- How does OneRoster data map to existing RosterHub data models?
- Should OneRoster data be isolated or integrated with RosterHub schedules?
- What is the sync frequency (real-time, daily, weekly)?
- Should we support bidirectional sync (RosterHub → OneRoster)?
- What are the user roles for OneRoster API access?

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | Orchestrator AI | Initial research document based on IMS Global OneRoster v1.2 specification |

**Review Status**: Draft (awaiting technical review)

**Next Review Date**: Upon completion of Japan Profile research

---

**END OF DOCUMENT**
