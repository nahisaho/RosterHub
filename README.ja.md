# RosterHub

**OneRoster Japan Profile 1.2.2 対応 教育データ連携ハブ**

教育委員会レベルでの大規模展開(10,000〜200,000ユーザー)を想定した、標準化された教育データ連携プラットフォームです。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)

[English README](./README.md)

---

## 概要

RosterHubは、**OneRoster Japan Profile 1.2.2**に準拠した教育データ連携ハブで、校務支援システムと学習ツール間の教育データ交換を標準化・自動化します。教育委員会レベルでの大規模展開を想定して構築されています。

### 主な機能

- **OneRoster Japan Profile 1.2.2 完全準拠**: 日本の教育データ標準規格に対応
- **CSV インポート/エクスポート**: ストリーミング処理による大容量データ操作(100MB以上のファイル、200,000人以上のユーザー)
- **REST API**: ページネーション、フィルタリング、ソート、フィールド選択機能を備えたフルCRUD操作
- **差分/増分API**: タイムスタンプベースの変更追跡による効率的な同期
- **エンタープライズセキュリティ**: APIキー認証、IPホワイトリスト、レート制限、監査ログ
- **大規模対応**: 10,000〜200,000ユーザー規模の組織向けに最適化
- **バックグラウンド処理**: BullMQによる非同期CSVインポートジョブ
- **GDPR準拠**: データサニタイゼーションと保持ポリシーを備えた包括的な監査ログ

---

## アーキテクチャ

RosterHubは、npmワークスペースを使用した**モノレポ**として構築されています:

```
RosterHub/
├── apps/                    # アプリケーション
│   └── api/                 # NestJS APIサーバー(メインアプリケーション)
├── packages/                # 共有パッケージ(将来)
├── docs/                    # ドキュメント
│   ├── research/            # 調査ドキュメント
│   ├── requirements/        # 要件仕様(EARS形式)
│   ├── design/              # アーキテクチャと設計ドキュメント
│   └── guides/              # 開発者ガイド
├── steering/                # プロジェクトメモリー(AIエージェントコンテキスト)
│   ├── structure.md         # アーキテクチャパターンと規約
│   ├── tech.md              # 技術スタック
│   └── product.md           # プロダクトコンテキスト
├── .claude/                 # Musuhi SDD AIエージェント(20種類の専門エージェント)
├── docker-compose.yml       # Dockerサービス(PostgreSQL、Redis)
└── package.json             # ルートワークスペース設定
```

### 技術スタック

**バックエンド(API)**:
- **フレームワーク**: NestJS 11.x (TypeScript 5.7、Node.js 20.x)
- **データベース**: PostgreSQL 15 + Prisma ORM 6.x
- **キャッシュ&キュー**: Redis 7 + BullMQ(バックグラウンドジョブ)
- **認証**: APIキー(bcryptjsハッシュ化)
- **APIドキュメント**: OpenAPI/Swagger
- **テスト**: Jest + Supertest(E2Eテスト)

**インフラストラクチャ**:
- **コンテナ化**: Docker & Docker Compose
- **環境**: Node.js 20.x、npm 9.x
- **開発環境**: WSL2 (Windows Subsystem for Linux)

---

## クイックスタート

### 前提条件

- Node.js 20.x 以上
- npm 9.x 以上
- Docker & Docker Compose
- PostgreSQL 15(Docker経由またはローカル)
- Redis 7(Docker経由またはローカル)

### インストール

1. **リポジトリのクローン**:
   ```bash
   git clone https://github.com/nahisaho/RosterHub.git
   cd RosterHub
   ```

2. **依存関係のインストール**:
   ```bash
   npm install
   ```

3. **環境変数の設定**:
   ```bash
   cd apps/api
   cp .env.example .env
   # .envファイルを編集して設定を行います
   ```

4. **インフラストラクチャサービスの起動**:
   ```bash
   # PostgreSQLとRedisを起動
   docker-compose up -d postgres redis
   ```

5. **データベースマイグレーションの実行**:
   ```bash
   cd apps/api
   npm run prisma:migrate
   ```

6. **APIサーバーの起動**:
   ```bash
   npm run dev
   ```

APIは `http://localhost:3000` で利用できます。

APIドキュメントは `http://localhost:3000/api` でアクセスできます。

### テスト

```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e

# テストカバレッジ
npm run test:cov
```

---

## プロジェクト構成

### アプリケーション

#### **APIサーバー** (`apps/api/`)

メインアプリケーション - NestJSベースのOneRoster APIサーバー。

**主な機能**:
- OneRoster v1.2 REST APIエンドポイント
- ストリーミング処理によるCSVインポート/エクスポート
- IPホワイトリスト付きAPIキー認証
- レート制限(トークンバケット&スライディングウィンドウアルゴリズム)
- 包括的な監査ログ
- BullMQによるバックグラウンドジョブ処理

**ドキュメント**: [apps/api/README.ja.md](apps/api/README.ja.md)

---

## OneRosterエンティティ

RosterHubは、OneRoster Japan Profile 1.2.2のすべてのエンティティをサポートしています:

| エンティティ | 説明 | Japan Profile拡張 |
|-------------|------|-------------------|
| **Users** | 児童生徒、教職員、スタッフ | `metadata.jp.kanaGivenName`、`metadata.jp.kanaFamilyName` |
| **Orgs** | 学校、教育委員会、部門 | `metadata.jp.kanaName`、`metadata.jp.orgCode` |
| **Classes** | 授業インスタンス(コース+時間割) | `metadata.jp.classCode` |
| **Courses** | コースカタログ | `metadata.jp.courseCode` |
| **Enrollments** | 児童生徒-クラス関連 | `metadata.jp.enrollmentType` |
| **AcademicSessions** | 学期、セメスター、年度 | `metadata.jp.sessionType` |
| **Demographics** | 児童生徒の人口統計データ | `metadata.jp.*` 拡張 |

---

## API概要

### 認証

すべてのAPIリクエストには、`X-API-Key`ヘッダーにAPIキーが必要です:

```bash
curl -H "X-API-Key: your-api-key" \
  https://api.rosterhub.example.com/ims/oneroster/v1p2/users
```

### エンドポイント

#### 一括API(全データアクセス)
- `GET /ims/oneroster/v1p2/users` - すべてのユーザーを取得
- `GET /ims/oneroster/v1p2/users/:sourcedId` - 単一ユーザーを取得
- `GET /ims/oneroster/v1p2/orgs` - すべての組織を取得
- `GET /ims/oneroster/v1p2/classes` - すべてのクラスを取得
- `GET /ims/oneroster/v1p2/enrollments` - すべての在籍情報を取得

#### 差分API(増分同期)
- `GET /ims/oneroster/v1p2/users?filter=dateLastModified>='2025-01-01T00:00:00Z'`
- 特定のタイムスタンプ以降に変更されたレコードのみを取得

#### CSVインポート/エクスポート
- `POST /ims/oneroster/v1p2/csv/import` - CSVファイルのアップロード
- `GET /ims/oneroster/v1p2/csv/export/:entityType` - CSVファイルのダウンロード

**完全なAPIドキュメント**: [apps/api/README.ja.md#APIリファレンス](apps/api/README.ja.md#APIリファレンス)

---

## 開発ワークフロー

### Musuhi SDD エージェントの使用

このプロジェクトでは、仕様駆動開発のために**Musuhi**と20種類の専門AIエージェントを使用しています:

```bash
# プロジェクトメモリーの生成/更新
@steering

# 新機能の要件作成
@requirements-analyst [機能]の要件を作成

# アーキテクチャ設計
@system-architect requirements.mdに基づいてアーキテクチャを設計

# 機能実装
@software-developer design.mdに従って[コンポーネント]を実装

# テスト生成
@test-engineer requirements.mdからテストを生成

# コードレビュー
@code-reviewer 最近の変更をレビュー

# 複雑なタスクの完全オーケストレーション
@orchestrator [完全なタスクを記述]
```

**利用可能なエージェント**: 完全なリストは[CLAUDE.md](CLAUDE.md)を参照してください。

### 仕様駆動開発(SDD)

RosterHubは8段階のSDDワークフローに従っています:

```
調査 → 要件 → 設計 → タスク → 実装 → テスト → デプロイ → 監視
```

**ドキュメントテンプレート**: `steering/templates/`
- `research.md` - 技術調査とオプション分析
- `requirements.md` - EARS形式の要件
- `design.md` - 技術設計ドキュメント
- `tasks.md` - 実装計画

**ワークフローガイド**: `steering/rules/workflow.md`

---

## ドキュメント

### プロジェクトドキュメント

- [プロジェクト構成](steering/structure.ja.md) - アーキテクチャパターンと規約
- [技術スタック](steering/tech.ja.md) - 詳細な技術スタックドキュメント
- [プロダクトコンテキスト](steering/product.ja.md) - ビジネスコンテキストとプロダクトビジョン
- [APIドキュメント](apps/api/README.ja.md) - 完全なAPIリファレンス

### 開発者ガイド

- [はじめに](docs/guides/getting-started.md) - セットアップと開発ガイド
- [CSVアップロード実装ガイド](docs/guides/csv-upload-implementation.ja.md) - CSVインポート完全実装ガイド
- [API連携ガイド](docs/guides/api-integration.md) - RosterHub APIとの連携方法

### 要件と設計

- [調査ドキュメント](docs/research/) - OneRoster仕様分析
- [要件](docs/requirements/) - EARS形式の要件仕様
- [設計ドキュメント](docs/design/) - アーキテクチャと設計決定

---

## デプロイ

### Dockerデプロイ

RosterHubには、簡単にデプロイできるDocker Compose設定が含まれています:

```bash
# すべてのサービスをビルド
docker-compose build

# すべてのサービスを起動
docker-compose up -d

# ログを表示
docker-compose logs -f api

# すべてのサービスを停止
docker-compose down
```

**サービス**:
- `api` - NestJS APIサーバー(ポート3000)
- `postgres` - PostgreSQL 15(ポート5432)
- `redis` - Redis 7(ポート6379)

### 環境変数

API の主な環境変数:

```env
NODE_ENV=production
API_PORT=3000
DATABASE_URL=postgresql://user:password@postgres:5432/rosterhub
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-jwt-secret
API_KEY_ENABLED=true
RATE_LIMIT_ENABLED=true
```

完全な設定については、[apps/api/.env.example](apps/api/.env.example)を参照してください。

### クラウドデプロイ

RosterHubは主要なクラウドプラットフォームへのデプロイをサポートしています:

- **[Azureデプロイガイド](docs/cloud/azure-optimization-guide.md)** - Azure(App Service、Container Apps、AKS)への完全デプロイガイド
- **[AWSデプロイガイド](docs/cloud/aws-optimization-guide.md)** - AWS(ECS、EKS、Elastic Beanstalk)への完全デプロイガイド
- **[クラウド移行計画](docs/cloud/cloud-migration-plan.md)** - 移行戦略と計画ガイド

### デプロイマニュアル

- **[デプロイマニュアル](docs/deployment/deployment-manual.md)** - 本番環境向け包括的デプロイガイド
- **[Dockerデプロイガイド](docs/deployment/docker-deployment-guide.md)** - Docker・Docker Compose詳細デプロイガイド
- **[運用マニュアル](docs/deployment/operation-manual.md)** - 日常運用・メンテナンスガイド

---

## テスト

### テストカバレッジ

- **ユニットテスト**: 26以上のテスト(ガード、サービス、リポジトリ)
- **E2Eテスト**: 33/33テスト(100%成功 - フェーズ1完了 ✅)
  - ユーザーAPI: 15テスト
  - 組織API: 6テスト
  - CSVインポート: 11テスト
  - ヘルスチェック: 1テスト

### テストの実行

```bash
# すべてのテスト
npm run test

# E2Eテストのみ
npm run test:e2e

# ウォッチモード(開発中)
npm run test:watch

# カバレッジレポート
npm run test:cov
```

---

## セキュリティ

### 認証と認可

- **APIキー認証**: 暗号学的に安全な256ビットキー
- **キー保存**: 12ラウンドのソルトでBcryptハッシュ化
- **IPホワイトリスト**: IPv4、IPv6、CIDR範囲対応
- **レート制限**: スライディングウィンドウアルゴリズム(デフォルト1000リクエスト/時間)
- **Redisキャッシング**: APIキー検証の5分TTL

### 監査ログ

- すべてのAPIリクエストをデータベース(AuditLogテーブル)に記録
- 機密データサニタイゼーション付きのリクエスト/レスポンスキャプチャ
- エンティティコンテキスト追跡(タイプ、アクション、sourcedId)
- GDPR準拠機能(データアクセスログ、保持ポリシー)

### セキュリティのベストプラクティス

- すべてのAPI通信にTLS 1.3を使用(インフラレベル)
- 機密設定は環境変数で管理
- バージョン管理にシークレットを含めない
- 定期的な依存関係の更新

---

## ロードマップ

### フェーズ1: コア連携プラットフォーム - ✅ 完了 (100%)

**ステータス**: 本番環境対応完了 (2025-11-16)

**完了した機能**:
- ✅ OneRoster v1.2 REST API(全7エンティティのCRUD操作)
- ✅ ストリーミング処理によるCSVインポート/エクスポート(100MB以上のファイル対応)
- ✅ タイムスタンプベースのフィルタリングによるデルタ/増分API
- ✅ 高度なフィルタリング(全OneRoster演算子対応: =, !=, >, <, >=, <=, ~)
- ✅ フィールド選択とページネーション
- ✅ セキュリティ(APIキー認証、IPホワイトリスト、レート制限、監査ログ)
- ✅ BullMQによるバックグラウンドジョブ処理
- ✅ Japan Profile 1.2.2拡張機能(かな検証、メタデータ)
- ✅ PostgreSQLとRedisによるDockerインフラ
- ✅ GitHub ActionsによるCI/CDパイプライン
- ✅ 100% E2Eテストカバレッジ(33/33テスト成功)

**ドキュメント**:
- [フェーズ1完了レポート](orchestrator/reports/phase1-completion-report-20251116.md)
- [CSVアップロード実装ガイド](docs/guides/csv-upload-implementation.md)
- [デプロイマニュアル](docs/deployment/deployment-manual.md)

### フェーズ2: 運用強化(7-12ヶ月目)

- WebベースのCSVインポートUI
- 高度な監視ダッシュボード
- データマッピング設定
- Webhook通知
- パフォーマンス最適化

### フェーズ3: エンタープライズ機能(13-18ヶ月目)

- マルチテナントアーキテクチャ
- カスタムSLAサポート
- 高度な分析
- オンプレミスデプロイオプション
- SSO連携

---

## コントリビューション

コントリビューションを歓迎します!コントリビューションガイドライン(近日公開)を参照してください。

### 開発セットアップ

1. リポジトリをフォーク
2. 機能ブランチを作成(`git checkout -b feature/amazing-feature`)
3. 変更をコミット(`git commit -m 'feat: 素晴らしい機能を追加'`)
4. ブランチにプッシュ(`git push origin feature/amazing-feature`)
5. プルリクエストを開く

### コミット規約

[Conventional Commits](https://www.conventionalcommits.org/)に従っています:

```
feat(users): Japan Profile検証を追加
fix(delta-api): dateLastModifiedフィルターを修正
docs(api): OpenAPI仕様を更新
test(users): CRUD操作のE2Eテストを追加
```

---

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

---

## サポート

- **ドキュメント**: [docs/](docs/)
- **APIリファレンス**: [apps/api/README.ja.md](apps/api/README.ja.md)
- **課題**: [GitHub Issues](https://github.com/nahisaho/RosterHub/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/nahisaho/RosterHub/discussions)

---

## 謝辞

- **OneRoster仕様**: [IMS Global Learning Consortium](https://www.imsglobal.org/activity/onerosterlis)
- **Japan Profile**: OneRoster Japan Profile 1.2.2
- **NestJS**: [https://nestjs.com/](https://nestjs.com/)
- **Prisma**: [https://www.prisma.io/](https://www.prisma.io/)

---

**日本の教育のために ❤️ を込めて構築**
