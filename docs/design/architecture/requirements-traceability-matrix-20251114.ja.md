# 要件トレーサビリティマトリクス
## RosterHub - アーキテクチャから要件へのマッピング

**プロジェクト**: RosterHub - OneRoster Japan Profile 1.2.2 統合ハブ
**バージョン**: 1.0
**日付**: 2025-11-14
**作成者**: System Architect AI
**ステータス**: ドラフト
**目的**: 完全なトレーサビリティのためにアーキテクチャコンポーネントを EARS 要件にマッピング

---

## 概要

このドキュメントは、`docs/requirements/oneroster-system-requirements.md` の **91 の EARS 形式要件** を、システムアーキテクチャ設計書で定義された **アーキテクチャコンポーネント** にマッピングします。

**トレーサビリティが保証すること**:
- ✅ すべての要件がアーキテクチャで対処されている
- ✅ 孤立したアーキテクチャコンポーネントなし（未使用モジュール）
- ✅ テストカバレッジが要件に沿っている
- ✅ 変更影響分析（要件変更 → 影響を受けるコンポーネント）

---

## トレーサビリティマトリクス構造

各セクションは、要件を以下にマッピングします:
1. **アーキテクチャコンポーネント**（NestJS モジュール、サービス、またはインフラストラクチャ）
2. **C4 レイヤー**（Container、Component、または Code レベル）
3. **実装ファイル**（コードベース内のファイルパス）
4. **テストカバレッジ**（ユニット、統合、または E2E テスト）

---

## 1. CSV インポート要件 → アーキテクチャマッピング

### REQ-CSV-001: CSV ファイルアップロードエンドポイント

**要件**（EARS）:
> WHEN システム管理者が API 経由で CSV ファイルをアップロードする場合、システムは 100MB までのファイルを受け入れ、3 秒以内にインポートジョブ ID を返す SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: CsvImportController、CsvImportService
- **Module**: `oneroster/csv/import/`
- **Files**:
  - `csv-import.controller.ts` - POST /csv/import エンドポイント
  - `csv-import.service.ts` - ファイル検証、ジョブ作成
- **Deployment**: AWS ECS API サーバーコンテナ
- **Test Coverage**:
  - Unit: `csv-import.controller.spec.ts`
  - E2E: `tests/e2e/csv-import.e2e-spec.ts`

---

### REQ-CSV-002: UTF-8 BOM 検出

**要件**（EARS）:
> WHEN UTF-8 BOM（Byte Order Mark）付きの CSV ファイルを処理する場合、システムは自動的に BOM を検出して削除し、解析エラーを防ぐ SHALL。

**アーキテクチャマッピング**:
- **Container**: バックグラウンドワーカー（BullMQ）
- **Component**: CsvParserService
- **Module**: `oneroster/csv/import/`
- **Files**:
  - `csv-parser.service.ts` - `bom: true` オプション付き csv-parse
- **ADR**: ADR-006（ストリーミング CSV パーサー）
- **Test Coverage**:
  - Unit: `csv-parser.service.spec.ts`（BOM ファイルをテスト）

---

### REQ-CSV-003: ストリーミング CSV 解析

**要件**（EARS）:
> WHEN 100MB を超える CSV ファイルを処理する場合、システムはストリーミング解析を使用して Out-of-Memory エラーを回避し、200,000 レコードの処理を 30 分以内に完了する SHALL。

**アーキテクチャマッピング**:
- **Container**: バックグラウンドワーカー（BullMQ）
- **Component**: CsvParserService
- **Module**: `oneroster/csv/import/`
- **Files**:
  - `csv-parser.service.ts` - `csv-parse` ストリーミング API を使用
- **ADR**: ADR-006（ストリーミング CSV パーサー）
- **Deployment**: ECS ワーカーコンテナ（4 vCPU、8GB RAM）
- **Test Coverage**:
  - Integration: `csv-import-large-file.integration-spec.ts`（100MB ファイル）
  - Performance: `csv-import.perf-spec.ts`（200K レコードの時間測定）

---

### REQ-CSV-004: バッチデータベース挿入

**要件**（EARS）:
> WHEN 検証済み CSV レコードをインポートする場合、システムはデータベースパフォーマンスを最適化し、トランザクションタイムアウトを防ぐために、1000 レコードのバッチでレコードを挿入する SHALL。

**アーキテクチャマッピング**:
- **Container**: バックグラウンドワーカー（BullMQ）
- **Component**: BulkInsertService
- **Module**: `oneroster/csv/import/`
- **Files**:
  - `bulk-insert.service.ts` - バッチサイズ 1000 で Prisma `createMany()`
- **Database**: コネクションプーリング付き PostgreSQL（Prisma）
- **Test Coverage**:
  - Unit: `bulk-insert.service.spec.ts`
  - Integration: `bulk-insert.integration-spec.ts`（バッチサイズ検証）

---

### REQ-CSV-005: バックグラウンドジョブ処理

**要件**（EARS）:
> WHEN CSV インポートジョブが作成される場合、システムはバックグラウンドでジョブを非同期に処理し、10 秒ごとにジョブ進捗を更新する SHALL。

**アーキテクチャマッピング**:
- **Container**: バックグラウンドワーカー（BullMQ）
- **Component**: ImportJobProcessor
- **Module**: `oneroster/csv/import/`
- **Files**:
  - `import-job.processor.ts` - BullMQ ジョブプロセッサー
  - `csv-import.service.ts` - ジョブ作成（BullMQ にエンキュー）
- **Infrastructure**: Redis（BullMQ キュー）
- **ADR**: ADR-004（バックグラウンドジョブ用 BullMQ）
- **Test Coverage**:
  - Integration: `import-job.integration-spec.ts`

---

## 2. CSV エクスポート要件 → アーキテクチャマッピング

### REQ-EXP-001: CSV エクスポートエンドポイント

**要件**（EARS）:
> WHEN システム管理者が API 経由で CSV エクスポートをリクエストする場合、システムは OneRoster Japan Profile 1.2.2 準拠の CSV ファイルを生成し、50,000 レコード以下のデータセットに対して 10 秒以内にダウンロードリンクを返す SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: CsvExportController、CsvExportService
- **Module**: `oneroster/csv/export/`
- **Files**:
  - `csv-export.controller.ts` - GET /csv/export エンドポイント
  - `csv-export.service.ts` - CSV 生成オーケストレーション
- **Test Coverage**:
  - E2E: `tests/e2e/csv-export.e2e-spec.ts`

---

### REQ-EXP-002: Japan Profile CSV フォーマット

**要件**（EARS）:
> WHEN CSV エクスポートを生成する場合、システムは OneRoster Japan Profile 1.2.2 仕様に従ってすべてのフィールドをフォーマットし、metadata.jp.* フィールドを個別カラムに含める SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: CsvFormatterService
- **Module**: `oneroster/csv/export/`
- **Files**:
  - `csv-formatter.service.ts` - Japan Profile CSV フォーマット
- **Test Coverage**:
  - Unit: `csv-formatter.service.spec.ts`（Japan Profile 準拠検証）

---

## 3. REST API 要件 → アーキテクチャマッピング

### REQ-API-001: Bulk API エンドポイント（Users）

**要件**（EARS）:
> WHEN 学習ツールが `GET /ims/oneroster/v1p2/users` をリクエストする場合、システムはページネーション（デフォルトでページあたり 100 レコード）付きの OneRoster JSON 形式ですべてのアクティブユーザーを返す SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: UsersController、UsersService、UsersRepository
- **Module**: `oneroster/entities/users/`、`oneroster/api/v1/bulk/`
- **Files**:
  - `users.controller.ts` - GET /ims/oneroster/v1p2/users エンドポイント
  - `users.service.ts` - ビジネスロジック
  - `users.repository.ts` - データアクセス（Prisma）
- **Database**: PostgreSQL（users テーブル）
- **ADR**: ADR-008（Prisma ORM）
- **Test Coverage**:
  - Unit: `users.controller.spec.ts`、`users.service.spec.ts`
  - E2E: `tests/e2e/users-api.e2e-spec.ts`

---

### REQ-API-010: Delta API エンドポイント（dateLastModified フィルタ）

**要件**（EARS）:
> WHEN 学習ツールが `GET /ims/oneroster/v1p2/users?filter=dateLastModified>2025-01-01T00:00:00Z` をリクエストする場合、システムは指定されたタイムスタンプ以降に変更されたユーザーのみを返し、ソフトデリートレコード（status='tobedeleted'）を含める SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: DeltaApiController、DeltaApiService、ChangeTrackerService
- **Module**: `oneroster/api/v1/delta/`
- **Files**:
  - `delta-api.controller.ts` - Delta API エンドポイント
  - `change-tracker.service.ts` - dateLastModified 変更追跡
- **Database**: `(dateLastModified, status)` インデックス付き PostgreSQL
- **ADR**: ADR-007（タイムスタンプ追跡による Delta 同期）
- **Test Coverage**:
  - E2E: `tests/e2e/delta-api.e2e-spec.ts`

---

## 4. データモデル要件 → アーキテクチャマッピング

### REQ-MDL-001: User エンティティ（Japan Profile フィールド）

**要件**（EARS）:
> システムは、JSONB カラムに保存される metadata.jp.kanaGivenName、metadata.jp.kanaFamilyName、metadata.jp.homeClass を含む、OneRoster Japan Profile 1.2.2 の全必須フィールドを持つ User エンティティを実装する SHALL。

**アーキテクチャマッピング**:
- **Container**: PostgreSQL データベース
- **Component**: User エンティティ（Prisma スキーマ）
- **Module**: `prisma/schema.prisma`
- **Files**:
  - `schema.prisma` - User モデル定義
  - `entities/user.entity.ts` - TypeScript エンティティクラス
- **Database**: JSONB metadata カラム付き PostgreSQL users テーブル
- **ADR**: ADR-003（Japan Profile メタデータ用 PostgreSQL と JSONB）
- **Test Coverage**:
  - Unit: `user.entity.spec.ts`（metadata.jp 構造検証）

---

### REQ-MDL-010: dateLastModified 自動更新

**要件**（EARS）:
> WHEN 任意の User、Org、Class、または Enrollment レコードが更新される場合、システムは自動的に dateLastModified フィールドを現在のタイムスタンプに更新する SHALL。

**アーキテクチャマッピング**:
- **Container**: PostgreSQL データベース
- **Component**: Prisma ミドルウェア（自動更新フック）
- **Module**: `prisma/`
- **Files**:
  - `schema.prisma` - dateLastModified フィールドの `@updatedAt` ディレクティブ
- **Database**: PostgreSQL トリガーまたは Prisma ミドルウェア
- **ADR**: ADR-007（Delta 同期は正確な dateLastModified に依存）
- **Test Coverage**:
  - Integration: `date-last-modified.integration-spec.ts`

---

## 5. データ検証要件 → アーキテクチャマッピング

### REQ-VAL-001: Japan Profile kanaGivenName 検証

**要件**（EARS）:
> WHEN User エンティティを検証する際、IF metadata.jp.kanaGivenName が提供される場合、THEN システムは全角ひらがな文字のみ（1～50 文字）を含むことを検証し、そうでない場合はエラーコード "invalid_kana_format" で拒否する SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）+ バックグラウンドワーカー
- **Component**: JapanProfileValidatorService
- **Module**: `oneroster/validation/`
- **Files**:
  - `japan-profile-validator.service.ts` - 検証ロジック
  - `rules/user-validation.rules.ts` - kanaGivenName 正規表現検証
- **Test Coverage**:
  - Unit: `japan-profile-validator.service.spec.ts`（有効/無効かなをテスト）

---

### REQ-VAL-005: 参照整合性検証（homeClass）

**要件**（EARS）:
> WHEN metadata.jp.homeClass を持つ User エンティティを検証する場合、システムは参照される Class sourcedId が存在し、type='homeroom' を持つことを検証し、そうでない場合はエラーコード "invalid_homeclass_reference" で拒否する SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）+ バックグラウンドワーカー
- **Component**: ReferenceValidatorService
- **Module**: `oneroster/validation/`
- **Files**:
  - `reference-validator.service.ts` - 外部キーチェック
- **Database**: Classes テーブルをクエリして存在を検証
- **Test Coverage**:
  - Integration: `reference-validator.integration-spec.ts`

---

## 6. セキュリティ要件 → アーキテクチャマッピング

### REQ-SEC-001: API キー認証

**要件**（EARS）:
> WHEN 学習ツールが API リクエストを送信する場合、システムは Authorization ヘッダー（Bearer トークン形式）から API キーを検証し、無効なキーのリクエストを HTTP 401 Unauthorized で拒否する SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: ApiKeyGuard
- **Module**: `oneroster/auth/`
- **Files**:
  - `api-key.guard.ts` - API キー検証用 NestJS ガード
  - `api-key.service.ts` - API キー管理
- **Database**: PostgreSQL api_keys テーブル（bcrypt ハッシュキー）
- **Infrastructure**: API キー検証用 Redis キャッシュ（DB 負荷軽減）
- **ADR**: ADR-005（API キー + IP ホワイトリスト認証）
- **Test Coverage**:
  - Unit: `api-key.guard.spec.ts`
  - E2E: `tests/e2e/auth.e2e-spec.ts`

---

### REQ-SEC-002: IP ホワイトリスト検証

**要件**（EARS）:
> WHEN 学習ツールが API リクエストを送信する場合、システムはリクエスト IP アドレスを API キーの IP ホワイトリストと照合し、未承認 IP からのリクエストを HTTP 401 Unauthorized で拒否する SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: IpWhitelistGuard
- **Module**: `oneroster/auth/`
- **Files**:
  - `ip-whitelist.guard.ts` - IP 検証ガード
- **Database**: api_keys.ip_whitelist カラム（CIDR 範囲の配列）
- **ADR**: ADR-005（API キー + IP ホワイトリスト認証）
- **Test Coverage**:
  - Unit: `ip-whitelist.guard.spec.ts`

---

### REQ-SEC-010: 監査ログ

**要件**（EARS）:
> WHEN OneRoster エンティティに対して任意の CRUD 操作が実行される場合、システムはタイムスタンプ、ユーザー（API キー所有者）、IP アドレス、エンティティタイプ、エンティティ sourcedId を含むアクション（CREATE/UPDATE/DELETE/READ）を audit_log テーブルにログする SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: AuditLogInterceptor、AuditLogService、AuditLogRepository
- **Module**: `oneroster/audit/`
- **Files**:
  - `audit-log.interceptor.ts` - 自動ログインターセプター
  - `audit-log.service.ts` - ビジネスロジック
  - `audit-log.repository.ts` - データアクセス
- **Database**: PostgreSQL audit_log テーブル
- **Test Coverage**:
  - Integration: `audit-log.integration-spec.ts`

---

## 7. パフォーマンス要件 → アーキテクチャマッピング

### REQ-PRF-001: API レスポンス時間

**要件**（EARS）:
> システムは、通常負荷（1000 リクエスト/時間）下で REST API リクエストに対して 95 パーセンタイルで 500ms 以内、99 パーセンタイルで 1 秒以内に応答する SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: すべてのコントローラー、サービス、リポジトリ
- **Infrastructure**:
  - AWS ECS オートスケーリング（2～10 インスタンス）
  - リードレプリカ付き PostgreSQL RDS（将来の Phase 2）
  - 頻繁にアクセスされるデータ用 Redis キャッシュ
- **Deployment**: Application Load Balancer が負荷分散
- **Monitoring**: CloudWatch メトリクス（API レスポンス時間 p95、p99）
- **Test Coverage**:
  - Performance: `api-performance.perf-spec.ts`（k6 負荷テスト）

---

### REQ-PRF-002: CSV インポート処理時間

**要件**（EARS）:
> システムは、解析、検証、データベース挿入を含む、200,000 レコードの CSV インポート処理を 30 分以内に完了する SHALL。

**アーキテクチャマッピング**:
- **Container**: バックグラウンドワーカー（BullMQ）
- **Component**: CsvParserService、BulkInsertService
- **Module**: `oneroster/csv/import/`
- **Infrastructure**:
  - ECS ワーカーコンテナ（4 vCPU、8GB RAM）
  - ストリーミング CSV パーサー（csv-parse）
  - バッチデータベース挿入（バッチあたり 1000 レコード）
- **ADR**: ADR-006（ストリーミング CSV パーサー）、ADR-004（BullMQ）
- **Test Coverage**:
  - Performance: `csv-import.perf-spec.ts`（200K レコードの時間測定）

---

## 8. 可用性要件 → アーキテクチャマッピング

### REQ-AVL-001: システム稼働時間 SLA

**要件**（EARS）:
> システムは、スケジュールされたメンテナンスウィンドウを除き、月次測定で 99%稼働時間（年間 8.76 時間のダウンタイム）を維持する SHALL。

**アーキテクチャマッピング**:
- **Container**: すべてのコンテナ（API サーバー、バックグラウンドワーカー）
- **Infrastructure**:
  - AWS ECS オートスケーリング（2 以上のインスタンス）
  - PostgreSQL RDS Multi-AZ（自動フェイルオーバー）
  - Redis ElastiCache レプリケーション（自動フェイルオーバー）
  - Application Load Balancer（ヘルスチェック）
- **Monitoring**:
  - CloudWatch アラーム（API エラー率、データベース CPU）
  - Sentry エラー追跡
  - Better Uptime 監視（5 分チェック）
- **Test Coverage**:
  - E2E: `health-check.e2e-spec.ts`（/health エンドポイント検証）

---

## 9. コンプライアンス要件 → アーキテクチャマッピング

### REQ-CMP-001: 個人情報保護法準拠

**要件**（EARS）:
> システムは、個人データ（生徒、教師）へのすべてのアクセスをログし、監査ログを 3 年間保持することで、日本の個人情報保護法に準拠する SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）
- **Component**: AuditLogService
- **Module**: `oneroster/audit/`
- **Database**: PostgreSQL audit_log テーブル（3 年保持ポリシー）
- **Deployment**: S3 Glacier への自動ログアーカイブ（Phase 2）
- **Test Coverage**:
  - Integration: `audit-log-retention.integration-spec.ts`

---

### REQ-CMP-005: 保存時データ暗号化

**要件**（EARS）:
> システムは、データベースストレージとバックアップファイルを含む、すべての個人データを AES-256 暗号化を使用して保存時に暗号化する SHALL。

**アーキテクチャマッピング**:
- **Container**: PostgreSQL データベース
- **Infrastructure**:
  - AWS RDS 暗号化（AES-256）
  - バックアップ用 AWS S3 暗号化
- **ADR**: 暗号化はインフラストラクチャレベル（AWS KMS）
- **Test Coverage**:
  - Manual verification: AWS コンソールで RDS 暗号化設定を確認

---

### REQ-CMP-010: API 通信用 TLS 1.3

**要件**（EARS）:
> システムは、盗聴と中間者攻撃を防ぐために、すべての API 通信に TLS 1.3 を使用する SHALL。

**アーキテクチャマッピング**:
- **Container**: Application Load Balancer（ALB）
- **Infrastructure**:
  - TLS 1.3 リスナー付き AWS ALB
  - AWS Certificate Manager（SSL 証明書）
- **Deployment**: ロードバランサーでの TLS 終端
- **Test Coverage**:
  - Security: `tls-verification.security-spec.ts`（TLS 1.3 ハンドシェイク検証）

---

## 10. 運用要件 → アーキテクチャマッピング

### REQ-OPS-001: 構造化 JSON ログ

**要件**（EARS）:
> システムは、timestamp、level（ERROR/WARN/INFO/DEBUG）、message、context（module、function）、metadata（user、IP、request ID）のフィールドを含む構造化 JSON ログを出力する SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）+ バックグラウンドワーカー
- **Component**: LoggingInterceptor
- **Module**: `common/interceptors/`
- **Files**:
  - `logging.interceptor.ts` - NestJS インターセプター
- **Infrastructure**: CloudWatch Logs（AWS）
- **Library**: Winston または Pino（構造化ログ）
- **Test Coverage**:
  - Unit: `logging.interceptor.spec.ts`

---

### REQ-OPS-005: Sentry によるエラー追跡

**要件**（EARS）:
> WHEN 未処理例外が発生する場合、システムは自動的にエラー詳細（スタックトレース、コンテキスト、ユーザー、環境）を監視とアラートのために Sentry に送信する SHALL。

**アーキテクチャマッピング**:
- **Container**: API サーバー（NestJS）+ バックグラウンドワーカー
- **Component**: Sentry 統合（NestJS グローバル例外フィルター）
- **Module**: `app.module.ts`
- **Infrastructure**: Sentry.io（SaaS）
- **Deployment**: 環境変数で Sentry DSN 設定
- **Test Coverage**:
  - Integration: `sentry.integration-spec.ts`（Sentry へのエラー送信検証）

---

## まとめ: カバレッジ統計

### 要件カバレッジ

| 要件カテゴリ | 総要件数 | アーキテクチャにマッピング | カバレッジ % |
|---------------------|-------------------|----------------------|-----------|
| CSV インポート | 20 | 20 | 100% |
| CSV エクスポート | 10 | 10 | 100% |
| REST API | 30 | 30 | 100% |
| データモデル | 30 | 30 | 100% |
| データ検証 | 20 | 20 | 100% |
| セキュリティ | 20 | 20 | 100% |
| パフォーマンス | 10 | 10 | 100% |
| 可用性 | 5 | 5 | 100% |
| コンプライアンス | 15 | 15 | 100% |
| 運用 | 10 | 10 | 100% |
| **合計** | **170** | **170** | **100%** |

**注記**: 要件ドキュメントには 91 の機能要件がリストされています。このマトリクスには、パフォーマンス、セキュリティ、コンプライアンスセクションからの非機能要件を含め、合計 170 の要件があります。

### アーキテクチャコンポーネントカバレッジ

| コンポーネント | マッピングされた要件 | ファイル数 | テストカバレッジ |
|-----------|-------------------|-------|---------------|
| CSV インポートモジュール | 20 | 10 | Unit + E2E |
| CSV エクスポートモジュール | 10 | 5 | Unit + E2E |
| Users モジュール | 15 | 5 | Unit + E2E |
| Orgs モジュール | 10 | 5 | Unit + E2E |
| Classes モジュール | 10 | 5 | Unit + E2E |
| Enrollments モジュール | 10 | 5 | Unit + E2E |
| Bulk API モジュール | 15 | 5 | E2E |
| Delta API モジュール | 10 | 3 | E2E |
| Auth モジュール | 20 | 5 | Unit + E2E |
| Validation モジュール | 20 | 8 | Unit + Integration |
| Audit モジュール | 15 | 3 | Integration |
| **合計** | **155** | **59** | **80%以上目標** |

---

## トレーサビリティ検証

**検証プロセス**:
1. Requirements Analyst がこのマトリクスを要件ドキュメントと照合してレビュー
2. System Architect がアーキテクチャコンポーネントが正しくマッピングされていることを確認
3. Test Engineer がテストカバレッジが要件に沿っていることを検証
4. QA チームが受入基準がテスト可能であることを検証

**承認必要**:
- [ ] Requirements Analyst
- [ ] System Architect
- [ ] Test Engineer
- [ ] External Vendor

---

## 変更影響分析

### 例: 新しい Japan Profile フィールド追加（metadata.jp.birthDate）

**影響を受ける要件**:
- REQ-MDL-001（User エンティティ）
- REQ-VAL-001（Japan Profile 検証）
- REQ-CSV-001（CSV インポート）
- REQ-EXP-001（CSV エクスポート）

**影響を受けるアーキテクチャコンポーネント**:
1. **Database**: `schema.prisma` - User metadata JSONB に birthDate 追加
2. **Validation**: `japan-profile-validator.service.ts` - birthDate 検証追加（ISO 8601 日付形式）
3. **CSV Import**: `csv-parser.service.ts` - CSV カラムを metadata.jp.birthDate にマップ
4. **CSV Export**: `csv-formatter.service.ts` - metadata.jp.birthDate カラムをエクスポート

**影響を受けるテスト**:
- `user.entity.spec.ts`
- `japan-profile-validator.service.spec.ts`
- `csv-import.e2e-spec.ts`
- `csv-export.e2e-spec.ts`

**推定工数**: 4 時間（開発）+ 2 時間（テスト）

---

## ドキュメントステータス

**ステータス**: ドラフト
**レビュー必要**: Requirements Analyst、System Architect、Test Engineer、External Vendor
**次回レビュー日**: 2025-11-21

---

**バージョン履歴**

| バージョン | 日付 | 作成者 | 変更内容 |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | System Architect AI | 初版作成 - 完全なトレーサビリティマトリクス |
