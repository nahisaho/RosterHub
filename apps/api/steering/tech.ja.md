# RosterHub - 技術スタック

## ドキュメント概要

**プロジェクト**: RosterHub - OneRoster Japan Profile 1.2.2 統合ハブ
**バージョン**: 1.0
**最終更新**: 2025-11-15
**目的**: 技術スタック、フレームワーク、開発ツール、依存関係、技術的決定を文書化

---

## 1. 技術スタック概要

### 1.1 コアスタック

```
┌─────────────────────────────────────────────────┐
│  ランタイム: Node.js 20.x LTS                  │
│  言語: TypeScript 5.7.x                        │
│  フレームワーク: NestJS 11.x                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  データベース: PostgreSQL 15                   │
│  ORM: Prisma 6.19.x                           │
│  マイグレーション: Prisma Migrate             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  キャッシュ/キュー: Redis 7.x                  │
│  ジョブキュー: BullMQ 5.63.x                   │
│  セッションストア: IORedis 5.8.x               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  コンテナ化: Docker 24.x                       │
│  オーケストレーション: Docker Compose 2.x      │
│  デプロイ: マルチステージDockerfile            │
└─────────────────────────────────────────────────┘
```

### 1.2 技術選定の根拠

**なぜNode.js 20.x LTS?**
- 2026年4月までの長期サポート（LTS）
- V8 JavaScriptエンジンによる優れたパフォーマンス
- ネイティブESモジュールサポート
- 強力なasync/awaitとPromiseサポート
- 教育データ統合の大規模エコシステム

**なぜTypeScript 5.7.x?**
- 型安全性がランタイムエラーを15-30%削減
- 優れたIDE サポート（IntelliSense、リファクタリング）
- 大規模コードベースの保守性向上
- Prisma ORMが型生成にTypeScriptを要求
- NestJSフレームワークがTypeScript上に構築

**なぜNestJS 11.x?**
- エンタープライズグレードのアーキテクチャ（モジュラー、スケーラブル、テスト可能）
- 組み込み依存性注入（IoCコンテナ）
- ネイティブTypeScriptサポート
- 豊富なデコレーターベースのプログラミングモデル
- REST、GraphQL、WebSocketsの即座サポート
- 強力なエコシステム（Swagger、Prisma、BullMQ統合）

**なぜPostgreSQL 15?**
- 教育データ整合性のための堅牢なACIDコンプライアンス
- Japan Profileメタデータ拡張のJSONBサポート
- 全文検索機能（将来の拡張）
- 適切なインデックスによる優れたパフォーマンス
- 教育機関向けの実績あるスケーラビリティ
- 強力なコミュニティサポートを持つオープンソース

**なぜPrisma 6.19.x?**
- 自動生成TypeScript型による型安全ORM
- 自動マイグレーションによる宣言的スキーマ
- SQLインジェクション防止のクエリビルダー
- 優れた開発者体験（Prisma Studio）
- パフォーマンス最適化（接続プーリング、クエリバッチング）
- PostgreSQL JSONBのネイティブサポート

**なぜRedis 7.x?**
- 高性能インメモリデータストア
- APIキー検証キャッシング（5分TTL）
- スライディングウィンドウアルゴリズムによるレート制限
- BullMQジョブキューバックエンド
- リアルタイム機能のPub/Subサポート（将来）

**なぜBullMQ 5.63.x?**
- CSVインポートのための堅牢なバックグラウンドジョブ処理
- 永続化を伴うRedisベースキュー
- 指数バックオフによる再試行メカニズム
- ジョブステータス追跡と監視
- 遅延ジョブとジョブ優先順位付けをサポート

**なぜDocker?**
- 開発、ステージング、本番環境の一貫性
- 簡単なデプロイとスケーリング
- サービス依存関係の分離（PostgreSQL、Redis、API）
- マルチステージビルドによる本番イメージサイズ削減
- ローカル開発用のDocker Compose

---

## 2. 言語とランタイム

### 2.1 Node.js設定

**バージョン**: 20.x LTS（コードネーム: Iron）
**インストール**: `nvm`（Node Version Manager）経由

**使用される主要機能**:
- ESモジュール（`import`/`export`構文）
- ネイティブPromiseとasync/await
- ワーカースレッド（将来: 並列CSV処理）
- APIキーハッシング用ネイティブcryptoモジュール
- Express経由のHTTP/2サポート

**環境**:
- 開発: Node.js 20.x、ホットリロード用`--watch`フラグ
- 本番: Node.js 20.x、PM2プロセスマネージャー（オプション）

### 2.2 TypeScript設定

**バージョン**: 5.9.3

**設定** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**使用されるTypeScript機能**:
- デコレーター（`@Injectable()`、`@Controller()`、`@Get()`）
- DTOのインターフェースと型エイリアス
- OneRoster仕様タイプのEnum
- ベースリポジトリパターン用のジェネリクス
- 柔軟なメタデータのユニオン型
- null安全性のための`strictNullChecks`

---

## 3. フレームワークとライブラリ

### 3.1 NestJSフレームワーク

**バージョン**: 11.1.9

**コアパッケージ**:
- `@nestjs/core@11.1.9`: コアフレームワーク
- `@nestjs/common@11.1.9`: 共通ユーティリティ（デコレーター、例外、パイプ）
- `@nestjs/platform-express@11.1.9`: Express.js統合（デフォルトHTTPアダプター）
- `@nestjs/config@4.0.2`: 設定管理（環境変数）
- `@nestjs/swagger@11.2.1`: OpenAPI/Swaggerドキュメント生成

**使用されるNestJSの主要概念**:
- **モジュール**: コードを凝集性の高い機能モジュールに整理
- **コントローラー**: HTTPリクエストとレスポンスの処理
- **サービス**: ビジネスロジック層（インジェクタブルプロバイダー）
- **リポジトリ**: データアクセス層（カスタムパターン）
- **ガード**: 認証と認可（APIキー、IPホワイトリスト、レート制限）
- **インターセプター**: 監査ログのためのAOP
- **パイプ**: `class-validator`を使用したリクエスト検証
- **フィルター**: グローバル例外処理

**依存性注入**:
- コンストラクターベースのインジェクション
- カスタムプロバイダー（`PrismaService`、`FilterParserService`）
- モジュールスコーププロバイダー（シングルトンパターン）
- 動的設定用ファクトリープロバイダー

### 3.2 バリデーションと変換

**パッケージ**:
- `class-validator` (0.14.2): デコレーターを使用したDTOバリデーション
- `class-transformer` (0.5.1): プレーンオブジェクトをクラスインスタンスに変換

**使用パターン**:
```typescript
import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  givenName: string;

  @IsString()
  familyName: string;

  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  middleName?: string;
}
```

**グローバルバリデーションパイプ** (`main.ts`):
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // 未知のプロパティを削除
    forbidNonWhitelisted: true, // 未知のプロパティでエラーを投げる
    transform: true,            // DTOクラスインスタンスに自動変換
  })
);
```

### 3.3 APIドキュメント

**パッケージ**: `@nestjs/swagger` (11.2.1)

**機能**:
- 自動生成OpenAPI 3.0仕様
- `/api/docs`のSwagger UI
- APIキー認証スキーム
- TypeScript型からのDTOスキーマ生成
- リクエスト/レスポンス例の生成

**設定** (`main.ts`):
```typescript
const config = new DocumentBuilder()
  .setTitle('RosterHub API')
  .setDescription('OneRoster Japan Profile 1.2.2 Integration Hub API')
  .setVersion('1.0')
  .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
  .build();
```

**使用されるデコレーター**:
- `@ApiTags()`: エンティティごとにエンドポイントをグループ化
- `@ApiOperation()`: エンドポイント説明
- `@ApiResponse()`: レスポンススキーマとステータスコード
- `@ApiProperty()`: DTOプロパティメタデータ
- `@ApiQuery()`: クエリパラメータドキュメント

---

## 4. データベースとORM

### 4.1 PostgreSQL

**バージョン**: 15.x（Alpine Linux Dockerイメージ）

**使用される主要機能**:
- **JSONB**: Japan Profileメタデータ拡張の保存
- **UUID**: すべてのエンティティの主キー
- **インデックス**: B-tree、複合、部分インデックス
- **トランザクション**: Prismaトランザクションサポート
- **全文検索**: テキスト検索の将来の拡張
- **制約**: 外部キー、一意制約、チェック制約

**パフォーマンス設定**（本番）:
- `max_connections`: 100
- `shared_buffers`: 256MB
- `effective_cache_size`: 1GB
- `work_mem`: 4MB
- `maintenance_work_mem`: 64MB

**接続プーリング**:
- Prisma接続プールサイズ: 10接続
- 接続タイムアウト: 10秒
- クエリタイムアウト: 30秒

### 4.2 Prisma ORM

**バージョン**: 6.19.0（`prisma` CLI + `@prisma/client`）

**Prismaコンポーネント**:
- **Prismaスキーマ**: 宣言的データモデル（`prisma/schema.prisma`）
- **Prismaクライアント**: 自動生成型安全クエリビルダー
- **Prisma Migrate**: スキーママイグレーションツール
- **Prisma Studio**: データベースGUI（開発専用）

**Prismaスキーマ設定**:
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**使用されるPrismaの主要機能**:
- **型安全性**: スキーマから自動生成されるTypeScript型
- **リレーション**: 一対多、多対多、自己参照
- **Enum**: OneRoster仕様のenum
- **JSONB**: 柔軟なメタデータストレージ
- **マイグレーション**: バージョン管理されたスキーマ変更
- **論理削除**: ステータスベースの論理削除
- **インデックス**: パフォーマンス最適化

**Prismaクライアント使用パターン**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 型安全クエリ
const users = await prisma.user.findMany({
  where: { status: 'active', role: 'student' },
  orderBy: { dateLastModified: 'desc' },
  take: 100,
  skip: 0,
});
```

### 4.3 データベースマイグレーション

**戦略**: Prisma Migrate（宣言的マイグレーション）

**マイグレーションワークフロー**:
1. `prisma/schema.prisma`を修正
2. `npx prisma migrate dev --name {migration_name}`を実行
3. PrismaがSQLマイグレーションファイルを生成
4. 開発データベースにマイグレーション適用
5. マイグレーションファイルをGitにコミット
6. 本番にデプロイ: `npx prisma migrate deploy`

**マイグレーションファイルの場所**: `prisma/migrations/`

**マイグレーション例**:
```sql
-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourcedId" VARCHAR(255) NOT NULL,
    "givenName" VARCHAR(255) NOT NULL,
    "familyName" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "StatusType" NOT NULL DEFAULT 'active',
    "dateCreated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastModified" TIMESTAMPTZ NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_sourcedId_key" ON "users"("sourcedId");
CREATE INDEX "users_dateLastModified_idx" ON "users"("dateLastModified");
```

---

## 5. キャッシングとバックグラウンドジョブ

### 5.1 Redis

**バージョン**: 7.x（Alpine Linux Dockerイメージ）

**ユースケース**:
1. **APIキー検証キャッシュ**: 検証済みAPIキーの5分TTL
2. **レート制限**: ソート済みセットによるスライディングウィンドウアルゴリズム
3. **BullMQジョブキュー**: バックグラウンドジョブストレージ
4. **セッションストア**: ユーザーセッションの将来の拡張

**接続**（`ioredis`パッケージ）:
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
```

**使用されるRedisデータ構造**:
- **文字列**: APIキーキャッシュ（`api-key:{key}`）
- **ソート済みセット**: レート制限スライディングウィンドウ
- **リスト**: BullMQジョブキュー
- **ハッシュ**: ジョブメタデータ

### 5.2 BullMQ

**バージョン**: 5.63.1

**機能**:
- Redisベースのジョブキュー
- 指数バックオフによる再試行メカニズム
- ジョブ優先順位と遅延ジョブ
- ジョブステータス追跡（pending、processing、completed、failed）
- 並行制御
- イベント駆動ジョブライフサイクル

**キュー設定**:
```typescript
import { Queue, Worker } from 'bullmq';

const csvImportQueue = new Queue('csv-import', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 }, // 最後の100個の完了ジョブを保持
    removeOnFail: { count: 1000 },    // 最後の1000個の失敗ジョブを保持
  },
});
```

**ワーカー設定**:
```typescript
const csvImportWorker = new Worker('csv-import', async (job) => {
  // CSVインポートジョブを処理
  await csvImportService.importCsv(job.data);
}, {
  connection: redis,
  concurrency: 5, // 5つのジョブを並行処理
});
```

---

## 6. CSV処理

### 6.1 CSV解析

**パッケージ**: `csv-parse` (6.1.0)

**機能**:
- 大規模ファイル（100MB以上）用ストリーミングパーサー
- カラムヘッダーマッピング
- 型変換
- エラーハンドリング

**使用パターン**:
```typescript
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

const fileStream = createReadStream('users.csv');
const parser = fileStream.pipe(
  parse({
    columns: true,           // 最初の行をカラム名として使用
    skip_empty_lines: true,
    trim: true,
    cast: false,             // すべての値を文字列として保持
    relax_column_count: true,
  })
);

for await (const row of parser) {
  // 各行を処理
}
```

### 6.2 CSV生成

**パッケージ**: `csv-stringify` (6.6.0)

**機能**:
- ストリーミングCSV生成
- カラムヘッダーカスタマイズ
- 引用符処理
- 区切り文字設定

**使用パターン**:
```typescript
import { stringify } from 'csv-stringify';
import { createWriteStream } from 'fs';

const output = createWriteStream('users.csv');
const stringifier = stringify({
  header: true,
  columns: ['sourcedId', 'givenName', 'familyName', 'role', 'status'],
  quoted: true,
});

stringifier.pipe(output);
users.forEach(user => stringifier.write(user));
stringifier.end();
```

### 6.3 ファイルアップロード

**パッケージ**: `@types/multer` (2.0.0) + `@nestjs/platform-express`

**設定**:
- 最大ファイルサイズ: 50MB（`CSV_UPLOAD_MAX_SIZE`で設定可能）
- 許可されるMIMEタイプ: `text/csv`、`application/vnd.ms-excel`
- ストレージ: ローカルディスク（`uploads/`ディレクトリ）
- ファイル検証: MIMEタイプ、拡張子、マジックナンバー

**使用法**:
```typescript
@Post('import')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: csvFileFilter,
}))
async importCsv(@UploadedFile() file: Express.Multer.File) {
  // CSVファイルアップロードを処理
}
```

---

## 7. セキュリティ

### 7.1 認証

**パッケージ**: `bcryptjs` (3.0.3)

**ユースケース**: APIキーハッシング

**設定**:
- ソルトラウンド: 10
- ハッシュアルゴリズム: bcrypt（Blowfish暗号）

**使用法**:
```typescript
import * as bcrypt from 'bcryptjs';

// APIキーをハッシュ化
const hashedKey = await bcrypt.hash(apiKey, 10);

// APIキーを検証
const isValid = await bcrypt.compare(apiKey, hashedKey);
```

### 7.2 IPアドレス解析

**パッケージ**: `ipaddr.js` (1.9.1)

**ユースケース**: IPホワイトリスト検証、CIDR表記サポート

**使用法**:
```typescript
import * as ipaddr from 'ipaddr.js';

const ip = ipaddr.parse('192.168.1.100');
const range = ipaddr.parseCIDR('192.168.1.0/24');
const isInRange = ip.match(range);
```

### 7.3 UUID生成

**パッケージ**: `uuid` (11.1.0)

**ユースケース**: ジョブ、セッションの一意識別子生成

**使用法**:
```typescript
import { v4 as uuidv4 } from 'uuid';

const jobId = uuidv4(); // 例: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
```

---

## 8. 開発ツール

### 8.1 コード品質

**ESLint** (9.18.0):
- 設定: `eslint.config.mjs`
- 拡張: `@eslint/js`、`typescript-eslint`
- プラグイン: `eslint-plugin-prettier`
- ルール: TypeScript推奨 + カスタムルール

**Prettier** (3.4.2):
- 設定: `.prettierrc`
- 保存時フォーマット有効
- ESLint統合

**設定** (`.prettierrc`):
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

### 8.2 テスト

**Jest** (30.0.0):
- 単体およびE2Eテスト用テストフレームワーク
- カバレッジレポート
- `ts-jest`によるTypeScriptサポート

**Supertest** (7.0.0):
- E2Eテスト用HTTPアサーションライブラリ

**設定** (`package.json`):
```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

**テストスクリプト**:
- `npm run test`: 単体テスト実行
- `npm run test:watch`: ウォッチモード
- `npm run test:cov`: カバレッジレポート
- `npm run test:e2e`: E2Eテスト

### 8.3 ビルドツール

**NestJS CLI** (11.0.0):
- モジュール、コントローラー、サービスのスキャフォールディング
- アプリケーションのビルドとバンドル
- ホットリロード付き開発モード

**TypeScriptコンパイラー** (`tsc`):
- TypeScriptからJavaScriptへのトランスパイル
- 型宣言ファイルの生成
- ソースマップ生成

**ビルド設定** (`nest-cli.json`):
```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["**/*.prisma"],
    "watchAssets": true
  }
}
```

---

## 9. コンテナ化とデプロイ

### 9.1 Docker

**バージョン**: 24.x

**Dockerfile戦略**: マルチステージビルド

**ステージ**:
1. **Dependencies**: 本番依存関係のみをインストール
2. **Build**: すべての依存関係をインストール、アプリケーションをビルド
3. **Production**: ビルドされたアプリと本番依存関係をコピー

**Dockerfile**（簡略版）:
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**イメージ最適化**:
- Alpine Linuxベース（最小サイズ）
- マルチステージビルド（最終イメージサイズを60%削減）
- セキュリティのための非rootユーザー（`nestjs`）
- ヘルスチェックエンドポイント
- 適切なシグナル処理のためのdumb-init

### 9.2 Docker Compose

**バージョン**: 2.x

**サービス**:
- `postgres`: PostgreSQL 15データベース
- `redis`: Redis 7キャッシュとジョブキュー
- `api`: NestJS APIアプリケーション
- `nginx`: リバースプロキシ（本番プロファイル）
- `adminer`: データベース管理UI（開発プロファイル）

**ネットワーク**: ブリッジネットワーク（`rosterhub-network`）

**ボリューム**:
- `postgres_data`: データベース永続化
- `redis_data`: Redis永続化
- `./uploads`: CSVファイルアップロード
- `./logs`: アプリケーションログ

**環境変数** (`.env`):
```bash
# データベース
POSTGRES_USER=rosterhub
POSTGRES_PASSWORD=rosterhub_dev_password
POSTGRES_DB=rosterhub_dev

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=rosterhub_redis

# API
API_PORT=3000
NODE_ENV=production
```

### 9.3 本番デプロイ

**デプロイターゲット**:
- **Docker Swarm**: マルチノードオーケストレーション
- **Kubernetes**: 高度なオーケストレーション（将来）
- **クラウドプラットフォーム**: AWS ECS、Google Cloud Run、Azure Container Instances

**ヘルスチェック**:
- HTTPヘルスエンドポイント: `GET /health`
- 活性プローブ: アプリケーションが実行中かチェック
- 準備プローブ: アプリケーションがトラフィックを受け入れられるかチェック

**監視**（将来）:
- Prometheusメトリクスエクスポート
- Grafanaダッシュボード
- Sentryエラー追跡
- CloudWatchログ（AWS）

---

## 10. CI/CDパイプライン

### 10.1 GitHub Actions

**ワークフロー**:
1. **CIパイプライン** (`.github/workflows/ci.yml`):
   - コードのLint（ESLint + Prettier）
   - 単体テスト実行（Jest）
   - E2Eテスト実行（Jest + Supertest）
   - Dockerイメージのビルド
   - セキュリティスキャン（Trivy）

2. **CDパイプライン** (`.github/workflows/cd.yml`):
   - ステージングへのデプロイ（`main`ブランチで自動デプロイ）
   - 本番へのデプロイ（手動承認）
   - データベースマイグレーション
   - ヘルスチェック検証
   - 失敗時のロールバック

**CIパイプラインステージ**:
```yaml
jobs:
  lint:
    - ESLintチェック
    - Prettierフォーマットチェック

  test:
    - PostgreSQLサービスセットアップ
    - Redisサービスセットアップ
    - Prismaマイグレーション実行
    - カバレッジ付き単体テスト実行
    - Codecovにカバレッジアップロード

  build:
    - Dockerイメージのビルド
    - Docker Hubにプッシュ（mainブランチのみ）

  security:
    - Trivy脆弱性スキャナー実行
    - GitHub Securityに結果をアップロード
```

**CDパイプラインステージ**:
```yaml
jobs:
  deploy-staging:
    - 最新のDockerイメージをプル
    - ステージングサーバーにSSH
    - docker-compose upを実行
    - Prismaマイグレーション適用
    - ヘルスチェック

  deploy-production:
    - 手動承認が必要
    - データベースバックアップ作成
    - 最新のDockerイメージをプル
    - 本番サーバーにSSH
    - docker-compose upを実行
    - Prismaマイグレーション適用
    - ヘルスチェック
    - 失敗時のロールバック
```

### 10.2 開発ワークフロー

**ブランチ戦略**: Git Flow
- `main`: 本番レディコード
- `develop`: 開発ブランチ
- `feature/*`: 機能ブランチ
- `hotfix/*`: ホットフィックスブランチ

**コードレビュープロセス**:
1. `develop`から機能ブランチを作成
2. テスト付きで機能を実装
3. ローカルでリンターとテストを実行
4. `develop`へのプルリクエスト作成
5. CIパイプラインが自動実行
6. チームメンバーによるコードレビュー
7. 承認後に`develop`にマージ
8. 本番デプロイのために`main`にリリース

---

## 11. 環境設定

### 11.1 環境変数

**カテゴリ**:

**データベース**:
- `DATABASE_URL`: PostgreSQL接続文字列
- `POSTGRES_USER`: データベースユーザー
- `POSTGRES_PASSWORD`: データベースパスワード
- `POSTGRES_DB`: データベース名

**Redis**:
- `REDIS_HOST`: Redisホスト名
- `REDIS_PORT`: Redisポート
- `REDIS_PASSWORD`: Redisパスワード

**API**:
- `PORT`: APIサーバーポート（デフォルト: 3000）
- `API_PREFIX`: APIパスプレフィックス（デフォルト: `api/v1`）
- `NODE_ENV`: 環境（`development`、`production`）
- `CORS_ORIGINS`: 許可されるCORSオリジン

**セキュリティ**:
- `API_KEY_ENABLED`: APIキー認証を有効化（デフォルト: `true`）
- `IP_WHITELIST_ENABLED`: IPホワイトリストを有効化（デフォルト: `false`）
- `RATE_LIMIT_ENABLED`: レート制限を有効化（デフォルト: `true`）
- `RATE_LIMIT_TTL`: レート制限ウィンドウ（秒）（デフォルト: 60）
- `RATE_LIMIT_MAX`: ウィンドウあたりの最大リクエスト（デフォルト: 100）

**OneRoster**:
- `ONEROSTER_VERSION`: OneRosterバージョン（デフォルト: `1.2`）
- `JAPAN_PROFILE_VERSION`: Japan Profileバージョン（デフォルト: `1.2.2`）

**CSV**:
- `CSV_UPLOAD_MAX_SIZE`: 最大CSVファイルサイズ（バイト）（デフォルト: 52428800 = 50MB）
- `CSV_BATCH_SIZE`: CSVバッチ挿入サイズ（デフォルト: 1000）

### 11.2 設定読み込み

**パッケージ**: `@nestjs/config` (4.0.2)

**設定ファイル**:
- `src/config/app.config.ts`: アプリケーション設定
- `src/config/database.config.ts`: データベース設定

**読み込み戦略**:
```typescript
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}
```

**型安全設定**:
```typescript
// app.config.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
});
```

---

## まとめ

RosterHubは、モダンでエンタープライズグレードの技術スタックを使用しています:

**コアスタック**:
- Node.js 20.x + TypeScript 5.7 + NestJS 11.x
- PostgreSQL 15 + Prisma ORM 6.19
- Redis 7.x + BullMQ 5.63

**主要技術**:
- **フレームワーク**: NestJS（モジュラー、依存性注入、TypeScriptファースト）
- **ORM**: Prisma（型安全、マイグレーション、優れたDX）
- **バリデーション**: class-validator + class-transformer
- **バックグラウンドジョブ**: Redisを使用したBullMQ
- **CSV処理**: csv-parse + csv-stringify（ストリーミング）
- **APIドキュメント**: Swagger/OpenAPI
- **コンテナ化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

**開発ツール**:
- ESLint + Prettier（コード品質）
- Jest + Supertest（テスト）
- Prisma Studio（データベースGUI）
- Docker Compose（ローカル開発）

このスタックは以下を提供します:
- **型安全性**: TypeScript + Prismaのエンドツーエンド
- **スケーラビリティ**: ステートレスAPI、バックグラウンドジョブ、キャッシング
- **開発者体験**: ホットリロード、自動生成型、Swagger UI
- **本番対応**: Docker、CI/CD、ヘルスチェック、監視
- **セキュリティ**: APIキー認証、レート制限、監査ログ、脆弱性スキャン
