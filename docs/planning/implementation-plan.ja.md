# RosterHub 実装計画書
## OneRoster Japan Profile 1.2.2 統合ハブ

**プロジェクト名**: RosterHub - OneRoster Japan Profile 1.2.2 Integration Hub
**バージョン**: 1.0
**作成日**: 2025-11-14
**作成者**: Project Manager AI
**ステータス**: Draft
**対象期間**: 12週間（3ヶ月）

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [プロジェクト概要](#2-プロジェクト概要)
3. [完了済みフェーズ（Phase 1-5）](#3-完了済みフェーズphase-1-5)
4. [WBS（Work Breakdown Structure）](#4-wbswork-breakdown-structure)
5. [詳細タスク一覧](#5-詳細タスク一覧)
6. [要件カバレッジマトリクス](#6-要件カバレッジマトリクス)
7. [スプリント計画](#7-スプリント計画)
8. [チーム構成とRACI](#8-チーム構成とraci)
9. [リスク管理](#9-リスク管理)
10. [品質管理](#10-品質管理)
11. [マイルストーンと成果物](#11-マイルストーンと成果物)
12. [予算見積もり](#12-予算見積もり)
13. [成功基準](#13-成功基準)

---

## 1. エグゼクティブサマリー

### 1.1 プロジェクト概要

**RosterHub**は、教育委員会レベル（10,000〜200,000名規模）の校務支援システムと学習ツール間のデータ連携を標準化・自動化するOneRoster Japan Profile 1.2.2準拠の統合ハブです。

### 1.2 現在の状況

**設計フェーズ完了（5/8段階）**:
- ✅ **Phase 1**: Research（3ドキュメント、163KB）
- ✅ **Phase 2**: Requirements Definition（91 EARS要件）
- ✅ **Phase 3**: System Architecture Design（8ドキュメント、C4ダイアグラム、8 ADR）
- ✅ **Phase 4**: Database Schema Design（12ドキュメント、ERダイアグラム、Prismaスキーマ、DDL）
- ✅ **Phase 5**: API Design（7ドキュメント、OpenAPI 3.0仕様）

### 1.3 実装スコープ

**技術スタック**:
- **Backend**: NestJS 10.x, TypeScript 5.3+, Node.js 20.x
- **Database**: PostgreSQL 15+, Prisma 5.x ORM
- **CSV Processing**: csv-parse 5.x（ストリーミング）、BullMQ 4.x（バックグラウンドジョブ）
- **Frontend**: React 18.3+, Next.js 14.x（Phase 2: 管理UI）

**主要機能**:
1. CSV一括インポート（200,000レコード、100MB+、30分以内）
2. CSV一括エクスポート（Japan Profile準拠）
3. REST API Bulk（全件取得）
4. REST API Delta（差分取得、`dateLastModified`フィルタ）
5. API認証（API Key + IPホワイトリスト）
6. データ検証（Japan Profile準拠）
7. 監査ログ（GDPR、個人情報保護法対応）

### 1.4 実装期間と予算

**期間**: 12週間（3ヶ月）
**工数**: 約960時間（2名フルタイム換算）
**チーム構成**: Backend Dev 2名、QA 1名、DevOps 1名、PM 1名（計5名）
**リリース目標**: できるだけ早く（ASAP、具体的期限なし）

### 1.5 重要な前提条件

- 設計ドキュメント完備（システムアーキテクチャ、データベース設計、API設計）
- 技術選定完了（NestJS、PostgreSQL、Prisma、csv-parse、BullMQ）
- OneRoster Japan Profile 1.2.2仕様確定
- 開発環境構築可能（Docker、PostgreSQL、Redis、Node.js 20.x）

---

## 2. プロジェクト概要

### 2.1 ビジネス目標

1. **データ連携の標準化**: OneRoster Japan Profile 1.2.2完全準拠
2. **運用自動化**: CSV手動運用廃止、API連携による自動同期
3. **データ品質向上**: 自動検証機能によるエラー削減
4. **セキュリティ強化**: API Key認証、IPホワイトリスト、監査ログ
5. **将来拡張性**: 新規エンティティ追加、仕様変更への対応容易性

### 2.2 技術目標

1. **OneRoster完全準拠**: 全エンティティ、全フィールド実装
2. **大規模処理**: 200,000名、100MB+ CSV、30分以内処理
3. **API性能**: 95パーセンタイル < 500ms、99パーセンタイル < 1秒
4. **テストカバレッジ**: 80%以上（ユニット + 統合 + E2E）
5. **コンプライアンス**: 個人情報保護法、GDPR、文科省ガイドライン遵守

### 2.3 対象スコープ

**In Scope（実装対象）**:
- OneRoster全7エンティティ（Users, Orgs, Classes, Courses, Enrollments, AcademicSessions, Demographics）
- CSV Import/Export（Japan Profile形式）
- REST API（Bulk + Delta）
- API認証・認可（API Key、IPホワイトリスト）
- データ検証エンジン
- 監査ログシステム
- バックグラウンドジョブ処理（BullMQ）

**Out of Scope（Phase 1対象外）**:
- Web管理UI（Phase 2）
- リアルタイムWebSocket同期（Phase 3）
- マルチテナンシー（Phase 3）
- 高度な分析ダッシュボード（Phase 2）

### 2.4 前提条件と制約

**前提条件**:
- ✅ OneRoster Japan Profile 1.2.2仕様書へのアクセス
- ✅ 設計ドキュメント完備（8ドキュメント、163KB）
- ✅ 技術スタック確定（NestJS、PostgreSQL、Prisma等）
- ✅ 開発環境構築可能（Docker、Node.js 20.x）
- ✅ サンプルCSVデータ（校務支援システムから提供）

**制約条件**:
- **期限**: できるだけ早く（ASAP、具体的期限未設定）
- **予算**: 未定（工数見積もりから逆算）
- **チームサイズ**: 5名（Backend 2名、QA 1名、DevOps 1名、PM 1名）
- **技術制約**: NestJS、PostgreSQL、Prismaを使用すること

---

## 3. 完了済みフェーズ（Phase 1-5）

### 3.1 Phase 1: Research（完了）

**期間**: 2025-11-14（1日）
**成果物**:
- ✅ `docs/research/oneroster-spec-analysis.md`（英語版）
- ✅ `docs/research/oneroster-spec-analysis.ja.md`（日本語版）
- ✅ `docs/research/japanese-educational-system.md`（英語版）
- ✅ `docs/research/japanese-educational-system.ja.md`（日本語版）
- ✅ `docs/research/technical-options.md`（英語版）
- ✅ `docs/research/technical-options.ja.md`（日本語版）

**主要成果**:
- OneRoster Japan Profile 1.2.2仕様の完全理解
- 7つのコアエンティティの特定（Users, Orgs, Classes, Courses, Enrollments, AcademicSessions, Demographics）
- Japan Profile拡張仕様（metadata.jp.*）の理解
- CSV/REST API両方のアクセスパターン理解

### 3.2 Phase 2: Requirements Definition（完了）

**期間**: 2025-11-14（1日）
**成果物**:
- ✅ `docs/requirements/oneroster-system-requirements.md`（全91要件）
- ✅ `docs/requirements/functional-requirements.md`（英語版）
- ✅ `docs/requirements/functional-requirements.ja.md`（日本語版）
- ✅ `docs/requirements/non-functional-requirements.md`（英語版）
- ✅ `docs/requirements/non-functional-requirements.ja.md`（日本語版）
- ✅ `docs/requirements/user-stories.md`（英語版）
- ✅ `docs/requirements/user-stories.ja.md`（日本語版）

**主要成果**:
- **91 EARS形式要件**（28機能要件、19非機能要件、44統合要件）
- 100%要件トレーサビリティ（要件 ↔ 設計）
- ユーザーストーリー（受入基準付き）

### 3.3 Phase 3: System Architecture Design（完了）

**期間**: 2025-11-14（1日）
**成果物**:
- ✅ `docs/design/architecture/system-architecture-design-part1-20251114.md`（C4 Context/Container）
- ✅ `docs/design/architecture/system-architecture-design-part2-20251114.md`（C4 Component/Code）
- ✅ `docs/design/architecture/adr/architecture-decision-records-20251114.md`（8 ADR）
- ✅ `docs/design/architecture/requirements-traceability-matrix-20251114.md`（要件トレーサビリティ）

**主要成果**:
- C4モデル4レベル完備（Context, Container, Component, Code）
- 8つの主要アーキテクチャ決定記録（ADR）
- 3層アーキテクチャ（Presentation, Business Logic, Data Access）

### 3.4 Phase 4: Database Schema Design（完了）

**期間**: 2025-11-14（1日）
**成果物**:
- ✅ Prismaスキーマ（全エンティティ、リレーション、インデックス）
- ✅ ERダイアグラム（Mermaid形式）
- ✅ データベース正規化分析（第3正規形）
- ✅ DDLスクリプト

**主要成果**:
- 7つのOneRosterエンティティテーブル
- metadata.jp.*用JSONBカラム
- dateLastModified複合インデックス（Delta API最適化）
- 参照整合性制約（外部キー）

### 3.5 Phase 5: API Design（完了）

**期間**: 2025-11-14（1日）
**成果物**:
- ✅ `docs/design/api/api-design-document.md`（REST API設計）
- ✅ `docs/design/api/api-usage-guide.md`（使用例、コードサンプル）
- ✅ OpenAPI 3.0仕様（Swagger対応）

**主要成果**:
- Bulk APIエンドポイント（GET /oneroster/v1p2/{entity}）
- Delta APIエンドポイント（dateLastModified フィルタ）
- API認証設計（API Key、IPホワイトリスト）
- ページネーション、フィルタリング、ソート

---

## 4. WBS（Work Breakdown Structure）

### 4.1 WBS階層構造

```
RosterHub実装プロジェクト
│
├── 1. プロジェクトセットアップ（Sprint 0: 1週間）
│   ├── 1.1 開発環境構築
│   │   ├── 1.1.1 Monorepo初期化（pnpm + Turborepo）
│   │   ├── 1.1.2 NestJSプロジェクト作成
│   │   ├── 1.1.3 Docker Compose設定（PostgreSQL + Redis）
│   │   ├── 1.1.4 CI/CDパイプライン構築（GitHub Actions）
│   │   └── 1.1.5 ESLint/Prettier設定
│   │
│   ├── 1.2 データベース初期化
│   │   ├── 1.2.1 Prismaセットアップ
│   │   ├── 1.2.2 schema.prisma作成
│   │   ├── 1.2.3 初期マイグレーション実行
│   │   └── 1.2.4 シードデータ作成
│   │
│   └── 1.3 プロジェクトドキュメント整備
│       ├── 1.3.1 README.md更新
│       ├── 1.3.2 CONTRIBUTING.md作成
│       └── 1.3.3 開発者ガイド作成
│
├── 2. データベースレイヤー（Sprint 1-2: 2週間）
│   ├── 2.1 Prismaスキーマ実装
│   │   ├── 2.1.1 Userモデル実装
│   │   ├── 2.1.2 Orgモデル実装
│   │   ├── 2.1.3 Classモデル実装
│   │   ├── 2.1.4 Courseモデル実装
│   │   ├── 2.1.5 Enrollmentモデル実装
│   │   ├── 2.1.6 AcademicSessionモデル実装
│   │   ├── 2.1.7 Demographicモデル実装
│   │   └── 2.1.8 システムテーブル（ApiKey, AuditLog, CsvImportJob）
│   │
│   ├── 2.2 Repositoryパターン実装
│   │   ├── 2.2.1 UserRepository実装
│   │   ├── 2.2.2 OrgRepository実装
│   │   ├── 2.2.3 ClassRepository実装
│   │   ├── 2.2.4 CourseRepository実装
│   │   ├── 2.2.5 EnrollmentRepository実装
│   │   ├── 2.2.6 AcademicSessionRepository実装
│   │   └── 2.2.7 DemographicRepository実装
│   │
│   └── 2.3 マイグレーション・シード
│       ├── 2.3.1 マイグレーションスクリプト作成
│       ├── 2.3.2 シードデータ準備（1000レコード）
│       └── 2.3.3 テストデータ作成（10,000レコード）
│
├── 3. コアドメインエンティティ（Sprint 3-4: 2週間）
│   ├── 3.1 Userエンティティモジュール
│   │   ├── 3.1.1 UsersController（CRUD）
│   │   ├── 3.1.2 UsersService（ビジネスロジック）
│   │   ├── 3.1.3 User DTO（Create, Update, Response）
│   │   ├── 3.1.4 User Entity（Prismaエンティティ）
│   │   └── 3.1.5 UsersModule（NestJSモジュール）
│   │
│   ├── 3.2 Orgエンティティモジュール
│   │   ├── 3.2.1 OrgsController
│   │   ├── 3.2.2 OrgsService
│   │   ├── 3.2.3 Org DTO
│   │   ├── 3.2.4 Org Entity
│   │   └── 3.2.5 OrgsModule
│   │
│   ├── 3.3 Classエンティティモジュール
│   │   ├── 3.3.1 ClassesController
│   │   ├── 3.3.2 ClassesService
│   │   ├── 3.3.3 Class DTO
│   │   ├── 3.3.4 Class Entity
│   │   └── 3.3.5 ClassesModule
│   │
│   ├── 3.4 Courseエンティティモジュール
│   │   ├── 3.4.1 CoursesController
│   │   ├── 3.4.2 CoursesService
│   │   ├── 3.4.3 Course DTO
│   │   ├── 3.4.4 Course Entity
│   │   └── 3.4.5 CoursesModule
│   │
│   ├── 3.5 Enrollmentエンティティモジュール
│   │   ├── 3.5.1 EnrollmentsController
│   │   ├── 3.5.2 EnrollmentsService
│   │   ├── 3.5.3 Enrollment DTO
│   │   ├── 3.5.4 Enrollment Entity
│   │   └── 3.5.5 EnrollmentsModule
│   │
│   ├── 3.6 AcademicSessionエンティティモジュール
│   │   ├── 3.6.1 AcademicSessionsController
│   │   ├── 3.6.2 AcademicSessionsService
│   │   ├── 3.6.3 AcademicSession DTO
│   │   ├── 3.6.4 AcademicSession Entity
│   │   └── 3.6.5 AcademicSessionsModule
│   │
│   └── 3.7 Demographicエンティティモジュール
│       ├── 3.7.1 DemographicsController
│       ├── 3.7.2 DemographicsService
│       ├── 3.7.3 Demographic DTO
│       ├── 3.7.4 Demographic Entity
│       └── 3.7.5 DemographicsModule
│
├── 4. 認証・認可（Sprint 5: 1週間）
│   ├── 4.1 API Key管理モジュール
│   │   ├── 4.1.1 ApiKeyService（Key生成、検証）
│   │   ├── 4.1.2 ApiKeyGuard（NestJS Guard）
│   │   ├── 4.1.3 ApiKey DTO
│   │   └── 4.1.4 AuthModule
│   │
│   ├── 4.2 IPホワイトリストミドルウェア
│   │   ├── 4.2.1 IpWhitelistGuard
│   │   └── 4.2.2 IP検証ロジック
│   │
│   ├── 4.3 レート制限
│   │   ├── 4.3.1 RateLimitGuard（NestJS Throttler）
│   │   └── 4.3.2 Redis連携（カウンター管理）
│   │
│   └── 4.4 監査ログモジュール
│       ├── 4.4.1 AuditLogService
│       ├── 4.4.2 AuditLogInterceptor（自動ログ記録）
│       ├── 4.4.3 AuditLog Entity
│       └── 4.4.4 AuditModule
│
├── 5. データ検証エンジン（Sprint 5: 1週間）
│   ├── 5.1 Japan Profileバリデーター
│   │   ├── 5.1.1 JapanProfileValidatorService
│   │   ├── 5.1.2 Userバリデーションルール（kanaGivenName等）
│   │   ├── 5.1.3 Orgバリデーションルール
│   │   ├── 5.1.4 Classバリデーションルール
│   │   └── 5.1.5 Enrollmentバリデーションルール
│   │
│   ├── 5.2 参照整合性バリデーター
│   │   ├── 5.2.1 ReferenceValidatorService（外部キーチェック）
│   │   └── 5.2.2 エンティティ存在確認ロジック
│   │
│   └── 5.3 重複検出
│       ├── 5.3.1 DuplicateDetectorService
│       └── 5.3.2 sourcedIdユニーク検証
│
├── 6. CSV処理（Sprint 6-7: 2週間）
│   ├── 6.1 CSVインポートモジュール
│   │   ├── 6.1.1 CsvImportController（アップロードエンドポイント）
│   │   ├── 6.1.2 CsvImportService（オーケストレーション）
│   │   ├── 6.1.3 CsvParserService（ストリーミングパーサー：csv-parse）
│   │   ├── 6.1.4 CsvValidatorService（Japan Profile検証）
│   │   ├── 6.1.5 BulkInsertService（バルクインサート）
│   │   ├── 6.1.6 ImportJobProcessor（BullMQプロセッサー）
│   │   ├── 6.1.7 CSV Import DTO
│   │   └── 6.1.8 CsvImportModule
│   │
│   └── 6.2 CSVエクスポートモジュール
│       ├── 6.2.1 CsvExportController（ダウンロードエンドポイント）
│       ├── 6.2.2 CsvExportService（CSV生成ロジック）
│       ├── 6.2.3 CsvFormatterService（Japan Profileフォーマット）
│       ├── 6.2.4 CSV Export DTO
│       └── 6.2.5 CsvExportModule
│
├── 7. REST API（Sprint 8-9: 2週間）
│   ├── 7.1 Bulk APIエンドポイント
│   │   ├── 7.1.1 BulkApiController（全エンティティ）
│   │   ├── 7.1.2 BulkApiService（全件取得ロジック）
│   │   ├── 7.1.3 ページネーション実装（offset/limit）
│   │   ├── 7.1.4 フィルタリング実装（クエリパラメータ）
│   │   ├── 7.1.5 ソート実装（orderBy）
│   │   └── 7.1.6 BulkApiModule
│   │
│   ├── 7.2 Delta/Incremental APIエンドポイント
│   │   ├── 7.2.1 DeltaApiController
│   │   ├── 7.2.2 DeltaApiService（差分取得ロジック）
│   │   ├── 7.2.3 ChangeTrackerService（dateLastModified追跡）
│   │   ├── 7.2.4 Delta API DTO
│   │   └── 7.2.5 DeltaApiModule
│   │
│   └── 7.3 共通APIユーティリティ
│       ├── 7.3.1 Pagination DTO
│       ├── 7.3.2 Filter DTO
│       ├── 7.3.3 Sort DTO
│       ├── 7.3.4 ResponseInterceptor（共通レスポンス形式）
│       └── 7.3.5 ErrorInterceptor（エラーハンドリング）
│
├── 8. テスト（Sprint 10: 1週間）
│   ├── 8.1 ユニットテスト
│   │   ├── 8.1.1 Serviceレイヤーテスト（全エンティティ）
│   │   ├── 8.1.2 Repositoryレイヤーテスト
│   │   ├── 8.1.3 Validatorテスト
│   │   └── 8.1.4 カバレッジ80%達成
│   │
│   ├── 8.2 統合テスト
│   │   ├── 8.2.1 CSV Import統合テスト
│   │   ├── 8.2.2 CSV Export統合テスト
│   │   ├── 8.2.3 Bulk API統合テスト
│   │   └── 8.2.4 Delta API統合テスト
│   │
│   ├── 8.3 E2Eテスト（Playwright）
│   │   ├── 8.3.1 CSV Import E2E（200,000レコード）
│   │   ├── 8.3.2 CSV Export E2E
│   │   ├── 8.3.3 Bulk API E2E（全エンティティCRUD）
│   │   ├── 8.3.4 Delta API E2E（差分取得）
│   │   └── 8.3.5 認証E2E（API Key、IPホワイトリスト）
│   │
│   └── 8.4 パフォーマンステスト
│       ├── 8.4.1 CSV Import性能テスト（200,000レコード、30分以内）
│       ├── 8.4.2 Bulk API性能テスト（95パーセンタイル < 500ms）
│       ├── 8.4.3 Delta API性能テスト
│       └── 8.4.4 同時接続テスト（100ユーザー）
│
└── 9. デプロイメント・運用（Sprint 11-12: 2週間）
    ├── 9.1 Dockerコンテナ化
    │   ├── 9.1.1 Dockerfile作成（マルチステージビルド）
    │   ├── 9.1.2 docker-compose.yml作成
    │   └── 9.1.3 コンテナイメージ最適化
    │
    ├── 9.2 本番環境デプロイ
    │   ├── 9.2.1 AWS ECS Fargate設定（またはRailway）
    │   ├── 9.2.2 PostgreSQL RDS設定
    │   ├── 9.2.3 Redis ElastiCache設定
    │   ├── 9.2.4 ロードバランサー設定（ALB）
    │   └── 9.2.5 環境変数管理（AWS Secrets Manager）
    │
    ├── 9.3 監視・ロギング
    │   ├── 9.3.1 Sentry統合（エラートラッキング）
    │   ├── 9.3.2 CloudWatch Logs設定
    │   ├── 9.3.3 メトリクスダッシュボード作成
    │   └── 9.3.4 アラート設定
    │
    └── 9.4 ドキュメント
        ├── 9.4.1 デプロイメントガイド作成
        ├── 9.4.2 運用マニュアル作成
        ├── 9.4.3 API利用ガイド作成
        └── 9.4.4 トラブルシューティングガイド作成
```

---

## 5. 詳細タスク一覧

### 5.1 Sprint 0: プロジェクトセットアップ（Week 1）

| タスクID | タスク名 | 担当 | 工数 | 優先度 | 依存関係 | EARS要件 |
|---------|---------|------|------|--------|---------|---------|
| **TASK-001** | Monorepo初期化（pnpm + Turborepo） | Backend Dev 1 | 4h | Critical | なし | - |
| **TASK-002** | NestJSプロジェクト作成 | Backend Dev 1 | 4h | Critical | TASK-001 | - |
| **TASK-003** | Docker Compose設定（PostgreSQL + Redis） | DevOps | 4h | Critical | なし | NFR-OPS-001 |
| **TASK-004** | CI/CDパイプライン構築（GitHub Actions） | DevOps | 8h | High | TASK-002 | NFR-OPS-002 |
| **TASK-005** | ESLint/Prettier設定 | Backend Dev 1 | 2h | Medium | TASK-002 | NFR-MNT-002 |
| **TASK-006** | Prismaセットアップ | Backend Dev 2 | 2h | Critical | TASK-003 | - |
| **TASK-007** | schema.prisma作成（全エンティティ） | Backend Dev 2 | 8h | Critical | TASK-006 | REQ-MDL-001〜030 |
| **TASK-008** | 初期マイグレーション実行 | Backend Dev 2 | 2h | Critical | TASK-007 | - |
| **TASK-009** | シードデータ作成（1000レコード） | Backend Dev 2 | 4h | Medium | TASK-008 | - |
| **TASK-010** | README.md更新 | PM | 2h | Low | TASK-002 | - |

**Sprint 0 合計工数**: 40時間

---

### 5.2 Sprint 1-2: データベースレイヤー（Week 2-3）

| タスクID | タスク名 | 担当 | 工数 | 優先度 | 依存関係 | EARS要件 |
|---------|---------|------|------|--------|---------|---------|
| **TASK-011** | UserRepository実装 | Backend Dev 1 | 6h | Critical | TASK-008 | REQ-MDL-001〜005 |
| **TASK-012** | OrgRepository実装 | Backend Dev 1 | 6h | Critical | TASK-008 | REQ-MDL-006〜010 |
| **TASK-013** | ClassRepository実装 | Backend Dev 1 | 6h | Critical | TASK-008 | REQ-MDL-011〜015 |
| **TASK-014** | CourseRepository実装 | Backend Dev 2 | 6h | Critical | TASK-008 | REQ-MDL-016〜020 |
| **TASK-015** | EnrollmentRepository実装 | Backend Dev 2 | 6h | Critical | TASK-008 | REQ-MDL-021〜025 |
| **TASK-016** | AcademicSessionRepository実装 | Backend Dev 2 | 4h | Critical | TASK-008 | REQ-MDL-026〜028 |
| **TASK-017** | DemographicRepository実装 | Backend Dev 1 | 4h | Critical | TASK-008 | REQ-MDL-029〜030 |
| **TASK-018** | ApiKeyRepository実装 | Backend Dev 2 | 4h | High | TASK-008 | REQ-SEC-001〜005 |
| **TASK-019** | AuditLogRepository実装 | Backend Dev 1 | 4h | High | TASK-008 | REQ-CMP-001〜005 |
| **TASK-020** | CsvImportJobRepository実装 | Backend Dev 2 | 4h | Medium | TASK-008 | REQ-CSV-001〜020 |
| **TASK-021** | Repositoryユニットテスト | QA | 16h | High | TASK-011〜020 | - |
| **TASK-022** | テストデータ作成（10,000レコード） | Backend Dev 2 | 4h | Medium | TASK-009 | - |

**Sprint 1-2 合計工数**: 70時間

---

### 5.3 Sprint 3-4: コアドメインエンティティ（Week 4-5）

| タスクID | タスク名 | 担当 | 工数 | 優先度 | 依存関係 | EARS要件 |
|---------|---------|------|------|--------|---------|---------|
| **TASK-023** | UsersController実装（CRUD） | Backend Dev 1 | 8h | Critical | TASK-011 | REQ-API-001〜010 |
| **TASK-024** | UsersService実装 | Backend Dev 1 | 8h | Critical | TASK-011 | REQ-API-001〜010 |
| **TASK-025** | User DTO実装（Create, Update, Response） | Backend Dev 1 | 4h | Critical | TASK-023 | REQ-API-001〜010 |
| **TASK-026** | OrgsController実装 | Backend Dev 2 | 6h | Critical | TASK-012 | REQ-API-001〜010 |
| **TASK-027** | OrgsService実装 | Backend Dev 2 | 6h | Critical | TASK-012 | REQ-API-001〜010 |
| **TASK-028** | Org DTO実装 | Backend Dev 2 | 4h | Critical | TASK-026 | REQ-API-001〜010 |
| **TASK-029** | ClassesController実装 | Backend Dev 1 | 6h | Critical | TASK-013 | REQ-API-001〜010 |
| **TASK-030** | ClassesService実装 | Backend Dev 1 | 6h | Critical | TASK-013 | REQ-API-001〜010 |
| **TASK-031** | Class DTO実装 | Backend Dev 1 | 4h | Critical | TASK-029 | REQ-API-001〜010 |
| **TASK-032** | CoursesController実装 | Backend Dev 2 | 6h | Critical | TASK-014 | REQ-API-001〜010 |
| **TASK-033** | CoursesService実装 | Backend Dev 2 | 6h | Critical | TASK-014 | REQ-API-001〜010 |
| **TASK-034** | Course DTO実装 | Backend Dev 2 | 4h | Critical | TASK-032 | REQ-API-001〜010 |
| **TASK-035** | EnrollmentsController実装 | Backend Dev 1 | 6h | Critical | TASK-015 | REQ-API-001〜010 |
| **TASK-036** | EnrollmentsService実装 | Backend Dev 1 | 6h | Critical | TASK-015 | REQ-API-001〜010 |
| **TASK-037** | Enrollment DTO実装 | Backend Dev 1 | 4h | Critical | TASK-035 | REQ-API-001〜010 |
| **TASK-038** | AcademicSessionsController実装 | Backend Dev 2 | 4h | Critical | TASK-016 | REQ-API-001〜010 |
| **TASK-039** | AcademicSessionsService実装 | Backend Dev 2 | 4h | Critical | TASK-016 | REQ-API-001〜010 |
| **TASK-040** | AcademicSession DTO実装 | Backend Dev 2 | 4h | Critical | TASK-038 | REQ-API-001〜010 |
| **TASK-041** | DemographicsController実装 | Backend Dev 1 | 4h | Critical | TASK-017 | REQ-API-001〜010 |
| **TASK-042** | DemographicsService実装 | Backend Dev 1 | 4h | Critical | TASK-017 | REQ-API-001〜010 |
| **TASK-043** | Demographic DTO実装 | Backend Dev 1 | 4h | Critical | TASK-041 | REQ-API-001〜010 |
| **TASK-044** | エンティティユニットテスト | QA | 24h | High | TASK-023〜043 | - |

**Sprint 3-4 合計工数**: 132時間

---

### 5.4 Sprint 5: 認証・認可・検証（Week 6）

| タスクID | タスク名 | 担当 | 工数 | 優先度 | 依存関係 | EARS要件 |
|---------|---------|------|------|--------|---------|---------|
| **TASK-045** | ApiKeyService実装（Key生成、検証） | Backend Dev 1 | 8h | Critical | TASK-018 | REQ-SEC-001〜005 |
| **TASK-046** | ApiKeyGuard実装（NestJS Guard） | Backend Dev 1 | 4h | Critical | TASK-045 | REQ-SEC-001〜005 |
| **TASK-047** | IpWhitelistGuard実装 | Backend Dev 1 | 4h | Critical | TASK-045 | REQ-SEC-006〜010 |
| **TASK-048** | RateLimitGuard実装（Throttler） | Backend Dev 2 | 4h | High | TASK-003 | REQ-SEC-011〜015 |
| **TASK-049** | AuditLogService実装 | Backend Dev 2 | 6h | High | TASK-019 | REQ-CMP-001〜005 |
| **TASK-050** | AuditLogInterceptor実装 | Backend Dev 2 | 4h | High | TASK-049 | REQ-CMP-001〜005 |
| **TASK-051** | JapanProfileValidatorService実装 | Backend Dev 1 | 8h | Critical | TASK-011〜017 | REQ-VAL-001〜010 |
| **TASK-052** | ReferenceValidatorService実装 | Backend Dev 1 | 6h | Critical | TASK-011〜017 | REQ-VAL-011〜015 |
| **TASK-053** | DuplicateDetectorService実装 | Backend Dev 2 | 4h | High | TASK-011〜017 | REQ-VAL-016〜020 |
| **TASK-054** | 認証・検証ユニットテスト | QA | 12h | High | TASK-045〜053 | - |

**Sprint 5 合計工数**: 60時間

---

### 5.5 Sprint 6-7: CSV処理（Week 7-8）

| タスクID | タスク名 | 担当 | 工数 | 優先度 | 依存関係 | EARS要件 |
|---------|---------|------|------|--------|---------|---------|
| **TASK-055** | CsvParserService実装（csv-parse） | Backend Dev 1 | 8h | Critical | TASK-003 | REQ-CSV-001〜005 |
| **TASK-056** | CsvValidatorService実装 | Backend Dev 1 | 8h | Critical | TASK-051, TASK-052 | REQ-CSV-006〜010 |
| **TASK-057** | BulkInsertService実装 | Backend Dev 2 | 8h | Critical | TASK-011〜017 | REQ-CSV-001〜005 |
| **TASK-058** | ImportJobProcessor実装（BullMQ） | Backend Dev 2 | 10h | Critical | TASK-055, TASK-057 | REQ-CSV-001〜005 |
| **TASK-059** | CsvImportService実装 | Backend Dev 1 | 8h | Critical | TASK-055〜058 | REQ-CSV-001〜020 |
| **TASK-060** | CsvImportController実装 | Backend Dev 1 | 6h | Critical | TASK-059 | REQ-CSV-001〜020 |
| **TASK-061** | CSV Import DTO実装 | Backend Dev 1 | 4h | High | TASK-060 | REQ-CSV-001〜020 |
| **TASK-062** | CsvFormatterService実装 | Backend Dev 2 | 6h | Critical | TASK-011〜017 | REQ-EXP-001〜010 |
| **TASK-063** | CsvExportService実装 | Backend Dev 2 | 8h | Critical | TASK-062 | REQ-EXP-001〜010 |
| **TASK-064** | CsvExportController実装 | Backend Dev 2 | 4h | Critical | TASK-063 | REQ-EXP-001〜010 |
| **TASK-065** | CSV Export DTO実装 | Backend Dev 2 | 4h | High | TASK-064 | REQ-EXP-001〜010 |
| **TASK-066** | CSV処理統合テスト | QA | 16h | High | TASK-055〜065 | - |

**Sprint 6-7 合計工数**: 90時間

---

### 5.6 Sprint 8-9: REST API（Week 9-10）

| タスクID | タスク名 | 担当 | 工数 | 優先度 | 依存関係 | EARS要件 |
|---------|---------|------|------|--------|---------|---------|
| **TASK-067** | BulkApiController実装 | Backend Dev 1 | 8h | Critical | TASK-023〜043 | REQ-API-001〜010 |
| **TASK-068** | BulkApiService実装 | Backend Dev 1 | 8h | Critical | TASK-011〜017 | REQ-API-001〜010 |
| **TASK-069** | ページネーション実装（Pagination DTO） | Backend Dev 1 | 4h | High | TASK-067 | REQ-API-011〜015 |
| **TASK-070** | フィルタリング実装（Filter DTO） | Backend Dev 1 | 4h | High | TASK-067 | REQ-API-016〜020 |
| **TASK-071** | ソート実装（Sort DTO） | Backend Dev 1 | 4h | High | TASK-067 | REQ-API-021〜025 |
| **TASK-072** | DeltaApiController実装 | Backend Dev 2 | 8h | Critical | TASK-023〜043 | REQ-API-026〜030 |
| **TASK-073** | DeltaApiService実装 | Backend Dev 2 | 8h | Critical | TASK-011〜017 | REQ-API-026〜030 |
| **TASK-074** | ChangeTrackerService実装 | Backend Dev 2 | 6h | High | TASK-011〜017 | REQ-API-026〜030 |
| **TASK-075** | ResponseInterceptor実装 | Backend Dev 1 | 4h | Medium | TASK-067, TASK-072 | REQ-API-001〜030 |
| **TASK-076** | ErrorInterceptor実装 | Backend Dev 1 | 4h | Medium | TASK-067, TASK-072 | REQ-API-001〜030 |
| **TASK-077** | OpenAPI仕様生成（Swagger） | Backend Dev 2 | 6h | Medium | TASK-067〜076 | - |
| **TASK-078** | REST API統合テスト | QA | 16h | High | TASK-067〜077 | - |

**Sprint 8-9 合計工数**: 80時間

---

### 5.7 Sprint 10: テスト（Week 11）

| タスクID | タスク名 | 担当 | 工数 | 優先度 | 依存関係 | EARS要件 |
|---------|---------|------|------|--------|---------|---------|
| **TASK-079** | ユニットテストカバレッジ確認（80%目標） | QA | 8h | Critical | TASK-001〜078 | REQ-OPS-006〜010 |
| **TASK-080** | E2E: CSV Import（200,000レコード） | QA | 8h | Critical | TASK-060 | REQ-CSV-001〜005, REQ-PRF-001〜005 |
| **TASK-081** | E2E: CSV Export | QA | 4h | High | TASK-064 | REQ-EXP-001〜010 |
| **TASK-082** | E2E: Bulk API（全エンティティCRUD） | QA | 8h | Critical | TASK-067 | REQ-API-001〜010 |
| **TASK-083** | E2E: Delta API（差分取得） | QA | 6h | Critical | TASK-072 | REQ-API-026〜030 |
| **TASK-084** | E2E: API認証（API Key、IP制限） | QA | 4h | High | TASK-046, TASK-047 | REQ-SEC-001〜010 |
| **TASK-085** | パフォーマンステスト: CSV Import | QA | 8h | Critical | TASK-060 | REQ-PRF-001〜005 |
| **TASK-086** | パフォーマンステスト: Bulk API | QA | 4h | High | TASK-067 | REQ-PRF-001〜005 |
| **TASK-087** | パフォーマンステスト: Delta API | QA | 4h | High | TASK-072 | REQ-PRF-001〜005 |
| **TASK-088** | 負荷テスト（100同時接続） | QA | 8h | Medium | TASK-067, TASK-072 | REQ-AVL-001〜005 |
| **TASK-089** | テスト結果レポート作成 | QA | 4h | Medium | TASK-079〜088 | - |

**Sprint 10 合計工数**: 66時間

---

### 5.8 Sprint 11-12: デプロイメント・運用（Week 12）

| タスクID | タスク名 | 担当 | 工数 | 優先度 | 依存関係 | EARS要件 |
|---------|---------|------|------|--------|---------|---------|
| **TASK-090** | Dockerfile作成（マルチステージビルド） | DevOps | 6h | Critical | TASK-001〜078 | NFR-OPS-001 |
| **TASK-091** | docker-compose.yml作成 | DevOps | 4h | Critical | TASK-090 | NFR-OPS-001 |
| **TASK-092** | AWS ECS Fargate設定 | DevOps | 12h | Critical | TASK-090 | NFR-OPS-001 |
| **TASK-093** | PostgreSQL RDS設定 | DevOps | 6h | Critical | TASK-092 | NFR-OPS-001 |
| **TASK-094** | Redis ElastiCache設定 | DevOps | 4h | Critical | TASK-092 | NFR-OPS-001 |
| **TASK-095** | ALB設定（ロードバランサー） | DevOps | 4h | High | TASK-092 | NFR-AVL-001〜005 |
| **TASK-096** | 環境変数管理（Secrets Manager） | DevOps | 4h | High | TASK-092 | REQ-SEC-016〜020 |
| **TASK-097** | Sentry統合（エラートラッキング） | DevOps | 4h | Medium | TASK-092 | NFR-OPS-001〜005 |
| **TASK-098** | CloudWatch Logs設定 | DevOps | 4h | Medium | TASK-092 | NFR-OPS-001〜005 |
| **TASK-099** | メトリクスダッシュボード作成 | DevOps | 6h | Medium | TASK-098 | NFR-OPS-001〜005 |
| **TASK-100** | アラート設定（エラー、パフォーマンス） | DevOps | 4h | Medium | TASK-099 | NFR-OPS-001〜005 |
| **TASK-101** | デプロイメントガイド作成 | PM | 4h | Low | TASK-092 | - |
| **TASK-102** | 運用マニュアル作成 | PM | 6h | Low | TASK-092 | - |
| **TASK-103** | API利用ガイド作成 | PM | 4h | Medium | TASK-077 | - |
| **TASK-104** | トラブルシューティングガイド作成 | PM | 4h | Low | TASK-089 | - |

**Sprint 11-12 合計工数**: 76時間

---

## 6. 要件カバレッジマトリクス

### 6.1 機能要件カバレッジ（91 EARS要件 → タスクマッピング）

| 要件カテゴリ | 要件ID | タスクID | タスク名 | 実装状況 |
|------------|-------|---------|---------|---------|
| **CSV Import** | REQ-CSV-001 | TASK-055, TASK-057 | CsvParserService, BulkInsertService | ⏸️ 未着手 |
| **CSV Import** | REQ-CSV-002 | TASK-056 | CsvValidatorService | ⏸️ 未着手 |
| **CSV Import** | REQ-CSV-003 | TASK-058 | ImportJobProcessor（BullMQ） | ⏸️ 未着手 |
| **CSV Import** | REQ-CSV-004 | TASK-060 | CsvImportController | ⏸️ 未着手 |
| **CSV Import** | REQ-CSV-005 | TASK-059 | CsvImportService | ⏸️ 未着手 |
| **CSV Export** | REQ-EXP-001 | TASK-062 | CsvFormatterService | ⏸️ 未着手 |
| **CSV Export** | REQ-EXP-002 | TASK-063 | CsvExportService | ⏸️ 未着手 |
| **CSV Export** | REQ-EXP-003 | TASK-064 | CsvExportController | ⏸️ 未着手 |
| **Data Model - User** | REQ-MDL-001〜005 | TASK-023, TASK-024 | UsersController, UsersService | ⏸️ 未着手 |
| **Data Model - Org** | REQ-MDL-006〜010 | TASK-026, TASK-027 | OrgsController, OrgsService | ⏸️ 未着手 |
| **Data Model - Class** | REQ-MDL-011〜015 | TASK-029, TASK-030 | ClassesController, ClassesService | ⏸️ 未着手 |
| **Data Model - Course** | REQ-MDL-016〜020 | TASK-032, TASK-033 | CoursesController, CoursesService | ⏸️ 未着手 |
| **Data Model - Enrollment** | REQ-MDL-021〜025 | TASK-035, TASK-036 | EnrollmentsController, EnrollmentsService | ⏸️ 未着手 |
| **Data Model - AcademicSession** | REQ-MDL-026〜028 | TASK-038, TASK-039 | AcademicSessionsController, Service | ⏸️ 未着手 |
| **Data Model - Demographic** | REQ-MDL-029〜030 | TASK-041, TASK-042 | DemographicsController, Service | ⏸️ 未着手 |
| **REST API - Bulk** | REQ-API-001〜010 | TASK-067, TASK-068 | BulkApiController, BulkApiService | ⏸️ 未着手 |
| **REST API - Pagination** | REQ-API-011〜015 | TASK-069 | Pagination DTO | ⏸️ 未着手 |
| **REST API - Filter** | REQ-API-016〜020 | TASK-070 | Filter DTO | ⏸️ 未着手 |
| **REST API - Sort** | REQ-API-021〜025 | TASK-071 | Sort DTO | ⏸️ 未着手 |
| **REST API - Delta** | REQ-API-026〜030 | TASK-072, TASK-073 | DeltaApiController, DeltaApiService | ⏸️ 未着手 |
| **Validation - Japan Profile** | REQ-VAL-001〜010 | TASK-051 | JapanProfileValidatorService | ⏸️ 未着手 |
| **Validation - Reference** | REQ-VAL-011〜015 | TASK-052 | ReferenceValidatorService | ⏸️ 未着手 |
| **Validation - Duplicate** | REQ-VAL-016〜020 | TASK-053 | DuplicateDetectorService | ⏸️ 未着手 |
| **Security - API Key** | REQ-SEC-001〜005 | TASK-045, TASK-046 | ApiKeyService, ApiKeyGuard | ⏸️ 未着手 |
| **Security - IP Whitelist** | REQ-SEC-006〜010 | TASK-047 | IpWhitelistGuard | ⏸️ 未着手 |
| **Security - Rate Limit** | REQ-SEC-011〜015 | TASK-048 | RateLimitGuard | ⏸️ 未着手 |
| **Compliance - Audit Log** | REQ-CMP-001〜005 | TASK-049, TASK-050 | AuditLogService, Interceptor | ⏸️ 未着手 |
| **Performance** | REQ-PRF-001〜005 | TASK-085, TASK-086, TASK-087 | パフォーマンステスト | ⏸️ 未着手 |
| **Availability** | REQ-AVL-001〜005 | TASK-088, TASK-095 | 負荷テスト、ALB設定 | ⏸️ 未着手 |
| **Operations** | REQ-OPS-001〜010 | TASK-097〜100 | Sentry、CloudWatch、ダッシュボード | ⏸️ 未着手 |

**カバレッジ**: 91要件 / 91要件 = **100%**（すべてタスクにマッピング済み）

---

### 6.2 要件カテゴリ別カバレッジサマリー

| 要件カテゴリ | 要件数 | マッピング済みタスク数 | カバレッジ | ギャップ |
|------------|-------|-------------------|-----------|---------|
| CSV Import | 20 | 6タスク | 100% | なし |
| CSV Export | 10 | 3タスク | 100% | なし |
| Data Model | 30 | 14タスク | 100% | なし |
| REST API - Bulk | 10 | 5タスク | 100% | なし |
| REST API - Delta | 5 | 2タスク | 100% | なし |
| Validation | 20 | 3タスク | 100% | なし |
| Security | 15 | 3タスク | 100% | なし |
| Compliance | 5 | 2タスク | 100% | なし |
| Performance | 5 | 3タスク | 100% | なし |
| Availability | 5 | 2タスク | 100% | なし |
| Operations | 10 | 4タスク | 100% | なし |
| **合計** | **91** | **47タスク** | **100%** | **なし** |

**結論**: 全91要件が実装タスクにマッピングされており、要件カバレッジは100%です。

---

## 7. スプリント計画

### 7.1 スプリント概要（12週間、0〜11スプリント）

| スプリント | 週 | 主要タスク | 工数 | マイルストーン |
|----------|---|----------|------|------------|
| **Sprint 0** | Week 1 | プロジェクトセットアップ | 40h | M0: 開発環境構築完了 |
| **Sprint 1** | Week 2 | データベースレイヤー（前半） | 35h | - |
| **Sprint 2** | Week 3 | データベースレイヤー（後半） | 35h | M1: データベースレイヤー完了 |
| **Sprint 3** | Week 4 | コアエンティティ（User, Org, Class） | 66h | - |
| **Sprint 4** | Week 5 | コアエンティティ（Course, Enrollment, etc.） | 66h | M2: エンティティモジュール完了 |
| **Sprint 5** | Week 6 | 認証・認可・検証 | 60h | M3: 認証・検証完了 |
| **Sprint 6** | Week 7 | CSV Import実装 | 45h | - |
| **Sprint 7** | Week 8 | CSV Export実装 | 45h | M4: CSV処理完了 |
| **Sprint 8** | Week 9 | REST API Bulk実装 | 40h | - |
| **Sprint 9** | Week 10 | REST API Delta実装 | 40h | M5: REST API完了 |
| **Sprint 10** | Week 11 | テスト（ユニット、統合、E2E） | 66h | M6: 全テスト合格 |
| **Sprint 11** | Week 12 | デプロイメント・運用準備 | 76h | M7: 本番デプロイ成功 |

**合計**: 614時間（約77人日）

---

### 7.2 ガントチャート（Mermaid形式）

```mermaid
gantt
    title RosterHub実装プロジェクト - 12週間スケジュール
    dateFormat YYYY-MM-DD

    section Sprint 0（Week 1）
    プロジェクトセットアップ（TASK-001〜010）    :s0, 2025-11-18, 5d

    section Sprint 1-2（Week 2-3）
    データベースレイヤー（TASK-011〜022）        :s1, after s0, 10d

    section Sprint 3-4（Week 4-5）
    コアエンティティモジュール（TASK-023〜044）  :s3, after s1, 10d

    section Sprint 5（Week 6）
    認証・認可・検証（TASK-045〜054）           :s5, after s3, 5d

    section Sprint 6-7（Week 7-8）
    CSV処理（TASK-055〜066）                   :s6, after s5, 10d

    section Sprint 8-9（Week 9-10）
    REST API（TASK-067〜078）                  :s8, after s6, 10d

    section Sprint 10（Week 11）
    テスト（TASK-079〜089）                    :s10, after s8, 5d

    section Sprint 11-12（Week 12）
    デプロイメント・運用（TASK-090〜104）       :s11, after s10, 5d

    section マイルストーン
    M0: 開発環境構築完了                        :milestone, m0, after s0, 0d
    M1: データベースレイヤー完了                :milestone, m1, after s1, 0d
    M2: エンティティモジュール完了              :milestone, m2, after s3, 0d
    M3: 認証・検証完了                         :milestone, m3, after s5, 0d
    M4: CSV処理完了                            :milestone, m4, after s6, 0d
    M5: REST API完了                           :milestone, m5, after s8, 0d
    M6: 全テスト合格                           :milestone, m6, after s10, 0d
    M7: 本番デプロイ成功                        :milestone, m7, after s11, 0d
```

---

### 7.3 各スプリントの詳細計画

#### Sprint 0（Week 1）: プロジェクトセットアップ

**目標**: 開発環境構築、CI/CDパイプライン、Prismaセットアップ

**タスク**:
- TASK-001〜010（40時間）

**成果物**:
- ✅ Monorepoセットアップ（pnpm + Turborepo）
- ✅ NestJSプロジェクト作成
- ✅ Docker Compose（PostgreSQL + Redis）
- ✅ GitHub Actions CI/CD
- ✅ Prisma schema.prisma（全エンティティ）
- ✅ 初期マイグレーション

**品質ゲート**:
- GitHub Actions パイプラインが正常動作
- PostgreSQL接続成功
- Prisma migrate dev 成功

---

#### Sprint 1-2（Week 2-3）: データベースレイヤー

**目標**: 全エンティティのRepositoryパターン実装

**タスク**:
- TASK-011〜022（70時間）

**成果物**:
- ✅ UserRepository〜DemographicRepository（7エンティティ）
- ✅ ApiKeyRepository
- ✅ AuditLogRepository
- ✅ CsvImportJobRepository
- ✅ Repositoryユニットテスト（80%カバレッジ）
- ✅ テストデータ（10,000レコード）

**品質ゲート**:
- 全Repositoryのユニットテストが合格
- テストカバレッジ80%以上
- マイグレーションが正常実行

---

#### Sprint 3-4（Week 4-5）: コアドメインエンティティ

**目標**: 全エンティティのController, Service, DTO実装

**タスク**:
- TASK-023〜044（132時間）

**成果物**:
- ✅ Users, Orgs, Classes, Courses, Enrollments, AcademicSessions, Demographicsモジュール
- ✅ 各エンティティのCRUD API
- ✅ DTO（Create, Update, Response）
- ✅ ユニットテスト（80%カバレッジ）

**品質ゲート**:
- 全エンティティAPIがPostmanでテスト可能
- ユニットテストカバレッジ80%以上
- Swagger UIで全エンドポイント確認可能

---

#### Sprint 5（Week 6）: 認証・認可・検証

**目標**: API Key認証、IP制限、データ検証実装

**タスク**:
- TASK-045〜054（60時間）

**成果物**:
- ✅ ApiKeyService, ApiKeyGuard
- ✅ IpWhitelistGuard
- ✅ RateLimitGuard
- ✅ AuditLogService, AuditLogInterceptor
- ✅ JapanProfileValidatorService
- ✅ ReferenceValidatorService
- ✅ DuplicateDetectorService

**品質ゲート**:
- API Key認証が正常動作（401 Unauthorized）
- IP制限が正常動作（403 Forbidden）
- 監査ログが正常記録
- データ検証が正常動作（Japan Profile準拠）

---

#### Sprint 6-7（Week 7-8）: CSV処理

**目標**: CSV Import/Export実装

**タスク**:
- TASK-055〜066（90時間）

**成果物**:
- ✅ CsvParserService（csv-parse、ストリーミング）
- ✅ CsvValidatorService（Japan Profile検証）
- ✅ BulkInsertService（バルクインサート）
- ✅ ImportJobProcessor（BullMQ）
- ✅ CsvImportController, CsvImportService
- ✅ CsvFormatterService（Japan Profile形式）
- ✅ CsvExportController, CsvExportService

**品質ゲート**:
- 200,000レコードCSV Import成功（30分以内）
- CSV Export成功（Japan Profile形式）
- BullMQジョブが正常動作
- 統合テスト合格

---

#### Sprint 8-9（Week 9-10）: REST API

**目標**: Bulk API、Delta API実装

**タスク**:
- TASK-067〜078（80時間）

**成果物**:
- ✅ BulkApiController, BulkApiService
- ✅ ページネーション、フィルタリング、ソート
- ✅ DeltaApiController, DeltaApiService
- ✅ ChangeTrackerService（dateLastModified追跡）
- ✅ ResponseInterceptor, ErrorInterceptor
- ✅ OpenAPI仕様（Swagger UI）

**品質ゲート**:
- Bulk API全エンドポイント動作確認
- Delta API差分取得動作確認
- API性能要件達成（95パーセンタイル < 500ms）
- Swagger UIで全エンドポイント確認可能

---

#### Sprint 10（Week 11）: テスト

**目標**: ユニット、統合、E2E、パフォーマンステスト

**タスク**:
- TASK-079〜089（66時間）

**成果物**:
- ✅ ユニットテストカバレッジ80%達成
- ✅ E2E: CSV Import（200,000レコード）
- ✅ E2E: CSV Export
- ✅ E2E: Bulk API（全エンティティCRUD）
- ✅ E2E: Delta API（差分取得）
- ✅ E2E: API認証
- ✅ パフォーマンステスト合格
- ✅ 負荷テスト合格（100同時接続）
- ✅ テスト結果レポート

**品質ゲート**:
- ユニットテストカバレッジ80%以上
- 全E2Eテスト合格
- パフォーマンス要件達成（CSV Import 30分以内、API 95パーセンタイル < 500ms）
- 負荷テスト合格（100同時接続、エラー率 < 1%）

---

#### Sprint 11-12（Week 12）: デプロイメント・運用

**目標**: 本番環境デプロイ、監視設定、ドキュメント整備

**タスク**:
- TASK-090〜104（76時間）

**成果物**:
- ✅ Dockerfile（マルチステージビルド）
- ✅ docker-compose.yml
- ✅ AWS ECS Fargate設定
- ✅ PostgreSQL RDS、Redis ElastiCache
- ✅ ALB（ロードバランサー）
- ✅ Sentry統合、CloudWatch Logs
- ✅ メトリクスダッシュボード、アラート
- ✅ デプロイメントガイド、運用マニュアル、API利用ガイド

**品質ゲート**:
- 本番環境デプロイ成功
- API正常動作確認（本番環境）
- 監視・アラートが正常動作
- ドキュメント完備（デプロイメント、運用、API利用）

---

## 8. チーム構成とRACI

### 8.1 チーム構成

| 役割 | 人数 | 氏名（仮） | 責務 | 稼働率 |
|-----|-----|----------|------|-------|
| **Project Manager** | 1 | PM-001 | プロジェクト管理、進捗管理、リスク管理、ドキュメント整備 | 100% |
| **Backend Developer 1** | 1 | DEV-001 | NestJS実装、CSV処理、REST API、テスト | 100% |
| **Backend Developer 2** | 1 | DEV-002 | NestJS実装、データベース、認証、バックグラウンドジョブ | 100% |
| **QA Engineer** | 1 | QA-001 | テスト設計、ユニット/統合/E2E/パフォーマンステスト | 100% |
| **DevOps Engineer** | 1 | DEVOPS-001 | CI/CD、Docker、AWS、監視・ロギング | 100% |

**合計**: 5名フルタイム

---

### 8.2 RAC Iマトリクス（タスク責任分担）

| タスクカテゴリ | PM | Backend Dev 1 | Backend Dev 2 | QA | DevOps |
|------------|----|--------------|--------------|----|--------|
| **Sprint 0: プロジェクトセットアップ** | A | R | R | I | R |
| **Sprint 1-2: データベースレイヤー** | A | R | R | I | I |
| **Sprint 3-4: コアエンティティモジュール** | A | R | R | C | I |
| **Sprint 5: 認証・認可・検証** | A | R | R | C | I |
| **Sprint 6-7: CSV処理** | A | R | R | C | I |
| **Sprint 8-9: REST API** | A | R | R | C | I |
| **Sprint 10: テスト** | A | C | C | R | I |
| **Sprint 11-12: デプロイメント・運用** | A | I | I | C | R |
| **ドキュメント整備** | R | C | C | C | C |
| **リスク管理** | R | C | C | I | C |

**凡例**:
- **R (Responsible)**: 実行責任者（タスク実行）
- **A (Accountable)**: 説明責任者（最終承認）
- **C (Consulted)**: 相談先（意見聴取）
- **I (Informed)**: 報告先（情報共有）

---

## 9. リスク管理

### 9.1 技術リスク

| リスクID | リスク内容 | 発生確率 | 影響度 | 対策 | 担当 |
|---------|----------|---------|-------|------|------|
| **R-001** | CSV処理性能が要件未達（200,000レコード30分超過） | 中 | 高 | ストリーミングパーサー（csv-parse）、バルクインサート、バッチサイズ最適化 | Backend Dev 1 |
| **R-002** | PostgreSQL性能ボトルネック（Delta API遅延） | 中 | 中 | dateLastModified複合インデックス、コネクションプール最適化 | Backend Dev 2 |
| **R-003** | BullMQジョブ失敗（CSV Import中断） | 低 | 中 | リトライロジック、ジョブ永続化（Redis AOF）、エラートラッキング | Backend Dev 2 |
| **R-004** | JSONB クエリ複雑化（metadata.jp.*） | 低 | 低 | Prisma JSONB操作サポート、ドキュメント化されたパターン | Backend Dev 1 |

**対策サマリー**:
- ✅ ストリーミングパーサー（csv-parse）でメモリ効率化
- ✅ dateLastModified複合インデックスでDelta API最適化
- ✅ BullMQリトライロジック + Redis AOF永続化
- ✅ Prisma JSONB操作パターンのドキュメント化

---

### 9.2 プロセスリスク

| リスクID | リスク内容 | 発生確率 | 影響度 | 対策 | 担当 |
|---------|----------|---------|-------|------|------|
| **R-005** | 要件ドリフト（仕様変更） | 低 | 高 | Steering Context（構造、技術、製品）で要件固定、@steeringで更新 | PM |
| **R-006** | アーキテクチャ不整合 | 低 | 中 | AI AgentがSteering Docsを参照、@code-reviewerでパターン強制 | PM, Backend Dev |
| **R-007** | テスト不足（カバレッジ未達） | 中 | 高 | テストカバレッジ目標80%、E2Eテスト必須パスの明確化 | QA |
| **R-008** | デプロイメント失敗 | 低 | 高 | Docker化、CI/CD自動テスト、ステージング環境での検証 | DevOps |

**対策サマリー**:
- ✅ Steering Context（structure.md、tech.md、product.md）で要件固定
- ✅ @code-reviewerでアーキテクチャパターン強制
- ✅ テストカバレッジ80%目標、E2E必須パス明確化
- ✅ Docker + CI/CD + ステージング検証

---

### 9.3 外部依存リスク

| リスクID | リスク内容 | 発生確率 | 影響度 | 対策 | 担当 |
|---------|----------|---------|-------|------|------|
| **R-009** | OneRoster Japan Profile仕様変更 | 低 | 高 | 仕様バージョン固定（1.2.2）、設計ドキュメントに仕様URL記載 | PM |
| **R-010** | サードパーティライブラリの脆弱性 | 中 | 中 | Dependabot有効化、定期的な依存関係更新 | DevOps |
| **R-011** | AWS/インフラ障害 | 低 | 高 | Multi-AZ構成、自動フェイルオーバー、CloudWatch監視 | DevOps |

**対策サマリー**:
- ✅ OneRoster Japan Profile 1.2.2仕様固定
- ✅ Dependabot + 定期依存関係更新
- ✅ Multi-AZ + 自動フェイルオーバー

---

### 9.4 リスク対応計画

**リスク監視頻度**:
- 毎週の定例会議でリスクレビュー
- 高リスク項目は毎日監視

**エスカレーションルール**:
1. **低リスク**: Backend Devが対応、PM報告
2. **中リスク**: PM判断、必要に応じて外部ベンダー相談
3. **高リスク**: 即座にPM報告、外部ベンダー承認必要

---

## 10. 品質管理

### 10.1 品質目標

| 品質特性 | 目標値 | 測定方法 | 責任者 |
|---------|-------|---------|-------|
| **正確性（Correctness）** | OneRoster Japan Profile 1.2.2準拠率100% | 全91要件の実装確認、外部ベンダー検収 | PM, QA |
| **テストカバレッジ** | ユニットテスト80%以上 | jest --coverage | QA |
| **API性能** | 95パーセンタイル < 500ms | パフォーマンステスト（Apache Bench） | QA |
| **CSV Import性能** | 200,000レコード < 30分 | E2Eテスト | QA |
| **可用性** | 99% SLA | CloudWatch Uptime監視 | DevOps |
| **セキュリティ** | OWASP Top 10対策100% | セキュリティ監査（@security-auditor） | DevOps |

---

### 10.2 品質ゲート（各スプリント終了時）

| スプリント | 品質ゲート | 合格基準 | 不合格時の対応 |
|----------|----------|---------|-------------|
| **Sprint 0** | GitHub Actions CI/CD正常動作 | パイプライン成功 | DevOps修正 |
| **Sprint 1-2** | Repositoryユニットテスト合格 | カバレッジ80%以上 | Backend Dev修正 |
| **Sprint 3-4** | エンティティAPI動作確認 | Postman全テスト合格 | Backend Dev修正 |
| **Sprint 5** | API Key認証、IP制限動作 | 401/403レスポンス正常 | Backend Dev修正 |
| **Sprint 6-7** | CSV Import/Export動作確認 | 200,000レコード成功 | Backend Dev修正 |
| **Sprint 8-9** | REST API Bulk/Delta動作確認 | 全エンドポイント正常 | Backend Dev修正 |
| **Sprint 10** | 全テスト合格 | ユニット80%、E2E全合格、性能要件達成 | QA + Backend Dev修正 |
| **Sprint 11-12** | 本番デプロイ成功 | API正常動作、監視正常 | DevOps修正 |

---

### 10.3 テスト戦略

#### 10.3.1 ユニットテスト

**ツール**: Vitest
**目標カバレッジ**: 80%以上
**対象**:
- Serviceレイヤー（全エンティティ）
- Repositoryレイヤー
- Validatorサービス
- CSV処理サービス

**実行タイミング**:
- 毎プッシュ時（GitHub Actions）
- ローカル開発時（pre-commit hook）

---

#### 10.3.2 統合テスト

**ツール**: Vitest + Supertest
**対象**:
- CSV Import統合（ファイルアップロード → BullMQ → データベース）
- CSV Export統合（データベース → CSV生成 → ダウンロード）
- Bulk API統合（全エンティティCRUD）
- Delta API統合（差分取得、dateLastModifiedフィルタ）

**実行タイミング**:
- 毎プッシュ時（GitHub Actions）
- スプリント終了時

---

#### 10.3.3 E2Eテスト

**ツール**: Playwright
**対象**:
- CSV Import E2E（200,000レコード、30分以内）
- CSV Export E2E（Japan Profile形式検証）
- Bulk API E2E（全エンティティCRUD、ページネーション）
- Delta API E2E（差分取得、新規・更新判定）
- API認証E2E（API Key、IPホワイトリスト、401/403）

**実行タイミング**:
- Sprint 10（テスト週）
- 本番デプロイ前

---

#### 10.3.4 パフォーマンステスト

**ツール**: Apache Bench (ab)、Artillery
**対象**:
- CSV Import性能（200,000レコード < 30分）
- Bulk API性能（95パーセンタイル < 500ms）
- Delta API性能（95パーセンタイル < 500ms）
- 負荷テスト（100同時接続）

**実行タイミング**:
- Sprint 10（テスト週）
- 本番デプロイ前

---

### 10.4 コードレビュー基準

**レビュアー**: Backend Dev 1 ↔ Backend Dev 2（相互レビュー）、PM（アーキテクチャレビュー）

**レビュー観点**:
1. **機能要件**: EARS要件を満たしているか
2. **コード品質**: SOLID原則、DRY原則遵守
3. **テスト**: ユニットテストが適切か（カバレッジ80%）
4. **パフォーマンス**: N+1クエリ、メモリリーク確認
5. **セキュリティ**: API Key検証、IPホワイトリスト、監査ログ
6. **ドキュメント**: JSDocコメント、README更新

**レビュー基準**:
- ✅ 全観点OKで承認
- ❌ 1つでもNGがあれば差し戻し

---

## 11. マイルストーンと成果物

### 11.1 主要マイルストーン

| マイルストーン | 日付 | 成果物 | 承認者 |
|------------|------|-------|-------|
| **M0: 開発環境構築完了** | Week 1終了 | Monorepo、NestJS、Docker Compose、CI/CD、Prisma | PM, DevOps |
| **M1: データベースレイヤー完了** | Week 3終了 | 全Repositoryパターン、ユニットテスト（80%） | PM, Backend Dev |
| **M2: エンティティモジュール完了** | Week 5終了 | 全エンティティCRUD API、DTO、ユニットテスト | PM, Backend Dev, QA |
| **M3: 認証・検証完了** | Week 6終了 | API Key認証、IP制限、Japan Profile検証 | PM, Backend Dev, QA |
| **M4: CSV処理完了** | Week 8終了 | CSV Import/Export、BullMQ、統合テスト | PM, Backend Dev, QA |
| **M5: REST API完了** | Week 10終了 | Bulk API、Delta API、OpenAPI仕様 | PM, Backend Dev, QA |
| **M6: 全テスト合格** | Week 11終了 | ユニット、統合、E2E、パフォーマンステスト | PM, QA |
| **M7: 本番デプロイ成功** | Week 12終了 | AWS ECS、監視、ドキュメント | PM, DevOps, 外部ベンダー |

---

### 11.2 成果物一覧

| 成果物カテゴリ | 成果物名 | 形式 | 保存先 | 担当 |
|------------|---------|------|-------|------|
| **コード** | NestJS APIサーバー | TypeScript | `apps/api/src/` | Backend Dev |
| **データベース** | Prismaスキーマ | schema.prisma | `apps/api/src/prisma/` | Backend Dev |
| **テスト** | ユニット/統合/E2Eテスト | TypeScript | `apps/api/tests/` | QA |
| **ドキュメント** | API仕様 | OpenAPI 3.0 | `docs/api/openapi.yaml` | Backend Dev |
| **ドキュメント** | デプロイメントガイド | Markdown | `docs/deployment/` | DevOps |
| **ドキュメント** | 運用マニュアル | Markdown | `docs/operations/` | PM |
| **ドキュメント** | API利用ガイド | Markdown | `docs/api/api-usage-guide.md` | PM |
| **インフラ** | Dockerfile | Dockerfile | `apps/api/Dockerfile` | DevOps |
| **インフラ** | docker-compose.yml | YAML | `docker-compose.yml` | DevOps |
| **インフラ** | AWS ECS設定 | Terraform/YAML | `infrastructure/` | DevOps |

---

## 12. 予算見積もり

### 12.1 工数見積もり（人時）

| フェーズ | 工数（時間） | 人日換算（8h/日） | 備考 |
|---------|------------|----------------|------|
| Sprint 0: プロジェクトセットアップ | 40h | 5人日 | Monorepo、CI/CD、Prisma |
| Sprint 1-2: データベースレイヤー | 70h | 8.75人日 | Repository、ユニットテスト |
| Sprint 3-4: コアエンティティモジュール | 132h | 16.5人日 | CRUD API、DTO、テスト |
| Sprint 5: 認証・認可・検証 | 60h | 7.5人日 | API Key、IP制限、検証 |
| Sprint 6-7: CSV処理 | 90h | 11.25人日 | Import/Export、BullMQ |
| Sprint 8-9: REST API | 80h | 10人日 | Bulk/Delta API、OpenAPI |
| Sprint 10: テスト | 66h | 8.25人日 | ユニット、E2E、性能 |
| Sprint 11-12: デプロイメント・運用 | 76h | 9.5人日 | Docker、AWS、監視 |
| **合計** | **614h** | **76.75人日** | 約12週間 |

---

### 12.2 チーム工数内訳

| 役割 | 稼働週数 | 週あたり工数 | 合計工数 | 人日換算 |
|-----|---------|------------|---------|---------|
| **Backend Developer 1** | 12週 | 40h/週 | 480h | 60人日 |
| **Backend Developer 2** | 12週 | 40h/週 | 480h | 60人日 |
| **QA Engineer** | 12週 | 32h/週 | 384h | 48人日 |
| **DevOps Engineer** | 12週 | 24h/週 | 288h | 36人日 |
| **Project Manager** | 12週 | 20h/週 | 240h | 30人日 |
| **合計** | 12週 | - | **1,872h** | **234人日** |

**実際の必要工数**: 614時間（約77人日）
**チーム総工数**: 1,872時間（約234人日）
**余裕**: 1,872h - 614h = 1,258h（約157人日）

**余裕率**: 67%（1,258h / 1,872h）

**解釈**:
- 実装タスクのみの工数見積もりは614時間（77人日）
- チーム総稼働時間は1,872時間（234人日）
- 余裕率67%は、以下に充当される:
  - コードレビュー、リファクタリング
  - バグ修正、再テスト
  - ドキュメント整備
  - 予期しない問題対応
  - チームミーティング、コミュニケーション

---

### 12.3 予算概算（人件費）

**前提**:
- Backend Developer: 時給 ¥6,000（平均的な日本の正社員エンジニア換算）
- QA Engineer: 時給 ¥5,000
- DevOps Engineer: 時給 ¥7,000
- Project Manager: 時給 ¥8,000

| 役割 | 工数（時間） | 時給 | 小計 |
|-----|------------|------|------|
| Backend Developer 1 | 480h | ¥6,000 | ¥2,880,000 |
| Backend Developer 2 | 480h | ¥6,000 | ¥2,880,000 |
| QA Engineer | 384h | ¥5,000 | ¥1,920,000 |
| DevOps Engineer | 288h | ¥7,000 | ¥2,016,000 |
| Project Manager | 240h | ¥8,000 | ¥1,920,000 |
| **合計人件費** | **1,872h** | - | **¥11,616,000** |

**その他コスト**:
- AWS費用（RDS、ECS、ElastiCache、ALB）: 月額約¥100,000 × 3ヶ月 = ¥300,000
- Sentry、GitHub Actions、その他SaaS: 月額約¥30,000 × 3ヶ月 = ¥90,000
- 予備費（10%）: ¥1,161,600

**総予算**: ¥11,616,000 + ¥300,000 + ¥90,000 + ¥1,161,600 = **約¥13,167,600**

**概算**: **約1,300万円（3ヶ月）**

---

## 13. 成功基準

### 13.1 技術成功基準

| 基準 | 目標値 | 測定方法 | 優先度 |
|-----|-------|---------|-------|
| **OneRoster準拠** | 100%（全91要件実装） | 外部ベンダー検収、E2Eテスト | Critical |
| **テストカバレッジ** | 80%以上 | jest --coverage | Critical |
| **API性能** | 95パーセンタイル < 500ms | Apache Bench | High |
| **CSV Import性能** | 200,000レコード < 30分 | E2Eテスト | Critical |
| **可用性** | 99% SLA | CloudWatch Uptime | High |
| **セキュリティ** | OWASP Top 10対策100% | @security-auditorレビュー | Critical |
| **データ整合性** | エラー率 < 0.1% | 監査ログ分析 | Critical |

---

### 13.2 ビジネス成功基準

| 基準 | 目標値 | 測定方法 | 優先度 |
|-----|-------|---------|-------|
| **運用コスト削減** | 月40時間 → 0時間（CSV手動運用廃止） | ユーザーヒアリング | High |
| **データ連携エラー削減** | 手動エラー率50% → 自動検証0.1% | 監査ログ | High |
| **外部ベンダー承認** | 承認済み | 検収会議 | Critical |
| **ドキュメント完備** | API利用ガイド、運用マニュアル作成 | ドキュメントレビュー | Medium |

---

### 13.3 プロジェクト成功基準

| 基準 | 目標値 | 測定方法 | 優先度 |
|-----|-------|---------|-------|
| **期限遵守** | 12週間以内（できるだけ早く） | プロジェクトスケジュール | High |
| **予算遵守** | 約1,300万円以内 | 実績工数集計 | Medium |
| **品質ゲート合格** | 全スプリントの品質ゲート合格 | スプリントレビュー | Critical |
| **本番稼働** | 本番環境デプロイ成功、API正常動作 | 本番環境テスト | Critical |

---

## 最終承認

### 承認記録

| 役割 | 氏名 | 署名 | 日付 |
|-----|-----|------|------|
| **Project Manager** | PM-001 | __________ | 2025-11-14 |
| **外部ベンダー** | __________ | __________ | __________ |
| **Technical Lead** | __________ | __________ | __________ |

---

## 変更履歴

| バージョン | 日付 | 変更者 | 変更内容 |
|----------|------|-------|---------|
| 1.0 | 2025-11-14 | Project Manager AI | 初版作成（全セクション完成） |

---

**ドキュメント終了**

---

## 付録A: 用語集

| 用語 | 定義 |
|-----|------|
| **OneRoster** | 教育データ連携の国際標準規格 |
| **Japan Profile** | OneRoster仕様の日本向け拡張仕様 |
| **EARS** | Easy Approach to Requirements Syntax（要件記述フォーマット） |
| **WBS** | Work Breakdown Structure（作業分解構成図） |
| **RACI** | Responsible, Accountable, Consulted, Informed（責任分担マトリクス） |
| **SLA** | Service Level Agreement（サービス水準合意） |
| **sourcedId** | OneRosterエンティティの一意識別子 |
| **dateLastModified** | エンティティの最終更新日時（Delta API用） |
| **metadata.jp.*** | Japan Profile拡張フィールドのJSONパス |
| **BullMQ** | Redis-basedバックグラウンドジョブキューライブラリ |
| **Prisma** | TypeScript-firstのORMライブラリ |

---

## 付録B: 参照ドキュメント

| ドキュメント名 | パス | 用途 |
|------------|------|------|
| **System Architecture Design** | `docs/design/architecture/system-architecture-design-part1-20251114.md` | C4モデル、アーキテクチャ決定 |
| **Database Schema Design** | `docs/design/database/database-design-rosterhub-20251114.md` | Prismaスキーマ、ERダイアグラム |
| **API Design** | `docs/design/api/api-design-document.md` | REST API仕様、OpenAPI |
| **Requirements** | `docs/requirements/oneroster-system-requirements.md` | 全91 EARS要件 |
| **Steering Context** | `steering/structure.md`, `steering/tech.md`, `steering/product.md` | プロジェクトメモリ |

---

**このドキュメントは、RosterHubプロジェクトの包括的な実装計画を提供します。すべてのステークホルダーがこの計画に基づいて作業を進めてください。**
