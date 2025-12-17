# Product Context

**Project**: RosterHub
**Last Updated**: 2025-12-17
**Version**: 1.0

---

## Product Vision

**Vision Statement**: 教育データの標準化と連携を通じて、日本の教育DXを加速する

> 校務支援システムと学習ツール間のデータ連携を標準化・自動化し、
> 教育委員会と学校現場の業務効率化を実現します。

**Mission**: OneRoster Japan Profile 1.2.2準拠の教育データ連携ハブを提供し、
大規模展開（10,000〜200,000ユーザー）に対応したエンタープライズグレードのソリューションを構築する。

---

## Product Overview

### What is RosterHub?

**OneRoster Japan Profile 1.2.2対応 教育データ連携ハブ**

RosterHubは、教育委員会レベルでの大規模展開を想定した、標準化された教育データ連携プラットフォームです。
校務支援システム（SIS）と学習管理システム（LMS）間のデータ交換を自動化し、
教職員の業務負担を軽減します。

### Problem Statement

**問題**: 教育現場では複数のシステム間でのデータ連携が手作業で行われており、
以下の課題が存在します：
- 児童生徒・教職員データの二重入力
- システム間のデータ不整合
- 大規模データ移行の時間とコスト
- 各ベンダー独自フォーマットへの対応負担

### Solution

**解決策**: OneRoster Japan Profile 1.2.2に準拠した標準データ連携ハブを提供し：
- CSVインポート/エクスポートによる一括データ操作
- REST APIによるリアルタイム連携
- 差分同期APIによる効率的な増分更新
- エンタープライズセキュリティ（APIキー認証、監査ログ）

---

## Target Users

### Primary Users

#### User Persona 1: 教育委員会 情報システム担当者

**Demographics**:
- **Role**: 教育委員会の情報システム管理者
- **Organization Size**: 10,000〜200,000ユーザー（複数校を統括）
- **Technical Level**: 中〜高（システム管理経験あり）

**Goals**:
- 管轄内全校のデータを一元管理
- 年度更新作業の効率化
- システム間のデータ整合性確保

**Pain Points**:
- 各校からのデータ収集・集約に時間がかかる
- ベンダーごとに異なるデータフォーマット
- 大規模データ処理のパフォーマンス問題

**Use Cases**:
- 年度初めの一括データインポート
- 学期中の差分データ同期
- 監査用データエクスポート

#### User Persona 2: 学校 教務主任/情報担当

**Demographics**:
- **Role**: 学校の教務主任または情報担当教員
- **Organization Size**: 100〜2,000ユーザー（単一校）
- **Technical Level**: 低〜中

**Goals**:
- クラス編成・名簿管理の効率化
- 学習ツールへの児童生徒データ連携

**Pain Points**:
- CSVフォーマットの理解・作成が困難
- データ入力ミスによる連携エラー

---

## Core Product Capabilities

### Must-Have Features (MVP)

1. **CSVインポート/エクスポート**
   - **Description**: OneRoster Japan Profile 1.2.2準拠のCSVファイル処理
   - **User Value**: 大容量データの一括処理（100MB+、200,000+レコード）
   - **Priority**: P0 (Critical)

2. **REST API**
   - **Description**: フルCRUD操作、ページネーション、フィルタリング、ソート
   - **User Value**: 外部システムとのリアルタイム連携
   - **Priority**: P0 (Critical)

3. **差分/増分API**
   - **Description**: タイムスタンプベースの変更追跡
   - **User Value**: 効率的なデータ同期
   - **Priority**: P0 (Critical)

4. **エンタープライズセキュリティ**
   - **Description**: APIキー認証、IPホワイトリスト、レート制限、監査ログ
   - **User Value**: 組織のセキュリティポリシー準拠
   - **Priority**: P0 (Critical)

---

## OneRoster Japan Profile 1.2.2 対応エンティティ

| エンティティ | 説明 | 状態 |
|-------------|------|------|
| **Users** | 児童生徒・教職員 | ✅ Repository完了 |
| **Orgs** | 学校・教育委員会 | ✅ Repository完了 |
| **Classes** | クラス・学級 | ✅ Repository完了 |
| **Courses** | 教科・科目 | ✅ Repository完了 |
| **Enrollments** | 所属関係 | ✅ Repository完了 |
| **AcademicSessions** | 年度・学期 | ✅ Repository完了 |
| **Demographics** | 属性情報 | ✅ Repository完了 |

---

## Non-Functional Requirements

### Performance
- 200,000レコードのCSV処理 < 30分
- 100同時ユーザー対応
- API レスポンス P95 < 200ms

### Security
- APIキー認証（bcryptハッシュ化）
- IPホワイトリスト
- 監査ログ（GDPR準拠）

### Scalability
- 水平スケーリング対応（Kubernetes）
- バックグラウンドジョブ処理（BullMQ）

---

*Run `#sdd-steering` to update this document after product changes.*

3. **{{FEATURE_3}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P0 (Critical)

### High-Priority Features (Post-MVP)

4. **{{FEATURE_4}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P1 (High)

5. **{{FEATURE_5}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P1 (High)

### Future Features (Roadmap)

6. **{{FEATURE_6}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P2 (Medium)

7. **{{FEATURE_7}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P3 (Low)

---

## Product Principles

### Design Principles

1. **{{PRINCIPLE_1}}**
   - [Description of what this means for product decisions]

2. **{{PRINCIPLE_2}}**
   - [Description]

3. **{{PRINCIPLE_3}}**
   - [Description]

**Examples**:

- **Simplicity First**: Favor simple solutions over complex ones
- **User Empowerment**: Give users control and flexibility
- **Speed & Performance**: Fast response times (< 200ms)

### User Experience Principles

1. **{{UX_PRINCIPLE_1}}**
   - [How this guides UX decisions]

2. **{{UX_PRINCIPLE_2}}**
   - [How this guides UX decisions]

**Examples**:

- **Progressive Disclosure**: Show advanced features only when needed
- **Accessibility First**: WCAG 2.1 AA compliance
- **Mobile-First**: Design for mobile, enhance for desktop

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Business Metrics

| Metric                              | Target            | Measurement    |
| ----------------------------------- | ----------------- | -------------- |
| **Monthly Active Users (MAU)**      | {{MAU_TARGET}}    | [How measured] |
| **Monthly Recurring Revenue (MRR)** | ${{MRR_TARGET}}   | [How measured] |
| **Customer Acquisition Cost (CAC)** | ${{CAC_TARGET}}   | [How measured] |
| **Customer Lifetime Value (LTV)**   | ${{LTV_TARGET}}   | [How measured] |
| **Churn Rate**                      | < {{CHURN_RATE}}% | [How measured] |

#### Product Metrics

| Metric                       | Target                | Measurement    |
| ---------------------------- | --------------------- | -------------- |
| **Daily Active Users (DAU)** | {{DAU_TARGET}}        | [How measured] |
| **Feature Adoption Rate**    | > {{ADOPTION_RATE}}%  | [How measured] |
| **User Retention (Day 7)**   | > {{RETENTION_RATE}}% | [How measured] |
| **Net Promoter Score (NPS)** | > {{NPS_TARGET}}      | [How measured] |

#### Technical Metrics

| Metric                      | Target  | Measurement             |
| --------------------------- | ------- | ----------------------- |
| **API Response Time (p95)** | < 200ms | Monitoring dashboard    |
| **Uptime**                  | 99.9%   | Status page             |
| **Error Rate**              | < 0.1%  | Error tracking (Sentry) |
| **Page Load Time**          | < 2s    | Web vitals              |

---

## Product Roadmap

### Phase 1: MVP (Months 1-3)

**Goal**: Launch minimum viable product

**Features**:

- [Feature 1]
- [Feature 2]
- [Feature 3]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

### Phase 2: Growth (Months 4-6)

**Goal**: Achieve product-market fit

**Features**:

- [Feature 4]
- [Feature 5]
- [Feature 6]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

### Phase 3: Scale (Months 7-12)

**Goal**: Scale to {{USER_TARGET}} users

**Features**:

- [Feature 7]
- [Feature 8]
- [Feature 9]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

## User Workflows

### Primary Workflow 1: {{WORKFLOW_1_NAME}}

**User Goal**: {{USER_GOAL}}

**Steps**:

1. User [action 1]
2. System [response 1]
3. User [action 2]
4. System [response 2]
5. User achieves [goal]

**Success Criteria**:

- User completes workflow in < {{TIME}} minutes
- Success rate > {{SUCCESS_RATE}}%

---

### Primary Workflow 2: {{WORKFLOW_2_NAME}}

**User Goal**: {{USER_GOAL}}

**Steps**:

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

## Business Domain

### Domain Concepts

Key concepts and terminology used in this domain:

1. **{{CONCEPT_1}}**: [Definition and importance]
2. **{{CONCEPT_2}}**: [Definition and importance]
3. **{{CONCEPT_3}}**: [Definition and importance]

**Example for SaaS Authentication**:

- **Identity Provider (IdP)**: Service that authenticates users
- **Single Sign-On (SSO)**: One login for multiple applications
- **Multi-Factor Authentication (MFA)**: Additional verification step

### Business Rules

1. **{{RULE_1}}**
   - [Description of business rule]
   - **Example**: [Concrete example]

2. **{{RULE_2}}**
   - [Description]
   - **Example**: [Example]

**Example for E-commerce**:

- **Inventory Reservation**: Reserved items held for 10 minutes during checkout
- **Refund Window**: Refunds allowed within 30 days of purchase

---

## Constraints & Requirements

### Business Constraints

- **Budget**: ${{BUDGET}}
- **Timeline**: {{TIMELINE}}
- **Team Size**: {{TEAM_SIZE}} engineers
- **Launch Date**: {{LAUNCH_DATE}}

### Compliance Requirements

- **{{COMPLIANCE_1}}**: [Description, e.g., GDPR, SOC 2, HIPAA]
- **{{COMPLIANCE_2}}**: [Description]
- **Data Residency**: [Requirements, e.g., EU data stays in EU]

### Non-Functional Requirements

- **Performance**: API response < 200ms (95th percentile)
- **Availability**: 99.9% uptime SLA
- **Scalability**: Support {{CONCURRENT_USERS}} concurrent users
- **Security**: OWASP Top 10 compliance
- **Accessibility**: WCAG 2.1 AA compliance

---

## Stakeholders

### Internal Stakeholders

| Role                    | Name                 | Responsibilities                  |
| ----------------------- | -------------------- | --------------------------------- |
| **Product Owner**       | {{PO_NAME}}          | Vision, roadmap, priorities       |
| **Tech Lead**           | {{TECH_LEAD_NAME}}   | Architecture, technical decisions |
| **Engineering Manager** | {{EM_NAME}}          | Team management, delivery         |
| **QA Lead**             | {{QA_LEAD_NAME}}     | Quality assurance, testing        |
| **Design Lead**         | {{DESIGN_LEAD_NAME}} | UX/UI design                      |

### External Stakeholders

| Role                        | Name        | Responsibilities            |
| --------------------------- | ----------- | --------------------------- |
| **Customer Advisory Board** | [Members]   | Product feedback            |
| **Investors**               | [Names]     | Funding, strategic guidance |
| **Partners**                | [Companies] | Integration, co-marketing   |

---

## Go-to-Market Strategy

### Launch Strategy

**Target Launch Date**: {{LAUNCH_DATE}}

**Launch Phases**:

1. **Private Beta** ({{START_DATE}} - {{END_DATE}})
   - Invite-only, 50 beta users
   - Focus: Gather feedback, fix critical bugs

2. **Public Beta** ({{START_DATE}} - {{END_DATE}})
   - Open signup
   - Focus: Validate product-market fit

3. **General Availability** ({{LAUNCH_DATE}})
   - Full public launch
   - Focus: Acquisition and growth

### Marketing Channels

- **{{CHANNEL_1}}**: [Strategy, e.g., Content marketing, SEO]
- **{{CHANNEL_2}}**: [Strategy, e.g., Social media, Twitter/LinkedIn]
- **{{CHANNEL_3}}**: [Strategy, e.g., Paid ads, Google/Facebook]
- **{{CHANNEL_4}}**: [Strategy, e.g., Partnerships, integrations]

---

## Risk Assessment

### Product Risks

| Risk       | Probability     | Impact          | Mitigation            |
| ---------- | --------------- | --------------- | --------------------- |
| {{RISK_1}} | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |
| {{RISK_2}} | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |

**Example Risks**:

- **Low adoption**: Users don't understand value → Clear onboarding, demos
- **Performance issues**: System slow at scale → Load testing, optimization
- **Security breach**: Data compromised → Security audit, penetration testing

---

## Customer Support

### Support Channels

- **Email**: support@{{COMPANY}}.com
- **Chat**: In-app live chat (business hours)
- **Documentation**: docs.{{COMPANY}}.com
- **Community**: Forum/Discord/Slack

### Support SLA

| Tier              | Response Time | Resolution Time |
| ----------------- | ------------- | --------------- |
| **Critical (P0)** | < 1 hour      | < 4 hours       |
| **High (P1)**     | < 4 hours     | < 24 hours      |
| **Medium (P2)**   | < 24 hours    | < 3 days        |
| **Low (P3)**      | < 48 hours    | Best effort     |

---

## Product Analytics

### Analytics Tools

- **{{ANALYTICS_TOOL_1}}**: [Purpose, e.g., Google Analytics, Mixpanel]
- **{{ANALYTICS_TOOL_2}}**: [Purpose, e.g., Amplitude, Heap]

### Events to Track

| Event               | Description            | Purpose           |
| ------------------- | ---------------------- | ----------------- |
| `user_signup`       | New user registration  | Track acquisition |
| `feature_used`      | User uses core feature | Track engagement  |
| `payment_completed` | User completes payment | Track conversion  |
| `error_occurred`    | User encounters error  | Track reliability |

---

## Localization & Internationalization

### Supported Languages

- **Primary**: English (en-US)
- **Secondary**: [Languages, e.g., Japanese (ja-JP), Spanish (es-ES)]

### Localization Strategy

- **UI Strings**: i18n framework (next-intl, react-i18next)
- **Date/Time**: Locale-aware formatting
- **Currency**: Multi-currency support
- **Right-to-Left (RTL)**: Support for Arabic, Hebrew (if needed)

---

## Data & Privacy

### Data Collection

**What data we collect**:

- User account information (email, name)
- Usage analytics (anonymized)
- Error logs (for debugging)

**What data we DON'T collect**:

- [Sensitive data we avoid, e.g., passwords (only hashed), payment details (tokenized)]

### Privacy Policy

- **GDPR Compliance**: Right to access, delete, export data
- **Data Retention**: [Retention period, e.g., 90 days for logs]
- **Third-Party Sharing**: [Who we share data with, why]

---

## Integrations

### Existing Integrations

| Integration       | Purpose   | Priority |
| ----------------- | --------- | -------- |
| {{INTEGRATION_1}} | [Purpose] | P0       |
| {{INTEGRATION_2}} | [Purpose] | P1       |

### Planned Integrations

| Integration       | Purpose   | Timeline |
| ----------------- | --------- | -------- |
| {{INTEGRATION_3}} | [Purpose] | Q2 2025  |
| {{INTEGRATION_4}} | [Purpose] | Q3 2025  |

---

## Changelog

### Version 1.1 (Planned)

- [Future product updates]

---

**Last Updated**: 2025-12-17
**Maintained By**: {{MAINTAINER}}
