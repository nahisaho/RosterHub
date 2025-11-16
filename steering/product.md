# Product Context - RosterHub

## Overview
This document defines the business context, product purpose, and core capabilities of RosterHub. It helps AI agents understand the "why" behind development decisions and ensures alignment with business goals.

**Last Updated**: 2025-11-14 (Updated by Steering Agent)

---

## Product Vision

### What We're Building
**RosterHub** is a **OneRoster Japan Profile 1.2.2 Integration Hub** designed to standardize and automate educational data integration between school information systems (校務支援システム) and learning tools. Built for Board of Education (教育委員会) level deployments managing 10,000 to 200,000 users across multiple schools.

### Problem We're Solving
Educational institutions currently struggle with:
- **Manual CSV Operations**: Time-consuming manual export/import workflows between systems
- **Data Integration Chaos**: Non-standard formats requiring custom integration for each vendor
- **Synchronization Errors**: Manual data updates leading to inconsistencies across systems
- **Security Risks**: CSV files transmitted via email or file sharing services
- **Compliance Challenges**: Difficulty meeting personal information protection regulations
- **Scalability Issues**: Manual processes cannot scale to 100,000+ user organizations

### Target Users

**Primary Audience**: Board of Education (教育委員会) - Prefecture/Municipal Level
- **Organization Scale**: Managing 10,000-200,000 students and staff
- **User Count**: 10-100 system administrators and integration managers
- **Use Case**: Centralized data hub connecting school systems to multiple learning platforms
- **Technical Level**: Intermediate (system administrators, IT staff)

**Secondary Audience**: Schools and Educational Institutions
- **Organization Scale**: Individual schools with 500-5,000 students
- **Use Case**: Direct integration with school information systems
- **Technical Level**: Basic to intermediate

**Tertiary Audience**: Vendors and Learning Platform Providers
- **Use Case**: Consume OneRoster-compliant data via REST API
- **Technical Level**: Advanced (developer/integration teams)

---

## Core Capabilities

### Must-Have Features (MVP)

#### 1. OneRoster Japan Profile 1.2.2 CSV Import
- **User Value**: Bulk data import from school information systems (100MB+ files, 200,000+ users)
- **Priority**: Critical
- **Description**: Streaming CSV parser supporting all Japan Profile entities with validation and background processing (30-minute async jobs)

#### 2. OneRoster Japan Profile 1.2.2 CSV Export
- **User Value**: Standardized data export for learning tools supporting CSV import
- **Priority**: Critical
- **Description**: Generate Japan Profile-compliant CSV files with proper encoding (UTF-8 BOM), metadata fields, and bulk download

#### 3. OneRoster REST API (Bulk Access)
- **User Value**: Real-time data access for learning platforms via standard API
- **Priority**: Critical
- **Description**: Full CRUD operations for all OneRoster entities with pagination, filtering, and sorting

#### 4. OneRoster Delta/Incremental API
- **User Value**: Efficient synchronization by fetching only changed data since last sync
- **Priority**: High
- **Description**: Timestamp-based change tracking with `dateLastModified` queries, supporting soft deletes (`status='tobedeleted'`)

#### 5. Data Validation and Error Handling
- **User Value**: Prevent invalid data from entering the system, provide clear error reports
- **Priority**: Critical
- **Description**: Japan Profile field validation, reference integrity checks, duplicate detection, and detailed error reporting

#### 6. API Authentication and Security
- **User Value**: Secure API access with granular permission control
- **Priority**: Critical
- **Description**: API Key authentication with IP whitelist restrictions, rate limiting, and audit logging

### High-Priority Features (Phase 2)

- **Web-based CSV Import UI**: Browser-based upload with progress tracking
- **Data Mapping Configuration**: Custom field mapping for non-standard source systems
- **Advanced Monitoring Dashboard**: Real-time sync status, error analytics, and audit trail visualization
- **Webhook Notifications**: Event-driven notifications for data changes
- **Multi-tenancy Support**: Isolated environments for multiple Board of Education clients

### Nice-to-Have Features (Future Phases)

- **Real-time Data Streaming**: WebSocket-based real-time updates
- **Data Quality Reporting**: Automated data quality checks and recommendations
- **Multi-language Support**: UI and documentation in English, Japanese, and other languages
- **Advanced Analytics**: Usage analytics, sync performance metrics, and trend analysis
- **Custom Entity Extensions**: Support for vendor-specific extensions beyond Japan Profile

### Explicitly Out of Scope

- **OneRoster 1.1 or earlier versions** (only 1.2.2 Japan Profile supported)
- **Custom data formats** (non-OneRoster standards)
- **Direct database integration** (API-only external access)
- **Learning management system features** (LMS/LTI functionality)
- **Student information system functionality** (RosterHub is integration only)
- **Real-time chat or collaboration** (not a communication platform)

---

## Business Model

### Revenue Model
- **Subscription-based SaaS** (per organization or per user)
- **Tiered Pricing**:
  - **Starter**: Up to 10,000 users - Basic CSV import/export + REST API
  - **Professional**: Up to 50,000 users - Full feature set with Delta API
  - **Enterprise**: 50,000+ users - Custom SLA, dedicated support, on-premise deployment option
- **Annual contracts** with volume discounts

### Key Metrics
Success metrics we track:
- **Data Accuracy Rate**: Percentage of successful imports without validation errors (target: 99%+)
- **API Uptime**: System availability (target: 99.9%)
- **Sync Performance**: Average CSV import time for 100,000 users (target: < 30 minutes)
- **Customer Retention Rate**: Annual renewal rate (target: 95%+)
- **Integration Volume**: Number of active learning tool integrations per customer
- **Error Resolution Time**: Time from error detection to resolution (target: < 1 hour for critical issues)

---

## User Personas

### Persona 1: Takashi (Board of Education System Administrator)
**Background**: IT manager at a prefecture Board of Education managing 150,000 students across 300 schools, responsible for data integration between school systems and learning platforms

**Goals**:
- Automate CSV data exchange workflows (eliminate manual processes)
- Ensure data consistency across all integrated systems
- Comply with personal information protection regulations
- Reduce integration setup time for new learning tools (from weeks to hours)
- Monitor data synchronization status in real-time

**Pain Points**:
- Manual CSV export/import takes 2-3 hours weekly per integration
- Frequent data format errors due to vendor-specific variations
- Difficult to track which systems have up-to-date data
- No audit trail for data changes
- Security risks with CSV files sent via email

**How They Use RosterHub**:
- Weekly: Monitor sync status dashboard, review error reports
- Monthly: Generate compliance reports, review audit logs
- As needed: Configure new learning tool integrations, update IP whitelists for vendors
- Daily: Receive notifications for sync failures or validation errors

### Persona 2: Yuki (Learning Platform Vendor - Integration Engineer)
**Background**: Integration engineer at a learning management system vendor, implements OneRoster API clients for school data synchronization

**Goals**:
- Quickly integrate with Board of Education data sources (standard OneRoster API)
- Fetch only changed data since last sync (efficient Delta API usage)
- Minimize implementation time and maintenance overhead
- Provide reliable real-time student roster data to their platform

**Pain Points**:
- Each Board of Education has different CSV formats or APIs
- No standardized incremental sync mechanism (must re-fetch all data)
- Difficult to debug integration issues without proper error messages
- Authentication and security requirements vary by institution

**How They Use RosterHub**:
- Initial Setup: Obtain API key, configure IP whitelist, test endpoints
- Daily: Automated sync jobs fetch delta changes via REST API (`?filter=dateLastModified>={timestamp}`)
- As needed: Debug issues using detailed error responses and audit logs
- Monthly: Review API usage reports and performance metrics

### Persona 3: Kenji (School Principal)
**Background**: Principal of a large high school (3,000 students), wants visibility into data integration without technical details

**Goals**:
- Ensure student and teacher data is always up-to-date in learning tools
- Verify compliance with data protection regulations
- Receive alerts for critical data issues (e.g., missing student records)

**Pain Points**:
- Relies on IT staff for integration status updates
- Difficult to understand technical error messages
- Concerned about student data security and privacy compliance

**How They Use RosterHub**:
- Weekly: View simplified dashboard showing sync status (green/yellow/red indicators)
- As needed: Review compliance reports for audits
- Rarely: Receive critical error notifications via email

---

## Product Principles

### Design Principles
1. **Standards Compliance First**: 100% adherence to OneRoster Japan Profile 1.2.2 specification
2. **Automation Over Manual Work**: Eliminate manual CSV handling wherever possible
3. **Error Transparency**: Provide detailed, actionable error messages for validation failures
4. **Security by Default**: API authentication and IP restrictions enabled out of the box
5. **Scalability for Large Organizations**: Support 200,000+ users without performance degradation

### Development Priorities
When making tradeoffs:
1. **Data Integrity > Performance**: Never compromise data accuracy for speed
2. **Compliance > Feature Velocity**: Regulatory requirements are non-negotiable
3. **API Stability > New Features**: Breaking changes require major version updates
4. **Observability > Complexity**: Comprehensive logging and monitoring over feature additions
5. **Documentation > Automation**: Well-documented manual processes beat poorly documented automation

---

## Competitive Landscape

### Main Competitors
1. **Custom In-house Solutions**: Many Boards of Education build proprietary integration scripts
   - **Strengths**: Tailored to specific needs, full control
   - **Weaknesses**: High maintenance cost, not standardized, difficult to scale

2. **Vendor-specific Integration Platforms**: Learning tool vendors provide custom connectors
   - **Strengths**: Deep integration with vendor's platform
   - **Weaknesses**: Lock-in, non-standard formats, requires separate integration per vendor

3. **General-purpose Integration Platforms** (e.g., Mulesoft, Dell Boomi):
   - **Strengths**: Flexible, supports many protocols
   - **Weaknesses**: Expensive, requires significant configuration, not OneRoster-focused

4. **CSV Manual Exchange**: Current status quo in many Japanese schools
   - **Strengths**: Simple, no software required
   - **Weaknesses**: Error-prone, time-consuming, not scalable, security risks

### Our Differentiation
- **OneRoster Japan Profile Native Support**: Purpose-built for Japanese educational institutions
- **Large-scale Focus**: Optimized for 100,000+ user organizations (Board of Education level)
- **Comprehensive Delta Sync**: Efficient incremental updates via standardized API
- **Compliance-ready**: Built-in support for Japanese personal information protection laws and MEXT guidelines
- **Vendor-neutral Hub**: Centralized integration point for multiple learning tools (not tied to one vendor)
- **Transparent Pricing**: Simple per-user or per-organization pricing (no hidden fees)

---

## Domain Terminology

### Key Terms
Standard terminology to use consistently (English / Japanese):

- **OneRoster**: International standard for educational data interoperability / 教育データ標準規格
- **Japan Profile**: OneRoster specification adapted for Japanese educational institutions / 日本版プロファイル
- **Board of Education**: Prefecture or municipal education authority / 教育委員会
- **School Information System**: System managing student and teacher records / 校務支援システム
- **Learning Tool**: Third-party educational software consuming roster data / 学習ツール
- **Roster Data**: Student, teacher, class, and enrollment information / 名簿データ
- **sourcedId**: Unique identifier in OneRoster specification / OneRoster一意識別子
- **Delta API**: API endpoint for fetching incremental changes / 差分取得API
- **Bulk API**: API endpoint for full dataset access / 一括取得API
- **CSV Import**: Batch data upload via CSV files / CSVインポート
- **Validation Error**: Data quality issue detected during import / 検証エラー
- **Metadata Field**: Japan Profile extension field (e.g., `metadata.jp.*`) / メタデータフィールド

### Avoid These Terms
Terms that might cause confusion:
- Don't say "roster management system" (RosterHub is integration, not a SIS)
- Don't say "LMS" for RosterHub (it's not a learning management system)
- Don't say "CSV sync" (use "CSV import/export")
- Don't say "real-time sync" (Delta API is near-real-time, not instant)

---

## User Journey

### Typical User Flow

#### Board of Education IT Administrator - Initial Setup:
1. Sign up for RosterHub account (organization registration)
2. Configure organization settings (name, scale, compliance preferences)
3. Generate API keys for learning tool vendors
4. Configure IP whitelist for vendor access
5. Perform initial CSV bulk import (full roster data from school system)
6. Verify data accuracy via dashboard
7. Distribute API keys and documentation to vendors
8. Configure sync schedules (daily, weekly)

#### Board of Education IT Administrator - Weekly Usage:
1. Monitor sync dashboard (check for failed jobs or validation errors)
2. Review error reports for CSV imports
3. Perform weekly CSV import (updated roster data from school system)
4. Verify data consistency across integrated learning tools
5. Generate compliance reports for audits

#### Learning Platform Vendor - Initial Integration:
1. Receive API key and IP whitelist confirmation from Board of Education
2. Test API endpoints using Swagger/OpenAPI documentation
3. Implement initial bulk data fetch (all users, orgs, classes, enrollments)
4. Verify data mapping to vendor's internal data model
5. Implement Delta API polling (fetch changes every 24 hours)

#### Learning Platform Vendor - Daily Operations:
1. Automated job runs Delta API query (`?filter=dateLastModified>={last_sync_time}`)
2. Process new, updated, and deleted records (soft deletes via `status='tobedeleted'`)
3. Update vendor's database with synchronized data
4. Log sync status and errors
5. Alert vendor support team if critical errors occur

---

## Integration Strategy

### Must-Have Integrations
Essential for product success:
- **School Information Systems (SIS)**: Bulk CSV export from major Japanese SIS vendors
- **Learning Management Systems (LMS)**: OneRoster API clients for major LMS platforms
- **Identity Providers**: SAML/OAuth integration for Single Sign-On (future phase)
- **Audit Logging Systems**: Structured log export for compliance reporting

### High-Priority Integrations
Important but not blocking MVP:
- **Cloud Storage**: S3/Azure Blob for large CSV file uploads
- **Monitoring Services**: Datadog, New Relic, or Grafana for observability
- **Notification Services**: Email (SendGrid) and webhook notifications for sync events
- **Data Quality Tools**: Integration with data validation services

### Future Integrations
Nice to have, but not critical:
- **Business Intelligence Tools**: Tableau, PowerBI connectors for analytics
- **Workflow Automation**: Zapier, Make.com for custom automation
- **Communication Platforms**: Slack, Microsoft Teams for alert notifications

---

## Compliance & Regulations

### Requirements
Regulatory requirements to comply with:

- **Personal Information Protection Act (個人情報保護法 - Japan)**:
  - Secure storage of student/teacher personal data
  - Data access logging and audit trail
  - Data retention and deletion policies

- **Act on the Protection of Personal Information Held by Administrative Organs (行政機関個人情報保護法)**:
  - Applicable to Board of Education (government agencies)
  - Strict access control and encryption requirements

- **GDPR Compliance** (for potential EU students/staff):
  - Right to access, rectify, and delete personal data
  - Data portability and consent management

- **MEXT Guidelines (文部科学省ガイドライン)**:
  - Educational data security best practices
  - Incident response procedures
  - Vendor management requirements

- **WCAG 2.1 AA Accessibility**: Web dashboard accessible to users with disabilities

- **ISO 27001 / SOC 2 Type II** (for enterprise customers):
  - Information security management
  - Data center security controls

### Data Security Requirements
- **Encryption at Rest**: AES-256 for database storage (Planned)
- **Encryption in Transit**: TLS 1.3 for all API communications (Planned - infrastructure)
- **Access Control**: Role-based access control (RBAC) with least privilege principle (Planned)
- **API Authentication**: ✅ API Key + IP whitelist + rate limiting (Sprint 5 Complete)
  - Cryptographically secure API key generation (256-bit entropy)
  - Bcrypt hashing (12 salt rounds) for secure storage
  - Redis caching (5-minute TTL) for performance
  - IPv4/IPv6/CIDR whitelist validation
  - Sliding window rate limiting (1000 req/hour default, configurable per API key)
- **Audit Logging**: ✅ All data access and modifications logged with timestamp, user, and IP address (Sprint 5 Complete)
  - Database persistence (AuditLog table) + console logging
  - Request/response capture with data sanitization
  - Entity context extraction (type, action, sourcedId)
  - GDPR compliance features (data access logging, retention policy)
- **Data Retention**: Configurable retention policies (default: 2 years for audit logs) ✅ (Sprint 5 Complete)
- **Backup and Recovery**: Automated daily backups with 30-day retention, RPO < 24 hours, RTO < 4 hours (Planned)

---

## Roadmap Themes

### Phase 1: Core Integration Platform (Months 1-6) - CURRENT PHASE
**Goal**: OneRoster Japan Profile 1.2.2 compliant CSV import/export and REST API

**Completed**:
- ✅ Sprint 0: Research (OneRoster Base, Japan Profile 1.2.2, Gap Analysis)
- ✅ Sprint 1: Requirements Definition (91 EARS-format requirements)
- ✅ Sprint 2: Project Setup (NestJS, Prisma, PostgreSQL, Redis, Docker)
- ✅ Sprint 3: Database Layer (Prisma schema, migrations, repositories)
- ✅ Sprint 4: Entity Modules (Users, Orgs, Classes, Courses, Enrollments, AcademicSessions, Demographics)
- ✅ Sprint 5: Security Implementation
  - API Key Management (generation, validation, revocation)
  - IP Whitelist Guard (IPv4/IPv6/CIDR support)
  - Rate Limiting Guards (token bucket + sliding window algorithms)
  - Enhanced Audit Logging (database + console, GDPR compliance)
  - 14 new files (~3,257 lines), 26 unit tests

**Overall Progress**: 76/104 tasks complete (73%)

**In Progress**:
- Sprint 6: CSV Processing (import/export modules)
- Sprint 7-8: Advanced API Features (filter parser, field selection)

**Planned**:
- Sprint 9-10: Comprehensive Testing (unit, integration, E2E)
- Sprint 11: Deployment (Docker, CI/CD, monitoring)
- Admin dashboard (monitoring and management UI)

### Phase 2: Enhanced Operations (Months 7-12)
**Goal**: Production-ready platform with advanced monitoring and management

- Web-based CSV import UI with progress tracking
- Advanced dashboard with error analytics and trend analysis
- Data mapping configuration UI (custom field mappings)
- Webhook notifications for sync events
- Performance optimization (query optimization, caching)
- Comprehensive test coverage (80%+ unit + integration + E2E)
- Production deployment and monitoring

### Phase 3: Enterprise Features (Months 13-18)
**Goal**: Scale to multiple Board of Education clients with multi-tenancy

- Multi-tenancy architecture with data isolation
- Custom SLA support and dedicated support channels
- Advanced analytics dashboard (usage metrics, cost analysis)
- On-premise deployment option (containerized)
- Advanced security features (MFA, SSO integration)
- Disaster recovery and business continuity planning

### Future Considerations
- Real-time data streaming (WebSocket-based)
- AI-powered data quality recommendations
- Custom entity extensions beyond Japan Profile
- International OneRoster support (other country profiles)
- Integration marketplace (third-party plugins)

---

## Technical Constraints

### Scale Requirements
- **User Capacity**: 10,000 to 200,000 users per organization
- **CSV File Size**: Support up to 100MB+ files (streaming processing required)
- **API Throughput**: 1,000 requests per minute per organization
- **Data Volume**: 1 million+ records (users, orgs, classes, enrollments combined)
- **Concurrent Imports**: 10 simultaneous CSV import jobs

### Performance Targets
- **CSV Import**: Complete 200,000-user import in < 30 minutes
- **API Response Time**: 95th percentile < 500ms, 99th percentile < 1 second
- **Delta API Query**: Return 10,000 changed records in < 5 seconds
- **Dashboard Load Time**: < 2 seconds for status overview

### Compliance Constraints
- **Data Residency**: Data stored in Japan-based data centers (for compliance)
- **Audit Log Retention**: Minimum 3 years (configurable per organization)
- **Encryption Standards**: TLS 1.3 (transit), AES-256 (rest)
- **API Key Rotation**: Support 90-day forced rotation for enterprise customers

---

**Note**: This document should be updated as product direction evolves. Keep it focused on high-level context rather than detailed specifications (those belong in requirements and design documents).

**Last Updated**: 2025-11-15 (Updated by Steering Agent - Sprint 5 Security Implementation Complete)
