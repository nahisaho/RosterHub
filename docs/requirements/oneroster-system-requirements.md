# OneRoster Japan Profile 1.2.2 準拠システム - 要件定義書

**プロジェクト名**: OneRoster Data Integration System
**バージョン**: 1.0
**作成日**: 2025-11-14
**作成者**: Requirements Analyst AI
**ステータス**: Draft
**準拠規格**: OneRoster Japan Profile 1.2.2

---

## Document Overview

### Purpose
本ドキュメントは、OneRoster Japan Profile 1.2.2に完全準拠したデータ連携システムの要件を定義します。本システムは、校務支援システムと学習ツール間のデータ連携を標準化し、CSV手動運用の自動化を実現することを目的とします。

### Scope

**対象範囲:**
- OneRoster Japan Profile 1.2.2 全エンティティの実装
- CSV一括インポート/エクスポート機能
- REST API（Bulk API、Delta/Incremental API）
- データ検証および変換機能
- セキュリティ（API Key認証、IPアドレス制限）
- コンプライアンス（個人情報保護法、GDPR、文科省ガイドライン）

**対象外:**
- OneRoster 1.2以前のバージョンサポート
- 国際版OneRosterの独自拡張仕様
- リアルタイムデータ同期（Deltaは差分取得のみ）
- カスタムデータフォーマット（OneRoster以外）

### Audience
- 外部ベンダー・開発パートナー（承認者）
- System Architect（アーキテクチャ設計者）
- Software Developer（開発者）
- Test Engineer（テストエンジニア）
- QA Team（品質保証チーム）
- Database Administrator（データベース管理者）

### References
- **OneRoster Japan Profile 1.2.2 仕様書**: [IMS Global Learning Consortium Japan](https://www.imsglobal.org/oneroster-v11-final-specification)
- **個人情報保護法**: [個人情報保護委員会](https://www.ppc.go.jp/)
- **GDPR**: [EU General Data Protection Regulation](https://gdpr-info.eu/)
- **文科省ガイドライン**: [教育情報セキュリティポリシーに関するガイドライン](https://www.mext.go.jp/)
- **Research Documents**:
  - `docs/research/oneroster-japan-profile-research.md` - OneRoster仕様調査
  - `docs/research/oneroster-incremental-api-research.md` - Delta API仕様調査

---

## Executive Summary

### Project Overview

本プロジェクトは、**教育委員会配下の学校（10,000〜200,000名規模）** における校務支援システムと学習ツール間のデータ連携を自動化するシステムです。現在のCSV手動エクスポート・インポート運用を廃止し、OneRoster Japan Profile 1.2.2準拠のAPIおよびCSV一括処理により、データ連携の標準化と効率化を実現します。

### Key Business Drivers

1. **データ連携の標準化**: OneRoster Japan Profile 1.2.2への完全準拠
2. **運用自動化**: CSV手動運用の廃止、API連携による自動化
3. **正確性の確保**: データ検証機能によるエラー防止
4. **セキュリティ・コンプライアンス**: 個人情報保護、GDPR、文科省ガイドライン遵守
5. **将来拡張性**: 新規エンティティ追加、仕様変更への対応容易性

### Target Scale

- **対象規模**: 10,000〜200,000名（教育委員会配下の学校）
- **CSVファイルサイズ**: 最大100MB+
- **処理時間要件**: 30分以内（200,000名フルインポート）
- **同時利用者**: 10〜100名（システム管理者、連携設定担当者）

### Quality Priorities

本プロジェクトでは、以下の優先順位で品質特性を重視します：

1. **正確性（Correctness）**: OneRoster仕様完全準拠、データ整合性100%
2. **拡張性（Extensibility）**: 将来の機能追加、仕様変更への対応容易性
3. **保守性（Maintainability）**: コード可読性、ドキュメント整備、テストカバレッジ80%+
4. **運用性（Operability）**: 監視、ログ管理、エラートレーサビリティ

### Deliverables Summary

本要件定義書では、以下の要件カテゴリを定義します：

- **機能要件（Functional Requirements）**:
  - CSV インポート機能（REQ-CSV-001〜020）
  - CSV エクスポート機能（REQ-EXP-001〜010）
  - OneRoster データモデル（REQ-MDL-001〜030）
  - REST API機能（REQ-API-001〜030、Delta/Incremental API含む）
  - データ検証機能（REQ-VAL-001〜020）

- **非機能要件（Non-Functional Requirements）**:
  - パフォーマンス要件（REQ-PRF-001〜010）
  - 可用性要件（REQ-AVL-001〜005）
  - セキュリティ要件（REQ-SEC-001〜020）
  - コンプライアンス要件（REQ-CMP-001〜015）
  - 運用要件（REQ-OPS-001〜010）

### Compliance Framework

本システムは、以下の法規制・ガイドラインに準拠します：

- **個人情報保護法**: 生徒・教職員の個人データ保護、目的外利用禁止、安全管理措置
- **GDPR（General Data Protection Regulation）**: EU在住生徒のデータ保護、削除権対応
- **文科省「教育情報セキュリティポリシーに関するガイドライン」**: 教育データの適切な管理・保護

---

## Document Structure

本要件定義書は、以下のセクションで構成されます：

1. **ドキュメント情報・エグゼクティブサマリー**（本セクション）
2. **プロジェクト概要**: 目的、スコープ、ステークホルダー
3. **システムアーキテクチャ概要**: システム構成、データフロー、対象エンティティ
4. **機能要件（EARS形式）**: 5つのサブセクションに分割
   - Part 1: CSV インポート機能
   - Part 2: CSV エクスポート機能
   - Part 3: OneRoster データモデル
   - Part 4: REST API機能（Delta/Incremental API含む）
   - Part 5: データ検証機能
5. **非機能要件（EARS形式）**: 4つのサブセクションに分割
   - Part 1: パフォーマンス要件、可用性要件
   - Part 2: セキュリティ要件
   - Part 3: コンプライアンス要件
   - Part 4: 運用要件
6. **テスト要件**: テスト戦略、受入テスト基準
7. **トレーサビリティマトリクス**: 要件とリサーチドキュメントの対応
8. **付録**: 用語集、参考文献、承認記録

---

**Version Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | Requirements Analyst AI | Initial version - Section 1 completed |

---

**Note**: 本ドキュメントはEARS形式（Easy Approach to Requirements Syntax）に準拠して記述されています。各要件は以下のパターンで記述されます：
- **WHEN** (Event-Driven): イベント発生時の動作
- **WHILE** (State-Driven): 特定状態における継続的な動作
- **IF...THEN** (Unwanted Behavior): エラー処理
- **WHERE** (Optional Feature): オプション機能
- **SHALL** (Ubiquitous): 常時適用される要件

詳細は `steering/rules/ears-format.md` を参照してください。

---

## 2. プロジェクト概要

### 2.1 プロジェクト目的

#### 2.1.1 ビジネス目的

**主要目的**: 教育機関におけるデータ連携の標準化と自動化

本プロジェクトは、以下のビジネス目標を達成します：

1. **データ連携の標準化**
   - OneRoster Japan Profile 1.2.2準拠により、校務支援システムと学習ツール間のデータフォーマットを統一
   - 教育委員会配下の全学校で一貫したデータ連携基盤を構築
   - ベンダー依存を低減し、システム選択の自由度を向上

2. **運用コスト削減**
   - CSV手動エクスポート・インポート作業の廃止（月40時間→0時間）
   - データ連携エラーの削減（手動入力ミス防止）
   - システム管理者の作業負荷軽減

3. **データ品質向上**
   - 自動検証機能によるデータ整合性の確保
   - リアルタイムなエラー検出と通知
   - 監査ログによるトレーサビリティ

4. **セキュリティ強化**
   - API Key認証とIPアドレス制限による不正アクセス防止
   - 個人情報保護法、GDPR、文科省ガイドライン遵守
   - 暗号化通信（TLS 1.3）による盗聴防止

#### 2.1.2 技術目的

**技術的達成目標**:

- **OneRoster Japan Profile 1.2.2完全準拠**: 全エンティティ、全フィールドの実装
- **大規模データ処理**: 200,000名、100MB+のCSVを30分以内に処理
- **API提供**: REST API（Bulk API、Delta/Incremental API）
- **拡張性**: 将来の仕様変更、新規エンティティ追加への対応
- **テスト可能性**: 80%以上のテストカバレッジ、自動テスト基盤

---

### 2.2 対象範囲（Scope）

#### 2.2.1 対象機能（In Scope）

以下の機能が本プロジェクトの対象範囲です：

**A. CSV処理機能**
- OneRoster Japan Profile 1.2.2形式のCSV一括インポート
- OneRoster Japan Profile 1.2.2形式のCSV一括エクスポート
- マルチエンティティCSV処理（全エンティティ同時処理）
- 大規模CSVファイル対応（100MB+、200,000レコード+）

**B. REST API機能**
- Bulk API（全件取得）
- Delta/Incremental API（差分取得）
  - `dateCreated`および`dateLastModified`フィールド追跡
  - 新規レコード判定（`dateCreated == dateLastModified`）
  - 更新レコード判定（`dateCreated < dateLastModified`）
- OneRoster 1.2準拠のエンドポイント設計
- JSON形式のレスポンス

**C. データモデル**
- OneRoster Japan Profile 1.2.2 全エンティティ対応:
  - orgs（組織）
  - academicSessions（学年・学期）
  - courses（コース）
  - classes（クラス）
  - users（ユーザー：生徒・教職員）
  - enrollments（履修登録）
  - demographics（人口統計情報）
  - その他拡張エンティティ
- すべてのフィールド（必須・オプション）の実装
- データ型検証、関連性検証

**D. セキュリティ機能**
- API Key認証
- IPアドレスアクセス制御
- TLS 1.3暗号化通信
- 監査ログ記録

**E. データ検証機能**
- OneRoster仕様準拠検証
- データ型検証
- 必須フィールドチェック
- 参照整合性チェック（外部キー検証）
- 重複チェック

**F. コンプライアンス対応**
- 個人情報保護法準拠
- GDPR準拠（削除権対応）
- 文科省ガイドライン準拠

#### 2.2.2 対象外機能（Out of Scope）

以下は本プロジェクトの対象外です：

**A. 過去バージョンサポート**
- OneRoster 1.0、1.1のサポート
- 国際版OneRoster独自拡張仕様

**B. リアルタイム同期**
- WebSocketによるリアルタイムデータ同期
- Change Data Capture（CDC）
- イベント駆動アーキテクチャ

**C. カスタムフォーマット**
- OneRoster以外のデータフォーマット
- 学校独自のCSV形式
- Excel形式の直接インポート

**D. UI/管理画面**
- データ編集用Webインターフェース
- ダッシュボード、レポート機能
- ユーザー管理UI

**E. 外部システム連携（Phase 1）**
- 校務支援システムとの直接連携
- 学習ツールとの直接連携
- SSOシステム連携

---

### 2.3 ステークホルダー

#### 2.3.1 主要ステークホルダー

| ステークホルダー | 役割 | 責任 | 関心事 |
|----------------|------|------|--------|
| **外部ベンダー・開発パートナー** | 承認者、要件定義レビュアー | 要件承認、仕様確定 | OneRoster仕様準拠、拡張性 |
| **教育委員会 情報システム部門** | システム所有者 | 予算承認、運用方針決定 | コスト削減、運用効率化 |
| **学校 システム管理者** | エンドユーザー | データ連携設定、運用 | 使いやすさ、エラー対応 |
| **校務支援システムベンダー** | データ提供元 | CSVエクスポート実装 | データ形式互換性 |
| **学習ツールベンダー** | データ利用先 | API統合実装 | APIレスポンス速度、データ正確性 |

#### 2.3.2 技術ステークホルダー

| ステークホルダー | 役割 | 責任 |
|----------------|------|------|
| **System Architect** | アーキテクチャ設計 | システム設計、技術選定 |
| **Software Developer** | 実装 | コーディング、単体テスト |
| **Test Engineer** | テスト設計・実行 | テスト計画、自動テスト構築 |
| **QA Team** | 品質保証 | 受入テスト、品質評価 |
| **Database Administrator** | データベース管理 | スキーマ設計、パフォーマンスチューニング |
| **Security Auditor** | セキュリティ監査 | 脆弱性診断、コンプライアンスチェック |

#### 2.3.3 エンドユーザー

**直接ユーザー（システム管理者）**:
- **人数**: 10〜100名
- **役割**: データ連携設定、CSV手動アップロード（必要時）、エラー監視
- **技術レベル**: 中級（基本的なCSV操作、API概念理解）
- **利用頻度**: 毎日（ログ確認）、週次（CSV更新）

**間接ユーザー（校務支援システム・学習ツール）**:
- **校務支援システム**: CSVエクスポート、API連携設定
- **学習ツール**: API経由でのデータ取得、差分同期

---

### 2.4 プロジェクト制約

#### 2.4.1 技術制約

- **OneRoster Japan Profile 1.2.2完全準拠**: 仕様からの逸脱不可
- **処理時間**: 200,000名のフルインポートを30分以内に完了
- **CSVファイルサイズ**: 最大100MB+対応
- **同時接続**: 10〜100ユーザー対応
- **可用性**: 99% SLA（年間ダウンタイム87.6時間以内）

#### 2.4.2 ビジネス制約

- **予算**: 未定（できるだけ早くリリース）
- **リリース時期**: 未定、できるだけ早く
- **承認者**: 外部ベンダー・開発パートナー
- **品質優先順位**: 正確性 > 拡張性 > 保守性 > 運用性

#### 2.4.3 法規制制約

- **個人情報保護法**: 生徒・教職員の個人データ保護義務
- **GDPR**: EU在住生徒のデータ保護、削除権対応
- **文科省ガイドライン**: 教育情報セキュリティポリシー遵守

#### 2.4.4 運用制約

- **既存運用**: CSV手動エクスポート→手動インポート（廃止予定）
- **段階的移行**: 一括リリース（全機能同時実装）
- **ベンダー連携**: 校務支援システムベンダー、学習ツールベンダーとの調整必要

---

### 2.5 前提条件

本プロジェクトは、以下を前提条件とします：

1. **OneRoster Japan Profile 1.2.2仕様の確定**: 仕様変更がないこと
2. **校務支援システムの対応**: OneRoster形式のCSVエクスポート機能実装済み
3. **学習ツールの対応**: REST API統合機能実装済み
4. **ネットワーク環境**: インターネット接続、TLS 1.3対応
5. **インフラ**: データベース（PostgreSQL推奨）、Webサーバー、ストレージ確保
6. **テストデータ**: 校務支援システムからのサンプルCSV提供

---

**Version Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | Requirements Analyst AI | Section 1 completed |
| 1.1 | 2025-11-14 | Requirements Analyst AI | Section 2 completed - Project Overview |
| 1.2 | 2025-11-14 | Requirements Analyst AI | Section 3 completed - System Architecture Overview |

---

## 3. システムアーキテクチャ概要

### 3.1 システム構成

#### 3.1.1 全体アーキテクチャ

本システムは、以下の3層構造で構成されます：

```
┌─────────────────────────────────────────────────────────────┐
│                    データ提供元（Source）                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         校務支援システム（SIS）                        │   │
│  │  - 生徒情報管理                                       │   │
│  │  - 成績管理                                           │   │
│  │  - 出席管理                                           │   │
│  │  - OneRoster CSV エクスポート機能                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ CSV Export (Manual/Automated)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              OneRoster Data Integration System              │
│                    (本システム)                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              CSV Processing Layer                    │   │
│  │  - CSV Import Service (Bulk)                         │   │
│  │  - CSV Export Service (Bulk)                         │   │
│  │  - Data Validation Service                           │   │
│  │  - Error Handling Service                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              REST API Layer                          │   │
│  │  - Bulk API (全件取得)                                │   │
│  │  - Delta API (差分取得)                               │   │
│  │  - Authentication Middleware (API Key)               │   │
│  │  - Authorization Middleware (IP Filtering)           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Data Model Layer                        │   │
│  │  - orgs (組織)                                        │   │
│  │  - academicSessions (学年・学期)                      │   │
│  │  - courses (コース)                                   │   │
│  │  - classes (クラス)                                   │   │
│  │  - users (ユーザー)                                   │   │
│  │  - enrollments (履修登録)                             │   │
│  │  - demographics (人口統計)                            │   │
│  │  - dateCreated / dateLastModified (差分追跡)          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Security Layer                          │   │
│  │  - TLS 1.3 Encryption                                │   │
│  │  - API Key Management                                │   │
│  │  - IP Address Access Control                         │   │
│  │  - Audit Logging                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Data Store Layer                        │   │
│  │  - PostgreSQL Database (Primary)                     │   │
│  │  - File Storage (CSV Upload)                         │   │
│  │  - Audit Log Store                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API (HTTPS)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   データ利用先（Consumer）                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         学習ツール（LMS/LTI）                          │   │
│  │  - eラーニングプラットフォーム                         │   │
│  │  - 協働学習ツール                                     │   │
│  │  - 成績分析ツール                                     │   │
│  │  - OneRoster API Client                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.2 主要コンポーネント

| コンポーネント | 責務 | 技術スタック（推奨） |
|--------------|------|-------------------|
| **CSV Processing Service** | CSV一括インポート・エクスポート | Python/Node.js + Pandas/Papa Parse |
| **REST API Service** | Bulk API、Delta API提供 | NestJS/Express + TypeScript |
| **Data Validation Service** | OneRoster仕様準拠検証 | JSON Schema + カスタムバリデーター |
| **Authentication Service** | API Key認証、IPアドレス制御 | Passport.js/NestJS Guards |
| **Database Service** | データ永続化、CRUD操作 | Prisma ORM + PostgreSQL |
| **Audit Logging Service** | 監査ログ記録 | Winston/Pino Logger |
| **File Storage Service** | CSVアップロード保存 | AWS S3 / Local Storage |

---

### 3.2 データフロー

#### 3.2.1 CSV インポートフロー

```
[校務支援システム]
       │
       │ 1. CSV Export
       ▼
[CSVファイル (100MB+)]
       │
       │ 2. Manual Upload / Automated Transfer
       ▼
[CSV Import Service]
       │
       ├─ 3. File Validation (サイズ、フォーマット)
       │
       ├─ 4. CSV Parsing (全エンティティ読み込み)
       │
       ├─ 5. Data Validation
       │     ├─ OneRoster仕様準拠チェック
       │     ├─ データ型検証
       │     ├─ 必須フィールド検証
       │     ├─ 参照整合性検証（外部キー）
       │     └─ 重複チェック
       │
       ├─ 6. Transformation (必要に応じて)
       │
       ├─ 7. Database Transaction
       │     ├─ UPSERT (Insert or Update)
       │     ├─ dateCreated 設定（新規レコード）
       │     └─ dateLastModified 更新（既存レコード）
       │
       ├─ 8. Audit Logging
       │
       └─ 9. Import Result Response
             ├─ Success: レコード数、処理時間
             └─ Error: エラー詳細（行番号、エラー内容）
```

#### 3.2.2 REST API データ取得フロー（Delta API）

```
[学習ツール]
       │
       │ 1. API Request
       │    GET /ims/oneroster/v1p2/users?filter=dateLastModified>=2025-01-01T00:00:00Z
       │    Header: Authorization: Bearer {API_KEY}
       ▼
[API Gateway]
       │
       ├─ 2. Authentication (API Key検証)
       │
       ├─ 3. Authorization (IPアドレス検証)
       │
       ├─ 4. Rate Limiting (100 req/min)
       │
       └─ 5. Audit Logging (アクセスログ記録)
              │
              ▼
[REST API Service]
       │
       ├─ 6. Query Parsing
       │     ├─ filter パラメータ解析
       │     ├─ limit, offset パラメータ解析
       │     └─ fields パラメータ解析
       │
       ├─ 7. Database Query
       │     SELECT * FROM users
       │     WHERE dateLastModified >= '2025-01-01T00:00:00Z'
       │     ORDER BY dateLastModified ASC
       │     LIMIT 100
       │
       ├─ 8. Response Formatting (OneRoster JSON)
       │     {
       │       "users": [...],
       │       "warnings": [...],
       │       "metadata": {
       │         "total": 1234,
       │         "limit": 100,
       │         "offset": 0
       │       }
       │     }
       │
       └─ 9. TLS 1.3 Encrypted Response
              │
              ▼
[学習ツール]
       │
       └─ 10. Data Processing
              ├─ 新規レコード判定 (dateCreated == dateLastModified)
              ├─ 更新レコード判定 (dateCreated < dateLastModified)
              └─ ローカルデータベース同期
```

#### 3.2.3 CSV エクスポートフロー

```
[Export Request]
       │
       │ 1. Export API Call / UI Trigger
       ▼
[CSV Export Service]
       │
       ├─ 2. Database Query (全エンティティ)
       │     ├─ SELECT * FROM orgs
       │     ├─ SELECT * FROM academicSessions
       │     ├─ SELECT * FROM users
       │     └─ ... (全エンティティ)
       │
       ├─ 3. Data Transformation
       │     └─ OneRoster CSV形式に変換
       │
       ├─ 4. CSV Generation (マルチファイル)
       │     ├─ orgs.csv
       │     ├─ academicSessions.csv
       │     ├─ users.csv
       │     └─ ... (全エンティティCSV)
       │
       ├─ 5. ZIP Compression (manifest.csv含む)
       │
       ├─ 6. File Storage (一時保存)
       │
       └─ 7. Download URL Response
              │
              ▼
[Download (HTTPS)]
       │
       ▼
[校務支援システム / 管理者]
```

---

### 3.3 対象エンティティ（OneRoster Japan Profile 1.2.2）

本システムは、OneRoster Japan Profile 1.2.2で定義される以下の全エンティティを実装します。

#### 3.3.1 必須エンティティ（Required）

| エンティティ | 説明 | 主要フィールド | レコード数目安 |
|------------|------|--------------|--------------|
| **orgs** | 組織（学校、教育委員会） | sourcedId, name, type, identifier | 1〜100 |
| **academicSessions** | 学年、学期、ターム | sourcedId, title, type, startDate, endDate | 10〜50 |
| **courses** | コース（科目） | sourcedId, title, courseCode | 100〜1,000 |
| **classes** | クラス（授業） | sourcedId, title, classCode, classType, courseSourcedId | 500〜5,000 |
| **users** | ユーザー（生徒・教職員） | sourcedId, username, givenName, familyName, role, email | 10,000〜200,000 |
| **enrollments** | 履修登録（クラス-ユーザー紐付け） | sourcedId, classSourcedId, userSourcedId, role, beginDate, endDate | 50,000〜1,000,000 |

#### 3.3.2 オプションエンティティ（Optional）

| エンティティ | 説明 | 主要フィールド | 実装優先度 |
|------------|------|--------------|-----------|
| **demographics** | 人口統計情報 | sourcedId, userSourcedId, birthDate, sex | High |
| **resources** | 教材リソース | sourcedId, title, vendorResourceId | Medium |
| **lineItems** | 成績項目 | sourcedId, title, description, classSourcedId | Medium |
| **results** | 成績結果 | sourcedId, lineItemSourcedId, studentSourcedId, score | Medium |
| **categories** | カテゴリ | sourcedId, title | Low |

#### 3.3.3 エンティティ間関係

```
orgs (組織)
  │
  ├── academicSessions (学年・学期)
  │
  └── courses (コース)
        │
        └── classes (クラス)
              │
              └── enrollments (履修登録)
                    │
                    ├── users (生徒)
                    │     │
                    │     └── demographics (人口統計)
                    │
                    └── users (教職員)
```

#### 3.3.4 差分追跡フィールド（Delta API用）

すべてのエンティティに以下のフィールドを追加実装します：

| フィールド | データ型 | 説明 | 必須 |
|----------|---------|------|------|
| **dateCreated** | DateTime (ISO 8601) | レコード作成日時 | Yes |
| **dateLastModified** | DateTime (ISO 8601) | レコード最終更新日時 | Yes |
| **status** | Enum (active, tobedeleted) | レコードステータス | Yes |

**差分判定ロジック**:
- **新規レコード**: `dateCreated == dateLastModified`
- **更新レコード**: `dateCreated < dateLastModified`
- **削除済みレコード**: `status == 'tobedeleted'`

---

### 3.4 セキュリティアーキテクチャ

#### 3.4.1 多層防御戦略（Defense in Depth）

```
Layer 1: Network Security
  ├─ TLS 1.3 Encryption (すべての通信)
  ├─ IPアドレスホワイトリスト
  └─ DDoS Protection

Layer 2: Application Security
  ├─ API Key認証（Bearer Token）
  ├─ Rate Limiting（100 req/min/IP）
  ├─ Input Validation（すべてのリクエスト）
  └─ CORS Policy

Layer 3: Data Security
  ├─ Database Encryption at Rest（AES-256）
  ├─ Personal Data Masking（ログ出力時）
  └─ Access Control（Role-Based）

Layer 4: Monitoring & Audit
  ├─ Audit Logging（すべてのAPI呼び出し）
  ├─ Security Event Monitoring
  └─ Anomaly Detection
```

#### 3.4.2 コンプライアンスマッピング

| 要件 | 対応機能 | 実装レイヤー |
|------|---------|------------|
| **個人情報保護法** | データ暗号化、アクセス制御、監査ログ | Data Security Layer |
| **GDPR（削除権）** | データ削除API、削除記録、データエクスポート | REST API Layer |
| **文科省ガイドライン** | アクセスログ、IPアドレス制限、定期バックアップ | Security Layer |

---

### 3.5 スケーラビリティ設計

#### 3.5.1 水平スケーリング対応

- **Stateless API**: セッションをDBに保存し、APIサーバーはステートレス
- **Database Read Replica**: 読み取り負荷をレプリカに分散
- **CDN for Static Files**: CSVダウンロードをCDN経由で配信
- **Load Balancer**: 複数APIサーバーへの負荷分散

#### 3.5.2 パフォーマンス最適化

- **Database Indexing**: `dateLastModified`, `sourcedId`, `status` にインデックス
- **Query Pagination**: デフォルト100件、最大1000件のページネーション
- **CSV Streaming**: 大規模CSVをストリーミング処理（メモリ効率化）
- **Caching**: 頻繁にアクセスされるエンティティ（orgs, academicSessions）をキャッシュ

---

## 4. 機能要件（Functional Requirements）

> **NOTE**: すべての機能要件はEARS形式（Easy Approach to Requirements Syntax）で記述されています。
> 詳細は `steering/rules/ears-format.md` を参照してください。

---

### 4.1 CSV インポート機能（CSV Import）

**概要**: 校務支援システムから出力されたOneRoster Japan Profile 1.2.2準拠のCSVファイルを一括インポートする機能。

---

#### REQ-CSV-001: CSV ファイルアップロード

**Pattern**: Event-Driven (WHEN)

```
WHEN システム管理者がCSVファイルをアップロードした場合、CSV Import Service SHALL ファイルを一時ストレージに保存し、アップロードIDを返却する
```

**根拠（Rationale）**: CSV処理開始前にファイルを安全に保存し、非同期処理を可能にする

**受入基準（Acceptance Criteria）**:
1. ファイルサイズ100MB以下のCSVをアップロード可能
2. アップロード完了後、一意のアップロードID（UUID）を返却
3. ファイルは一時ストレージ（`/tmp/uploads/` またはS3）に保存

**優先度（Priority）**: Critical
**出典（Source）**: Q4（既存運用：CSV手動インポート）、Q7（CSVサイズ100MB+）
**依存関係（Dependencies）**: なし

**Test Verification**:
- [ ] Unit test: ファイル保存ロジック検証
- [ ] Integration test: ストレージへの保存確認
- [ ] E2E test: 100MBファイルアップロード成功

---

#### REQ-CSV-002: マルチファイルZIPアップロード

**Pattern**: Event-Driven (WHEN)

```
WHEN システム管理者がZIP形式のマルチCSVファイルをアップロードした場合、CSV Import Service SHALL ZIPファイルを展開し、全CSVファイルを一時ストレージに保存する
```

**根拠（Rationale）**: OneRoster仕様では複数エンティティが個別CSVファイルとして提供されるため

**受入基準（Acceptance Criteria）**:
1. ZIP内の全CSVファイル（orgs.csv, users.csv等）を展開
2. `manifest.csv`の存在を確認
3. 展開後の合計サイズが200MB以下であることを確認

**優先度（Priority）**: High
**出典（Source）**: OneRoster 1.2仕様（Bulk CSV Format）
**依存関係（Dependencies）**: REQ-CSV-001

**Test Verification**:
- [ ] Unit test: ZIP展開ロジック検証
- [ ] Integration test: マルチファイル保存確認
- [ ] Error test: 破損ZIPファイル処理

---

#### REQ-CSV-003: CSVファイル形式検証

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVファイルがアップロードされた場合、CSV Import Service SHALL ファイル形式（文字コード、区切り文字、ヘッダー行）を検証する
```

**根拠（Rationale）**: OneRoster仕様準拠の確認と、不正ファイル early detection

**受入基準（Acceptance Criteria）**:
1. 文字コード: UTF-8を検証
2. 区切り文字: カンマ（`,`）を検証
3. ヘッダー行: OneRoster仕様準拠フィールド名を検証
4. エンコーディングエラー時は HTTP 400 エラーを返却

**優先度（Priority）**: High
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-CSV-001

**Test Verification**:
- [ ] Unit test: 文字コード検証ロジック
- [ ] Integration test: 不正ファイル rejection
- [ ] Error test: Shift-JIS ファイル拒否確認

---

#### REQ-CSV-004: CSVパースエラーハンドリング

**Pattern**: Unwanted Behavior (IF...THEN)

```
IF CSVパース中にエラーが発生した場合、THEN CSV Import Service SHALL エラー行番号、エラー内容、エラータイプを含むエラーレスポンスを返却し、処理を中断する
```

**根拠（Rationale）**: データ不整合を防ぎ、エラー箇所を明確に特定可能にする

**受入基準（Acceptance Criteria）**:
1. エラーレスポンス形式:
   ```json
   {
     "status": "error",
     "errors": [
       {
         "lineNumber": 123,
         "field": "email",
         "errorType": "INVALID_FORMAT",
         "message": "Invalid email format"
       }
     ]
   }
   ```
2. パースエラー時はデータベーストランザクションをロールバック

**優先度（Priority）**: Critical
**出典（Source）**: Q13（品質優先順位：正確性が最優先）
**依存関係（Dependencies）**: REQ-CSV-003

**Test Verification**:
- [ ] Unit test: エラーハンドリングロジック
- [ ] Integration test: ロールバック確認
- [ ] Error test: 複数エラー同時発生

---

#### REQ-CSV-005: OneRoster必須フィールド検証

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVデータをパースした場合、CSV Import Service SHALL OneRoster Japan Profile 1.2.2で定義される必須フィールドの存在を検証する
```

**根拠（Rationale）**: OneRoster仕様準拠を保証

**受入基準（Acceptance Criteria）**:
1. 必須フィールド（例: `sourcedId`, `status`, `dateLastModified`）の欠落を検出
2. 必須フィールド欠落時はHTTP 400エラーを返却
3. エラーメッセージに欠落フィールド名を含む

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様、Q13（正確性優先）
**依存関係（Dependencies）**: REQ-CSV-003

**Test Verification**:
- [ ] Unit test: 必須フィールド検証ロジック
- [ ] Integration test: 全エンティティ検証
- [ ] Error test: 複数必須フィールド欠落

---

#### REQ-CSV-006: データ型検証

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVデータをパースした場合、CSV Import Service SHALL 各フィールドのデータ型がOneRoster仕様に準拠していることを検証する
```

**根拠（Rationale）**: データ品質保証とデータベース格納時のエラー防止

**受入基準（Acceptance Criteria）**:
1. データ型検証:
   - `status`: Enum (`active`, `tobedeleted`)
   - `dateLastModified`: ISO 8601 DateTime
   - `email`: Email format
   - `role`: Enum (OneRoster Role値)
2. 型不一致時はHTTP 400エラーを返却

**優先度（Priority）**: High
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-CSV-005

**Test Verification**:
- [ ] Unit test: 各データ型検証関数
- [ ] Integration test: 不正データ型rejection
- [ ] Error test: 日付フォーマット異常

---

#### REQ-CSV-007: 参照整合性検証（外部キー）

**Pattern**: Event-Driven (WHEN)

```
WHEN エンティティ間の関連を持つCSVデータを処理する場合、CSV Import Service SHALL 外部キー参照の整合性を検証する
```

**根拠（Rationale）**: データベース制約エラー防止と、データ整合性保証

**受入基準（Acceptance Criteria）**:
1. 外部キー検証例:
   - `enrollments.classSourcedId` → `classes.sourcedId` 存在確認
   - `enrollments.userSourcedId` → `users.sourcedId` 存在確認
   - `classes.courseSourcedId` → `courses.sourcedId` 存在確認
2. 参照先レコード不在時はHTTP 400エラーを返却
3. エラーメッセージに不在の`sourcedId`を含む

**優先度（Priority）**: High
**出典（Source）**: OneRoster仕様（Entity Relationships）
**依存関係（Dependencies）**: REQ-CSV-006

**Test Verification**:
- [ ] Unit test: 外部キー検証ロジック
- [ ] Integration test: エンティティ順序依存テスト
- [ ] Error test: 孤立レコード検出

---

#### REQ-CSV-008: 重複レコード検出

**Pattern**: Event-Driven (WHEN)

```
WHEN 同一`sourcedId`を持つレコードが複数存在する場合、CSV Import Service SHALL 重複エラーを返却する
```

**根拠（Rationale）**: `sourcedId`はOneRosterにおける一意識別子であり、重複は許容されない

**受入基準（Acceptance Criteria）**:
1. CSV内での重複検出
2. 既存データベースレコードとの重複検出
3. 重複検出時はHTTP 409 Conflictエラーを返却

**優先度（Priority）**: High
**出典（Source）**: OneRoster仕様（sourcedId uniqueness）
**依存関係（Dependencies）**: REQ-CSV-006

**Test Verification**:
- [ ] Unit test: 重複検出ロジック
- [ ] Integration test: DB重複チェック
- [ ] Error test: CSV内重複 + DB重複

---

#### REQ-CSV-009: トランザクション処理（All-or-Nothing）

**Pattern**: Ubiquitous (SHALL)

```
CSV Import Service SHALL すべてのCSVファイル処理をアトミックなデータベーストランザクションとして実行し、一部失敗時は全体をロールバックする
```

**根拠（Rationale）**: データ整合性保証と、部分的インポートによる不整合防止

**受入基準（Acceptance Criteria）**:
1. マルチエンティティCSVインポートを単一トランザクションで実行
2. 1つでもエンティティでエラーが発生した場合、全エンティティをロールバック
3. トランザクション分離レベル: READ COMMITTED以上

**優先度（Priority）**: Critical
**出典（Source）**: Q13（正確性優先）
**依存関係（Dependencies）**: REQ-CSV-007

**Test Verification**:
- [ ] Unit test: トランザクションロジック
- [ ] Integration test: ロールバック確認
- [ ] Error test: 大量データロールバック

---

#### REQ-CSV-010: UPSERT処理（Insert or Update）

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVレコードを処理する場合、CSV Import Service SHALL `sourcedId`の存在に基づいてINSERT（新規作成）またはUPDATE（更新）を実行する
```

**根拠（Rationale）**: 既存データの上書き更新とデータ同期を可能にする

**受入基準（Acceptance Criteria）**:
1. `sourcedId`が既存の場合: UPDATE処理
   - `dateLastModified`を現在日時に更新
   - `dateCreated`は変更しない
2. `sourcedId`が新規の場合: INSERT処理
   - `dateCreated`を現在日時に設定
   - `dateLastModified`を現在日時に設定
3. PostgreSQL `ON CONFLICT DO UPDATE`を使用

**優先度（Priority）**: Critical
**出典（Source）**: Q15（Delta API要件）
**依存関係（Dependencies）**: REQ-CSV-009

**Test Verification**:
- [ ] Unit test: UPSERT ロジック
- [ ] Integration test: 新規/更新混在処理
- [ ] Performance test: 大量UPSERTパフォーマンス

---

#### REQ-CSV-011: 大規模CSVストリーミング処理

**Pattern**: Ubiquitous (SHALL)

```
CSV Import Service SHALL 100MB以上の大規模CSVファイルをストリーミング処理し、メモリ使用量を1GB以下に抑える
```

**根拠（Rationale）**: メモリ不足エラー防止と、200,000レコード処理の実現

**受入基準（Acceptance Criteria）**:
1. CSVファイル全体をメモリに読み込まず、行単位でストリーミング処理
2. チャンクサイズ: 1,000行ごとにバッチINSERT
3. メモリ使用量: 1GB以下（ピーク時）
4. 100MB CSVファイルを30分以内に処理

**優先度（Priority）**: High
**出典（Source）**: Q7（CSVサイズ100MB+、処理時間30分以内）
**依存関係（Dependencies）**: REQ-CSV-010

**Test Verification**:
- [ ] Performance test: 100MB CSVインポート
- [ ] Memory test: メモリ使用量測定
- [ ] Load test: 200,000レコード処理

---

#### REQ-CSV-012: 進捗状況レポート

**Pattern**: State-Driven (WHILE)

```
WHILE CSVインポート処理が実行中の場合、CSV Import Service SHALL 進捗状況（処理済みレコード数、総レコード数、進捗率）をリアルタイムに取得可能にする
```

**根拠（Rationale）**: 長時間処理の可視化と、ユーザー体験向上

**受入基準（Acceptance Criteria）**:
1. 進捗API: `GET /imports/{importId}/progress`
2. レスポンス形式:
   ```json
   {
     "importId": "uuid",
     "status": "processing",
     "processedRecords": 5000,
     "totalRecords": 200000,
     "progressPercentage": 2.5,
     "estimatedTimeRemaining": "28 minutes"
   }
   ```
3. 1秒ごとに進捗を更新

**優先度（Priority）**: Medium
**出典（Source）**: Q13（運用性）
**依存関係（Dependencies）**: REQ-CSV-011

**Test Verification**:
- [ ] Unit test: 進捗計算ロジック
- [ ] Integration test: 進捗API動作確認
- [ ] E2E test: UI進捗表示

---

#### REQ-CSV-013: インポート結果サマリー

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVインポート処理が完了した場合、CSV Import Service SHALL 処理結果サマリー（成功/失敗レコード数、処理時間、エラー詳細）を返却する
```

**根拠（Rationale）**: インポート結果の透明性とエラートラブルシューティング

**受入基準（Acceptance Criteria）**:
1. レスポンス形式:
   ```json
   {
     "importId": "uuid",
     "status": "completed",
     "summary": {
       "totalRecords": 200000,
       "successRecords": 199950,
       "errorRecords": 50,
       "processingTime": "28 minutes 15 seconds"
     },
     "errors": [
       {
         "entity": "users",
         "lineNumber": 1234,
         "sourcedId": "user123",
         "errorMessage": "Invalid email format"
       }
     ]
   }
   ```

**優先度（Priority）**: High
**出典（Source）**: Q13（正確性、運用性）
**依存関係（Dependencies）**: REQ-CSV-012

**Test Verification**:
- [ ] Unit test: サマリー生成ロジック
- [ ] Integration test: エラー詳細記録
- [ ] E2E test: 完了通知

---

#### REQ-CSV-014: 監査ログ記録

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVインポート処理が実行された場合、CSV Import Service SHALL 監査ログ（実行者、実行日時、ファイル名、レコード数、結果）を記録する
```

**根拠（Rationale）**: コンプライアンス要件（個人情報保護法、GDPR、文科省ガイドライン）

**受入基準（Acceptance Criteria）**:
1. ログ記録内容:
   - 実行者（ユーザーID、IPアドレス）
   - 実行日時（ISO 8601）
   - ファイル名、ファイルサイズ
   - 処理結果（成功/失敗）
   - レコード数（成功/失敗）
2. ログ保存先: 専用監査ログDB/ファイル
3. ログ保持期間: 1年間

**優先度（Priority）**: High
**出典（Source）**: Q8（コンプライアンス要件）、Q9（監査ログ）
**依存関係（Dependencies）**: REQ-CSV-013

**Test Verification**:
- [ ] Unit test: ログ記録ロジック
- [ ] Integration test: ログDB保存確認
- [ ] Security test: ログ改ざん防止確認

---

#### REQ-CSV-015: エラーリカバリーメカニズム

**Pattern**: Unwanted Behavior (IF...THEN)

```
IF CSVインポート処理中にシステムエラー（データベース接続切断、サーバークラッシュ）が発生した場合、THEN CSV Import Service SHALL 処理を中断し、部分的インポートをロールバックし、エラーログを記録する
```

**根拠（Rationale）**: データ整合性保護と、障害発生時の復旧容易性

**受入基準（Acceptance Criteria）**:
1. データベーストランザクションロールバック
2. 一時ファイルクリーンアップ
3. エラーログ記録（スタックトレース含む）
4. リトライ可能状態の維持

**優先度（Priority）**: High
**出典（Source）**: Q10（可用性99% SLA）
**依存関係（Dependencies）**: REQ-CSV-009

**Test Verification**:
- [ ] Chaos test: DB切断シミュレーション
- [ ] Error test: メモリ不足シミュレーション
- [ ] Recovery test: ロールバック確認

---

#### REQ-CSV-016: 並行インポート制御

**Pattern**: State-Driven (WHILE)

```
WHILE 既存のCSVインポート処理が実行中の場合、CSV Import Service SHALL 新規インポートリクエストをキューに追加し、順次処理する
```

**根拠（Rationale）**: データベースロック競合防止と、システムリソース保護

**受入基準（Acceptance Criteria）**:
1. 同時実行インポート数: 最大1件
2. キューイング: Redis/PostgreSQL Queue
3. キュー状態API: `GET /imports/queue`
4. キュー待機時のHTTP 202 Accepted返却

**優先度（Priority）**: Medium
**出典（Source）**: Q7（同時ユーザー10〜100名）
**依存関係（Dependencies）**: REQ-CSV-011

**Test Verification**:
- [ ] Unit test: キューイングロジック
- [ ] Integration test: 並行リクエスト処理
- [ ] Load test: キューパフォーマンス

---

#### REQ-CSV-017: 差分インポート（Delta Import）

**Pattern**: Optional Feature (WHERE)

```
WHERE 差分インポートモードが有効な場合、CSV Import Service SHALL `status='tobedeleted'`のレコードを論理削除として処理する
```

**根拠（Rationale）**: Delta API要件に対応したデータ同期

**受入基準（Acceptance Criteria）**:
1. `status='active'`: 通常のUPSERT処理
2. `status='tobedeleted'`: データベースレコードに削除フラグを設定（物理削除しない）
3. 削除フラグ設定時に`deletedAt`タイムスタンプを記録

**優先度（Priority）**: High
**出典（Source）**: Q15（Delta API要件）
**依存関係（Dependencies）**: REQ-CSV-010

**Test Verification**:
- [ ] Unit test: 削除フラグロジック
- [ ] Integration test: 論理削除確認
- [ ] E2E test: Delta同期シナリオ

---

#### REQ-CSV-018: インポート履歴保存

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVインポート処理が完了した場合、CSV Import Service SHALL インポート履歴（ファイル名、実行日時、結果、レコード数）をデータベースに保存する
```

**根拠（Rationale）**: 過去のインポート操作追跡と、トラブルシューティング支援

**受入基準（Acceptance Criteria）**:
1. 履歴保存テーブル: `import_history`
2. 保存期間: 無期限（容量監視必要）
3. 履歴取得API: `GET /imports/history?limit=100&offset=0`

**優先度（Priority）**: Medium
**出典（Source）**: Q13（運用性）
**依存関係（Dependencies）**: REQ-CSV-013

**Test Verification**:
- [ ] Unit test: 履歴保存ロジック
- [ ] Integration test: 履歴DB保存確認
- [ ] API test: 履歴取得API

---

#### REQ-CSV-019: CSV検証プレビューモード

**Pattern**: Optional Feature (WHERE)

```
WHERE プレビューモードが有効な場合、CSV Import Service SHALL データベースへの書き込みを行わず、検証結果のみを返却する
```

**根拠（Rationale）**: 本番インポート前の検証と、エラー事前検出

**受入基準（Acceptance Criteria）**:
1. プレビューモード: `POST /imports/preview`
2. 検証実行: データ型、必須フィールド、参照整合性
3. データベース書き込みなし（Dry-Run）
4. 検証結果レスポンス: エラー一覧、警告一覧

**優先度（Priority）**: Medium
**出典（Source）**: Q13（正確性）
**依存関係（Dependencies）**: REQ-CSV-007

**Test Verification**:
- [ ] Unit test: プレビューロジック
- [ ] Integration test: DB書き込みなし確認
- [ ] E2E test: プレビュー→本番インポートフロー

---

#### REQ-CSV-020: ファイル自動削除

**Pattern**: State-Driven (WHILE)

```
WHILE 一時保存されたCSVファイルが24時間以上経過している場合、CSV Import Service SHALL ファイルを自動削除する
```

**根拠（Rationale）**: ストレージ容量管理と、不要ファイル蓄積防止

**受入基準（Acceptance Criteria）**:
1. 自動削除バッチ: 毎日深夜2時実行
2. 削除対象: 作成日時から24時間経過ファイル
3. 削除前ログ記録

**優先度（Priority）**: Low
**出典（Source）**: Q13（運用性）
**依存関係（Dependencies）**: REQ-CSV-001

**Test Verification**:
- [ ] Unit test: ファイル削除ロジック
- [ ] Integration test: バッチ実行確認
- [ ] Cron test: スケジュール動作確認

---

**Version Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | Requirements Analyst AI | Section 1 completed |
| 1.1 | 2025-11-14 | Requirements Analyst AI | Section 2 completed - Project Overview |
| 1.2 | 2025-11-14 | Requirements Analyst AI | Section 3 completed - System Architecture Overview |
| 1.3 | 2025-11-14 | Requirements Analyst AI | Section 4 Part 1 completed - CSV Import Requirements (REQ-CSV-001~020) |
| 1.4 | 2025-11-14 | Requirements Analyst AI | Section 5 completed - CSV Export Requirements (REQ-EXP-001~010) |

---

### 4.2 CSV エクスポート機能（CSV Export）

**概要**: システムに保存されているOneRosterデータをCSV形式でエクスポートする機能。校務支援システムへのデータ戻し、バックアップ、他システム連携に使用。

---

#### REQ-EXP-001: CSVエクスポートリクエスト

**Pattern**: Event-Driven (WHEN)

```
WHEN システム管理者がCSVエクスポートをリクエストした場合、CSV Export Service SHALL エクスポートジョブを作成し、ジョブIDを返却する
```

**根拠（Rationale）**: 大規模データエクスポートの非同期処理と、ユーザー待機時間削減

**受入基準（Acceptance Criteria）**:
1. エクスポートAPI: `POST /exports` リクエスト受付
2. レスポンス形式:
   ```json
   {
     "exportId": "uuid",
     "status": "processing",
     "createdAt": "2025-11-14T10:00:00Z",
     "estimatedCompletionTime": "2025-11-14T10:05:00Z"
   }
   ```
3. エクスポート対象エンティティをリクエストボディで指定可能

**優先度（Priority）**: High
**出典（Source）**: Q4（既存運用：CSVエクスポート）
**依存関係（Dependencies）**: なし

**Test Verification**:
- [ ] Unit test: エクスポートジョブ作成ロジック
- [ ] Integration test: ジョブDB保存確認
- [ ] API test: POST /exports レスポンス検証

---

#### REQ-EXP-002: 全エンティティエクスポート

**Pattern**: Event-Driven (WHEN)

```
WHEN 全エンティティエクスポートがリクエストされた場合、CSV Export Service SHALL OneRoster Japan Profile 1.2.2で定義される全エンティティ（orgs, academicSessions, courses, classes, users, enrollments, demographics）をCSVファイルとして生成する
```

**根拠（Rationale）**: OneRoster仕様準拠の完全データエクスポート

**受入基準（Acceptance Criteria）**:
1. 生成CSVファイル:
   - `orgs.csv`
   - `academicSessions.csv`
   - `courses.csv`
   - `classes.csv`
   - `users.csv`
   - `enrollments.csv`
   - `demographics.csv`
   - `manifest.csv`（メタデータ）
2. 各CSVファイルはOneRoster仕様準拠のヘッダー、データ型
3. 文字コード: UTF-8

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-EXP-001

**Test Verification**:
- [ ] Unit test: 全エンティティCSV生成ロジック
- [ ] Integration test: 全CSVファイル存在確認
- [ ] Compliance test: OneRoster仕様準拠検証

---

#### REQ-EXP-003: 選択的エンティティエクスポート

**Pattern**: Optional Feature (WHERE)

```
WHERE エクスポートリクエストで特定エンティティが指定された場合、CSV Export Service SHALL 指定されたエンティティのみをエクスポートする
```

**根拠（Rationale）**: 部分エクスポートによる処理時間短縮とデータ転送量削減

**受入基準（Acceptance Criteria）**:
1. リクエスト例:
   ```json
   {
     "entities": ["users", "enrollments"]
   }
   ```
2. 指定エンティティのみCSV生成
3. `manifest.csv`には指定エンティティのみ記載

**優先度（Priority）**: Medium
**出典（Source）**: Q13（運用性）
**依存関係（Dependencies）**: REQ-EXP-001

**Test Verification**:
- [ ] Unit test: エンティティフィルタリングロジック
- [ ] Integration test: 選択的エクスポート確認
- [ ] API test: エンティティ指定リクエスト

---

#### REQ-EXP-004: CSV形式検証（OneRoster準拠）

**Pattern**: Ubiquitous (SHALL)

```
CSV Export Service SHALL 生成するCSVファイルがOneRoster Japan Profile 1.2.2仕様に準拠していることを保証する
```

**根拠（Rationale）**: エクスポートデータの品質保証と、他システムでのインポート成功率向上

**受入基準（Acceptance Criteria）**:
1. ヘッダー行: OneRoster仕様準拠フィールド名
2. データ型: 仕様準拠（DateTime ISO 8601、Enum値等）
3. 必須フィールド: すべて出力
4. CSV区切り文字: カンマ（`,`）
5. 文字コード: UTF-8（BOM無し）

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様、Q13（正確性）
**依存関係（Dependencies）**: REQ-EXP-002

**Test Verification**:
- [ ] Unit test: CSV形式検証ロジック
- [ ] Compliance test: 仕様準拠検証
- [ ] Integration test: 外部システムインポート成功確認

---

#### REQ-EXP-005: ZIPファイル生成（manifest.csv含む）

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVエクスポート処理が完了した場合、CSV Export Service SHALL 全CSVファイルと`manifest.csv`を含むZIPアーカイブを生成する
```

**根拠（Rationale）**: OneRoster Bulk CSV仕様準拠と、ファイル転送効率化

**受入基準（Acceptance Criteria）**:
1. ZIPファイル構造:
   ```
   export-2025-11-14.zip
   ├── manifest.csv
   ├── orgs.csv
   ├── academicSessions.csv
   ├── courses.csv
   ├── classes.csv
   ├── users.csv
   ├── enrollments.csv
   └── demographics.csv
   ```
2. `manifest.csv`内容:
   - 各CSVファイル名、レコード数、生成日時
3. ZIP圧縮率: 70%以上（100MB → 30MB以下）

**優先度（Priority）**: High
**出典（Source）**: OneRoster Bulk CSV仕様
**依存関係（Dependencies）**: REQ-EXP-004

**Test Verification**:
- [ ] Unit test: ZIP生成ロジック
- [ ] Integration test: manifest.csv内容検証
- [ ] Compression test: 圧縮率測定

---

#### REQ-EXP-006: エクスポート進捗状況

**Pattern**: State-Driven (WHILE)

```
WHILE CSVエクスポート処理が実行中の場合、CSV Export Service SHALL 進捗状況（処理済みエンティティ、進捗率）をリアルタイムに取得可能にする
```

**根拠（Rationale）**: 長時間処理の可視化とユーザー体験向上

**受入基準（Acceptance Criteria）**:
1. 進捗API: `GET /exports/{exportId}/progress`
2. レスポンス形式:
   ```json
   {
     "exportId": "uuid",
     "status": "processing",
     "processedEntities": ["orgs", "academicSessions"],
     "totalEntities": 7,
     "progressPercentage": 28.5,
     "estimatedTimeRemaining": "3 minutes"
   }
   ```

**優先度（Priority）**: Medium
**出典（Source）**: Q13（運用性）
**依存関係（Dependencies）**: REQ-EXP-001

**Test Verification**:
- [ ] Unit test: 進捗計算ロジック
- [ ] Integration test: 進捗API動作確認
- [ ] E2E test: UI進捗表示

---

#### REQ-EXP-007: エクスポートファイルダウンロード

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVエクスポート処理が完了した場合、CSV Export Service SHALL ダウンロードURL（有効期限付き）を生成し、システム管理者に通知する
```

**根拠（Rationale）**: セキュアなファイル配布と、ストレージ容量管理

**受入基準（Acceptance Criteria）**:
1. ダウンロードURL有効期限: 24時間
2. URL形式: `https://api.example.com/exports/{exportId}/download?token={signed_token}`
3. ダウンロード通知: メール/Webhook
4. HTTPS（TLS 1.3）経由のダウンロード

**優先度（Priority）**: High
**出典（Source）**: Q8（セキュリティ要件）
**依存関係（Dependencies）**: REQ-EXP-005

**Test Verification**:
- [ ] Unit test: URL生成・署名ロジック
- [ ] Security test: トークン検証
- [ ] Integration test: ダウンロード成功確認

---

#### REQ-EXP-008: エクスポート履歴保存

**Pattern**: Event-Driven (WHEN)

```
WHEN CSVエクスポート処理が完了した場合、CSV Export Service SHALL エクスポート履歴（実行者、実行日時、エンティティ、ファイルサイズ、結果）をデータベースに保存する
```

**根拠（Rationale）**: 過去のエクスポート操作追跡とコンプライアンス対応

**受入基準（Acceptance Criteria）**:
1. 履歴保存テーブル: `export_history`
2. 保存期間: 1年間
3. 履歴取得API: `GET /exports/history?limit=100&offset=0`

**優先度（Priority）**: Medium
**出典（Source）**: Q9（監査ログ）
**依存関係（Dependencies）**: REQ-EXP-007

**Test Verification**:
- [ ] Unit test: 履歴保存ロジック
- [ ] Integration test: 履歴DB保存確認
- [ ] API test: 履歴取得API

---

#### REQ-EXP-009: 大規模データエクスポートパフォーマンス

**Pattern**: Ubiquitous (SHALL)

```
CSV Export Service SHALL 200,000レコードのエクスポート処理を10分以内に完了する
```

**根拠（Rationale）**: ユーザー待機時間削減とシステムリソース効率化

**受入基準（Acceptance Criteria）**:
1. 処理時間: 200,000レコード → 10分以内
2. メモリ使用量: 2GB以下
3. ストリーミング処理: 行単位でCSV生成（メモリ全展開しない）
4. バッチクエリ: 10,000レコードごとにDB取得

**優先度（Priority）**: High
**出典（Source）**: Q7（処理時間要件）
**依存関係（Dependencies）**: REQ-EXP-002

**Test Verification**:
- [ ] Performance test: 200,000レコードエクスポート
- [ ] Memory test: メモリ使用量測定
- [ ] Load test: 並行エクスポート

---

#### REQ-EXP-010: エクスポートエラーハンドリング

**Pattern**: Unwanted Behavior (IF...THEN)

```
IF CSVエクスポート処理中にエラー（データベース接続切断、ストレージ容量不足）が発生した場合、THEN CSV Export Service SHALL エクスポート処理を中断し、部分ファイルを削除し、エラーログを記録する
```

**根拠（Rationale）**: データ整合性保護と、障害復旧容易性

**受入基準（Acceptance Criteria）**:
1. エラー検出: DB接続エラー、ディスク容量不足
2. 部分ファイルクリーンアップ
3. エラーステータス更新: `status='failed'`
4. エラー通知: メール/Webhook
5. エラーログ記録（スタックトレース含む）

**優先度（Priority）**: High
**出典（Source）**: Q10（可用性99% SLA）
**依存関係（Dependencies）**: REQ-EXP-001

**Test Verification**:
- [ ] Chaos test: DB切断シミュレーション
- [ ] Error test: ディスク容量不足シミュレーション
- [ ] Recovery test: 部分ファイル削除確認

---

**Section 5 Progress**: ✅ CSV Export Requirements Completed (REQ-EXP-001~010)

---

### 4.3 OneRoster データモデル（Data Model）

**概要**: OneRoster Japan Profile 1.2.2で定義される全エンティティのデータモデル実装要件。各エンティティの必須フィールド、オプションフィールド、データ型、関連性を定義。

---

#### REQ-MDL-001: orgsエンティティ（組織）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL orgsエンティティを以下のフィールドで実装する:
- sourcedId (String, 必須, 一意)
- status (Enum, 必須: active, tobedeleted)
- dateLastModified (DateTime ISO 8601, 必須)
- name (String, 必須)
- type (Enum, 必須: department, school, district, local, state, national)
- identifier (String, オプション)
- parentSourcedId (String, オプション, 外部キー: orgs.sourcedId)
```

**根拠（Rationale）**: OneRoster Japan Profile 1.2.2仕様準拠

**受入基準（Acceptance Criteria)**:
1. データベーステーブル: `orgs`
2. 一意制約: `sourcedId` UNIQUE
3. 外部キー制約: `parentSourcedId` → `orgs.sourcedId`
4. インデックス: `sourcedId`, `status`, `dateLastModified`

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: なし

**Test Verification**:
- [ ] Unit test: orgモデルCRUD操作
- [ ] Integration test: 外部キー制約確認
- [ ] Compliance test: OneRoster仕様準拠検証

---

#### REQ-MDL-002: academicSessionsエンティティ（学年・学期）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL academicSessionsエンティティを以下のフィールドで実装する:
- sourcedId (String, 必須, 一意)
- status (Enum, 必須)
- dateLastModified (DateTime, 必須)
- title (String, 必須)
- type (Enum, 必須: gradingPeriod, semester, schoolYear, term)
- startDate (Date, 必須)
- endDate (Date, 必須)
- parentSourcedId (String, オプション, 外部キー: academicSessions.sourcedId)
- schoolYear (String, 必須: YYYY形式)
```

**根拠（Rationale）**: 学年・学期管理の基盤

**受入基準（Acceptance Criteria）**:
1. データベーステーブル: `academic_sessions`
2. 日付検証: `startDate <= endDate`
3. 外部キー制約: `parentSourcedId` → `academicSessions.sourcedId`
4. schoolYear形式検証: YYYY（例: 2025）

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: なし

**Test Verification**:
- [ ] Unit test: 日付範囲検証
- [ ] Integration test: 階層構造（学年→学期→ターム）
- [ ] Validation test: schoolYear形式検証

---

#### REQ-MDL-003: coursesエンティティ（コース）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL coursesエンティティを以下のフィールドで実装する:
- sourcedId (String, 必須, 一意)
- status (Enum, 必須)
- dateLastModified (DateTime, 必須)
- schoolYearSourcedId (String, オプション, 外部キー: academicSessions.sourcedId)
- title (String, 必須)
- courseCode (String, オプション)
- grades (Array<String>, オプション)
- orgSourcedId (String, 必須, 外部キー: orgs.sourcedId)
- subjects (Array<String>, オプション)
- subjectCodes (Array<String>, オプション)
```

**根拠（Rationale）**: 科目情報管理

**受入基準（Acceptance Criteria）**:
1. データベーステーブル: `courses`
2. 外部キー制約:
   - `schoolYearSourcedId` → `academicSessions.sourcedId`
   - `orgSourcedId` → `orgs.sourcedId`
3. 配列フィールド: JSONBまたは別テーブルで実装

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-MDL-001, REQ-MDL-002

**Test Verification**:
- [ ] Unit test: コースCRUD操作
- [ ] Integration test: 外部キー制約確認
- [ ] Validation test: 配列フィールド処理

---

#### REQ-MDL-004: classesエンティティ（クラス）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL classesエンティティを以下のフィールドで実装する:
- sourcedId (String, 必須, 一意)
- status (Enum, 必須)
- dateLastModified (DateTime, 必須)
- title (String, 必須)
- classCode (String, オプション)
- classType (Enum, 必須: homeroom, scheduled)
- location (String, オプション)
- grades (Array<String>, オプション)
- subjects (Array<String>, オプション)
- courseSourcedId (String, 必須, 外部キー: courses.sourcedId)
- schoolSourcedId (String, 必須, 外部キー: orgs.sourcedId)
- termSourcedIds (Array<String>, 必須, 外部キー: academicSessions.sourcedId)
- periods (Array<String>, オプション)
```

**根拠（Rationale）**: クラス（授業）管理の中核

**受入基準（Acceptance Criteria）**:
1. データベーステーブル: `classes`
2. 外部キー制約:
   - `courseSourcedId` → `courses.sourcedId`
   - `schoolSourcedId` → `orgs.sourcedId`
   - `termSourcedIds` → `academicSessions.sourcedId` (複数)
3. classType検証: `homeroom` または `scheduled`のみ

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-MDL-001, REQ-MDL-002, REQ-MDL-003

**Test Verification**:
- [ ] Unit test: クラスCRUD操作
- [ ] Integration test: 複数ターム紐付け
- [ ] Validation test: classType検証

---

#### REQ-MDL-005: usersエンティティ（ユーザー）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL usersエンティティを以下のフィールドで実装する:
- sourcedId (String, 必須, 一意)
- status (Enum, 必須)
- dateLastModified (DateTime, 必須)
- enabledUser (Boolean, 必須)
- orgSourcedIds (Array<String>, オプション, 外部キー: orgs.sourcedId)
- role (Enum, 必須: student, teacher, administrator, aide, guardian, relative)
- username (String, 必須)
- userIds (Array<Object>, オプション)
- givenName (String, 必須)
- familyName (String, 必須)
- middleName (String, オプション)
- identifier (String, オプション)
- email (String, オプション, Email形式)
- sms (String, オプション)
- phone (String, オプション)
- agentSourcedIds (Array<String>, オプション, 外部キー: users.sourcedId)
- grades (Array<String>, オプション)
- password (String, オプション)
```

**根拠（Rationale）**: 生徒・教職員情報管理の中核

**受入基準（Acceptance Criteria）**:
1. データベーステーブル: `users`
2. 一意制約: `username` UNIQUE
3. Email形式検証: RFC 5322準拠
4. role検証: OneRoster定義の6つのロールのみ
5. 外部キー制約:
   - `orgSourcedIds` → `orgs.sourcedId` (複数)
   - `agentSourcedIds` → `users.sourcedId` (複数)

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-MDL-001

**Test Verification**:
- [ ] Unit test: ユーザーCRUD操作
- [ ] Validation test: Email形式検証
- [ ] Security test: パスワードハッシュ化確認

---

#### REQ-MDL-006: enrollmentsエンティティ（履修登録）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL enrollmentsエンティティを以下のフィールドで実装する:
- sourcedId (String, 必須, 一意)
- status (Enum, 必須)
- dateLastModified (DateTime, 必須)
- classSourcedId (String, 必須, 外部キー: classes.sourcedId)
- schoolSourcedId (String, 必須, 外部キー: orgs.sourcedId)
- userSourcedId (String, 必須, 外部キー: users.sourcedId)
- role (Enum, 必須: student, teacher, aide, proctor)
- primary (Boolean, オプション)
- beginDate (Date, オプション)
- endDate (Date, オプション)
```

**根拠（Rationale）**: クラスとユーザーの紐付け管理

**受入基準（Acceptance Criteria）**:
1. データベーステーブル: `enrollments`
2. 外部キー制約:
   - `classSourcedId` → `classes.sourcedId`
   - `schoolSourcedId` → `orgs.sourcedId`
   - `userSourcedId` → `users.sourcedId`
3. 複合一意制約: `(classSourcedId, userSourcedId, role)`
4. 日付検証: `beginDate <= endDate`（両方存在する場合）

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-MDL-001, REQ-MDL-004, REQ-MDL-005

**Test Verification**:
- [ ] Unit test: 履修登録CRUD操作
- [ ] Integration test: 外部キー制約確認
- [ ] Validation test: 重複登録防止

---

#### REQ-MDL-007: demographicsエンティティ（人口統計情報）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL demographicsエンティティを以下のフィールドで実装する:
- sourcedId (String, 必須, 一意)
- status (Enum, 必須)
- dateLastModified (DateTime, 必須)
- birthDate (Date, オプション)
- sex (Enum, オプション: male, female, other, unknown)
- americanIndianOrAlaskaNative (Boolean, オプション)
- asian (Boolean, オプション)
- blackOrAfricanAmerican (Boolean, オプション)
- nativeHawaiianOrOtherPacificIslander (Boolean, オプション)
- white (Boolean, オプション)
- demographicRaceTwoOrMoreRaces (Boolean, オプション)
- hispanicOrLatinoEthnicity (Boolean, オプション)
- countryOfBirthCode (String, オプション)
- stateOfBirthAbbreviation (String, オプション)
- cityOfBirth (String, オプション)
- publicSchoolResidenceStatus (String, オプション)
```

**根拠（Rationale）**: 個人属性情報管理（個人情報保護法・GDPR対応必須）

**受入基準（Acceptance Criteria）**:
1. データベーステーブル: `demographics`
2. 一対一関係: `sourcedId` → `users.sourcedId`
3. 個人情報暗号化: birthDate, sex等を暗号化保存（オプション）
4. GDPR対応: 削除権実装（物理削除可能）

**優先度（Priority）**: High
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様、Q8（コンプライアンス）
**依存関係（Dependencies）**: REQ-MDL-005

**Test Verification**:
- [ ] Unit test: demographics CRUD操作
- [ ] Security test: 個人情報暗号化確認
- [ ] Compliance test: GDPR削除権確認

---

#### REQ-MDL-008: dateCreated / dateLastModified（差分追跡）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべてのエンティティにdateCreatedおよびdateLastModifiedフィールドを実装し、Delta API要件を満たす
```

**根拠（Rationale）**: Delta/Incremental API実装に必須

**受入基準（Acceptance Criteria）**:
1. すべてのエンティティに以下フィールド追加:
   - `dateCreated` (DateTime ISO 8601, 必須)
   - `dateLastModified` (DateTime ISO 8601, 必須)
2. 新規レコード作成時: `dateCreated = dateLastModified = 現在日時`
3. レコード更新時: `dateLastModified = 現在日時` (dateCreatedは変更しない)
4. インデックス: `dateLastModified` (Delta API高速化)

**優先度（Priority）**: Critical
**出典（Source）**: Q15（Delta API要件）、OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-MDL-001〜007

**Test Verification**:
- [ ] Unit test: タイムスタンプ自動設定
- [ ] Integration test: Delta API クエリパフォーマンス
- [ ] E2E test: 新規/更新レコード判定

---

#### REQ-MDL-009: statusフィールド（論理削除）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべてのエンティティのstatusフィールドで論理削除を実装する:
- status = 'active': 有効レコード
- status = 'tobedeleted': 削除予定（論理削除）
```

**根拠（Rationale）**: 物理削除を避け、データ履歴保持とDelta API対応

**受入基準（Acceptance Criteria）**:
1. デフォルト値: `status = 'active'`
2. 削除処理: 物理削除せず `status = 'tobedeleted'` に更新
3. 削除日時記録: `deletedAt` フィールド追加（論理削除時のタイムスタンプ）
4. API取得: デフォルトで `status = 'active'` のみ返却
5. Delta API: `status = 'tobedeleted'` も返却（削除検出のため）

**優先度（Priority）**: Critical
**出典（Source）**: Q15（Delta API要件）、OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-MDL-001〜007

**Test Verification**:
- [ ] Unit test: 論理削除ロジック
- [ ] Integration test: 削除フラグフィルタリング
- [ ] E2E test: Delta API削除レコード取得

---

#### REQ-MDL-010: sourcedId一意性制約

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべてのエンティティのsourcedIdフィールドに一意性制約を設定する
```

**根拠（Rationale）**: OneRoster仕様要件とデータ整合性保証

**受入基準（Acceptance Criteria）**:
1. データベース制約: `sourcedId UNIQUE NOT NULL`
2. 重複挿入時: データベースエラー（UNIQUE CONSTRAINT VIOLATION）
3. エラーハンドリング: HTTP 409 Conflict返却

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-MDL-001〜007

**Test Verification**:
- [ ] Unit test: 一意性制約検証
- [ ] Integration test: 重複挿入拒否確認
- [ ] Error test: 適切なエラーレスポンス確認

---

#### REQ-MDL-011: 外部キー参照整合性

**Pattern**: Ubiquitous (SHALL)

```
System SHALL エンティティ間の外部キー参照整合性をデータベース制約で保証する
```

**根拠（Rationale）**: データ整合性保証と孤立レコード防止

**受入基準（Acceptance Criteria）**:
1. 外部キー制約設定:
   - `enrollments.classSourcedId` → `classes.sourcedId`
   - `enrollments.userSourcedId` → `users.sourcedId`
   - `classes.courseSourcedId` → `courses.sourcedId`
   - `courses.orgSourcedId` → `orgs.sourcedId`
   - その他すべての外部キー
2. 削除保護: 参照されているレコードの物理削除を拒否（CASCADE DELETEは使用しない）
3. エラーハンドリング: HTTP 400 Bad Request返却

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-MDL-001〜007

**Test Verification**:
- [ ] Unit test: 外部キー制約検証
- [ ] Integration test: 孤立レコード挿入拒否
- [ ] Error test: 参照先不在エラー

---

#### REQ-MDL-012: データ型検証

**Pattern**: Event-Driven (WHEN)

```
WHEN データがデータベースに保存される場合、System SHALL OneRoster仕様準拠のデータ型検証を実行する
```

**根拠（Rationale）**: データ品質保証と仕様準拠

**受入基準（Acceptance Criteria）**:
1. データ型検証:
   - DateTime: ISO 8601形式（例: 2025-11-14T10:00:00Z）
   - Date: ISO 8601形式（例: 2025-11-14）
   - Boolean: true/false
   - Enum: 定義された値のみ
   - Email: RFC 5322準拠
2. 検証エラー時: HTTP 400 Bad Request返却
3. エラーメッセージ: フィールド名、期待される型、実際の値を含む

**優先度（Priority）**: High
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-MDL-001〜007

**Test Verification**:
- [ ] Unit test: 各データ型検証関数
- [ ] Integration test: 不正データ型rejection
- [ ] Validation test: 日付フォーマット検証

---

#### REQ-MDL-013: 必須フィールド検証

**Pattern**: Event-Driven (WHEN)

```
WHEN データがデータベースに保存される場合、System SHALL OneRoster仕様で定義される必須フィールドの存在を検証する
```

**根拠（Rationale）**: OneRoster仕様準拠保証

**受入基準（Acceptance Criteria）**:
1. 必須フィールドチェック（例: sourcedId, status, dateLastModified, title/name等）
2. 欠落時: HTTP 400 Bad Request返却
3. エラーメッセージ: 欠落フィールド名リスト

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster Japan Profile 1.2.2仕様
**依存関係（Dependencies）**: REQ-MDL-001〜007

**Test Verification**:
- [ ] Unit test: 必須フィールド検証ロジック
- [ ] Integration test: 全エンティティ検証
- [ ] Error test: 複数必須フィールド欠落

---

#### REQ-MDL-014: JSON Schema検証

**Pattern**: Optional Feature (WHERE)

```
WHERE JSON Schema検証が有効な場合、System SHALL OneRoster JSON Schemaに基づいてデータ検証を実行する
```

**根拠（Rationale）**: 自動検証による品質保証と開発効率化

**受入基準（Acceptance Criteria）**:
1. JSON Schema定義: 各エンティティごとに作成
2. スキーマファイル配置: `schemas/oneroster/v1p2/`
3. 検証ライブラリ: Ajv (Node.js) / jsonschema (Python)
4. 検証エラー: 詳細なエラーメッセージ（フィールドパス、エラー内容）

**優先度（Priority）**: Medium
**出典（Source）**: OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-MDL-001〜007

**Test Verification**:
- [ ] Unit test: JSON Schema検証
- [ ] Integration test: スキーマ違反rejection
- [ ] Compliance test: OneRoster公式スキーマ準拠

---

#### REQ-MDL-015: 複合インデックス最適化

**Pattern**: Ubiquitous (SHALL)

```
System SHALL パフォーマンス最適化のため、以下の複合インデックスを実装する:
- users: (status, dateLastModified)
- enrollments: (classSourcedId, userSourcedId)
- classes: (courseSourcedId, status)
```

**根拠（Rationale）**: Delta APIおよび検索クエリの高速化

**受入基準（Acceptance Criteria）**:
1. 複合インデックス作成: 上記3つ以上
2. クエリパフォーマンス: Delta APIレスポンス <200ms (95th percentile)
3. インデックスサイズ監視: データベース容量の20%以下

**優先度（Priority）**: High
**出典（Source）**: Q11（パフォーマンス要件）
**依存関係（Dependencies）**: REQ-MDL-001〜007

**Test Verification**:
- [ ] Performance test: Delta APIクエリ速度
- [ ] Load test: 大量データでのインデックス効果測定
- [ ] Monitoring test: インデックスサイズ監視

---

**Section 6 Progress**: ✅ OneRoster Data Model Completed (REQ-MDL-001~015)

---

### 4.4 REST API機能（REST API）

**概要**: OneRoster 1.2準拠のREST API実装。Bulk API（全件取得）およびDelta/Incremental API（差分取得）を提供し、学習ツールとのデータ連携を実現。

**参考ドキュメント**: `docs/research/oneroster-incremental-api-research.md`

---

#### REQ-API-001: API Base URL

**Pattern**: Ubiquitous (SHALL)

```
System SHALL OneRoster 1.2仕様準拠のAPIベースURLを提供する: /ims/oneroster/v1p2/
```

**根拠（Rationale）**: OneRoster仕様準拠と、複数バージョン共存可能性

**受入基準（Acceptance Criteria）**:
1. ベースURL: `https://{domain}/ims/oneroster/v1p2/`
2. すべてのエンドポイントはこのベースURLから開始
3. HTTPSのみサポート（HTTP非対応）

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster 1.2仕様
**依存関係（Dependencies）**: なし

**Test Verification**:
- [ ] Integration test: ベースURL動作確認
- [ ] Security test: HTTPリクエスト拒否確認
- [ ] API test: 全エンドポイントルーティング

---

#### REQ-API-002: Bulk API - orgsエンドポイント

**Pattern**: Event-Driven (WHEN)

```
WHEN 学習ツールが組織情報をリクエストした場合、REST API Service SHALL GET /ims/oneroster/v1p2/orgs エンドポイントで全組織情報をJSON形式で返却する
```

**根拠（Rationale）**: OneRoster仕様準拠の組織情報提供

**受入基準（Acceptance Criteria)**:
1. エンドポイント: `GET /ims/oneroster/v1p2/orgs`
2. レスポンス形式:
   ```json
   {
     "orgs": [
       {
         "sourcedId": "org123",
         "status": "active",
         "dateLastModified": "2025-11-14T10:00:00Z",
         "name": "Example School",
         "type": "school",
         ...
       }
     ]
   }
   ```
3. ページネーション: `limit`, `offset` パラメータ対応
4. デフォルト: `limit=100`, `offset=0`

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-MDL-001, REQ-API-001

**Test Verification**:
- [ ] Unit test: orgs取得ロジック
- [ ] Integration test: JSON形式検証
- [ ] API test: ページネーション動作確認

---

#### REQ-API-003: Bulk API - 全エンティティエンドポイント

**Pattern**: Ubiquitous (SHALL)

```
System SHALL 以下のBulk APIエンドポイントを実装する:
- GET /ims/oneroster/v1p2/academicSessions
- GET /ims/oneroster/v1p2/courses
- GET /ims/oneroster/v1p2/classes
- GET /ims/oneroster/v1p2/users
- GET /ims/oneroster/v1p2/enrollments
- GET /ims/oneroster/v1p2/demographics
```

**根拠（Rationale）**: OneRoster仕様準拠の全エンティティ提供

**受入基準（Acceptance Criteria）**:
1. 各エンドポイントでGETリクエスト対応
2. JSON形式レスポンス
3. `status=active` のレコードのみ返却（デフォルト）
4. ページネーション対応（limit, offset）

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-MDL-002〜007, REQ-API-001

**Test Verification**:
- [ ] Unit test: 全エンティティ取得ロジック
- [ ] Integration test: 全エンドポイント動作確認
- [ ] API test: レスポンス形式検証

---

#### REQ-API-004: 単一レコード取得API

**Pattern**: Event-Driven (WHEN)

```
WHEN 学習ツールが特定レコードをリクエストした場合、REST API Service SHALL GET /ims/oneroster/v1p2/{entity}/{sourcedId} エンドポイントで単一レコードを返却する
```

**根拠（Rationale）**: 個別レコード取得による効率的なデータアクセス

**受入基準（Acceptance Criteria）**:
1. エンドポイント例:
   - `GET /ims/oneroster/v1p2/users/user123`
   - `GET /ims/oneroster/v1p2/classes/class456`
2. レコード存在時: HTTP 200 OK + JSON
3. レコード不在時: HTTP 404 Not Found
4. 削除済みレコード（status=tobedeleted）: HTTP 410 Gone

**優先度（Priority）**: High
**出典（Source）**: OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-API-003

**Test Verification**:
- [ ] Unit test: 単一レコード取得ロジック
- [ ] Integration test: 全エンティティ単一取得
- [ ] Error test: 404, 410 エラーレスポンス

---

#### REQ-API-005: Delta API - dateLastModified フィルタ

**Pattern**: Event-Driven (WHEN)

```
WHEN 学習ツールがdateLastModifiedフィルタ付きリクエストを送信した場合、REST API Service SHALL 指定日時以降に更新されたレコードのみを返却する
```

**根拠（Rationale）**: Delta/Incremental API実装の中核

**受入基準（Acceptance Criteria）**:
1. フィルタパラメータ: `?filter=dateLastModified>=2025-01-01T00:00:00Z`
2. ISO 8601 DateTime形式サポート
3. 演算子サポート: `>=`, `>`, `<=`, `<`
4. レスポンス: 条件に合致するレコードのみ
5. `status=tobedeleted` レコードも含む（削除検出のため）

**優先度（Priority）**: Critical
**出典（Source）**: Q15（Delta API要件）、`docs/research/oneroster-incremental-api-research.md`
**依存関係（Dependencies）**: REQ-MDL-008, REQ-API-003

**Test Verification**:
- [ ] Unit test: dateLastModifiedフィルタロジック
- [ ] Integration test: Delta API動作確認
- [ ] Performance test: 大量データでのフィルタ速度

---

#### REQ-API-006: Delta API - 新規レコード判定

**Pattern**: Ubiquitous (SHALL)

```
System SHALL Delta APIレスポンスで、新規レコード判定可能な情報を提供する:
- dateCreated == dateLastModified の場合: 新規レコード
- dateCreated < dateLastModified の場合: 更新レコード
```

**根拠（Rationale）**: 学習ツール側での新規/更新判定の実現

**受入基準（Acceptance Criteria）**:
1. すべてのレスポンスに `dateCreated` および `dateLastModified` を含む
2. 両フィールドはISO 8601形式
3. ドキュメンテーション: API仕様書に新規/更新判定方法を記載

**優先度（Priority）**: Critical
**出典（Source）**: Q15（Delta API要件）、`docs/research/oneroster-incremental-api-research.md`
**依存関係（Dependencies）**: REQ-MDL-008, REQ-API-005

**Test Verification**:
- [ ] Unit test: タイムスタンプ比較ロジック
- [ ] Integration test: 新規/更新レコード判定
- [ ] E2E test: 学習ツール同期シナリオ

---

#### REQ-API-007: Delta API - 削除レコード検出

**Pattern**: Event-Driven (WHEN)

```
WHEN 学習ツールがDelta APIをリクエストした場合、REST API Service SHALL status='tobedeleted' のレコードを含めて返却し、削除検出を可能にする
```

**根拠（Rationale）**: 学習ツール側でのレコード削除同期

**受入基準（Acceptance Criteria）**:
1. Delta API（`dateLastModified` フィルタ付き）: `status='tobedeleted'` も返却
2. Bulk API（フィルタなし）: `status='active'` のみ返却（デフォルト）
3. `status='tobedeleted'` のレコードには `deletedAt` フィールドを含む
4. ドキュメンテーション: 削除レコード処理方法を記載

**優先度（Priority）**: Critical
**出典（Source）**: Q15（Delta API要件）、OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-MDL-009, REQ-API-005

**Test Verification**:
- [ ] Unit test: 削除レコードフィルタリング
- [ ] Integration test: Delta API削除レコード取得
- [ ] E2E test: 学習ツール削除同期

---

#### REQ-API-008: フィルタパラメータ - fields

**Pattern**: Optional Feature (WHERE)

```
WHERE fieldsパラメータが指定された場合、REST API Service SHALL 指定されたフィールドのみを返却する
```

**根拠（Rationale）**: データ転送量削減とパフォーマンス向上

**受入基準（Acceptance Criteria）**:
1. パラメータ: `?fields=sourcedId,username,email`
2. カンマ区切りフィールド名
3. 必須フィールド（sourcedId, status, dateLastModified）は常に含む
4. 不正フィールド名: HTTP 400 Bad Request

**優先度（Priority）**: Medium
**出典（Source）**: OneRoster 1.2仕様
**依存関係（Dependencies）**: REQ-API-003

**Test Verification**:
- [ ] Unit test: フィールドフィルタリングロジック
- [ ] Integration test: 指定フィールドのみ返却確認
- [ ] Error test: 不正フィールド名処理

---

#### REQ-API-009: ソート機能

**Pattern**: Optional Feature (WHERE)

```
WHERE sortパラメータが指定された場合、REST API Service SHALL 指定フィールドでソートした結果を返却する
```

**根拠（Rationale）**: クライアント側のソート処理軽減

**受入基準（Acceptance Criteria）**:
1. パラメータ: `?sort=dateLastModified`, `?sort=-dateLastModified` (降順)
2. デフォルトソート: `dateLastModified ASC`
3. 複数フィールドソート: `?sort=status,dateLastModified`

**優先度（Priority）**: Low
**出典（Source）**: OneRoster 1.2仕様（オプション機能）
**依存関係（Dependencies）**: REQ-API-003

**Test Verification**:
- [ ] Unit test: ソートロジック
- [ ] Integration test: 昇順・降順確認
- [ ] Performance test: 大量データソート速度

---

#### REQ-API-010: ページネーション

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべてのリストAPIでページネーションをサポートし、limit, offset パラメータを提供する
```

**根拠（Rationale）**: 大量データレスポンス防止とパフォーマンス保護

**受入基準（Acceptance Criteria）**:
1. パラメータ:
   - `limit`: 取得件数（デフォルト: 100、最大: 1000）
   - `offset`: スキップ件数（デフォルト: 0）
2. レスポンスにメタデータ含む:
   ```json
   {
     "users": [...],
     "warnings": [],
     "metadata": {
       "total": 200000,
       "limit": 100,
       "offset": 0,
       "hasMore": true
     }
   }
   ```

**優先度（Priority）**: Critical
**出典（Source）**: OneRoster 1.2仕様、Q7（大規模データ対応）
**依存関係（Dependencies）**: REQ-API-003

**Test Verification**:
- [ ] Unit test: ページネーションロジック
- [ ] Integration test: limit, offset動作確認
- [ ] API test: メタデータ検証

---

#### REQ-API-011: Rate Limiting（レート制限）

**Pattern**: State-Driven (WHILE)

```
WHILE APIリクエストレートが100リクエスト/分を超えている場合、REST API Service SHALL HTTP 429 Too Many Requestsを返却し、リクエストを拒否する
```

**根拠（Rationale）**: APIサーバー保護とDoS攻撃防止

**受入基準（Acceptance Criteria）**:
1. レート制限: 100リクエスト/分/IPアドレス
2. 超過時: HTTP 429 + `Retry-After` ヘッダー
3. レスポンス例:
   ```json
   {
     "error": "Rate limit exceeded",
     "retryAfter": 60
   }
   ```

**優先度（Priority）**: High
**出典（Source）**: Q8（セキュリティ要件）
**依存関係（Dependencies）**: REQ-API-001

**Test Verification**:
- [ ] Unit test: レート制限ロジック
- [ ] Load test: 100リクエスト/分超過確認
- [ ] Security test: DoS攻撃耐性

---

#### REQ-API-012: API Key認証

**Pattern**: Event-Driven (WHEN)

```
WHEN 学習ツールがAPIリクエストを送信した場合、REST API Service SHALL Authorizationヘッダーに含まれるAPI Keyを検証する
```

**根拠（Rationale）**: 不正アクセス防止と認証

**受入基準（Acceptance Criteria）**:
1. ヘッダー形式: `Authorization: Bearer {api_key}`
2. API Key検証: データベース照合
3. 不正Key: HTTP 401 Unauthorized
4. Key欠落: HTTP 401 Unauthorized

**優先度（Priority）**: Critical
**出典（Source）**: Q8（セキュリティ要件）
**依存関係（Dependencies）**: REQ-API-001

**Test Verification**:
- [ ] Unit test: API Key検証ロジック
- [ ] Security test: 不正Key拒否
- [ ] Integration test: 全エンドポイント認証確認

---

#### REQ-API-013: IPアドレスアクセス制御

**Pattern**: Event-Driven (WHEN)

```
WHEN APIリクエストが到着した場合、REST API Service SHALL リクエスト元IPアドレスがホワイトリストに含まれることを確認する
```

**根拠（Rationale）**: 多層防御とアクセス制御強化

**受入基準（Acceptance Criteria）**:
1. IPホワイトリスト: データベースまたは設定ファイルで管理
2. ホワイトリスト外: HTTP 403 Forbidden
3. CIDR記法サポート: `192.168.1.0/24`
4. 管理API: ホワイトリスト追加・削除

**優先度（Priority）**: High
**出典（Source）**: Q8（セキュリティ要件）、Q9（IPアドレス制限）
**依存関係（Dependencies）**: REQ-API-012

**Test Verification**:
- [ ] Unit test: IPアドレス検証ロジック
- [ ] Security test: ホワイトリスト外拒否
- [ ] Integration test: CIDR記法確認

---

#### REQ-API-014: CORS設定

**Pattern**: Optional Feature (WHERE)

```
WHERE Webブラウザからのクロスオリジンリクエストを許可する場合、REST API Service SHALL 適切なCORSヘッダーを返却する
```

**根拠（Rationale）**: WebアプリケーションからのAPI利用

**受入基準（Acceptance Criteria）**:
1. レスポンスヘッダー:
   - `Access-Control-Allow-Origin`: 許可ドメインリスト
   - `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE
   - `Access-Control-Allow-Headers`: Authorization, Content-Type
2. プリフライトリクエスト（OPTIONS）対応

**優先度（Priority）**: Low
**出典（Source）**: 一般的なWeb API要件
**依存関係（Dependencies）**: REQ-API-001

**Test Verification**:
- [ ] Unit test: CORSヘッダー設定
- [ ] Integration test: ブラウザからのリクエスト
- [ ] Security test: 不正ドメインからのリクエスト拒否

---

#### REQ-API-015: エラーレスポンス標準化

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべてのAPIエラーレスポンスを以下の形式で返却する:
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [...]
  }
}
```

**根拠（Rationale）**: エラーハンドリングの一貫性とトラブルシューティング容易性

**受入基準（Acceptance Criteria）**:
1. HTTPステータスコード:
   - 400: Bad Request（不正パラメータ）
   - 401: Unauthorized（認証失敗）
   - 403: Forbidden（権限不足）
   - 404: Not Found（リソース不在）
   - 409: Conflict（重複）
   - 410: Gone（削除済み）
   - 429: Too Many Requests（レート制限）
   - 500: Internal Server Error
2. エラーコード: 一意の識別子（例: `ER001`）
3. 詳細情報: フィールドエラー、バリデーションエラー等

**優先度（Priority）**: High
**出典（Source）**: OneRoster 1.2仕様、Q13（運用性）
**依存関係（Dependencies）**: REQ-API-001

**Test Verification**:
- [ ] Unit test: エラーレスポンス生成ロジック
- [ ] Integration test: 全エラータイプ確認
- [ ] API test: レスポンス形式検証

---

#### REQ-API-016: 監査ログ記録

**Pattern**: Event-Driven (WHEN)

```
WHEN APIリクエストが処理された場合、REST API Service SHALL 監査ログ（リクエスト元IP、API Key、エンドポイント、レスポンスステータス、処理時間）を記録する
```

**根拠（Rationale）**: コンプライアンス対応とセキュリティ監視

**受入基準（Acceptance Criteria）**:
1. ログ記録内容:
   - リクエスト日時（ISO 8601）
   - リクエスト元IPアドレス
   - API Key ID
   - HTTPメソッド、エンドポイント
   - リクエストパラメータ（個人情報マスキング）
   - レスポンスステータスコード
   - 処理時間（ミリ秒）
2. ログ保存先: 専用監査ログDB/ファイル
3. ログ保持期間: 1年間

**優先度（Priority）**: High
**出典（Source）**: Q9（監査ログ）、Q8（コンプライアンス）
**依存関係（Dependencies）**: REQ-API-001

**Test Verification**:
- [ ] Unit test: ログ記録ロジック
- [ ] Integration test: ログDB保存確認
- [ ] Compliance test: 個人情報マスキング確認

---

#### REQ-API-017: TLS 1.3暗号化通信

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべてのAPI通信をTLS 1.3で暗号化する
```

**根拠（Rationale）**: 通信内容の盗聴防止と個人情報保護

**受入基準（Acceptance Criteria）**:
1. TLS 1.3のみサポート（TLS 1.2以下は無効）
2. HTTPリクエスト: 拒否またはHTTPSへリダイレクト
3. 証明書: 有効なSSL/TLS証明書

**優先度（Priority）**: Critical
**出典（Source）**: Q8（セキュリティ要件）、Q12（TLS 1.3）
**依存関係（Dependencies）**: REQ-API-001

**Test Verification**:
- [ ] Security test: TLS 1.3接続確認
- [ ] Security test: TLS 1.2接続拒否確認
- [ ] Security test: HTTP接続拒否確認

---

#### REQ-API-018: APIバージョニング

**Pattern**: Ubiquitous (SHALL)

```
System SHALL APIバージョンをURLパスに含め、将来のバージョンアップに対応可能とする: /ims/oneroster/v1p2/
```

**根拠（Rationale）**: 後方互換性保持と段階的移行サポート

**受入基準（Acceptance Criteria）**:
1. バージョン表記: `v1p2` （OneRoster 1.2準拠）
2. 将来のバージョン共存: `v1p3`, `v2p0` 等
3. バージョン不明リクエスト: HTTP 404 Not Found

**優先度（Priority）**: Medium
**出典（Source）**: OneRoster仕様、Q13（拡張性）
**依存関係（Dependencies）**: REQ-API-001

**Test Verification**:
- [ ] Unit test: バージョンルーティング
- [ ] Integration test: 複数バージョン共存（将来対応）
- [ ] API test: バージョン不明リクエスト拒否

---

#### REQ-API-019: API ドキュメンテーション（OpenAPI仕様）

**Pattern**: Ubiquitous (SHALL)

```
System SHALL OpenAPI 3.0仕様書を提供し、API仕様を文書化する
```

**根拠（Rationale）**: 学習ツールベンダーへのAPI仕様提供と開発支援

**受入基準（Acceptance Criteria）**:
1. OpenAPI 3.0 YAML/JSON形式
2. 全エンドポイント、パラメータ、レスポンス定義
3. 認証方法、エラーレスポンス記載
4. Swagger UIでのドキュメント公開: `/api-docs`

**優先度（Priority）**: High
**出典（Source）**: Q13（運用性）
**依存関係（Dependencies）**: REQ-API-001〜018

**Test Verification**:
- [ ] Documentation test: OpenAPI仕様書生成
- [ ] Integration test: Swagger UI動作確認
- [ ] Compliance test: OneRoster仕様との整合性確認

---

#### REQ-API-020: APIパフォーマンス要件

**Pattern**: Ubiquitous (SHALL)

```
System SHALL 以下のAPIパフォーマンス要件を満たす:
- 95パーセンタイル: レスポンスタイム <200ms
- 99パーセンタイル: レスポンスタイム <500ms
```

**根拠（Rationale）**: ユーザー体験向上とシステム応答性確保

**受入基準（Acceptance Criteria）**:
1. 測定対象: 単一レコード取得、100件リスト取得
2. 測定環境: 本番相当負荷（同時100ユーザー）
3. パフォーマンス監視: APM（Application Performance Monitoring）導入

**優先度（Priority）**: High
**出典（Source）**: Q11（パフォーマンス要件）
**依存関係（Dependencies）**: REQ-API-003, REQ-MDL-015

**Test Verification**:
- [ ] Performance test: 95/99パーセンタイル測定
- [ ] Load test: 同時100ユーザー負荷
- [ ] Monitoring test: APM動作確認

---

**Section 7 Progress**: ✅ REST API Requirements Completed (REQ-API-001~020)

**Note**: Delta/Incremental API要件（REQ-API-005〜007）を含む全20要件完了。

---

### 4.5 データ検証機能（Data Validation）

**概要**: OneRoster仕様準拠のデータ検証機能。CSVインポート、API処理時のデータ品質保証。

---

#### REQ-VAL-001: OneRoster仕様準拠検証

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべてのデータがOneRoster Japan Profile 1.2.2仕様に準拠していることを検証する
```

**受入基準**:
1. JSON Schemaベースの検証
2. 必須フィールド、データ型、Enum値検証
3. 違反時: HTTP 400 + 詳細エラーメッセージ

**優先度**: Critical | **出典**: OneRoster 1.2仕様 | **依存**: REQ-MDL-001~007

**Test Verification**: [ ] Compliance test: OneRoster仕様準拠検証

---

#### REQ-VAL-002: Email形式検証

**Pattern**: Event-Driven (WHEN)

```
WHEN emailフィールドが入力された場合、System SHALL RFC 5322準拠のEmail形式を検証する
```

**受入基準**:
1. 正規表現検証: RFC 5322準拠
2. 不正形式時: HTTP 400エラー
3. ドメイン存在確認（オプション）

**優先度**: High | **出典**: OneRoster 1.2仕様 | **依存**: REQ-MDL-005

**Test Verification**: [ ] Unit test: Email形式検証ロジック

---

#### REQ-VAL-003: 日付範囲検証

**Pattern**: Event-Driven (WHEN)

```
WHEN beginDate/endDateが入力された場合、System SHALL beginDate <= endDate を検証する
```

**受入基準**:
1. 日付範囲チェック: beginDate <= endDate
2. 未来日付検証（オプション）
3. 違反時: HTTP 400エラー

**優先度**: High | **出典**: OneRoster 1.2仕様 | **依存**: REQ-MDL-002, 006

**Test Verification**: [ ] Unit test: 日付範囲検証ロジック

---

#### REQ-VAL-004: Enum値検証

**Pattern**: Event-Driven (WHEN)

```
WHEN Enumフィールドが入力された場合、System SHALL 定義された値のみを許可する
```

**受入基準**:
1. Enum検証: status, role, type, sex等
2. 不正値: HTTP 400エラー
3. 大文字小文字区別

**優先度**: Critical | **出典**: OneRoster 1.2仕様 | **依存**: REQ-MDL-001~007

**Test Verification**: [ ] Unit test: 全Enum値検証

---

#### REQ-VAL-005: 外部キー存在検証

**Pattern**: Event-Driven (WHEN)

```
WHEN 外部キーフィールドが入力された場合、System SHALL 参照先レコードの存在を検証する
```

**受入基準**:
1. 外部キー検証: enrollments.classSourcedId → classes.sourcedId等
2. 参照先不在: HTTP 400エラー
3. エラーメッセージ: 不在のsourcedIdを含む

**優先度**: Critical | **出典**: OneRoster 1.2仕様 | **依存**: REQ-MDL-011

**Test Verification**: [ ] Integration test: 外部キー検証

---

#### REQ-VAL-006: 循環参照検出

**Pattern**: Unwanted Behavior (IF...THEN)

```
IF 階層構造エンティティ（orgs, academicSessions）で循環参照が発生した場合、THEN System SHALL エラーを返却する
```

**受入基準**:
1. 循環参照検出: orgs.parentSourcedId、academicSessions.parentSourcedId
2. 検出時: HTTP 400エラー
3. エラーメッセージ: 循環参照パス表示

**優先度**: High | **出典**: データ整合性要件 | **依存**: REQ-MDL-001, 002

**Test Verification**: [ ] Unit test: 循環参照検出ロジック

---

#### REQ-VAL-007: 重複チェック

**Pattern**: Event-Driven (WHEN)

```
WHEN 新規レコードが作成される場合、System SHALL sourcedIdの重複を検出する
```

**受入基準**:
1. 一意性検証: sourcedId UNIQUE制約
2. 重複時: HTTP 409 Conflictエラー
3. エラーメッセージ: 重複したsourcedId表示

**優先度**: Critical | **出典**: OneRoster 1.2仕様 | **依存**: REQ-MDL-010

**Test Verification**: [ ] Integration test: 重複挿入拒否確認

---

#### REQ-VAL-008: 文字列長検証

**Pattern**: Event-Driven (WHEN)

```
WHEN 文字列フィールドが入力された場合、System SHALL 最大文字列長を検証する
```

**受入基準**:
1. フィールドごとの最大長: name 100文字、email 255文字等
2. 超過時: HTTP 400エラー
3. Unicode文字対応

**優先度**: Medium | **出典**: OneRoster 1.2仕様 | **依存**: REQ-MDL-001~007

**Test Verification**: [ ] Unit test: 文字列長検証

---

#### REQ-VAL-009: NULL/空文字検証

**Pattern**: Event-Driven (WHEN)

```
WHEN 必須フィールドにNULLまたは空文字が入力された場合、System SHALL エラーを返却する
```

**受入基準**:
1. 必須フィールド検証: NULL, 空文字, 空白のみ を拒否
2. 拒否時: HTTP 400エラー
3. エラーメッセージ: 欠落フィールド名表示

**優先度**: Critical | **出典**: OneRoster 1.2仕様 | **依存**: REQ-MDL-013

**Test Verification**: [ ] Unit test: NULL/空文字検証

---

#### REQ-VAL-010: 検証エラー集約

**Pattern**: Ubiquitous (SHALL)

```
System SHALL 1回のリクエストで複数の検証エラーを検出し、すべてのエラーを返却する
```

**受入基準**:
1. エラー集約: 最初のエラーで中断せず、全エラー収集
2. レスポンス形式:
   ```json
   {
     "errors": [
       {"field": "email", "message": "Invalid format"},
       {"field": "beginDate", "message": "Must be before endDate"}
     ]
   }
   ```

**優先度**: High | **出典**: Q13（正確性） | **依存**: REQ-VAL-001~009

**Test Verification**: [ ] Integration test: 複数エラー同時返却

---

**Section 8 Progress**: ✅ Data Validation Requirements Completed (REQ-VAL-001~010)

---

## 5. 非機能要件（Non-Functional Requirements）

> **NOTE**: すべての非機能要件はEARS形式で記述されています。

---

### 5.1 パフォーマンス要件（Performance Requirements）

#### REQ-PRF-001: CSVインポート処理時間

**Pattern**: Ubiquitous (SHALL)

```
System SHALL 200,000レコードのCSVインポートを30分以内に完了する
```

**受入基準**: 処理時間 ≤ 30分（200,000レコード）| メモリ使用量 ≤ 1GB

**優先度**: Critical | **出典**: Q7 | **Test**: [ ] Performance test: 200,000レコードインポート

---

#### REQ-PRF-002: API レスポンスタイム

**Pattern**: Ubiquitous (SHALL)

```
System SHALL APIレスポンスタイムを95パーセンタイル <200ms、99パーセンタイル <500ms とする
```

**受入基準**: 95th <200ms, 99th <500ms | 測定条件: 同時100ユーザー

**優先度**: High | **出典**: Q11 | **Test**: [ ] Load test: レスポンスタイム測定

---

#### REQ-PRF-003: データベースクエリパフォーマンス

**Pattern**: Ubiquitous (SHALL)

```
System SHALL Delta APIクエリ（dateLastModifiedフィルタ）を100ms以内に完了する
```

**受入基準**: クエリ時間 <100ms | インデックス最適化実施

**優先度**: High | **出典**: REQ-API-005, REQ-MDL-015 | **Test**: [ ] Performance test: Delta APIクエリ速度

---

### 5.2 可用性要件（Availability Requirements）

#### REQ-AVL-001: システム稼働率

**Pattern**: Ubiquitous (SHALL)

```
System SHALL 99% SLA稼働率を保証する（年間ダウンタイム87.6時間以内）
```

**受入基準**: 年間稼働率 ≥ 99% | 計画メンテナンス: 月1回深夜2時間以内

**優先度**: High | **出典**: Q10 | **Test**: [ ] Monitoring test: 稼働率測定

---

#### REQ-AVL-002: データバックアップ

**Pattern**: Ubiquitous (SHALL)

```
System SHALL データベースの差分バックアップを15分ごと、完全バックアップを日次で実行する
```

**受入基準**: 差分: 15分ごと | 完全: 日次 | 保持期間: 30日間 | 別リージョン保存

**優先度**: Critical | **出典**: Q10（RPO 15分） | **Test**: [ ] Backup test: バックアップ復旧確認

---

#### REQ-AVL-003: 災害復旧（DR）

**Pattern**: Unwanted Behavior (IF...THEN)

```
IF システム障害が発生した場合、THEN System SHALL RTO 1時間以内、RPO 15分以内でサービスを復旧する
```

**受入基準**: RTO <1時間 | RPO <15分 | DR訓練: 年2回実施

**優先度**: High | **出典**: Q10 | **Test**: [ ] DR test: 復旧手順確認

---

### 5.3 セキュリティ要件（Security Requirements）

#### REQ-SEC-001: API Key認証

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべてのAPIリクエストでAPI Key認証を必須とする
```

**受入基準**: Bearer Token認証 | 不正Key: HTTP 401 | Key管理: データベース暗号化保存

**優先度**: Critical | **出典**: Q8, REQ-API-012 | **Test**: [ ] Security test: API Key検証

---

#### REQ-SEC-002: IPアドレスアクセス制御

**Pattern**: Ubiquitous (SHALL)

```
System SHALL IPアドレスホワイトリストによるアクセス制御を実装する
```

**受入基準**: IPホワイトリスト | ホワイトリスト外: HTTP 403 | CIDR記法サポート

**優先度**: High | **出典**: Q9, REQ-API-013 | **Test**: [ ] Security test: IP制限確認

---

#### REQ-SEC-003: TLS 1.3暗号化通信

**Pattern**: Ubiquitous (SHALL)

```
System SHALL すべての通信をTLS 1.3で暗号化する
```

**受入基準**: TLS 1.3のみサポート | HTTP拒否 | 有効な証明書

**優先度**: Critical | **出典**: Q12, REQ-API-017 | **Test**: [ ] Security test: TLS 1.3確認

---

#### REQ-SEC-004: 個人情報暗号化

**Pattern**: Ubiquitous (SHALL)

```
System SHALL データベース保存時の個人情報（birthDate, email等）をAES-256で暗号化する
```

**受入基準**: AES-256暗号化 | at-rest encryption | 暗号化キー: AWS KMS/Azure Key Vault

**優先度**: High | **出典**: Q8（個人情報保護法） | **Test**: [ ] Security test: 暗号化確認

---

#### REQ-SEC-005: 監査ログ記録

**Pattern**: Event-Driven (WHEN)

```
WHEN API/CSVインポート操作が実行された場合、System SHALL 監査ログを記録する
```

**受入基準**: ログ内容: 実行者、日時、操作、結果 | 保持期間: 1年 | 改ざん防止

**優先度**: High | **出典**: Q9, REQ-CSV-014, REQ-API-016 | **Test**: [ ] Security test: ログ改ざん防止

---

#### REQ-SEC-006: パスワードハッシュ化

**Pattern**: Ubiquitous (SHALL)

```
System SHALL パスワードをbcrypt（コスト12以上）でハッシュ化して保存する
```

**受入基準**: bcrypt | コスト ≥ 12 | 平文保存禁止

**優先度**: Critical | **出典**: Q8 | **Test**: [ ] Security test: パスワードハッシュ検証

---

#### REQ-SEC-007: OWASP Top 10対策

**Pattern**: Ubiquitous (SHALL)

```
System SHALL OWASP Top 10脆弱性対策を実装する
```

**受入基準**: SQLインジェクション対策 | XSS対策 | CSRF対策 | 認証・認可 | 機密データ暗号化

**優先度**: Critical | **出典**: Q8 | **Test**: [ ] Security test: OWASP Top 10脆弱性診断

---

#### REQ-SEC-008: Rate Limiting

**Pattern**: State-Driven (WHILE)

```
WHILE APIリクエストレートが100リクエスト/分を超えている場合、System SHALL HTTP 429を返却する
```

**受入基準**: 100 req/min/IP | 超過時: HTTP 429 + Retry-After

**優先度**: High | **出典**: Q8, REQ-API-011 | **Test**: [ ] Security test: DDoS耐性

---

### 5.4 コンプライアンス要件（Compliance Requirements）

#### REQ-CMP-001: 個人情報保護法準拠

**Pattern**: Ubiquitous (SHALL)

```
System SHALL 個人情報保護法に準拠したデータ管理を実施する
```

**受入基準**:
1. 利用目的明示
2. 安全管理措置（暗号化、アクセス制御、監査ログ）
3. 第三者提供制限
4. 本人開示請求対応

**優先度**: Critical | **出典**: Q8 | **Test**: [ ] Compliance test: 個人情報保護法チェックリスト

---

#### REQ-CMP-002: GDPR準拠（削除権）

**Pattern**: Event-Driven (WHEN)

```
WHEN EU在住生徒が削除権を行使した場合、System SHALL 個人データを物理削除し、削除記録を保存する
```

**受入基準**:
1. 削除API実装: DELETE /users/{sourcedId}/gdpr-delete
2. 30日以内の削除完了
3. 削除記録: 1年間保持

**優先度**: High | **出典**: Q8（GDPR） | **Test**: [ ] Compliance test: GDPR削除権確認

---

#### REQ-CMP-003: 文科省ガイドライン準拠

**Pattern**: Ubiquitous (SHALL)

```
System SHALL 文部科学省「教育情報セキュリティポリシーに関するガイドライン」に準拠する
```

**受入基準**:
1. アクセスログ記録
2. IPアドレス制限
3. 定期バックアップ
4. セキュリティ研修（年1回）

**優先度**: High | **出典**: Q8 | **Test**: [ ] Compliance test: 文科省ガイドライン適合性確認

---

### 5.5 運用要件（Operational Requirements）

#### REQ-OPS-001: 監視・アラート

**Pattern**: Ubiquitous (SHALL)

```
System SHALL システムメトリクス（CPU、メモリ、ディスク、ネットワーク）を監視し、閾値超過時にアラート通知する
```

**受入基準**:
1. 監視項目: CPU >80%, メモリ >80%, ディスク >90%, エラー率 >5%
2. アラート通知: メール/Slack
3. 監視ツール: Prometheus/CloudWatch/Azure Monitor

**優先度**: High | **出典**: Q13（運用性） | **Test**: [ ] Monitoring test: アラート動作確認

---

#### REQ-OPS-002: ログ管理

**Pattern**: Ubiquitous (SHALL)

```
System SHALL アプリケーションログを構造化JSON形式で出力し、ログ集約システムに送信する
```

**受入基準**:
1. ログ形式: JSON（timestamp, level, message, context）
2. ログレベル: ERROR, WARN, INFO, DEBUG
3. ログ集約: ELK Stack/CloudWatch Logs/Azure Log Analytics
4. 保持期間: 30日間

**優先度**: Medium | **出典**: Q13 | **Test**: [ ] Monitoring test: ログ集約確認

---

#### REQ-OPS-003: ゼロダウンタイムデプロイ

**Pattern**: Ubiquitous (SHALL)

```
System SHALL Blue-Greenデプロイまたはローリングアップデートによるゼロダウンタイムデプロイを実現する
```

**受入基準**:
1. デプロイ戦略: Blue-Green/Rolling Update
2. ヘルスチェック実装
3. ロールバック: 5分以内

**優先度**: Medium | **出典**: Q10（可用性） | **Test**: [ ] Deployment test: ゼロダウンタイム確認

---

#### REQ-OPS-004: API使用量監視

**Pattern**: Ubiquitous (SHALL)

```
System SHALL API使用量（リクエスト数、レスポンスタイム、エラー率）を監視し、ダッシュボードで可視化する
```

**受入基準**:
1. メトリクス: リクエスト数/分、平均レスポンスタイム、エラー率
2. ダッシュボード: Grafana/CloudWatch Dashboard
3. 異常検知: 自動アラート

**優先度**: Medium | **出典**: Q13 | **Test**: [ ] Monitoring test: ダッシュボード動作確認

---

**Section 9-12 Progress**: ✅ Non-Functional Requirements Completed

**Sections Completed**:
- 5.1 パフォーマンス要件 (REQ-PRF-001~003)
- 5.2 可用性要件 (REQ-AVL-001~003)
- 5.3 セキュリティ要件 (REQ-SEC-001~008)
- 5.4 コンプライアンス要件 (REQ-CMP-001~003)
- 5.5 運用要件 (REQ-OPS-001~004)

---

## 6. テスト要件（Testing Requirements）

### 6.1 テスト戦略

本プロジェクトは、以下のテストレベルで品質を保証します：

| テストレベル | 目的 | カバレッジ目標 | 担当 |
|------------|------|--------------|------|
| **Unit Test** | 関数・メソッド単位の動作確認 | 80%以上 | Software Developer |
| **Integration Test** | コンポーネント間連携確認 | 主要フロー100% | Software Developer |
| **API Test** | REST API仕様準拠確認 | 全エンドポイント | Test Engineer |
| **E2E Test** | エンドツーエンドシナリオ確認 | 主要ユースケース | Test Engineer |
| **Performance Test** | パフォーマンス要件確認 | REQ-PRF-001~003 | Test Engineer |
| **Security Test** | セキュリティ要件確認 | REQ-SEC-001~008 | Security Auditor |
| **Compliance Test** | OneRoster仕様準拠確認 | 全要件 | QA Team |

---

### 6.2 受入テスト基準

**すべての要件（REQ-CSV-001〜REQ-OPS-004）はEARS形式で記述されており、以下の基準で受入テストを実施します：**

#### EARS Pattern別テスト方法

| EARS Pattern | テスト方法 | 例 |
|-------------|----------|-----|
| **Event-Driven (WHEN)** | イベント発生→期待される応答確認 | WHEN CSVアップロード → ファイル保存＋ID返却確認 |
| **State-Driven (WHILE)** | 特定状態維持→継続的動作確認 | WHILE インポート実行中 → 進捗API応答確認 |
| **Unwanted Behavior (IF...THEN)** | エラー条件発生→エラーハンドリング確認 | IF CSV解析エラー → HTTP 400＋エラー詳細確認 |
| **Optional Feature (WHERE)** | オプション有効時→機能動作確認 | WHERE プレビューモード → DB書き込みなし確認 |
| **Ubiquitous (SHALL)** | 常時適用→全ケースで動作確認 | SHALL sourcedId一意性 → 重複挿入拒否確認 |

---

### 6.3 テストカバレッジ要件

**REQ-TEST-001: テストカバレッジ**

```
System SHALL 以下のテストカバレッジ基準を満たす:
- Unit Test: 80%以上（行カバレッジ）
- Integration Test: 主要フロー100%
- API Test: 全エンドポイント100%
```

**受入基準**:
1. カバレッジ測定: Jest/pytest-cov/Istanbul
2. CI/CDパイプラインでカバレッジ自動測定
3. カバレッジ未達時: ビルド失敗

**Test Verification**: [ ] Coverage test: 80%以上確認

---

### 6.4 テスト自動化要件

**REQ-TEST-002: CI/CD統合**

```
System SHALL すべてのテストをCI/CDパイプラインで自動実行する
```

**受入基準**:
1. CI/CD: GitHub Actions/GitLab CI/Azure DevOps
2. 実行トリガー: Pull Request、mainブランチマージ
3. テスト失敗時: マージブロック

**Test Verification**: [ ] CI/CD test: 自動テスト実行確認

---

### 6.5 OneRoster Compliance Test

**REQ-TEST-003: OneRoster仕様準拠テスト**

```
System SHALL OneRoster Japan Profile 1.2.2仕様準拠をテストで検証する
```

**受入基準**:
1. テスト項目:
   - 全エンティティフィールド検証
   - データ型検証（ISO 8601、Enum等）
   - 必須フィールド検証
   - 外部キー参照整合性検証
2. テストデータ: OneRoster公式サンプルCSV使用

**Test Verification**: [ ] Compliance test: OneRoster仕様準拠100%確認

---

### 6.6 Delta API テスト

**REQ-TEST-004: Delta/Incremental APIテスト**

```
System SHALL Delta API（REQ-API-005~007）の動作をE2Eテストで検証する
```

**受入基準**:
1. テストシナリオ:
   - 新規レコード作成 → dateCreated == dateLastModified確認
   - レコード更新 → dateLastModified更新確認
   - 論理削除 → status='tobedeleted'確認
   - Delta API取得 → dateLastModifiedフィルタ動作確認
2. テストツール: Postman/Newman/REST Client

**Test Verification**: [ ] E2E test: Delta API完全動作確認

---

### 6.7 パフォーマンステスト

**REQ-TEST-005: 負荷テスト**

```
System SHALL 以下の負荷テストを実施し、パフォーマンス要件を満たすことを確認する:
- CSVインポート: 200,000レコード30分以内
- API: 95パーセンタイル <200ms
- 同時接続: 100ユーザー
```

**受入基準**:
1. 負荷テストツール: JMeter/k6/Locust
2. テスト環境: 本番相当スペック
3. 合格基準: REQ-PRF-001~003すべて満たす

**Test Verification**: [ ] Performance test: 負荷テスト合格

---

### 6.8 セキュリティテスト

**REQ-TEST-006: 脆弱性診断**

```
System SHALL OWASP Top 10脆弱性診断を実施し、Critical/High脆弱性ゼロを確認する
```

**受入基準**:
1. 診断ツール: OWASP ZAP/Burp Suite
2. 診断項目: SQLインジェクション、XSS、CSRF、認証・認可
3. 合格基準: Critical/High脆弱性ゼロ

**Test Verification**: [ ] Security test: 脆弱性診断合格

---

## 7. トレーサビリティマトリクス（Traceability Matrix）

### 7.1 要件トレーサビリティ

本要件定義書の各要件は、以下のドキュメントとトレース可能です：

| 要件カテゴリ | 要件ID範囲 | 出典ドキュメント | トレース先 |
|------------|----------|--------------|----------|
| **CSV Import** | REQ-CSV-001~020 | 初回ヒアリング Q4, Q7 | 設計書、テスト仕様書 |
| **CSV Export** | REQ-EXP-001~010 | 初回ヒアリング Q4 | 設計書、テスト仕様書 |
| **Data Model** | REQ-MDL-001~015 | OneRoster Japan Profile 1.2.2仕様 | データベーススキーマ設計 |
| **REST API** | REQ-API-001~020 | OneRoster 1.2仕様、Q15（Delta API） | API設計書、OpenAPI仕様 |
| **Data Validation** | REQ-VAL-001~010 | OneRoster 1.2仕様、Q13（正確性） | バリデーションロジック |
| **Performance** | REQ-PRF-001~003 | Q7, Q11 | パフォーマンステスト |
| **Availability** | REQ-AVL-001~003 | Q10 | インフラ設計、DR計画 |
| **Security** | REQ-SEC-001~008 | Q8, Q9, Q12 | セキュリティ設計 |
| **Compliance** | REQ-CMP-001~003 | Q8（個人情報保護法、GDPR、文科省） | コンプライアンスチェックリスト |
| **Operations** | REQ-OPS-001~004 | Q13（運用性） | 運用手順書 |

---

### 7.2 リサーチドキュメント対応表

本要件定義書は、以下のリサーチドキュメントの調査結果を反映しています：

| リサーチドキュメント | 対応要件 | 反映内容 |
|------------------|---------|---------|
| `docs/research/oneroster-japan-profile-research.md` | REQ-MDL-001~015, REQ-VAL-001~010 | OneRoster Japan Profile 1.2.2仕様準拠 |
| `docs/research/oneroster-incremental-api-research.md` | REQ-API-005~007, REQ-MDL-008~009 | Delta/Incremental API実装方法 |

---

### 7.3 ユーザーストーリー対応（今後作成）

本要件定義書完成後、以下のユーザーストーリーを作成します：

- **US-001**: システム管理者として、CSVファイルを一括インポートしたい（REQ-CSV-001~020）
- **US-002**: システム管理者として、データをCSVエクスポートしたい（REQ-EXP-001~010）
- **US-003**: 学習ツールとして、REST APIで生徒情報を取得したい（REQ-API-001~020）
- **US-004**: 学習ツールとして、Delta APIで差分データを取得したい（REQ-API-005~007）

---

## 8. 付録（Appendix）

### 8.1 用語集（Glossary）

| 用語 | 定義 |
|------|------|
| **OneRoster** | IMS Global Learning Consortiumが策定した教育データ連携標準規格 |
| **OneRoster Japan Profile 1.2.2** | 日本の教育現場向けにカスタマイズされたOneRoster 1.2仕様 |
| **sourcedId** | OneRosterにおける一意識別子（UUID推奨） |
| **Delta API** | 差分データのみを取得するAPI（dateLastModifiedフィルタ使用） |
| **Bulk API** | 全件データを取得するAPI |
| **EARS形式** | Easy Approach to Requirements Syntax（要件記述標準） |
| **Enrollment** | 履修登録（クラスとユーザーの紐付け） |
| **academicSession** | 学年、学期、ターム |
| **status** | レコードステータス（active, tobedeleted） |
| **dateLastModified** | レコード最終更新日時（Delta API用） |

---

### 8.2 参考文献（References）

1. **OneRoster Japan Profile 1.2.2仕様書** - IMS Global Learning Consortium Japan
   - https://www.imsglobal.org/oneroster-v11-final-specification
2. **個人情報保護法** - 個人情報保護委員会
   - https://www.ppc.go.jp/
3. **GDPR（General Data Protection Regulation）**
   - https://gdpr-info.eu/
4. **文部科学省「教育情報セキュリティポリシーに関するガイドライン」**
   - https://www.mext.go.jp/
5. **OWASP Top 10**
   - https://owasp.org/www-project-top-ten/
6. **EARS（Easy Approach to Requirements Syntax）**
   - `steering/rules/ears-format.md`

---

### 8.3 変更履歴（Change Log）

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | Requirements Analyst AI | 初版作成 |
| 1.1 | 2025-11-14 | Requirements Analyst AI | Section 2 完了 - プロジェクト概要 |
| 1.2 | 2025-11-14 | Requirements Analyst AI | Section 3 完了 - システムアーキテクチャ概要 |
| 1.3 | 2025-11-14 | Requirements Analyst AI | Section 4.1 完了 - CSV Import（REQ-CSV-001~020） |
| 1.4 | 2025-11-14 | Requirements Analyst AI | Section 4.2 完了 - CSV Export（REQ-EXP-001~010） |
| 1.5 | 2025-11-14 | Requirements Analyst AI | Section 4.3 完了 - Data Model（REQ-MDL-001~015） |
| 1.6 | 2025-11-14 | Requirements Analyst AI | Section 4.4 完了 - REST API（REQ-API-001~020、Delta API含む） |
| 1.7 | 2025-11-14 | Requirements Analyst AI | Section 4.5 完了 - Data Validation（REQ-VAL-001~010） |
| 1.8 | 2025-11-14 | Requirements Analyst AI | Section 5.1~5.5 完了 - 非機能要件（パフォーマンス、可用性、セキュリティ、コンプライアンス、運用） |
| 1.9 | 2025-11-14 | Requirements Analyst AI | Section 6 完了 - テスト要件 |
| 2.0 | 2025-11-14 | Requirements Analyst AI | Section 7-8 完了 - トレーサビリティマトリクス、付録 |

---

### 8.4 承認記録（Approval Record）

本要件定義書は、以下のステークホルダーの承認を必要とします：

| ステークホルダー | 役割 | 承認日 | 署名 |
|----------------|------|--------|------|
| **外部ベンダー・開発パートナー** | 承認者 |  |  |
| **教育委員会 情報システム部門** | 承認者 |  |  |
| **System Architect** | レビュアー |  |  |
| **Security Auditor** | レビュアー |  |  |

---

## Document Completion Summary

✅ **全セクション完了**

**合計要件数: 91要件**

- CSV Import: 20要件（REQ-CSV-001~020）
- CSV Export: 10要件（REQ-EXP-001~010）
- Data Model: 15要件（REQ-MDL-001~015）
- REST API: 20要件（REQ-API-001~020、Delta API含む）
- Data Validation: 10要件（REQ-VAL-001~010）
- Performance: 3要件（REQ-PRF-001~003）
- Availability: 3要件（REQ-AVL-001~003）
- Security: 8要件（REQ-SEC-001~008）
- Compliance: 3要件（REQ-CMP-001~003）
- Operations: 4要件（REQ-OPS-001~004）
- Testing: 6要件（REQ-TEST-001~006）

**全要件がEARS形式で記述され、テスト可能な受入基準を含んでいます。**

---

**Next Steps (次のフェーズ)**:

1. **要件レビュー**: 外部ベンダー・開発パートナーによる承認
2. **System Architect**: アーキテクチャ設計（`docs/architecture/`）
3. **Database Schema Designer**: データベース設計（`docs/database/`）
4. **API Designer**: OpenAPI仕様書作成（`docs/api/`）
5. **Software Developer**: 実装開始
6. **Test Engineer**: テスト計画・テストケース作成

---

**END OF DOCUMENT**
