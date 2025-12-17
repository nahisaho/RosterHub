# RosterHub 入門ガイド

このガイドでは、開発またはテスト用にRosterHubをローカルでセットアップして実行する方法を説明します。

## 前提条件

始める前に、以下がインストールされていることを確認してください：

- **Node.js 20.x** 以上 ([ダウンロード](https://nodejs.org/))
- **npm 9.x** 以上 (Node.jsに含まれています)
- **Docker & Docker Compose** ([ダウンロード](https://www.docker.com/products/docker-desktop/))
- **Git** ([ダウンロード](https://git-scm.com/))

## クイックスタート

### 1. リポジトリのクローン

```bash
git clone https://github.com/nahisaho/RosterHub.git
cd RosterHub
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cd apps/api
cp .env.example .env
```

`.env` を編集して設定を行います：

```env
# データベース
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rosterhub?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API設定
PORT=3000
API_PREFIX=ims/oneroster/v1p2

# セキュリティ
API_KEY_SALT_ROUNDS=10
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# ログ
LOG_LEVEL=debug
```

### 4. インフラサービスの起動

Docker Composeを使用してPostgreSQLとRedisを起動します：

```bash
# プロジェクトルートディレクトリから
cd /path/to/RosterHub
docker-compose up -d postgres redis
```

サービスが実行されていることを確認：

```bash
docker-compose ps
```

### 5. データベースの初期化

```bash
cd apps/api

# Prismaクライアントの生成
npm run prisma:generate

# データベースマイグレーションの実行
npm run prisma:migrate

# (オプション) テストデータの投入（約1000レコード）
npm run prisma:seed
```

### 6. APIサーバーの起動

```bash
# ホットリロード付き開発モード
npm run dev

# または本番モード
npm run build
npm run start:prod
```

APIは以下のURLで利用可能になります: **http://localhost:3000**

## インストールの確認

### ヘルスチェック

```bash
curl http://localhost:3000/health
```

期待されるレスポンス：
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### APIドキュメント

ブラウザで以下にアクセス：

- **Swagger UI**: http://localhost:3000/api
- **OpenAPI JSON**: http://localhost:3000/api-json

## 最初のAPIキーを作成

OneRoster APIにアクセスするにはAPIキーが必要です：

```bash
# CLIツールを使用
cd apps/api
npm run cli:create-api-key -- --name "テストクライアント" --description "開発テスト用"
```

または、データベースに直接作成：

```sql
INSERT INTO "ApiKey" ("sourcedId", "name", "description", "keyHash", "status", "createdAt", "updatedAt")
VALUES (
  'api-key-001',
  'テストクライアント',
  '開発テスト用',
  '$2b$10$...', -- キーのbcryptハッシュ
  'active',
  NOW(),
  NOW()
);
```

## 最初のAPIリクエストを実行

### ユーザー一覧の取得

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/ims/oneroster/v1p2/users
```

### 単一ユーザーの取得

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/ims/oneroster/v1p2/users/user-student-001
```

### ロールでユーザーをフィルタリング

```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/ims/oneroster/v1p2/users?filter=role='student'"
```

### ページネーション

```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/ims/oneroster/v1p2/users?limit=10&offset=0"
```

## テストの実行

### ユニットテスト

```bash
cd apps/api
npm run test
```

### E2Eテスト

```bash
cd apps/api
npm run test:e2e
```

### テストカバレッジ

```bash
cd apps/api
npm run test:cov
```

## プロジェクト構造

```
RosterHub/
├── apps/
│   └── api/                    # NestJS APIサーバー
│       ├── src/
│       │   ├── oneroster/      # OneRosterモジュール
│       │   │   ├── entities/   # Users, Orgs, Classes など
│       │   │   ├── csv/        # CSVインポート/エクスポート
│       │   │   └── common/     # 共有サービス
│       │   ├── common/         # ガード、インターセプター
│       │   ├── database/       # Prismaサービス
│       │   └── caching/        # Redisキャッシュ
│       ├── prisma/             # データベーススキーマ
│       └── test/               # E2Eテスト
├── docs/                       # ドキュメント
├── steering/                   # プロジェクトメモリ（AIコンテキスト）
└── docker-compose.yml          # インフラサービス
```

## よくある問題

### データベース接続エラー

**エラー**: `Can't reach database server at localhost:5432`

**解決方法**: PostgreSQLコンテナが実行中であることを確認：
```bash
docker-compose up -d postgres
```

### Redis接続エラー

**エラー**: `Redis connection to localhost:6379 failed`

**解決方法**: Redisコンテナが実行中であることを確認：
```bash
docker-compose up -d redis
```

### Prismaクライアント未生成

**エラー**: `@prisma/client did not initialize yet`

**解決方法**: Prismaクライアントを生成：
```bash
cd apps/api
npm run prisma:generate
```

### ポートが既に使用中

**エラー**: `Error: listen EADDRINUSE: address already in use :::3000`

**解決方法**: 既存のプロセスを停止するか、`.env`でポートを変更：
```bash
# プロセスを見つけて終了
lsof -i :3000
kill -9 <PID>

# またはポートを変更
PORT=3001
```

## 次のステップ

- **[APIリファレンス](../design/api/)** - 完全なAPIドキュメント
- **[CSVインポートガイド](./csv-upload-implementation.ja.md)** - 一括データインポート
- **[アーキテクチャ概要](../design/architecture/)** - システム設計
- **[セキュリティガイド](../security/)** - 認証と認可

## サポート

- **GitHub Issues**: [バグ報告や機能リクエスト](https://github.com/nahisaho/RosterHub/issues)
- **ドキュメント**: [完全なドキュメント](../README.md)

---

**RosterHub** - OneRoster Japan Profile 1.2.2 教育データ連携ハブ
