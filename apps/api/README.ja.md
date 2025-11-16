# RosterHub API

**OneRoster v1.2 Japan Profile 1.2.2 準拠 REST API**

RosterHubは、日本の小中高教育機関向けに標準化された名簿データ管理を提供する、プロダクションレディなOneRoster API実装です。35,000以上の学校と1,550万人の児童生徒をサポートします。

[![CI Status](https://github.com/your-org/RosterHub/workflows/CI/badge.svg)](https://github.com/your-org/RosterHub/actions)
[![Coverage](https://codecov.io/gh/your-org/RosterHub/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/RosterHub)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 機能

### OneRoster v1.2 準拠
- **7つのコアエンティティ**: users（ユーザー）、orgs（組織）、classes（クラス）、courses（コース）、enrollments（履修登録）、academicSessions（学期）、demographics（人口統計）
- **差分/増分API**: `dateLastModified`フィルターによる効率的な同期
- **大容量CSV インポート/エクスポート**: ストリーミングパーサーで200,000件以上のレコードを処理
- **高度なフィルタリング**: AND/OR/括弧をサポートした複雑なフィルター式
- **ページネーション & ソート**: limit/offset/sortによる効率的なデータ取得
- **フィールド選択**: 選択的なフィールド返却によるペイロードサイズの削減

### Japan Profile 1.2.2 拡張機能
- **カナ名**: 読み仮名表記のための`kanaGivenName`、`kanaFamilyName`
- **日本固有メタデータ**: 組織コード、出席番号、学級担任情報など
- **文字エンコーディング**: 日本語テキストへの完全なUTF-8サポート

### エンタープライズグレードセキュリティ
- **APIキー認証**: リクエストレベルの認証と取り消し可能なキー
- **IPホワイトリスト**: ネットワークレベルのアクセス制御
- **レート制限**: スライディングウィンドウアルゴリズムによる不正使用防止（デフォルト: 1時間あたり1000リクエスト）
- **監査ログ**: コンプライアンスのための完全なリクエスト/レスポンスログ

### 高パフォーマンス
- **データベース**: フレキシブルなメタデータストレージのためのPostgreSQL 15 + JSONB
- **キャッシング**: APIキー検証のためのRedis 7（5分TTL）
- **非同期処理**: バックグラウンドCSVインポートジョブのためのBullMQ
- **最適化クエリ**: 50ms未満のレスポンスタイムを実現するインデックス化フィールド

---

## クイックスタート

### 前提条件

- **Node.js**: 20.x LTS
- **Docker**: 20.10以上 & Docker Compose 2.0以上
- **PostgreSQL**: 15以上（またはDocker Composeを使用）
- **Redis**: 7以上（またはDocker Composeを使用）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-org/RosterHub.git
cd RosterHub/apps/api

# 依存関係のインストール
npm install

# Prisma Clientの生成
npx prisma generate
```

### 設定

```bash
# 環境変数テンプレートのコピー
cp .env.example .env

# 設定の編集
nano .env
```

**必須の環境変数**:
```env
# データベース
DATABASE_URL=postgresql://rosterhub:password@localhost:5432/rosterhub?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# セキュリティ
JWT_SECRET=your_very_long_random_secret_string
API_KEY_ENABLED=true
RATE_LIMIT_ENABLED=true

# アプリケーション
NODE_ENV=production
API_PORT=3000
```

### データベースセットアップ

```bash
# マイグレーションの実行
npx prisma migrate deploy

# （オプション）テストデータの投入
npm run seed
```

### 開発サーバーの起動

```bash
# ホットリロード付き開発モード
npm run start:dev

# 本番モード
npm run build
npm run start:prod
```

**APIは以下で利用可能**: `http://localhost:3000`

**APIドキュメント（Swagger）**: `http://localhost:3000/api/docs`

---

## Docker デプロイ

### Docker Composeによるクイックスタート

```bash
# 全サービスの起動（PostgreSQL + Redis + API）
docker-compose up -d

# データベースマイグレーションの実行
docker-compose exec api npx prisma migrate deploy

# サービスヘルスチェック
docker-compose ps
curl http://localhost:3000/health
```

### 本番デプロイ

```bash
# 本番プロファイルで起動（Nginx含む）
docker-compose --profile production up -d

# デプロイ確認
curl -f https://rosterhub.yourdomain.com/health
```

詳細なDockerデプロイ手順については、[Dockerデプロイガイド](docs/deployment/docker-deployment-guide.md)を参照してください。

---

## API使用方法

### 認証

すべてのOneRoster APIリクエストにはAPIキーが必要です：

```bash
# データベースにAPIキーを作成
INSERT INTO api_keys (key, name, is_active, rate_limit)
VALUES (gen_random_uuid(), 'School LMS Integration', true, 1000);
```

リクエストヘッダーにAPIキーを含める：
```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/ims/oneroster/v1p2/users
```

### 一般的なAPI操作

**ページネーション付きで全ユーザーを取得**:
```bash
GET /ims/oneroster/v1p2/users?limit=100&offset=0
```

**アクティブな生徒をフィルタリング**:
```bash
GET /ims/oneroster/v1p2/users?filter=role='student' AND status='active'
```

**差分同期（タイムスタンプ以降に変更されたユーザーを取得）**:
```bash
GET /ims/oneroster/v1p2/users?filter=dateLastModified>='2025-01-01T00:00:00Z'
```

**単一ユーザーの取得**:
```bash
GET /ims/oneroster/v1p2/users/:sourcedId
```

**CSVインポート**:
```bash
curl -X POST \
  -H "X-API-Key: your-api-key-here" \
  -F "file=@users.csv" \
  -F "entityType=users" \
  http://localhost:3000/ims/oneroster/v1p2/csv/import
```

**CSVエクスポート**:
```bash
GET /ims/oneroster/v1p2/csv/export/users
```

完全なAPIドキュメントについては、`/api/docs`のSwagger UIまたは[API仕様書](docs/api/oneroster-v1.2-spec.md)を参照してください。

---

## テスト

### ユニットテスト

```bash
# 全ユニットテストの実行
npm test

# カバレッジレポート付き実行
npm run test:cov

# 特定のテストファイルを実行
npm test -- users.service.spec.ts

# 開発用ウォッチモード
npm run test:watch
```

**現在のテストカバレッジ**: 126テスト合格（100%成功率）

### E2Eテスト

```bash
# エンドツーエンドテストの実行
npm run test:e2e
```

E2Eテストでカバーする項目：
- OneRoster APIエンドポイント（users、orgs、classesなど）
- CSV インポート/エクスポート ワークフロー
- 認証と認可
- フィルタクエリ解析
- Japan Profile メタデータ

---

## プロジェクト構造

```
apps/api/
├── src/
│   ├── oneroster/              # OneRoster v1.2 実装
│   │   ├── entities/           # 7つのOneRosterエンティティ
│   │   │   ├── users/
│   │   │   ├── orgs/
│   │   │   ├── classes/
│   │   │   ├── courses/
│   │   │   ├── enrollments/
│   │   │   ├── academic-sessions/
│   │   │   └── demographics/
│   │   ├── csv/                # CSV インポート/エクスポート
│   │   └── common/             # 共有サービス（フィルターパーサー、フィールド選択）
│   ├── common/                 # ガード、インターセプター、デコレーター
│   │   ├── guards/             # ApiKey、IpWhitelist、RateLimit
│   │   └── interceptors/       # 監査ログ
│   ├── database/               # Prisma 設定
│   └── config/                 # アプリケーション設定
├── prisma/
│   ├── schema.prisma           # データベーススキーマ
│   └── migrations/             # データベースマイグレーション
├── test/                       # E2Eテスト
├── docs/                       # ドキュメント
│   ├── deployment/             # デプロイガイド
│   ├── api/                    # API仕様書
│   └── cloud/                  # クラウドアーキテクチャ
├── docker-compose.yml          # Dockerオーケストレーション
├── Dockerfile                  # マルチステージDockerビルド
└── README.md                   # このファイル（英語版）
```

---

## パフォーマンス

### ベンチマーク

| 操作 | レコード数 | 時間 | スループット |
|------|----------|------|------------|
| GET /users（ページネーション） | 100 | <50ms | 2,000 req/s |
| GET /users/:id | 1 | <10ms | 10,000 req/s |
| CSV インポート | 200,000 | <30分 | 111 レコード/秒 |
| CSV エクスポート | 100,000 | <2分 | 833 レコード/秒 |
| 複雑なフィルタクエリ | 10,000 | <100ms | 100 クエリ/秒 |

### 最適化戦略

- **データベースインデックス**: すべてのフィルター可能フィールドにインデックスを設定
- **Redisキャッシング**: APIキー検証をキャッシュ（5分TTL）
- **バッチ処理**: CSVインポートは1000レコードバッチを使用
- **コネクションプーリング**: PostgreSQLコネクションプール（最大20接続）
- **ストリーミング**: 大容量CSVファイルはストリーミングパーサーで処理

---

## 本番環境デプロイ

### デプロイオプション

1. **Docker Compose**（中小規模デプロイに推奨）
   - [Dockerデプロイガイド](docs/deployment/docker-deployment-guide.md)を参照
   - 全サービスを含む単一サーバーデプロイ

2. **Kubernetes**（大規模デプロイ向け）
   - [Kubernetesデプロイガイド](docs/deployment/kubernetes-deployment-guide.md)を参照
   - 水平スケーリング、高可用性

3. **クラウドプラットフォーム**
   - **AWS**: [AWSデプロイガイド](docs/cloud/aws-optimization-guide.md)
   - **Azure**: [Azureデプロイガイド](docs/cloud/azure-optimization-guide.md)
   - **GCP**: [GCPデプロイガイド](docs/cloud/gcp-optimization-guide.md)

### CI/CDパイプライン

GitHub Actionsワークフロー：
- **CI**: リント、テスト、ビルド、セキュリティスキャン
- **CD**: ステージング/本番環境への自動デプロイ
- **トリガー**: `main`ブランチへのプッシュまたは手動ワークフロー実行

詳細は`.github/workflows/ci.yml`および`.github/workflows/cd.yml`を参照してください。

---

## 監視 & 運用

### ヘルスチェック

```bash
# APIヘルスステータス
GET /health

# データベースとRedisのステータス
GET /health/db
GET /health/redis
```

### ロギング

- **アプリケーションログ**: NestJS Loggerによる構造化JSONロギング
- **監査ログ**: すべてのAPIリクエストを`audit_logs`テーブルに記録
- **エラートラッキング**: スタックトレース付き自動エラーログ

### メトリクス

- すべてのレスポンスにレート制限ヘッダーを含む
- BullMQジョブキューメトリクス
- データベースコネクションプール統計

---

## セキュリティ

### 認証 & 認可
- APIキー認証（取り消し可能なキー）
- IPホワイトリストフィルタリング（オプション）
- レート制限（スライディングウィンドウアルゴリズム）

### データ保護
- 本番環境ではHTTPS必須
- PostgreSQL SSL接続
- Redisパスワード認証
- 環境変数の暗号化

### コンプライアンス
- すべてのAPIリクエストの完全な監査証跡
- GDPR準拠のデータ取り扱い
- 日本の個人情報保護法（APPI）準拠

セキュリティ監査チェックリストについては、[セキュリティドキュメント](docs/security/security-audit.md)を参照してください。

---

## トラブルシューティング

### よくある問題

**データベース接続エラー**:
```bash
# PostgreSQLが実行中か確認
docker-compose ps postgres

# 接続を検証
docker-compose exec postgres pg_isready -U rosterhub

# .env の DATABASE_URL を確認
```

**Redis接続エラー**:
```bash
# Redisが実行中か確認
docker-compose ps redis

# 接続をテスト
docker-compose exec redis redis-cli -a your_password ping
```

**APIキー認証失敗**:
```sql
-- APIキーが存在しアクティブか確認
SELECT * FROM api_keys WHERE key = 'your-api-key' AND is_active = true;
```

その他のトラブルシューティングについては、[トラブルシューティングガイド](docs/troubleshooting.md)を参照してください。

---

## コントリビューション

貢献を歓迎します！ガイドラインについては[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

### 開発ワークフロー

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更を加える
4. テストを実行（`npm test`）
5. 変更をコミット（`git commit -m 'Add amazing feature'`）
6. ブランチにプッシュ（`git push origin feature/amazing-feature`）
7. プルリクエストを開く

---

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

---

## サポート

- **ドキュメント**: [docs/](docs/)ディレクトリを参照
- **課題**: [GitHub Issues](https://github.com/your-org/RosterHub/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/your-org/RosterHub/discussions)

---

## 参考資料

- [OneRoster v1.2 仕様書](https://www.imsglobal.org/oneroster-v12-final-specification)
- [OneRoster Japan Profile 1.2.2](docs/api/japan-profile-1.2.2.md)
- [NestJS ドキュメント](https://docs.nestjs.com/)
- [Prisma ドキュメント](https://www.prisma.io/docs/)
- [PostgreSQL 15 ドキュメント](https://www.postgresql.org/docs/15/)

---

**最終更新日**: 2025-11-16
**バージョン**: 1.0.0
**管理者**: RosterHub 開発チーム
