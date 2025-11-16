# RosterHub - Product Context

## Document Overview

**Project**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**Version**: 1.0
**Last Updated**: 2025-11-15
**Purpose**: Documents business context, product purpose, target users, and domain knowledge

---

## 1. Product Overview

### 1.1 Product Name

**RosterHub** - OneRoster Japan Profile 1.2.2 Integration Hub

### 1.2 Product Vision

**Enable seamless roster data exchange between Japanese educational institutions and learning platforms through OneRoster international standards with Japan-specific extensions.**

### 1.3 Elevator Pitch

RosterHub is an integration hub that bridges Japanese school administration systems and e-learning portals by implementing the **OneRoster v1.2 Japan Profile 1.2.2 standard**. It automates roster data synchronization, eliminating manual data entry and reducing year-end administrative burden for Japanese schools and universities.

---

## 2. Business Context

### 2.1 Problem Statement

#### Current Pain Points in Japanese Education

**1. Manual Roster Data Entry Burden**
- At the beginning of each school year (April in Japan), administrators must manually enter student/teacher rosters into multiple learning systems
- Average Japanese elementary school spends 20-40 hours on roster data entry across 5-10 learning platforms
- High schools and universities face even greater complexity with course enrollments and class assignments

**2. Lack of Standardization**
- No unified format for roster data exchange between school administration systems and learning platforms
- Each vendor uses proprietary formats, creating vendor lock-in
- Data migration costs are prohibitive when switching platforms

**3. Japanese Education System Specifics Not Supported**
- International standards don't natively support Japanese concepts:
  - **Grade/Class Structure**: Japanese schools organize students by grade (学年) and class (組)
  - **Homeroom Concept**: Students belong to a homeroom (ホームルーム) throughout the year
  - **Attendance Number**: Each student has an attendance number (出席番号) within their class
  - **Name Representation**: Japanese names require kanji, hiragana, and katakana representations
  - **School Year**: Japanese school year runs April to March (not September to June)

**4. Data Synchronization Challenges**
- Student transfers (転入・転出) require immediate roster updates across systems
- Class reorganizations (クラス替え) at year-end need coordinated updates
- Teacher assignments change mid-year but systems don't reflect updates

### 2.2 Solution Approach

RosterHub solves these problems by:

**1. Implementing International Standards with Japanese Extensions**
- Fully compliant with OneRoster v1.2 specification (international standard)
- Supports Japan Profile 1.2.2 extensions for Japanese-specific requirements
- Maintains backward compatibility with base OneRoster v1.2

**2. Automating Roster Data Exchange**
- School administration systems export roster data once
- RosterHub distributes to all connected learning platforms automatically
- Real-time synchronization via REST API
- Bulk synchronization via CSV import/export

**3. Providing Flexible Integration**
- REST API for real-time integration
- CSV Bulk Data format for batch integration
- Streaming support for large datasets (200,000+ students/teachers)
- Filter queries for selective data synchronization

---

## 3. Market and Domain

### 3.1 Target Market

**Primary Market**: Japan (Initial Focus)
- Elementary schools (小学校): ~19,000 schools, ~6.3 million students
- Junior high schools (中学校): ~10,000 schools, ~3.2 million students
- High schools (高等学校): ~4,800 schools, ~3.1 million students
- Universities (大学): ~800 institutions, ~2.9 million students

**Future Markets**: Other Asian countries with similar educational structures

### 3.2 Target Users

#### Primary Users (Direct Users)

**1. School IT Administrators (情報システム担当者)**
- **Role**: Manage school administration systems and learning platform integration
- **Goals**:
  - Reduce manual data entry workload
  - Ensure roster data accuracy across systems
  - Simplify year-end roster updates
- **Pain Points**:
  - Spend days on roster data entry each year
  - Deal with data inconsistencies between systems
  - Handle urgent student transfer updates
- **Usage**: Configure RosterHub, manage API keys, monitor data synchronization

**2. School Administration Staff (校務担当教員)**
- **Role**: Update student/teacher information in school administration systems
- **Goals**:
  - Have roster changes automatically reflected in learning platforms
  - Reduce duplicate data entry
- **Pain Points**:
  - Must update same information in multiple systems
  - Risk of data entry errors
- **Usage**: Indirectly benefit from automated synchronization

#### Secondary Users (Stakeholders)

**3. Teachers (教員)**
- **Role**: Use learning platforms for teaching
- **Goals**:
  - Access up-to-date class rosters in learning platforms
  - See correct student names and class assignments
- **Benefits**:
  - No need to wait for roster updates
  - Correct student information always available

**4. Students (児童・生徒・学生)**
- **Role**: Access learning platforms
- **Goals**:
  - Log in to learning platforms with correct account
  - See correct class assignments
- **Benefits**:
  - Automatic account provisioning
  - Correct course enrollments

#### Technical Users (Developers)

**5. System Integrators (システムインテグレーター)**
- **Role**: Integrate school administration systems and learning platforms with RosterHub
- **Goals**:
  - Easy integration with OneRoster API
  - Clear API documentation
  - Sample code and integration guides
- **Usage**: Implement RosterHub API clients, test integrations

**6. Learning Platform Vendors (学習プラットフォームベンダー)**
- **Role**: Develop learning platforms (e-learning portals, LMS, etc.)
- **Goals**:
  - Support OneRoster standard for roster import
  - Reduce custom integration development
- **Usage**: Consume RosterHub API, implement OneRoster client libraries

---

## 4. Educational Domain Knowledge

### 4.1 Japanese School System Structure

#### Grade Levels (学年)

**Elementary School (小学校)**:
- Grades: 1st through 6th (小1 〜 小6)
- Age: 6-12 years old
- Classes per grade: 1-8 classes (depending on school size)

**Junior High School (中学校)**:
- Grades: 1st through 3rd (中1 〜 中3)
- Age: 12-15 years old
- Classes per grade: 1-10 classes

**High School (高等学校)**:
- Grades: 1st through 3rd (高1 〜 高3)
- Age: 15-18 years old
- Classes per grade: 1-12 classes

**University (大学)**:
- Years: 1st through 4th (typically) (1年 〜 4年)
- Age: 18-22 years old (undergraduate)
- Structure: Departments (学部), Majors (学科), Courses (コース)

#### Homeroom vs. Subject Classes

**Homeroom (ホームルーム)**:
- Each student belongs to one homeroom for the entire year
- Identified by: Grade + Class Number (例: 3年2組 = 3rd grade, Class 2)
- Homeroom teacher (担任) is responsible for class management
- Used for: Attendance, school events, communications

**Subject Classes (授業クラス)**:
- Students may have different classmates for different subjects
- More common in high schools and universities
- Elective courses create flexible class compositions

#### Attendance Number (出席番号)

- Each student has an attendance number within their homeroom class
- Typically assigned based on Japanese syllabary order (あいうえお順)
- Used for: Roll call, seating arrangements, grading records
- Range: 1 to ~40 (typical class size)

### 4.2 Japanese School Year Calendar

**Academic Year**: April to March (not September to June like Western countries)

**School Terms**:
- **1st Semester (1学期)**: April to July
- **2nd Semester (2学期)**: September to December
- **3rd Semester (3学期)**: January to March

**Major Events**:
- **April**: Entrance ceremony (入学式), class assignments announced
- **March**: Graduation ceremony (卒業式), class reorganization (クラス替え)
- **July/December**: End-of-term exams, report cards
- **Summer/Winter/Spring Breaks**: No classes, but school year continues

**Year-End Roster Updates** (March/April):
- Students advance to next grade
- Homeroom classes are reorganized
- Teachers get new class assignments
- Graduating students leave, new students enter

### 4.3 Japanese Name Representation

Japanese names require multiple representations:

**1. Kanji (漢字)**: Official legal name
- Family name + Given name (例: 山田 太郎)
- Stored in: `familyName` + `givenName`

**2. Hiragana (ひらがな)**: Phonetic reading
- Used for alphabetical sorting (Japanese syllabary order)
- Stored in: `metadata.jp.familyNameKana` + `metadata.jp.givenNameKana`

**3. Katakana (カタカナ)**: Alternative phonetic reading
- Sometimes used for foreign names
- Stored in: `metadata.jp.familyNameKatakana` + `metadata.jp.givenNameKatakana`

**4. Romanization (ローマ字)**: Latin alphabet (optional)
- Example: YAMADA Taro
- Stored in: `username` or separate fields

**Name Order**: Family name comes first in Japanese (山田 太郎), but international systems often expect Given name first (Taro Yamada). RosterHub supports both representations.

### 4.4 School Organization Hierarchy

**Typical Hierarchy**:
```
Prefecture (都道府県)
  └─ Municipality (市区町村)
      └─ School (学校)
          └─ Department (学部) [Universities only]
              └─ Grade (学年)
                  └─ Class (組/クラス)
                      └─ Students (児童・生徒・学生)
```

**OneRoster Mapping**:
- Prefecture → Org (type: `state`)
- Municipality → Org (type: `local`)
- School → Org (type: `school`)
- Department → Org (type: `department`)
- Class → Class (type: `homeroom` or `scheduled`)
- Students → User (role: `student`)

---

## 5. OneRoster Standard Overview

### 5.1 What is OneRoster?

**OneRoster** is an international standard developed by **1EdTech Consortium** (formerly IMS Global Learning Consortium) for **roster data exchange** in education.

**Purpose**: Enable interoperability between Student Information Systems (SIS), Learning Management Systems (LMS), and other educational applications.

**Current Version**: OneRoster v1.2 (published 2021)

### 5.2 OneRoster Components

**1. Data Model**:
- **Core Entities**: Orgs, Academic Sessions, Courses, Classes, Users, Enrollments, Demographics
- **Relationships**: Many-to-many relationships via junction tables
- **Identifiers**: `sourcedId` (unique identifier), status (active/tobedeleted)

**2. REST API**:
- RESTful API for real-time data exchange
- Standard endpoints: `/users`, `/orgs`, `/classes`, `/enrollments`, etc.
- Query parameters: Filtering, pagination, sorting, field selection
- Authentication: OAuth 2.0 or API keys

**3. CSV Bulk Data Format**:
- CSV files for batch data import/export
- Manifest file lists all CSV files
- Standardized column names
- Used for initial roster import and periodic bulk updates

### 5.3 Japan Profile Extensions

**Japan Profile v1.2.2** extends OneRoster v1.2 with Japan-specific requirements:

**1. Metadata Extensions** (`metadata.jp.*`):
- Kana name representations (hiragana, katakana)
- Attendance numbers (出席番号)
- Homeroom class information (学年・組)
- Japanese grade levels (小1, 中2, 高3)

**2. Grade and Class Structure**:
- Mapping Japanese grade/class to OneRoster Class entity
- Homeroom class type (`type: homeroom`)
- Subject class type (`type: scheduled`)

**3. Japanese Academic Year**:
- School year: April to March
- Academic Session structure aligned with Japanese terms

**4. CSV Format Enhancements**:
- Additional columns for Japanese-specific fields
- Kana field columns in CSV files
- Japanese character encoding (UTF-8 with BOM)

---

## 6. Product Features

### 6.1 Core Features

**1. OneRoster v1.2 REST API (Fully Compliant)**
- All standard endpoints: `/users`, `/orgs`, `/classes`, `/courses`, `/enrollments`, `/academicSessions`, `/demographics`
- Standard query parameters: `limit`, `offset`, `orderBy`, `filter`, `fields`
- OneRoster filter syntax parser
- Pagination support (offset-based)
- Field selection for optimized responses

**2. Japan Profile 1.2.2 Support**
- Kana name fields (hiragana, katakana)
- Attendance number support
- Japanese grade/class structure
- Japanese academic year calendar
- Metadata extensions for Japanese-specific data

**3. CSV Import/Export**
- Streaming CSV parser (handles 100MB+ files)
- Supports 200,000+ records
- Background job processing with progress tracking
- Validation with detailed error reporting
- CSV generation for bulk export

**4. Security and Access Control**
- API key authentication with bcrypt hashing
- IP whitelist per API key
- Rate limiting (sliding window algorithm)
- Comprehensive audit logging (all CRUD operations)
- Role-based access control (future)

**5. Data Synchronization**
- Real-time updates via REST API
- Bulk synchronization via CSV import
- Delta API for incremental updates (via `dateLastModified`)
- Soft deletes (status-based)

### 6.2 Integration Scenarios

**Scenario 1: School Administration System to Learning Portal**
1. School updates student roster in administration system
2. Administration system exports OneRoster CSV files
3. RosterHub imports CSV files via background job
4. Learning portal queries RosterHub API for updated roster
5. Students see correct class assignments in learning portal

**Scenario 2: Real-Time Student Transfer**
1. Student transfers to new school (転入)
2. School administration system calls RosterHub API to create/update user
3. RosterHub immediately updates roster database
4. All connected learning portals receive updates via webhook (future) or poll API
5. Student account is provisioned in learning portals

**Scenario 3: Year-End Class Reorganization**
1. School decides new class assignments for next year (クラス替え)
2. School administration system generates OneRoster CSV with new class data
3. RosterHub imports CSV in background (20,000 students in 5 minutes)
4. Learning portals query updated roster before new school year starts
5. Students automatically enrolled in new classes

---

## 7. Competitive Landscape

### 7.1 Current Solutions

**1. Manual Data Entry**
- **Current State**: School staff manually enter roster data into each learning platform
- **Pain Point**: Time-consuming, error-prone, not scalable
- **RosterHub Advantage**: Automated data exchange eliminates manual entry

**2. Vendor-Specific Integration**
- **Current State**: Each learning platform has proprietary import format
- **Pain Point**: Vendor lock-in, high switching costs, no interoperability
- **RosterHub Advantage**: Open standard (OneRoster) enables vendor-neutral integration

**3. CSV File Exchange**
- **Current State**: Schools export CSV from administration system, manually import to learning platforms
- **Pain Point**: Manual file transfer, no real-time updates, format inconsistencies
- **RosterHub Advantage**: Automated CSV import/export + real-time API

**4. Custom API Integration**
- **Current State**: Some schools develop custom integration scripts
- **Pain Point**: High development cost, maintenance burden, not reusable
- **RosterHub Advantage**: Standard API with comprehensive documentation

### 7.2 Differentiators

**1. OneRoster International Standard Compliance**
- Ensures interoperability with global learning platforms
- Future-proof: Standard is actively maintained by 1EdTech Consortium
- Vendor-neutral: No lock-in to specific vendors

**2. Japan Profile Support**
- Only solution that fully supports Japan Profile 1.2.2 extensions
- Native support for Japanese educational concepts
- Developed with input from Japanese educators and vendors

**3. High Performance**
- Handles large datasets (200,000+ students/teachers)
- Streaming CSV processing for large files
- Background job processing for bulk operations
- Redis caching for fast API responses

**4. Comprehensive Security**
- Enterprise-grade authentication and authorization
- Audit logging for compliance (e.g., GDPR, Japanese privacy laws)
- IP whitelisting for network-level security
- Rate limiting to prevent abuse

---

## 8. Business Model

### 8.1 Target Deployment Models

**1. SaaS (Software as a Service)**
- RosterHub hosted in cloud (AWS, Google Cloud, Azure)
- Schools subscribe to RosterHub service
- Pricing: Per-student/per-school pricing
- Benefits: No infrastructure management, automatic updates

**2. On-Premises Installation**
- Schools or municipalities host RosterHub in their data centers
- Docker-based deployment for easy setup
- Licensing: Annual license fee
- Benefits: Data sovereignty, full control

**3. Hybrid Cloud**
- RosterHub hosted in municipality/prefecture cloud
- Multiple schools share one instance
- Pricing: Per-organization subscription
- Benefits: Cost sharing, local data residency

### 8.2 Revenue Streams (Potential)

**1. Subscription Fees**
- Per-student pricing (e.g., ¥10-50 per student per year)
- Per-school flat rate (e.g., ¥100,000-500,000 per year)
- Per-municipality bulk pricing

**2. Professional Services**
- Integration consulting
- Custom API development
- Training and onboarding

**3. Support Contracts**
- Premium support with SLA
- 24/7 support for large deployments

---

## 9. Success Metrics

### 9.1 Product Metrics

**Adoption**:
- Number of schools using RosterHub
- Number of students/teachers managed
- Number of connected learning platforms per school

**Usage**:
- API request volume (requests/day)
- CSV import job volume (jobs/month)
- Average roster update frequency

**Performance**:
- API response time (95th percentile < 200ms)
- CSV import throughput (200,000 records in < 30 minutes)
- System uptime (99.9% availability)

### 9.2 Business Metrics

**Time Savings**:
- Hours saved per school on roster data entry
- Reduction in data entry errors
- Faster student onboarding (transfer students)

**User Satisfaction**:
- Net Promoter Score (NPS) from school administrators
- Support ticket volume and resolution time
- Feature request fulfillment rate

**Market Penetration**:
- Percentage of target schools using RosterHub
- Geographic coverage (prefectures, municipalities)
- Learning platform vendor adoption

---

## 10. Regulatory and Compliance

### 10.1 Privacy Laws

**1. Personal Information Protection Act (個人情報保護法)**
- Japanese privacy law for handling personal data
- RosterHub must ensure: Secure storage, access control, audit logging
- Student/teacher data is personal information requiring protection

**2. GDPR (General Data Protection Regulation)**
- If RosterHub is used by EU schools (future expansion)
- Right to erasure (soft delete support)
- Data portability (CSV export)
- Consent management (future enhancement)

### 10.2 Educational Data Standards

**1. 1EdTech Consortium Standards**
- OneRoster v1.2 specification compliance
- LTI (Learning Tools Interoperability) compatibility (future)

**2. Japan Ministry of Education Standards**
- Alignment with GIGA School Initiative (GIGAスクール構想)
- Learning e-Portal Standard Model (学習eポータル標準モデル)
- ICT CONNECT 21 guidelines

---

## 11. Roadmap and Future Vision

### 11.1 Short-Term (6 months)

**1. Complete OneRoster v1.2 + Japan Profile 1.2.2 Implementation**
- All core entities and endpoints
- Full CSV import/export support
- Production-ready security and performance

**2. Reference Implementation and Documentation**
- Integration guides for school administration systems
- Sample code for learning platform vendors
- API documentation with Swagger/OpenAPI

**3. Pilot Deployment**
- 3-5 schools in different prefectures
- 2-3 learning platform integrations
- Feedback collection and iteration

### 11.2 Medium-Term (12 months)

**1. LTI Integration**
- LTI Advantage support for seamless learning tool integration
- Single Sign-On (SSO) with school identity providers

**2. Real-Time Event Notifications**
- Webhook support for roster change notifications
- WebSocket support for real-time updates

**3. Multi-Tenancy**
- Support for multiple schools/organizations in single instance
- Data isolation and access control

**4. Advanced Analytics**
- Roster data quality dashboards
- Synchronization status monitoring
- Usage analytics for schools

### 11.3 Long-Term (2+ years)

**1. International Expansion**
- Support for other Asian countries (South Korea, Taiwan, Singapore)
- Multi-language support
- Country-specific profile extensions

**2. Learning Analytics Integration**
- Caliper Analytics support
- Learning data warehouse integration
- Cross-platform learning analytics

**3. AI-Powered Features**
- Automatic class assignment optimization
- Anomaly detection in roster data
- Predictive enrollment management

---

## Summary

RosterHub is an **integration hub for educational roster data exchange** that:

**Solves Critical Problems**:
- Eliminates manual roster data entry burden for Japanese schools
- Standardizes roster data exchange using international OneRoster standard
- Supports Japanese education system specifics via Japan Profile

**Targets Specific Users**:
- School IT administrators (primary users)
- School administration staff (indirect users)
- System integrators and learning platform vendors (technical users)

**Delivers Key Value**:
- Time savings: 20-40 hours per school per year
- Data accuracy: Eliminates duplicate data entry errors
- Interoperability: Vendor-neutral standard enables platform switching

**Built on Strong Foundation**:
- OneRoster v1.2 international standard (1EdTech Consortium)
- Japan Profile 1.2.2 (1EdTech Japan, ICT CONNECT 21)
- Modern technology stack (NestJS, PostgreSQL, Prisma, Docker)

**Addresses Japanese Educational Domain**:
- Homeroom vs. subject class distinction
- Japanese academic year (April to March)
- Kana name representations
- Grade/class structure (学年・組)
- Attendance numbers (出席番号)

RosterHub is positioned to become the **standard roster data hub** for Japanese educational institutions, enabling seamless integration between school administration systems and learning platforms.
