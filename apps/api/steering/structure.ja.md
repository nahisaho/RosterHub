# RosterHub - アーキテクチャ構造

## ドキュメント概要

**プロジェクト**: RosterHub - OneRoster Japan Profile 1.2.2 統合ハブ
**バージョン**: 1.0
**最終更新**: 2025-11-15
**目的**: アーキテクチャパターン、ディレクトリ構成、命名規則、モジュール構造を文書化

---

## 1. アーキテクチャパターン

### 1.1 全体パターン

**NestJSモジュラーアーキテクチャ** + **機能優先の組織化**

RosterHubは、NestJSのベストプラクティスに基づくクリーンでモジュラーなアーキテクチャに従っています:
- **モジュラー設計**: 各OneRosterエンティティ（users、orgs、classesなど）が独立したモジュール
- **レイヤードアーキテクチャ**: Controller → Service → Repository → Database の明確な分離
- **ドメイン駆動設計の影響**: OneRosterドメインエンティティを中心にビジネスロジックを整理
- **垂直スライス**: 技術レイヤーではなくエンティティタイプごとに機能を整理

### 1.2 アーキテクチャレイヤー

```
┌─────────────────────────────────────────────────┐
│  プレゼンテーション層 (Controllers)            │
│  - REST APIエンドポイント                      │
│  - Request/Response DTO                        │
│  - OpenAPI/Swagger ドキュメント                │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  アプリケーション層 (Services)                 │
│  - ビジネスロジック                            │
│  - データ変換                                  │
│  - オーケストレーション                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  データアクセス層 (Repositories)               │
│  - データベース操作                            │
│  - クエリ構築                                  │
│  - ベースリポジトリパターン                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  インフラストラクチャ層 (Prisma ORM)          │
│  - PostgreSQLデータベース                      │
│  - スキーマ管理                                │
│  - マイグレーション                            │
└─────────────────────────────────────────────────┘
```

### 1.3 横断的関心事

**Guards**（セキュリティ層）:
- `ApiKeyGuard`: APIキー認証
- `IpWhitelistGuard`: IPアドレス検証
- `RateLimitGuard`: レート制限（スライディングウィンドウアルゴリズム）

**Interceptors**（AOP）:
- `AuditInterceptor`: すべてのAPI操作の自動監査ログ

**Pipes**（バリデーション）:
- `ValidationPipe`: `class-validator`を使用したグローバルリクエストバリデーション

**Filters**（例外処理）:
- 標準化されたエラーレスポンスのためのグローバル例外フィルター

---

## 2. ディレクトリ構造

### 2.1 ルート構造

```
apps/api/
├── src/                      # ソースコード
├── prisma/                   # データベーススキーマとマイグレーション
├── test/                     # E2Eテスト
├── uploads/                  # CSVファイルアップロード（ランタイム）
├── exports/                  # CSVファイルエクスポート（ランタイム）
├── logs/                     # アプリケーションログ（ランタイム）
├── steering/                 # プロジェクトメモリ（このドキュメント）
├── Dockerfile                # マルチステージプロダクションビルド
├── docker-compose.yml        # ローカル開発スタック
├── package.json              # 依存関係とスクリプト
├── tsconfig.json             # TypeScript設定
└── nest-cli.json             # NestJS CLI設定
```

### 2.2 ソースコード構造 (`src/`)

```
src/
├── main.ts                   # アプリケーションエントリーポイント
├── app.module.ts             # ルートモジュール（すべての機能モジュールをインポート）
├── app.controller.ts         # ヘルスチェックエンドポイント
├── app.service.ts            # アプリケーションサービス
│
├── config/                   # 設定モジュール
│   ├── app.config.ts         # アプリレベル設定（ポート、CORSなど）
│   └── database.config.ts    # データベース接続設定
│
├── database/                 # データベースインフラストラクチャ
│   ├── database.module.ts    # データベースモジュール（Prisma）
│   ├── prisma.service.ts     # Prismaクライアントサービス
│   └── base.repository.ts    # 共通CRUD操作を持つベースリポジトリ
│
├── common/                   # 共有ユーティリティ（横断的）
│   ├── guards/               # セキュリティガード
│   │   ├── api-key.guard.ts
│   │   ├── ip-whitelist.guard.ts
│   │   └── rate-limit.guard.ts
│   ├── interceptors/         # AOPインターセプター
│   │   └── audit.interceptor.ts
│   ├── filters/              # 例外フィルター
│   ├── pipes/                # カスタムパイプ
│   ├── decorators/           # カスタムデコレーター
│   └── utils/                # ユーティリティ関数
│
└── oneroster/                # OneRosterドメイン（メイン機能エリア）
    │
    ├── entities/             # OneRosterエンティティモジュール（垂直スライス）
    │   ├── users/
    │   │   ├── users.module.ts
    │   │   ├── users.controller.ts      # RESTエンドポイント (/ims/oneroster/v1p2/users)
    │   │   ├── users.service.ts         # ビジネスロジック
    │   │   ├── users.repository.ts      # データアクセス
    │   │   ├── dto/                     # データ転送オブジェクト
    │   │   │   ├── create-user.dto.ts
    │   │   │   ├── user-response.dto.ts
    │   │   │   └── query-users.dto.ts
    │   │   └── entities/                # ドメインエンティティ（オプション）
    │   │
    │   ├── orgs/                        # 組織モジュール（同じ構造）
    │   ├── classes/                     # クラスモジュール
    │   ├── courses/                     # コースモジュール
    │   ├── enrollments/                 # 履修登録モジュール
    │   ├── academic-sessions/           # 学期モジュール
    │   └── demographics/                # 人口統計モジュール
    │
    ├── common/               # OneRoster固有の共有ユーティリティ
    │   ├── oneroster-common.module.ts
    │   ├── dto/
    │   │   ├── pagination.dto.ts        # ページネーションパラメータ（limit、offset）
    │   │   └── sorting.dto.ts           # ソートパラメータ（orderBy）
    │   └── services/
    │       ├── filter-parser.service.ts # OneRosterフィルタークエリパーサー
    │       └── field-selection.service.ts # フィールド選択サービス
    │
    ├── csv/                  # CSVインポート/エクスポートモジュール
    │   ├── csv.module.ts
    │   ├── csv-import.controller.ts     # CSVインポートエンドポイント
    │   ├── csv-export.controller.ts     # CSVエクスポートエンドポイント
    │   ├── services/
    │   │   ├── csv-import.service.ts    # ストリーミングCSVインポート
    │   │   └── csv-export.service.ts    # ストリーミングCSVエクスポート
    │   ├── processors/
    │   │   └── csv-import.processor.ts  # BullMQバックグラウンドプロセッサー
    │   ├── mappers/
    │   │   └── csv-entity.mapper.ts     # CSV ↔ エンティティマッピング
    │   ├── validators/
    │   │   └── csv-validator.service.ts # CSV行バリデーション
    │   └── dto/
    │       └── csv-import-job.dto.ts
    │
    ├── auth/                 # API認証モジュール
    │   ├── api-key/
    │   │   ├── api-key.module.ts
    │   │   ├── api-key.controller.ts    # APIキー管理エンドポイント
    │   │   └── api-key.service.ts
    │   ├── repositories/
    │   │   └── api-key.repository.ts
    │   └── dto/
    │       ├── create-api-key.dto.ts
    │       └── api-key-response.dto.ts
    │
    └── audit/                # 監査ログモジュール
        ├── audit.module.ts
        ├── audit.controller.ts          # 監査ログクエリエンドポイント
        ├── audit.service.ts
        └── repositories/
            └── audit-log.repository.ts
```

---

## 3. モジュール組織化パターン

### 3.1 エンティティモジュールパターン（テンプレート）

各OneRosterエンティティは、この一貫した構造に従います:

```
{entity}/
├── {entity}.module.ts          # NestJSモジュール定義
├── {entity}.controller.ts      # REST APIエンドポイント
├── {entity}.service.ts         # ビジネスロジック層
├── {entity}.repository.ts      # データアクセス層
├── dto/                        # データ転送オブジェクト
│   ├── create-{entity}.dto.ts  # 作成リクエストDTO
│   ├── update-{entity}.dto.ts  # 更新リクエストDTO（該当する場合）
│   ├── {entity}-response.dto.ts # レスポンスDTO
│   └── query-{entity}.dto.ts   # クエリパラメータDTO
└── entities/                   # ドメインエンティティ（オプション）
    └── {entity}.entity.ts
```

**例**: `users/` モジュール

### 3.2 モジュール依存関係ルール

**許可される依存関係**:
- エンティティモジュール → 共通ユーティリティ（`common/`、`oneroster/common/`）
- エンティティモジュール → データベースモジュール（`database/`）
- エンティティモジュール → 設定モジュール（`config/`）
- CSVモジュール → エンティティリポジトリ（インポート/エクスポート用）
- 監査モジュール → すべてのモジュール（インターセプター経由）

**禁止される依存関係**:
- エンティティモジュール → 他のエンティティモジュール（結合を避ける）
- 共通ユーティリティ → エンティティモジュール（循環依存）

### 3.3 ベースリポジトリパターン

すべてのリポジトリは `BaseRepository<T>` を継承し、以下を提供します:
- `findAll(params)`: ページネーション、フィルタリング、ソート付きリスト
- `findById(id)`: 内部UUID検索
- `findBySourcedId(sourcedId)`: OneRoster sourcedId検索
- `create(data)`: 新規レコード作成
- `update(id, data)`: 既存レコード更新
- `upsert(sourcedId, data)`: 更新または挿入
- `softDelete(id)`: 論理削除（status = 'tobedeleted'）

---

## 4. 命名規則

### 4.1 ファイル命名

**パターン**: `{feature}.{type}.ts`

- モジュール: `{entity}.module.ts`（例: `users.module.ts`）
- コントローラー: `{entity}.controller.ts`（例: `users.controller.ts`）
- サービス: `{entity}.service.ts`（例: `users.service.ts`）
- リポジトリ: `{entity}.repository.ts`（例: `users.repository.ts`）
- DTO: `{action}-{entity}.dto.ts`（例: `create-user.dto.ts`）
- ガード: `{feature}.guard.ts`（例: `api-key.guard.ts`）
- インターセプター: `{feature}.interceptor.ts`（例: `audit.interceptor.ts`）
- テスト: `{feature}.spec.ts`（例: `users.service.spec.ts`）

### 4.2 クラス命名

**パターン**: 接尾辞付きPascalCase

- モジュール: `{Entity}Module`（例: `UsersModule`）
- コントローラー: `{Entity}Controller`（例: `UsersController`）
- サービス: `{Entity}Service`（例: `UsersService`）
- リポジトリ: `{Entity}Repository`（例: `UsersRepository`）
- DTO: `{Action}{Entity}Dto`（例: `CreateUserDto`）
- ガード: `{Feature}Guard`（例: `ApiKeyGuard`）
- インターセプター: `{Feature}Interceptor`（例: `AuditInterceptor`）

### 4.3 APIエンドポイントパターン

**OneRoster v1.2 REST API仕様準拠**

ベースパス: `/ims/oneroster/v1p2`

**エンティティエンドポイント**:
- `GET /ims/oneroster/v1p2/{entities}` - すべてのエンティティをリスト
- `GET /ims/oneroster/v1p2/{entities}/{id}` - 単一エンティティ取得
- `POST /ims/oneroster/v1p2/{entities}` - エンティティ作成（非標準、Japan Profile用に追加）
- `PUT /ims/oneroster/v1p2/{entities}/{id}` - エンティティ更新（非標準）
- `DELETE /ims/oneroster/v1p2/{entities}/{id}` - 論理削除（status = tobedeleted）

**リレーションシップエンドポイント**:
- `GET /ims/oneroster/v1p2/users/{userId}/classes` - ユーザーのクラス取得
- `GET /ims/oneroster/v1p2/classes/{classId}/students` - クラスの生徒取得

**クエリパラメータ**（OneRoster標準）:
- `limit`: ページサイズ（デフォルト: 100、最大: 1000）
- `offset`: ページネーションオフセット
- `orderBy`: ソートフィールド（デフォルト: `dateLastModified DESC`）
- `filter`: OneRosterフィルター式（例: `status='active' AND role='student'`）
- `fields`: フィールド選択（カンマ区切りリスト）

---

## 5. データフローパターン

### 5.1 リクエストフロー（読み取り操作）

```
クライアントリクエスト
      ↓
[Controller] リクエスト受信、クエリパラメータ検証（QueryDto）
      ↓
[Service] ビジネスロジック適用、リポジトリ呼び出し
      ↓
[Repository] Prismaクエリ構築（フィルター、ページネーション、ソート）
      ↓
[Prisma] SQLクエリ実行
      ↓
[Repository] エンティティ返却
      ↓
[Service] ResponseDTOに変換
      ↓
[Controller] ResponseDTOでHTTPレスポンス返却
      ↓
クライアントレスポンス
```

**監査証跡**: `AuditInterceptor`がREADアクションを`audit_logs`テーブルに記録

### 5.2 書き込み操作フロー

```
クライアントリクエスト（POST/PUT/DELETE）
      ↓
[ApiKeyGuard] APIキー検証
      ↓
[IpWhitelistGuard] IPホワイトリストチェック
      ↓
[RateLimitGuard] レート制限適用
      ↓
[Controller] リクエスト受信、DTO検証
      ↓
[Service] ビジネスロジック適用
      ↓
[Repository] データベース操作実行（create/update/softDelete）
      ↓
[Prisma] SQLトランザクション実行
      ↓
[Repository] 更新されたエンティティ返却
      ↓
[Service] ResponseDTOに変換
      ↓
[Controller] HTTPレスポンス返却
      ↓
[AuditInterceptor] CREATE/UPDATE/DELETEアクション記録
      ↓
クライアントレスポンス
```

### 5.3 CSVインポートフロー

```
クライアントがCSVファイルアップロード
      ↓
[CsvImportController] ファイル受信、インポートジョブ作成
      ↓
[BullMQ] バックグラウンドジョブをキューに追加
      ↓
[CsvImportProcessor] ジョブを非同期処理
      ↓
[CsvImportService] CSVファイルをストリーミング
      ↓
[CsvValidatorService] 各行を検証
      ↓
[CsvEntityMapper] CSV → エンティティマッピング
      ↓
[Repository] バッチ挿入（1000レコード/バッチ）
      ↓
[Prisma] 一括挿入実行
      ↓
ジョブステータス更新（processing → completed）
      ↓
クライアントがジョブステータスエンドポイントをポーリング
```

---

## 6. データベーススキーマ組織化

### 6.1 Prismaスキーマ構造

**場所**: `prisma/schema.prisma`

**組織化**:
1. ジェネレーターとデータソース設定
2. Enum（OneRoster仕様のenum）
3. OneRosterコアエンティティ（User、Org、Course、Class、Enrollment、AcademicSession、Demographic）
4. ジャンクションテーブル（多対多リレーションシップ）
5. システムエンティティ（ApiKey、AuditLog、CsvImportJob）

### 6.2 命名規則（データベース）

- **テーブル名**: 複数形、snake_case（例: `users`、`academic_sessions`）
- **カラム名**: PrismaではcamelCase、PostgreSQLではsnake_case
- **外部キー**: `{entity}SourcedId`（例: `userSourcedId`、`classSourcedId`）
- **インデックス**: 外部キー、dateLastModified、statusの複合インデックス
- **Enum**: PrismaではPascalCase、PostgreSQLでは小文字

### 6.3 主要な設計決定

- **二重識別子**:
  - `id`（UUID）: 内部主キー
  - `sourcedId`（文字列）: OneRoster識別子（一意）
- **論理削除**: 物理削除ではなく`status = 'tobedeleted'`
- **監査タイムスタンプ**: `dateCreated`、`dateLastModified`（自動更新）
- **Japan Profile拡張**: 柔軟な拡張用の`metadata` JSONBカラム

---

## 7. テスト構造

### 7.1 テスト組織化

```
src/
├── {module}/
│   ├── {module}.service.spec.ts    # サービスの単体テスト
│   ├── {module}.controller.spec.ts # コントローラーの単体テスト
│   └── {module}.repository.spec.ts # リポジトリの単体テスト
│
test/
├── e2e/
│   ├── users.e2e-spec.ts           # ユーザーAPIのE2Eテスト
│   ├── csv-import.e2e-spec.ts      # CSVインポートのE2Eテスト
│   └── auth.e2e-spec.ts            # 認証のE2Eテスト
└── jest-e2e.json                   # E2Eテスト設定
```

### 7.2 テスト命名規則

- 単体テスト: `{feature}.spec.ts`
- E2Eテスト: `{feature}.e2e-spec.ts`
- テストスイート: `describe('{ClassName}', () => {})`
- テストケース: `it('should {behavior}', () => {})`

---

## 8. 設定管理

### 8.1 環境変数

**場所**: `.env`ファイル（コミットされない、`.env.example`が提供される）

**カテゴリ**:
- データベース: `DATABASE_URL`
- Redis: `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`
- APIセキュリティ: `API_KEY_ENABLED`、`IP_WHITELIST_ENABLED`、`RATE_LIMIT_ENABLED`
- OneRoster: `ONEROSTER_VERSION`、`JAPAN_PROFILE_VERSION`
- CSV処理: `CSV_UPLOAD_MAX_SIZE`、`CSV_BATCH_SIZE`

### 8.2 設定パターン

**型付き設定**（`@nestjs/config`を使用）:
- `app.config.ts`: アプリケーションレベル設定
- `database.config.ts`: データベース接続設定

`ConfigModule.forRoot()`経由で`app.module.ts`にグローバルにロードされます

---

## 9. セキュリティアーキテクチャ

### 9.1 認証層

**APIキー認証**（プライマリ）:
- ヘッダー: `X-API-Key`
- ストレージ: `api_keys`テーブル（bcryptでハッシュ化）
- 検証: Redisキャッシング付き`ApiKeyGuard`（5分TTL）
- メタデータ: 組織ID、レート制限、IPホワイトリスト、有効期限

### 9.2 認可層

**IPホワイトリスト**（オプション）:
- APIキーごとのIPホワイトリスト設定
- ガード: `IpWhitelistGuard`
- CIDR表記と個別IPをサポート

### 9.3 レート制限

**スライディングウィンドウアルゴリズム**:
- ガード: `RateLimitGuard`
- ストレージ: Redis（ソート済みセット）
- APIキーごとのレート制限
- デフォルト: 1000リクエスト/時間（設定可能）

### 9.4 監査ログ

**包括的な監査証跡**:
- インターセプター: `AuditInterceptor`（グローバル適用）
- ログ: すべてのCRUD操作（CREATE、READ、UPDATE、DELETE）
- データ: エンティティタイプ、sourcedId、ユーザーID、APIキーID、IPアドレス、リクエスト/レスポンス
- ストレージ: `audit_logs`テーブル

---

## 10. バックグラウンドジョブ処理

### 10.1 キューアーキテクチャ

**BullMQ**（Redis使用）:
- キュー: `csv-import-queue`
- プロセッサー: `CsvImportProcessor`
- ジョブ: CSV インポート操作（非同期、バックグラウンド）

### 10.2 ジョブフロー

1. コントローラーがジョブをキューに追加 → BullMQ
2. BullMQがジョブをRedisに保存
3. プロセッサーが非同期でジョブをピックアップ
4. `csv_import_jobs`テーブルでジョブステータスを追跡
5. クライアントがジョブステータスエンドポイントをポーリング

---

## 11. エラーハンドリングパターン

### 11.1 例外階層

- `BadRequestException`（400）: バリデーションエラー、無効なフィルター構文
- `UnauthorizedException`（401）: 無効なAPIキー
- `ForbiddenException`（403）: IPがホワイトリストにない、レート制限超過
- `NotFoundException`（404）: エンティティが見つからない
- `ConflictException`（409）: sourcedIdの重複
- `InternalServerErrorException`（500）: 予期しないエラー

### 11.2 エラーレスポンス形式

```json
{
  "statusCode": 400,
  "message": "バリデーション失敗",
  "errors": [
    {
      "field": "givenName",
      "message": "givenNameは文字列でなければなりません"
    }
  ],
  "timestamp": "2025-11-15T10:30:00.000Z",
  "path": "/ims/oneroster/v1p2/users"
}
```

---

## 12. APIドキュメント

### 12.1 OpenAPI/Swagger

**場所**: `http://localhost:3000/api/docs`

**設定**: `@nestjs/swagger`を使用した`main.ts`

**タグ**:
- `users`: ユーザーエンティティ操作
- `orgs`: 組織エンティティ操作
- `classes`: クラスエンティティ操作
- `courses`: コースエンティティ操作
- `enrollments`: 履修登録エンティティ操作
- `academicSessions`: 学期エンティティ操作
- `demographics`: 人口統計エンティティ操作
- `csv`: CSVインポート/エクスポート操作
- `auth`: APIキー管理

---

## 13. 主要なアーキテクチャ決定

### 13.1 なぜNestJSか？

- エンタープライズグレードのTypeScriptフレームワーク
- 組み込み依存性注入（制御の反転）
- モジュラーアーキテクチャがOneRosterエンティティ構造と一致
- 優れたTypeScriptサポートと型安全性
- 豊富なエコシステム（Swagger、Prisma、BullMQ統合）

### 13.2 なぜPrismaか？

- TypeScript統合による型安全ORM
- 自動マイグレーション生成
- クエリビルダーがSQLインジェクションを防止
- クエリバッチングによるパフォーマンス最適化
- PostgreSQL全文検索サポート（将来用）

### 13.3 なぜ機能優先の組織化か？

- OneRosterエンティティは自然に独立している
- 各モジュールを独立して開発/テスト/デプロイ可能
- 明確な境界が結合を減らす
- チームが並行して作業しやすい

### 13.4 なぜベースリポジトリパターンか？

- DRY原則: 共通CRUD操作を一箇所に
- すべてのエンティティで一貫したクエリパターン
- 横断的機能の追加が容易（論理削除、監査ログ）
- テスト可能性: 単体テスト用のベースリポジトリモック

---

## 14. マイグレーション戦略

### 14.1 データベースマイグレーション

**Prisma Migrate**:
- 開発: `npx prisma migrate dev`（マイグレーション作成+適用）
- 本番: `npx prisma migrate deploy`（保留中のマイグレーション適用）
- マイグレーションファイル: `prisma/migrations/`

### 14.2 破壊的変更

- 本番環境での破壊的変更は不可（後方互換性）
- スキーマ変更が必要な場合はバージョン管理されたAPIパスを使用
- バージョン管理されたモジュール経由で複数のOneRosterバージョンをサポート

---

## 15. パフォーマンス最適化パターン

### 15.1 データベース最適化

- **インデックス**: すべての外部キー、dateLastModified、status、role、email
- **ページネーション**: オフセットベースのページネーション（limit + offset）
- **バッチ挿入**: CSVインポートは1000レコードのバッチを使用
- **クエリ最適化**: `select`と`include`によるPrismaクエリ最適化

### 15.2 キャッシング戦略

- **APIキー検証**: Redisキャッシュ（5分TTL）
- **レート制限**: Redisソート済みセット（スライディングウィンドウ）
- **将来**: 読み取り頻度の高いエンドポイントのレスポンスキャッシング

### 15.3 CSV処理

- **ストリーミングパーサー**: `csv-parse`でストリーミング（100MB以上のファイルを処理）
- **バックグラウンドジョブ**: 非同期処理用BullMQ
- **進捗追跡**: リアルタイムジョブステータス更新

---

## 16. 将来のアーキテクチャ強化

### 16.1 計画された改善

- **イベントソーシング**: 監査証跡リプレイ用のイベントログ追加
- **CQRS**: パフォーマンス向上のための読み取り/書き込みモデル分離
- **GraphQL API**: RESTと並行してGraphQL層追加
- **マイクロサービス**: CSV処理を別サービスに分割
- **リアルタイム更新**: ライブデータ同期用WebSocketサポート

### 16.2 スケーラビリティの考慮事項

- **水平スケーリング**: ステートレスAPIサーバー（ロードバランサー背後でスケール）
- **データベース読み取りレプリカ**: 読み取り/書き込みデータベースの分離
- **Redisクラスター**: 複数のRedisノードにキャッシュを分散
- **CDN**: 静的APIドキュメントとOpenAPI仕様をキャッシュ

---

## まとめ

RosterHubは、以下を備えた**クリーンでモジュラーなNestJSアーキテクチャ**に従っています:
- OneRosterエンティティを中心とした**機能優先の組織化**
- **レイヤードアーキテクチャ**（Controller → Service → Repository → Database）
- 一貫したデータアクセスのための**ベースリポジトリパターン**
- **包括的なセキュリティ**（APIキー、IPホワイトリスト、レート制限、監査ログ）
- CSVインポート/エクスポート用の**バックグラウンドジョブ処理**
- Prisma ORM経由の**型安全なデータベースアクセス**
- すべてのエンドポイント用の**OpenAPIドキュメント**

このアーキテクチャは以下を提供します:
- **保守性**: 明確なモジュール境界と一貫したパターン
- **テスト可能性**: 依存性注入とリポジトリパターン
- **スケーラビリティ**: ステートレス設計、バックグラウンドジョブ、キャッシング
- **セキュリティ**: 多層認証と認可
- **準拠性**: OneRoster v1.2 + Japan Profile 1.2.2 仕様への準拠
