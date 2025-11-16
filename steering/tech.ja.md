# 技術スタック - RosterHub

## 概要
このドキュメントは、RosterHubの技術選択、フレームワーク決定、技術的制約を定義します。すべての開発は、一貫性、保守性、最適なパフォーマンスを確保するために、これらの技術的決定に従う必要があります。

**最終更新**: 2025-11-15 (Steering Agent - Sprint 5 セキュリティ実装完了)

---

## コア技術

### OneRoster固有要件

このセクションでは、OneRoster Japan Profile 1.2.2 準拠のために特別に選択された技術を文書化します:

**CSV処理**:
- **ライブラリ**: csv-parse 5.x
- **選定理由**:
  - ストリーミングパーサーで大容量CSVファイル（200,000+レコード）を効率的に処理
  - UTF-8日本語ファイル用のBOM（Byte Order Mark）処理を内蔵
  - メモリ効率的な処理（ファイル全体をメモリに読み込む必要なし）
  - 自動カラムヘッダー解析
  - 日本語文字を含む引用フィールドの処理
- **設定**:
  - `encoding: 'utf8'`
  - `bom: true` (UTF-8 BOMの検出と削除)
  - `columns: true` (最初の行をカラム名として使用)
  - `skip_empty_lines: true`

**バックグラウンドジョブ処理**:
- **ライブラリ**: BullMQ 4.x (Redisベースジョブキュー)
- **選定理由**:
  - CSV入力ジョブは大容量ファイルで5〜10分かかる場合がある
  - ジョブ進捗追跡（処理済みレコード数）
  - 失敗したレコードバッチの再試行ロジック
  - ジョブの優先順位付け（緊急入力を優先）
  - Redis永続化（サーバー再起動後もジョブが保持される）
- **使用例**:
  - CSV入力処理（非同期、ノンブロッキング）
  - CSV出力生成（大規模データセット）
  - バルクAPIデータエクスポート

**データベースJSON保存**:
- **機能**: PostgreSQL JSONB カラム
- **選定理由**:
  - Japan Profile拡張を`metadata.jp.*`名前空間に保存
  - JSONBで日本語固有フィールドの効率的なクエリが可能（例: `metadata.jp.kanaGivenName`）
  - 将来のJapan Profileアップデートに対してマイグレーション不要なスキーマ柔軟性
  - JSONフィールドにインデックスを付けてパフォーマンス向上
- **使用方法**:
  - User.metadata: `{ jp: { kanaGivenName, kanaFamilyName, kanaMiddleName, homeClass } }`
  - Org.metadata: `{ jp: { ... } }`
  - すべてのOneRosterエンティティがmetadata.jp拡張をサポート

**API認証**:
- **方式**: APIキー + IPホワイトリスト
- **選定理由**:
  - OneRoster仕様ではAPIキーベース認証を推奨
  - IPホワイトリストで追加のセキュリティ層を提供（学校ネットワーク制限）
  - システム間統合ではOAuth 2.0よりシンプル
- **実装**:
  - APIキーはデータベースに保存（bcryptハッシュ化）
  - 組織ごとのAPIキーでスコープ制限
  - APIキーごとのレート制限（デフォルト1000リクエスト/時間）

**監査ログ**:
- **要件**: GDPR/日本のプライバシー法準拠
- **実装**:
  - NestJS Interceptorsで自動ログ記録
  - WinstonまたはPinoで構造化JSONログ
  - PostgreSQL `AuditLog`テーブルにログを保存
- **ログ対象データ**:
  - OneRosterエンティティのすべてのCRUD操作
  - 使用されたAPIキー、IPアドレス、タイムスタンプ
  - UPDATE操作の変更前/変更後の値
  - CSV入出力操作

**Delta Sync実装**:
- **戦略**: `dateLastModified`タイムスタンプベースのフィルタリング
- **データベースインデックス**:
  - すべてのOneRosterエンティティに`@@index([dateLastModified])`
  - パフォーマンス向上のための複合インデックス: `@@index([dateLastModified, status])`
- **APIエンドポイント**: `GET /oneroster/v1/{entity}?filter=dateLastModified>2025-01-01T00:00:00Z`
- **選定理由**: OneRoster Delta APIパターンで増分同期を実現

---

### Sprint 5: セキュリティ技術（完了 ✅）

このセクションは、Sprint 5で実装されたセキュリティ固有の技術を文書化します。

**IPアドレス検証**:
- **ライブラリ**: ipaddr.js 1.9+
- **選定理由**:
  - 堅牢なIPv4およびIPv6アドレス解析
  - CIDR範囲マッチングサポート（例: `192.168.1.0/24`、`2001:db8::/32`）
  - IPv4マップIPv6アドレスの処理（`::ffff:192.168.1.100`）
  - 十分にテストされた本番環境対応ライブラリ
- **用途**: `IpWhitelistGuard`でのIPホワイトリスト検証

**暗号化**:
- **ライブラリ**: Node.js crypto（組み込み）+ bcryptjs 3.0+
- **APIキー生成**: `crypto.randomBytes(32).toString('hex')`（64文字の16進数）
- **パスワードハッシュ化**: 12ラウンドのsaltでbcryptjs
- **選定理由**:
  - cryptoモジュールは暗号学的に安全な乱数生成を提供
  - bcryptjsはbcrypt（ネイティブ）より遅いが、純粋なJS（コンパイル問題なし）
  - 12ラウンドのsaltはセキュリティとパフォーマンスのバランスが良い（約200-300ms）
- **セキュリティ基準**:
  - OWASP準拠のパスワードハッシュ化
  - 安全なAPIキー生成（256ビットエントロピー）

**セキュリティ用Redis**:
- **使用ケース**（Sprint 5）:
  - **APIキーキャッシュ**: 検証済みAPIキーの5分TTL（データベース負荷軽減）
  - **レート制限**: sorted setsを使用したスライディングウィンドウ実装
  - **フェイルオープン戦略**: Redisが利用不可の場合はリクエストを許可（可用性優先）
- **構成**:
  - Host: `REDIS_HOST`（デフォルト: localhost）
  - Port: `REDIS_PORT`（デフォルト: 6379）
  - Key Prefix: `rosterhub:`（すべてのキーの名前空間）
  - Connection Retry: 指数バックオフ（最大2秒）

**NestJSセキュリティガード**（実行順序）:
1. **ApiKeyGuard** (`common/guards/api-key.guard.ts`)
   - X-API-Keyヘッダーを検証
   - Redisキャッシュルックアップ → データベース検証フォールバック
   - requestオブジェクトにAPIキーメタデータをアタッチ

2. **IpWhitelistGuard** (`common/guards/ip-whitelist.guard.ts`)
   - クライアントIPをAPIキーのホワイトリストと照合
   - IPv4、IPv6、CIDR範囲をサポート
   - `ipaddr.js`を使用して解析

3. **RateLimitGuard** / **RateLimitSlidingWindowGuard** (`common/guards/rate-limit*.guard.ts`)
   - トークンバケット（シンプル）またはスライディングウィンドウ（高度）アルゴリズム
   - デフォルト: APIキーあたり1時間に1000リクエスト
   - レート制限ヘッダーを設定（X-RateLimit-Limit、X-RateLimit-Remaining、X-RateLimit-Reset）

**監査ログ**:
- **実装**: NestJSインターセプター（`common/interceptors/audit.interceptor.ts`）
- **保存先**: PostgreSQL（AuditLogテーブル）+ コンソール（構造化JSON）
- **機能**:
  - リクエスト/レスポンスキャプチャ（メソッド、パス、ボディ、ステータス、期間）
  - エンティティコンテキスト抽出（エンティティタイプ、アクション、sourcedId）
  - データサニタイゼーション（パスワード、トークン、APIキーを削除）
  - GDPR準拠（データアクセスログ、保持ポリシー）

**セキュリティテスト**:
- **ユニットテスト**: ガード全体で26テスト（IPホワイトリスト15 + レート制限11）
- **テストカバレッジ**:
  - IPv4/IPv6完全一致とCIDR範囲
  - レート制限の適用とウィンドウリセット
  - ヘッダー抽出（X-Forwarded-For、X-Real-IP）
  - エラーハンドリング（無効なIP、キャッシュ失敗）

---

## コア技術

### プログラミング言語

**主要言語**: TypeScript
- **バージョン**: TypeScript 5.3+
- **選定理由**:
  - 型安全性により実行時エラーを削減し、コード品質を向上
  - IntelliSenseとリファクタリングツールによる優れたIDE サポート
  - フロントエンドとバックエンド間での言語共通化によりコード再利用が可能
  - 大規模なエコシステムとコミュニティサポート
  - 後方互換性を保つ最新のECMAScript機能

**追加言語**:
- **SQL**: データベースクエリとPrismaマイグレーション
- **Bash/Shell**: ビルドスクリプト、デプロイ自動化、CI/CDタスク

---

## フレームワーク & ライブラリ

### バックエンド

**主要フレームワーク**: NestJS 10.x
- **選定理由**:
  - エンタープライズグレードのアーキテクチャをデフォルト提供
  - TypeScriptファーストフレームワーク
  - モジュラー構造はドメイン駆動設計と整合
  - 依存性注入を内蔵
  - 優れたテスト支援
  - GraphQLとWebSocketサポート（必要に応じて後で使用可）
  - 広範なエコシステム（Passport、Swagger等）

**APIスタイル**: REST (RESTful APIs)
- **バージョン**: API v1 (`/api/v1/...`)
- **ドキュメント**: OpenAPI 3.0 (Swagger)
- **選定理由**:
  - シンプルで全開発者に理解されている
  - HTTPキャッシュによる容易なキャッシング
  - GraphQLよりブラウザ互換性が高い
  - RosterHubのデータ取得パターンには十分

**ORM**: Prisma 5.x
- **選定理由**:
  - 型安全なデータベースクライアント
  - 優れたTypeScript統合
  - 直感的なスキーマ定義言語
  - 自動生成マイグレーション
  - 内蔵コネクションプーリング
  - 優れたパフォーマンス
- **使用機能**:
  - マイグレーション
  - クエリ用Prisma Client
  - データベースGUI用Prisma Studio

**認証**: Passport.js + JWT
- **戦略**: JWT (JSON Web Tokens)
- **Passport戦略**:
  - `passport-local` メール/パスワード用
  - `passport-google-oauth20` Google SSO用（将来）
  - `passport-jwt` トークン検証用
- **選定理由**:
  - ステートレス認証（水平スケール可能）
  - 標準JWT形式
  - Passportは一貫した認証APIを提供

**検証**: class-validator + class-transformer
- **選定理由**:
  - デコレーターベース検証はNestJSパターンに適合
  - ValidationPipeによる自動DTO検証
  - TypeScriptサポート
- **使用例**: リクエストDTO検証、データ変換

**タスクキュー**: Bull 4.x (Redisベース)
- **選定理由**:
  - 信頼性の高いジョブ処理
  - Redis上に構築（既にスタックにある）
  - ジョブスケジューリングと再試行
  - 優先度付きキュー
- **使用例**:
  - スケジュール通知（メール、プッシュ）
  - コンプライアンスレポート生成
  - データエクスポートジョブ

---

### データベース

**主要データベース**: PostgreSQL 15+
- **選定理由**:
  - 重要なスケジュールデータのACID準拠
  - 複雑なクエリと結合（スケジュールと従業員）
  - 柔軟なメタデータ用JSON サポート
  - OLTPワークロードの優れたパフォーマンス
  - マルチテナントアーキテクチャの行レベルセキュリティ
  - 成熟した、実戦証明済み、オープンソース
- **ホスティング**:
  - 開発環境: Dockerコンテナ
  - 本番環境: AWS RDS PostgreSQLまたはSupabase

**キャッシュ層**: Redis 7.x
- **選定理由**:
  - 頻繁にアクセスされるデータの高速インメモリキャッシュ
  - セッション保存
  - Bullキューバックエンド
  - リアルタイム通知用Pub/Sub（必要に応じて）
- **使用例**:
  - セッション保存
  - APIレスポンスキャッシング
  - レート制限
  - Bullジョブキュー
- **ホスティング**:
  - 開発環境: Dockerコンテナ
  - 本番環境: AWS ElastiCacheまたはUpstash Redis

**データベーススキーマバージョン管理**: Prismaマイグレーション
- **戦略**: 前進のみのマイグレーション
- **バックアップ**: 30日保持の自動日次バックアップ

---

## 開発ツール

### パッケージ管理
- **パッケージマネージャー**: pnpm 8.x
- **選定理由**:
  - npm/yarnより高速（シンボリックリンクでディスク効率的）
  - 優れたmonorepoサポート
  - 厳密な依存関係解決でファントム依存関係を防止
- **ロックファイル**: `pnpm-lock.yaml`
- **ワークスペース**: `pnpm-workspace.yaml`でMonorepo管理

### Monorepo管理
- **ツール**: Turborepo 1.x
- **選定理由**:
  - インクリメンタルビルド（変更されたパッケージのみ再ビルド）
  - CI/CDリモートキャッシング
  - タスクパイプライン
  - 優れたmonorepoパフォーマンス
- **設定**: `turbo.json`

### ビルドツール

**フロントエンドバンドラー**: Next.js内蔵（将来的にTurbopack）
- **現在**: Webpack 5 (Next.jsデフォルト)
- **将来**: Turbopack（安定版になったら）
- **選定理由**: Next.jsがバンドリングを処理、追加設定不要

**バックエンドバンドラー**: TypeScript Compiler (tsc) + NestJS CLI
- **選定理由**: シンプル、標準、NestJSとの相性良好

**コードトランスパイル**:
- **フロントエンド**: SWC (Next.jsデフォルト、Babelより20倍高速)
- **バックエンド**: TypeScript compiler (tsc)

---

### テスト

**ユニットテスト**: Vitest
- **選定理由**:
  - Vite駆動（非常に高速）
  - Jest互換API（簡単な移行）
  - ネイティブESMサポート
  - Jestより優れたTypeScriptサポート
- **カバレッジ目標**: 最低80%
- **設定**: `vitest.config.ts`

**コンポーネントテスト**: React Testing Library
- **選定理由**:
  - 実装ではなくユーザー動作のテストを推奨
  - アクセシビリティ優先クエリ
  - Vitestとシームレスに動作
- **原則**: ユーザーが操作する方法でコンポーネントをテスト

**E2Eテスト**: Playwright
- **選定理由**:
  - モダン、高速、信頼性の高いE2Eテスト
  - マルチブラウザサポート（Chromium、Firefox、WebKit）
  - Cypressより優れたデバッグ体験
  - 優れたドキュメント
  - 内蔵自動待機（フレーキーなテストなし）
- **使用例**: 重要なユーザーフロー（ログイン、スケジュール作成、シフト交換）

**APIテスト**: Supertest (NestJS E2E)
- **選定理由**: NestJSテストの標準、シンプルなHTTPアサーションライブラリ

**テストカバレッジ目標**: 全体80%
- ユニットテスト: 85%
- 統合テスト: 75%
- E2Eテスト: 重要なユーザーパスのみ

---

### コード品質

**Linter**: ESLint 8.x
- **設定**:
  - `eslint:recommended`
  - `plugin:@typescript-eslint/recommended`
  - `plugin:react/recommended` (フロントエンド)
  - `plugin:react-hooks/recommended` (フロントエンド)
  - `next/core-web-vitals` (Next.js)
- **カスタムルール**: `.eslintrc.js`のプロジェクト固有ルール

**フォーマッター**: Prettier 3.x
- **設定**: `.prettierrc`
- **設定内容**:
  - シングルクォート
  - 2スペースインデント
  - セミコロン
  - 末尾カンマ (es5)
  - 行幅: 100文字
- **統合**: `eslint-config-prettier`でESLint + Prettier統合

**型チェッカー**: TypeScript 5.3+
- **Strictモード**: 有効化 (`strict: true`)
- **追加チェック**:
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `strictFunctionTypes: true`

**Pre-commitフック**: Husky 8.x + lint-staged
- **フック**:
  - Pre-commit: lint-staged実行（ステージされたファイルをlint + format）
  - Pre-push: テスト実行
- **設定**: `.husky/`ディレクトリ
- **lint-staged**: `.lintstagedrc.js`

**Commitリント**: Commitlint
- **規約**: Conventional Commits
- **形式**: `type(scope): subject`
- **タイプ**: feat, fix, docs, style, refactor, test, chore

---

## デプロイ & インフラストラクチャ

### ホスティング

**フロントエンドホスティング**: Vercel
- **選定理由**:
  - Next.js作成者によるビルド（最適なNext.jsホスティング）
  - Gitからの自動デプロイ
  - PRのプレビューデプロイ
  - エッジネットワーク（高速グローバル配信）
  - ゼロ設定デプロイ
  - 寛大な無料プラン
- **環境**: サーバーレス (Vercel Edge Functions)
- **リージョン**: Auto (マルチリージョン)
- **カスタムドメイン**: `app.rosterhub.com`

**バックエンドホスティング**: AWS ECS (Elastic Container Service) または Railway
- **オプション1: AWS ECS Fargate**（エンタープライズスケール用）
  - コンテナ化NestJSアプリ
  - オートスケーリング
  - ロードバランサー (ALB)
  - プライベートサブネット付きVPC
- **オプション2: Railway**（MVP/初期段階用）
  - Gitからのシンプルなデプロイ
  - 内蔵PostgreSQLとRedis
  - 小〜中規模に対してコスト効率的
  - 必要に応じて容易なスケーリング
- **リージョン**: us-east-1 (プライマリ), us-west-2 (フェイルオーバー)

**データベースホスティング**:
- **オプション1: Supabase** (MVP用)
  - マネージドPostgreSQL
  - 内蔵認証（後でカスタム認証を置き換え可能）
  - リアルタイムサブスクリプション
  - 開発用無料プラン
- **オプション2: AWS RDS PostgreSQL** (スケール用)
  - マルチAZデプロイ
  - 自動バックアップ
  - スケーリング用リードレプリカ

**Redisホスティング**:
- **オプション1: Upstash Redis** (MVP用)
  - サーバーレスRedis
  - グローバルレプリケーション
  - 寛大な無料プラン
- **オプション2: AWS ElastiCache** (スケール用)
  - マネージドRedis
  - マルチAZレプリケーション

**CDN**: Vercel Edge Network (フロントエンド), CloudFront (必要に応じてAPIアセット)

---

### CI/CD

**パイプライン**: GitHub Actions
- **ワークフロー**:
  - `ci.yml`: すべてのプッシュでlint、型チェック、テスト
  - `deploy-frontend.yml`: mainブランチでVercelにデプロイ
  - `deploy-backend.yml`: mainブランチでRailway/AWSにデプロイ
  - `preview.yml`: PRのプレビュー環境デプロイ
- **キャッシング**: npm/pnpmキャッシュ、Dockerレイヤーキャッシュ
- **シークレット**: GitHub Secrets経由で管理

**デプロイ戦略**:
- **フロントエンド**: `main`へのマージで自動デプロイ (Vercel)
- **バックエンド**: `main`へのマージで自動デプロイ (Railway/ECS)
- **データベースマイグレーション**: バックエンドデプロイ前に自動実行
- **ロールバック**: Git revert + 再デプロイ（またはVercelロールバックボタン）

**環境**:
- **開発**: ローカル (Docker Compose)
- **ステージング**: Vercelプレビュー + Railwayステージング環境
- **本番**: Vercel本番 + Railway/ECS本番

---

### モニタリング & ログ

**アプリケーションモニタリング**: Sentry
- **選定理由**:
  - 優れたエラー追跡とデバッグ
  - パフォーマンスモニタリング
  - リリース追跡
  - エラーアラート
  - 寛大な無料プラン
- **対象**: フロントエンド + バックエンド

**ログ**:
- **開発**: コンソールログ
- **本番**:
  - Vercelログ (フロントエンド)
  - AWS CloudWatchまたはRailwayログ (バックエンド)
  - NestJS LoggerでJSON構造化ログ

**稼働監視**: Better UptimeまたはUptimeRobot
- **チェック**: 5分ごと
- **アラート**: メール + Slack（ダウンタイム > 5分の場合）

**アナリティクス**: Vercel Analytics + PostHog
- **Vercel Analytics**: Core Web Vitals、ページパフォーマンス
- **PostHog**: ユーザー行動分析、機能フラグ
- **選定理由**: プライバシーフレンドリー、セルフホスト可能、包括的な機能セット

**メトリクス & ダッシュボード**:
- **オプション1**: VercelダッシュボードRailwayダッシュボード（シンプル）
- **オプション2**: Grafana + Prometheus（高度、必要に応じて）

---

## 技術的制約

### パフォーマンス要件

**ページロード時間**:
- First Contentful Paint (FCP): < 1.5秒
- Largest Contentful Paint (LCP): < 2.5秒
- Time to Interactive (TTI): < 3.5秒
- First Input Delay (FID): < 100ms

**APIレスポンスタイム**:
- 95パーセンタイル: < 200ms
- 99パーセンタイル: < 500ms
- 平均: < 100ms

**同時ユーザー数**:
- フェーズ1 (MVP): 100並行ユーザーをサポート
- フェーズ2: 1,000並行ユーザーをサポート
- フェーズ3: 10,000並行ユーザーをサポート

**データベースクエリパフォーマンス**:
- シンプルクエリ: < 50ms
- 複雑クエリ（結合含む）: < 200ms
- 頻繁にクエリされるフィールドにデータベースインデックス使用

---

### ブラウザ/プラットフォームサポート

**デスクトップブラウザ**:
- Chrome 100+ (プライマリ)
- Firefox 100+
- Safari 15+
- Edge 100+

**モバイルブラウザ**:
- iOS Safari 15+ (iPhone/iPad)
- Chrome Mobile 100+ (Android)

**モバイルプラットフォーム**（フェーズ2のネイティブアプリ用）:
- iOS 14+
- Android 10+

**Node.jsバージョン**:
- 開発: Node.js 20.x LTS
- 本番: Node.js 20.x LTS

**画面サイズ**:
- モバイル: 375px - 767px (プライマリ: 従業員)
- タブレット: 768px - 1023px
- デスクトップ: 1024px+ (プライマリ: マネージャー)

---

### セキュリティ要件

**認証**:
- JWTトークン、15分有効期限
- リフレッシュトークン、7日有効期限
- リフレッシュトークン用セキュアHTTP-onlyクッキー
- OAuth 2.0でGoogle/Microsoft SSO（将来）

**認可**:
- ロールベースアクセス制御 (RBAC)
- ロール: SuperAdmin、OrgAdmin、Manager、Employee
- リソースレベル権限（自組織のデータのみ編集可能）

**データ暗号化**:
- すべての通信でTLS 1.3
- データベース保存時暗号化 (AWS RDS encryption)
- シークレット用環境変数（Gitにコミットしない）
- パスワードハッシング: bcrypt、12ソルトラウンド

**シークレット管理**:
- 開発: `.env.local` (gitignore)
- 本番: Vercel環境変数 + AWS Secrets Manager (またはRailway)

**レート制限**:
- API: IPあたり毎分100リクエスト
- 認証: 5回失敗ログイン = 15分ロックアウト
- 実装: Redis + NestJS Throttler

**セキュリティヘッダー**:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)

**OWASP Top 10 保護**:
- SQLインジェクション: Prismaパラメータ化クエリ
- XSS: React自動エスケープ + Content Security Policy
- CSRF: SameSiteクッキー + CSRFトークン
- 機密データ露出: TLS + 保存時暗号化

---

## サードパーティサービス

### 必須サービス (MVP)

**メール**: SendGridまたはResend
- **目的**: トランザクションメール（ウェルカム、スケジュール公開、パスワードリセット）
- **プラン**: 初期は無料プラン（100メール/日）

**プッシュ通知**:
- **Web**: Web Push API (ネイティブブラウザ)
- **モバイル**: Firebase Cloud Messaging (FCM) または OneSignal
- **目的**: スケジュール変更、シフト交換リクエスト、時間休承認

**SMS** (オプション): Twilio
- **目的**: 重要な通知（直前のシフト変更）
- **プラン**: 従量課金制 (フェーズ2)

---

### オプションサービス (将来)

**決済処理**: Stripe
- **目的**: サブスクリプション請求
- **プラン**: 標準プラン（取引あたり2.9% + $0.30）

**ファイルストレージ**: AWS S3またはVercel Blob
- **目的**: プロフィール写真、エクスポートレポート、アップロードドキュメント
- **プラン**: S3 StandardまたはVercel Blobストレージ

**検索**（必要に応じて）: AlgoliaまたはPostgreSQL全文検索
- **目的**: 従業員検索、スケジュール検索
- **初期**: PostgreSQL全文検索（MVPには十分）
- **後期**: 検索が複雑になればAlgolia

**カレンダー統合**: Google Calendar API、Microsoft Graph API
- **目的**: スケジュールを従業員カレンダーに同期
- **フェーズ**: フェーズ2

---

## 技術決定 & ADR

### アーキテクチャ決定記録

**ADR-001: Monorepo with pnpm + Turborepo**
- **決定**: pnpmワークスペースとTurborepoでMonorepo構造を使用
- **理由**: フロントエンド/バックエンド間で型とユーティリティを共有、CI/CDキャッシングが向上
- **検討した代替案**: 別々のリポジトリ（共有コード維持が困難）、Lerna（遅い）
- **日付**: 2025-11-13

**ADR-002: Next.js App Router over Pages Router**
- **決定**: Next.js 14とApp Routerを使用
- **理由**: React Server Componentsがパフォーマンス向上、データ取得がシンプル、キャッシング向上
- **検討した代替案**: Pages Router（古い）、Remix（エコシステムが未熟）
- **日付**: 2025-11-13

**ADR-003: NestJS over Express**
- **決定**: バックエンドフレームワークとしてNestJSを使用
- **理由**: 内蔵構造、TypeScriptファースト、優れたDI、スケールと保守が容易
- **検討した代替案**: Express（ミニマル過ぎ）、Fastify（機能が少ない）、tRPC（フロントエンド/バックエンドの結合が強すぎる）
- **日付**: 2025-11-13

**ADR-004: PostgreSQL over MongoDB**
- **決定**: PostgreSQLを主要データベースとして使用
- **理由**: リレーショナルデータモデルがスケジューリングドメインに適合、ACID準拠が重要、複雑なクエリ
- **検討した代替案**: MongoDB（MVPでトランザクションなし、弱い一貫性）、MySQL（PostgreSQLの方がJSONと配列サポートが優れている）
- **日付**: 2025-11-13

**ADR-005: Zustand over Redux**
- **決定**: クライアント状態管理にZustandを使用
- **理由**: よりシンプルなAPI、ボイラープレートが少ない、バンドルサイズが小さい、RosterHubのニーズには十分
- **検討した代替案**: Redux Toolkit（ボイラープレートが多すぎ）、Context API（パフォーマンス問題）、Jotai（未熟）
- **日付**: 2025-11-13

**ADR-006: TanStack Query for Server State**
- **決定**: サーバー状態にTanStack Query (React Query)を使用
- **理由**: データ取得、キャッシング、同期において最高クラス
- **検討した代替案**: SWR（機能が少ない）、Apollo Client（RESTにはオーバーキル）、ネイティブfetch（低レベル過ぎ）
- **日付**: 2025-11-13

**ADR-007: JWT Authentication**
- **決定**: 認証にJWTトークンを使用
- **理由**: ステートレス、水平スケーリング、標準形式、Passportと連携
- **検討した代替案**: セッションベース（スティッキーセッションが必要）、Auth0（コストと依存性追加）
- **日付**: 2025-11-13

**ADR-008: Tailwind CSS over CSS-in-JS**
- **決定**: スタイリングにTailwind CSSを使用
- **理由**: 開発が高速、一貫したデザインシステム、パフォーマンス向上（ランタイムなし）、バンドル小
- **検討した代替案**: Styled Components（ランタイムオーバーヘッド）、CSS Modules（冗長）、Emotion（遅い）
- **日付**: 2025-11-13

---

## 開発環境セットアップ

### 前提条件

開始前に以下のツールをインストール:

```bash
# Node.js 20.x LTS (nvm推奨)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# pnpm 8.x
npm install -g pnpm@8

# Docker Desktop (PostgreSQL、Redis用)
# https://www.docker.com/products/docker-desktopからダウンロード

# Git
# (macOS/Linuxでは通常プリインストール)
```

### クイックスタート

```bash
# 1. リポジトリクローン
git clone https://github.com/your-org/RosterHub.git
cd RosterHub

# 2. 依存関係インストール
pnpm install

# 3. Dockerサービス起動（PostgreSQL + Redis）
docker-compose up -d

# 4. 環境変数セットアップ
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# 5. データベースマイグレーション実行
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed

# 6. 開発サーバー起動（ルートから）
cd ../..
pnpm dev

# フロントエンド: http://localhost:3000
# バックエンド: http://localhost:4000
# APIドキュメント: http://localhost:4000/api
```

### 推奨VS Code拡張機能

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "ms-playwright.playwright",
    "unifiedjs.vscode-mdx"
  ]
}
```

### 環境変数

**フロントエンド (apps/web/.env.local)**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**バックエンド (apps/api/.env)**:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/rosterhub
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d
```

---

## Sprint 5 依存関係サマリー

**新規本番依存関係**:
```json
{
  "ipaddr.js": "^1.9.1",    // IPアドレス解析とCIDR検証
  "bcryptjs": "^3.0.3",     // パスワード/APIキーハッシュ化
  "ioredis": "^5.8.2"       // レート制限用Redisクライアント
}
```

**既存依存関係（Sprint 5で使用）**:
```json
{
  "@nestjs/cache-manager": "^2.x",  // APIキー用Redisキャッシュ
  "class-validator": "^0.14.2",     // DTO検証
  "class-transformer": "^0.5.1"     // DTO変換
}
```

**開発依存関係（テスト）**:
```json
{
  "@nestjs/testing": "^11.0.1",     // NestJSテストユーティリティ
  "jest": "^30.0.0"                 // ユニットテストフレームワーク
}
```

**新規コード合計（Sprint 5）**:
- 本番ファイル: 14ファイル（約3,257行）
- テストファイル: 2ファイル（約661行）
- ユニットテスト: 26テスト（IPホワイトリスト15 + レート制限11）

---

## 非推奨技術

まだ非推奨技術はありません。

将来の非推奨化はここにマイグレーション計画とともに文書化されます。

---

**注**: このドキュメントはRosterHubの現在の技術スタックを反映しています。以下の場合にこのドキュメントを更新してください:
- 技術バージョンがアップグレードされた場合
- 新しいライブラリ/フレームワークが採用された場合
- ツールが非推奨化または置換された場合
- パフォーマンス/セキュリティ要件が変更された場合
- デプロイインフラストラクチャが変更された場合

技術決定の**理由**を常に文書化し、組織の知識を維持してください。

**最終更新**: 2025-11-15（Sprint 5 セキュリティ実装完了 - APIキー管理、IPホワイトリスト、レート制限、監査ログ）
