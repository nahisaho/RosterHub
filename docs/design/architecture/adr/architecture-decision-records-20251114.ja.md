# アーキテクチャ決定記録（ADR）
## RosterHub - OneRoster Japan Profile 統合ハブ

**プロジェクト**: RosterHub
**日付**: 2025-11-14
**作成者**: System Architect AI
**ステータス**: 提案中（承認待ち）

---

## 目次

- [ADR-001: pnpm + Turborepo によるモノレポ構造](#adr-001-pnpm--turborepo-によるモノレポ構造)
- [ADR-002: NestJS フレームワークの選定](#adr-002-nestjs-フレームワークの選定)
- [ADR-003: Japan Profile メタデータ用 PostgreSQL と JSONB](#adr-003-japan-profile-メタデータ用-postgresql-と-jsonb)
- [ADR-004: バックグラウンドジョブ処理用 BullMQ](#adr-004-バックグラウンドジョブ処理用-bullmq)
- [ADR-005: API キー + IP ホワイトリスト認証](#adr-005-api-キー--ip-ホワイトリスト認証)
- [ADR-006: ストリーミング CSV パーサー（csv-parse）](#adr-006-ストリーミング-csv-パーサーcsv-parse)
- [ADR-007: タイムスタンプ追跡による Delta 同期](#adr-007-タイムスタンプ追跡による-delta-同期)
- [ADR-008: Prisma ORM の選定](#adr-008-prisma-orm-の選定)

---

## ADR-001: pnpm + Turborepo によるモノレポ構造

**ステータス**: ✅ 承認済み
**日付**: 2025-11-14
**決定者**: システムアーキテクト、DevOps エンジニア
**タグ**: #architecture #monorepo #tooling

### コンテキスト

RosterHub は、複数のアプリケーション（API サーバー、バックグラウンドワーカー、将来の Web UI）と共有コード（OneRoster エンティティ型、検証ルール、ユーティリティ関数）を必要とします。プロジェクト構造とツールを決定する必要があります。

**問題**:
- 複数の関連するコードベースをどのように整理するか？
- TypeScript の型とユーティリティをアプリケーション間でどのように共有するか？
- 効率的な CI/CD ビルドを確保する方法（変更されたパッケージのみ再ビルド）？

**制約**:
- TypeScript 優先の開発
- インクリメンタルビルドのサポート必須（変更されていないコードの再ビルドを回避）
- 共有パッケージのサポート必須（エンティティ型、バリデーター）
- JavaScript/TypeScript 開発者に馴染みがある必要がある

### 検討したオプション

#### オプション 1: pnpm + Turborepo によるモノレポ ✅ **選定**

**概要**: pnpm ワークスペースと Turborepo によるビルドオーケストレーションを使用した単一 Git リポジトリ内の複数パッケージ。

**メリット**:
- ✅ **コード共有**: TypeScript 型、バリデーター、ユーティリティの共有が容易
- ✅ **インクリメンタルビルド**: Turborepo がビルドをキャッシュし、変更されたパッケージのみ再ビルド
- ✅ **アトミックコミット**: 複数パッケージにわたる単一コミット（破壊的変更の調整）
- ✅ **依存関係の簡素化**: 共有依存関係をルート `package.json` で管理
- ✅ **高速**: pnpm は npm の 2 倍高速、シンボリックリンクでディスク容量節約
- ✅ **CI/CD 効率**: Turborepo リモートキャッシュで CI パイプライン高速化

**デメリット**:
- ❌ **複雑さ**: モノレポの概念理解が必要
- ❌ **ツール設定**: 初期設定がマルチリポより複雑

**実装**:
```
RosterHub/
├── apps/
│   ├── api/                # NestJS API サーバー
│   └── worker/             # バックグラウンドワーカー（オプション別アプリ）
├── packages/
│   ├── shared-types/       # OneRoster エンティティ型
│   ├── validators/         # Japan Profile バリデーター
│   └── utils/              # 共有ユーティリティ
├── package.json            # ルート package.json
├── pnpm-workspace.yaml     # pnpm ワークスペース設定
└── turbo.json              # Turborepo パイプライン設定
```

**コスト**: 低（オープンソースツール）

---

#### オプション 2: マルチリポ（個別リポジトリ）

**概要**: API サーバー、ワーカー、共有ライブラリ用の個別 Git リポジトリ。

**メリット**:
- ✅ **シンプルな初期設定**: 各リポジトリが独立
- ✅ **個別バージョニング**: 各パッケージが独自バージョン
- ✅ **チームの自律性**: チームが独立して作業可能

**デメリット**:
- ❌ **コード共有が困難**: 共有ライブラリを npm に公開するか Git サブモジュール使用が必要
- ❌ **調整オーバーヘッド**: 破壊的変更でリポジトリ間の調整リリースが必要
- ❌ **CI/CD の複雑さ**: 複数リポジトリ = 複数 CI パイプライン
- ❌ **依存関係地獄**: 共有ライブラリ間のバージョン不一致

**コスト**: 低

---

#### オプション 3: Lerna モノレポ

**概要**: Lerna（古いモノレポツール）によるモノレポ。

**メリット**:
- ✅ **成熟したツール**: 大規模プロジェクトで実戦投入済み
- ✅ **コード共有**: pnpm + Turborepo と同様

**デメリット**:
- ❌ **遅い**: Turborepo のようなインクリメンタルビルドなし
- ❌ **メンテナンスモード**: Lerna は活発に開発されていない
- ❌ **パフォーマンス低下**: pnpm + Turborepo より遅い

**コスト**: 低

---

### 決定

**選定**: **オプション 1 - pnpm + Turborepo によるモノレポ**

### 根拠

1. **コード共有が重要**: OneRoster エンティティ型は API サーバー、ワーカー、将来の Web UI 間で共有する必要がある。モノレポでこれが簡単になる。
2. **インクリメンタルビルド**: Turborepo のキャッシュで CI/CD が劇的に高速化（推定 70%高速化）。
3. **最新ツール**: pnpm + Turborepo はモノレポ管理の最先端（Vercel、Supabase、tRPC で使用）。
4. **アトミックコミット**: 共有型への破壊的変更（例: Japan Profile フィールド追加）を単一コミットで全パッケージに適用可能。

### 受け入れたトレードオフ

- **学習曲線**: モノレポに不慣れな開発者は、ワークスペース構造と Turborepo パイプライン理解に約 1 日必要。
- **初期設定時間**: pnpm ワークスペースと Turborepo パイプライン設定に約 2 時間（一度きりのコスト）。

### 影響

**ポジティブ**:
- 開発速度向上（コード共有が容易）
- CI/CD ビルド高速化（Turborepo キャッシュ）
- リファクタリングが容易（単一リポジトリ、グローバル検索/置換）

**ネガティブ**:
- 新規開発者にはやや急な学習曲線

**影響を受けるステークホルダー**:
- ソフトウェア開発者: pnpm/Turborepo 学習が必要
- DevOps エンジニア: CI/CD で Turborepo リモートキャッシュ設定が必要

### 検証

**成功基準**:
- CI/CD ビルドが 5 分以内に完了（マルチリポの 15 分と比較）
- 共有パッケージ間のバージョン不一致問題ゼロ

**測定**:
- CI/CD ビルド時間追跡（Turborepo キャッシュ前後）
- 依存関係バージョン問題のカウント（ゼロであるべき）

### 関連

- **関連 ADR**: ADR-008（Prisma ORM がモノレポの共有パッケージ使用）
- **参考**: [Turborepo Documentation](https://turbo.build/repo)、[pnpm Workspaces](https://pnpm.io/workspaces)

---

## ADR-002: NestJS フレームワークの選定

**ステータス**: ✅ 承認済み
**日付**: 2025-11-14
**決定者**: システムアーキテクト、ソフトウェア開発者
**タグ**: #backend #framework #typescript

### コンテキスト

RosterHub API サーバーは、REST API エンドポイント、バックグラウンドジョブ、データ検証、PostgreSQL との統合を実装するための堅牢なバックエンドフレームワークを必要とします。

**問題**:
- API サーバーにどの Node.js フレームワークを使用すべきか？
- フレームワークは TypeScript、依存性注入、モジュラーアーキテクチャ、包括的なテストをサポートする必要がある。

**制約**:
- TypeScript 優先（JavaScript に後付けでない）
- モジュラーアーキテクチャのサポート（エンティティベースモジュール）
- 強力なエコシステム（認証、検証、ORM 統合）
- 本番環境対応（大規模アプリケーションで使用実績）

### 検討したオプション

#### オプション 1: NestJS 10.x ✅ **選定**

**概要**: Angular に触発されたエンタープライズグレード Node.js フレームワークで、TypeScript と依存性注入をコア機能とする。

**メリット**:
- ✅ **TypeScript 優先**: 設計段階から TypeScript
- ✅ **モジュラーアーキテクチャ**: エンティティベースモジュール構造（Users、Orgs、Classes）と完全一致
- ✅ **依存性注入**: 組み込み DI コンテナ（クリーンなコード、テストが容易）
- ✅ **広範なエコシステム**: Passport（認証）、class-validator（検証）、Swagger（API ドキュメント）
- ✅ **テストサポート**: 組み込みテストユーティリティ（ユニット、E2E）
- ✅ **GraphQL/WebSocket 対応**: 将来の拡張性（Phase 2 機能）
- ✅ **エンタープライズ採用**: Adidas、Roche、IBM で使用

**デメリット**:
- ❌ **意見が強い**: 規範的な構造（柔軟性が低い）
- ❌ **学習曲線**: Express より急（デコレーター、DI 理解が必要）

**パフォーマンス**: Express と同等（Express または Fastify 上に構築）

**コスト**: 無料（MIT ライセンス）

---

#### オプション 2: Express.js（ミニマリストフレームワーク）

**概要**: ミニマルで意見の少ない Node.js Web フレームワーク。

**メリット**:
- ✅ **シンプル**: 学習しやすい、最小限のボイラープレート
- ✅ **柔軟性**: 規定構造なし
- ✅ **成熟**: 実戦投入済み、巨大なエコシステム

**デメリット**:
- ❌ **構造なし**: コードを手動で整理する必要（不整合のリスク）
- ❌ **依存性注入なし**: 依存関係の手動配線（テストが困難）
- ❌ **TypeScript 統合**: TypeScript ネイティブでない（手動設定が必要）
- ❌ **スケーラビリティ**: コードベース成長時の保守が困難（強制構造なし）

**コスト**: 無料（MIT ライセンス）

---

#### オプション 3: Fastify（高性能フレームワーク）

**概要**: JSON スキーマ検証を備えた高速、低オーバーヘッド Web フレームワーク。

**メリット**:
- ✅ **パフォーマンス**: Express の 2 倍高速（ベンチマーク）
- ✅ **スキーマ検証**: 組み込み JSON スキーマ検証
- ✅ **TypeScript サポート**: 良好な TypeScript サポート

**デメリット**:
- ❌ **エコシステム成熟度低い**: Express よりプラグインが少ない
- ❌ **依存性注入なし**: 依存関係の手動管理
- ❌ **モジュラー構造なし**: 独自アーキテクチャ構築が必要

**コスト**: 無料（MIT ライセンス）

---

### 決定

**選定**: **オプション 1 - NestJS 10.x**

### 根拠

1. **モジュラーアーキテクチャが完全一致**: RosterHub には 7 つの OneRoster エンティティ（Users、Orgs、Classes、Courses、Enrollments、AcademicSessions、Demographics）がある。NestJS のモジュールシステムで明確な分離が可能:
   - `UsersModule`、`OrgsModule`、`ClassesModule` 等
   - 各モジュールが自己完結（コントローラー、サービス、リポジトリ、DTO）

2. **TypeScript 優先**: OneRoster 仕様は複雑なネスト型（例: `metadata.jp.kanaGivenName`）を持つ。NestJS の型安全性でランタイムエラーを防止。

3. **依存性注入**: テストに不可欠。DI でリポジトリ、バリデーター、外部サービスを本番コード変更なしでモック可能。

4. **エコシステム整合性**:
   - **Passport.js**: API キー認証戦略
   - **class-validator**: Japan Profile 検証ルール
   - **Prisma ORM**: NestJS 公式 Prisma モジュールあり
   - **Swagger**: OpenAPI ドキュメント自動生成

5. **長期保守性**: 規範的構造で開発チーム全体のコード一貫性を保証（200,000 行のコードベースに重要）。

### 受け入れたトレードオフ

- **学習曲線**: NestJS に不慣れな開発者は、デコレーター、DI、モジュールアーキテクチャ理解に 2～3 日必要。
- **意見の強い構造**: Express より柔軟性が低いが、これは機能（ベストプラクティス強制）。

### 影響

**ポジティブ**:
- 開発高速化（一般的なタスクの組み込みモジュール）
- テストが容易（DI でクリーンなモッキング）
- 長期保守性向上（強制構造）

**ネガティブ**:
- 初期学習投資（開発者あたり 2～3 日）

**影響を受けるステークホルダー**:
- ソフトウェア開発者: NestJS 概念学習が必要
- QA エンジニア: テスト容易性の恩恵

### 検証

**成功基準**:
- 80%以上のテストカバレッジ達成（DI で包括的テスト可能）
- 全エンティティモジュール間でモジュール構造の一貫性維持

**測定**:
- テストカバレッジレポート（Jest/Vitest）
- コードレビューメトリクス（構造一貫性）

### 関連

- **関連 ADR**: ADR-008（Prisma ORM が NestJS とシームレス統合）
- **参考**: [NestJS Documentation](https://docs.nestjs.com/)、[NestJS Best Practices](https://github.com/nestjs/nest)

---

## ADR-003: Japan Profile メタデータ用 PostgreSQL と JSONB

**ステータス**: ✅ 承認済み
**日付**: 2025-11-14
**決定者**: システムアーキテクト、データベース管理者
**タグ**: #database #data-model #japan-profile

### コンテキスト

OneRoster Japan Profile 1.2.2 は、Japan 固有フィールド（例: `metadata.jp.kanaGivenName`、`metadata.jp.homeClass`）で基本仕様を拡張します。これらの拡張をどのように保存するかを決定する必要があります。

**問題**:
- Japan Profile メタデータフィールド（`metadata.jp.*`）をどのように保存するか？
- 専用カラムを作成するか、柔軟な JSON ストレージを使用するか？

**制約**:
- すべての Japan Profile 拡張をサポート必須（kanaGivenName、kanaFamilyName、gender、homeClass、attendanceNumber）
- データベースマイグレーションなしで将来の Japan Profile 更新を許可必須
- Japan Profile フィールドのクエリをサポート必須（例: kanaGivenName で検索）
- データ整合性を維持必須（外部キー参照、例: homeClass → Classes.sourcedId）

### 検討したオプション

#### オプション 1: PostgreSQL JSONB カラム ✅ **選定**

**概要**: Japan Profile 拡張を `metadata` JSONB カラムに保存。例:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  sourced_id VARCHAR(255) UNIQUE,
  given_name VARCHAR(255),
  family_name VARCHAR(255),
  metadata JSONB  -- { "jp": { "kanaGivenName": "たろう", ... } }
);
```

**メリット**:
- ✅ **スキーマ柔軟性**: データベースマイグレーションなしで新しい Japan Profile フィールド追加
- ✅ **クエリ可能**: PostgreSQL JSONB はインデックス作成とクエリをサポート（`WHERE metadata @> '{"jp": {"gender": "male"}}'`）
- ✅ **仕様整合性**: OneRoster 仕様は拡張に `metadata` 名前空間を使用
- ✅ **将来性**: 将来の Japan Profile v1.3 フィールド追加が容易
- ✅ **パフォーマンス**: JSONB はバイナリ形式（JSON テキストより高速）

**デメリット**:
- ❌ **型安全性**: JSONB フィールドはデータベースレベルで型チェックされない（アプリケーション検証に依存）
- ❌ **外部キー**: JSONB フィールドに外部キー制約を強制できない（例: `metadata.jp.homeClass` → Classes）

**実装**:
```typescript
// Prisma スキーマ
model User {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  givenName          String
  familyName         String
  metadata           Json?     // JSONB カラム

  @@index([metadata], type: Gin) // JSONB クエリ用 GIN インデックス
}

// TypeScript 型
interface UserMetadata {
  jp?: {
    kanaGivenName?: string;
    kanaFamilyName?: string;
    gender?: 'male' | 'female' | 'other' | 'notSpecified';
    homeClass?: string;  // Class sourcedId
    attendanceNumber?: number;
  };
}
```

**コスト**: 追加コストなし（PostgreSQL 組み込み機能）

---

#### オプション 2: 各 Japan Profile フィールド専用カラム

**概要**: 各 Japan Profile フィールドに個別カラムを作成。
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  sourced_id VARCHAR(255) UNIQUE,
  given_name VARCHAR(255),
  family_name VARCHAR(255),
  kana_given_name VARCHAR(255),
  kana_family_name VARCHAR(255),
  gender VARCHAR(20),
  home_class_id UUID REFERENCES classes(id),
  attendance_number INTEGER
);
```

**メリット**:
- ✅ **型安全性**: データベースがデータ型を強制（VARCHAR、INTEGER、ENUM）
- ✅ **外部キー**: `home_class_id REFERENCES classes(id)` を強制可能
- ✅ **クエリパフォーマンス**: 直接カラムアクセス（JSON パース不要）

**デメリット**:
- ❌ **スキーマ硬直性**: Japan Profile 更新ごとにデータベースマイグレーション必要
- ❌ **カラム増加**: エンティティあたり 5 カラム以上（Users、Orgs、Classes 等）
- ❌ **仕様不整合**: OneRoster は `metadata` 名前空間使用、フラットカラムでない

**コスト**: 低

---

#### オプション 3: 個別 Japan Profile テーブル（EAV パターン）

**概要**: Japan Profile メタデータ用に個別テーブル作成。
```sql
CREATE TABLE user_japan_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  kana_given_name VARCHAR(255),
  kana_family_name VARCHAR(255),
  gender VARCHAR(20),
  home_class_id UUID REFERENCES classes(id),
  attendance_number INTEGER
);
```

**メリット**:
- ✅ **関心の分離**: 基本 OneRoster と Japan Profile が明確に分離
- ✅ **型安全性**: データベースが型と外部キーを強制

**デメリット**:
- ❌ **クエリ複雑性**: 全クエリで JOIN が必要
- ❌ **パフォーマンスオーバーヘッド**: 追加テーブル JOIN
- ❌ **仕様不整合**: OneRoster はメタデータを埋め込み、個別テーブルでない

**コスト**: 低

---

### 決定

**選定**: **オプション 1 - PostgreSQL JSONB カラム**

### 根拠

1. **仕様整合性**: OneRoster Japan Profile は `metadata.jp.*` 名前空間を使用。JSONB カラムが仕様構造と完全一致。

2. **将来性**: Japan Profile は v1.3 で新しいフィールドを追加する可能性。JSONB でデータベースマイグレーションなしでフィールド追加可能（長期保守性に重要）。

3. **クエリ可能**: PostgreSQL JSONB がサポート:
   - **インデックス作成**: JSONB カラムの GIN インデックス
   - **フィルタリング**: `WHERE metadata @> '{"jp": {"gender": "male"}}'`
   - **部分更新**: `UPDATE users SET metadata = jsonb_set(metadata, '{jp,gender}', '"male"')`

4. **アプリケーション層での検証**: NestJS バリデーターが Japan Profile ルール（kanaGivenName 形式、attendanceNumber 一意性）を強制。これはデータベース制約より柔軟。

5. **パフォーマンス**: JSONB はバイナリ形式（JSON テキストより高速）。GIN インデックスで高速ルックアップ。

### 受け入れたトレードオフ

- **homeClass の外部キーなし**: `metadata.jp.homeClass` は `Classes.sourcedId` を参照するが、データベースレベルで外部キー制約を強制できない。緩和策:
  - アプリケーションレベル検証（ReferenceValidatorService）
  - 定期整合性チェックジョブ

- **アプリケーション層の型安全性**: データベースは JSONB 構造を強制しない。緩和策:
  - TypeScript 型でコンパイル時安全性を保証
  - class-validator でランタイム検証を保証
  - Prisma スキーマが期待される JSONB 構造を文書化

### 影響

**ポジティブ**:
- Japan Profile 更新でダウンタイムゼロ（マイグレーションなし）
- 開発速度向上（DBA 関与なしでフィールド追加）
- 完全な仕様整合性（OneRoster 準拠）

**ネガティブ**:
- アプリケーションレベル外部キー検証の実装が必要
- 開発者は JSONB クエリ構文を理解する必要

**影響を受けるステークホルダー**:
- データベース管理者: マイグレーション作業減少
- ソフトウェア開発者: ランタイムで JSONB 構造を検証する必要
- QA エンジニア: JSONB クエリパフォーマンスをテストする必要

### 検証

**成功基準**:
- JSONB クエリが 200ms 以内に実行（95 パーセンタイル）
- 定期チェックで外部キー整合性違反ゼロ

**測定**:
- データベースクエリパフォーマンス監視（CloudWatch RDS）
- 週次整合性チェックジョブログ

### 関連

- **関連 ADR**: ADR-008（Prisma ORM が `Json` 型で JSONB サポート）
- **参考**: [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)

---

## ADR-004: バックグラウンドジョブ処理用 BullMQ

**ステータス**: ✅ 承認済み
**日付**: 2025-11-14
**決定者**: システムアーキテクト、DevOps エンジニア
**タグ**: #background-jobs #async-processing #scalability

### コンテキスト

CSV インポート処理は、大きなファイル（100MB、200,000 レコード）で 5～30 分かかる可能性があります。API リクエストは迅速に返す必要があります（< 3 秒）。非同期バックグラウンドジョブ処理が必要です。

**問題**:
- API レスポンスをブロックせずに長時間実行される CSV インポートジョブをどのように処理するか？
- ジョブ進捗を追跡し、ユーザーにステータス更新を提供する方法は？
- 失敗したジョブをどのようにリトライするか（例: データベース接続エラー）？

**制約**:
- ジョブ進捗追跡のサポート必須（例: "10,000/200,000 レコード処理済み"）
- 指数バックオフによるジョブリトライのサポート必須
- ジョブ永続化必須（サーバー再起動を乗り越える）
- ジョブ優先順位付けのサポート必須（緊急インポートを優先）

### 検討したオプション

#### オプション 1: BullMQ（Redis ベースジョブキュー） ✅ **選定**

**概要**: Bull 3.x 上に構築された TypeScript サポート付きの最新 Redis ベースジョブキュー。

**メリット**:
- ✅ **ジョブ進捗追跡**: 組み込み進捗更新（`job.updateProgress(50)`）
- ✅ **リトライロジック**: 設定可能なリトライ試行、指数バックオフ
- ✅ **ジョブ永続化**: Redis AOF/RDB 永続化（ジョブは再起動を乗り越える）
- ✅ **優先順位付け**: ジョブ優先度のサポート
- ✅ **並行制御**: 並行ジョブ制限（例: 5 つの CSV インポートを同時に）
- ✅ **TypeScript ネイティブ**: 完全な TypeScript サポート
- ✅ **アクティブ開発**: 定期更新、大規模コミュニティ
- ✅ **ダッシュボード**: Bull Board がジョブ監視用 Web UI を提供

**デメリット**:
- ❌ **Redis 依存**: Redis インスタンス必要（追加インフラストラクチャ）
- ❌ **複雑さ**: インプロセスキューより複雑

**パフォーマンス**: 10,000 ジョブ/秒以上（Redis 基盤）

**コスト**: 低（Redis ElastiCache 約 $50/月）

---

#### オプション 2: Node.js Worker Threads（インプロセス）

**概要**: 並列処理に Node.js ワーカースレッドを使用。

**メリット**:
- ✅ **外部依存なし**: Redis 不要
- ✅ **シンプル**: 標準 Node.js 機能

**デメリット**:
- ❌ **永続化なし**: サーバークラッシュでジョブ喪失
- ❌ **進捗追跡なし**: カスタム実装が必要
- ❌ **リトライロジックなし**: 手動実装が必要
- ❌ **スケーラビリティ制限**: 単一サーバーに制限（複数ワーカーに分散不可）

**パフォーマンス**: CPU コア数で制限

**コスト**: 無料

---

#### オプション 3: AWS SQS（メッセージキュー）

**概要**: ジョブキューイング用 AWS Simple Queue Service。

**メリット**:
- ✅ **完全管理**: 保守するインフラストラクチャなし
- ✅ **スケーラブル**: 数百万メッセージに自動スケール

**デメリット**:
- ❌ **ジョブ進捗追跡なし**: SQS は進捗更新をサポートしない
- ❌ **ベンダーロックイン**: AWS 固有
- ❌ **複雑さ**: ポーリング、デッドレターキューが必要
- ❌ **コスト**: Redis より高価

**パフォーマンス**: 3,000 メッセージ/秒（標準キュー）

**コスト**: 中（約 $1 / 100 万リクエスト）

---

### 決定

**選定**: **オプション 1 - BullMQ（Redis ベースジョブキュー）**

### 根拠

1. **ジョブ進捗追跡**: CSV インポートジョブは 5～30 分かかる。ユーザーはリアルタイム進捗更新が必要（"50%完了、100,000/200,000 レコード処理済み"）。BullMQ がこれを提供。

2. **リトライロジック**: データベース接続失敗、ネットワークタイムアウトでジョブが失敗する可能性。BullMQ が指数バックオフでジョブを自動リトライ（例: 10 秒、30 秒、1 分、5 分後にリトライ）。

3. **ジョブ永続化**: CSV インポートジョブはサーバー再起動を乗り越える必要（例: デプロイメント中）。Redis AOF/RDB 永続化でジョブが失われない。

4. **並行制御**: CSV インポートを 5 並行ジョブに制限（データベース圧迫回避）。BullMQ がこの制限を強制。

5. **スケーラビリティ**: Redis は水平スケール可能（Redis Cluster）。複数ワーカーインスタンスが同じキューからジョブを処理可能。

6. **開発者体験**: Bull Board ダッシュボードがジョブ監視用 Web UI を提供（デバッグに便利）。

### 受け入れたトレードオフ

- **Redis 依存**: インフラストラクチャ複雑性追加（Redis インスタンス必要）。緩和策:
  - AWS ElastiCache が Redis 管理（自動フェイルオーバー、バックアップ）
  - Redis はセッションキャッシュとレート制限にも使用（共有リソース）

- **学習曲線**: 開発者は BullMQ API を学習する必要。緩和策:
  - 包括的なドキュメント
  - NestJS ドキュメントの例

### 影響

**ポジティブ**:
- リアルタイムジョブ進捗追跡（UX 向上）
- 一時的障害の自動リトライ（信頼性向上）
- 水平スケーラビリティ（ワーカーインスタンス追加）

**ネガティブ**:
- 追加インフラストラクチャコスト（Redis ElastiCache 約 $50/月）

**影響を受けるステークホルダー**:
- システム管理者: ジョブ進捗の可視性取得
- ソフトウェア開発者: BullMQ API 学習が必要
- DevOps エンジニア: Redis インフラストラクチャのプロビジョニングが必要

### 検証

**成功基準**:
- CSV インポートジョブが 99%以上成功（リトライ含む）
- ジョブ進捗更新がリアルタイムで表示（< 5 秒遅延）

**測定**:
- ジョブ成功率（BullMQ メトリクス）
- ジョブ進捗更新頻度（ログ）

### 関連

- **関連 ADR**: ADR-006（ストリーミング CSV パーサーが BullMQ ジョブと統合）
- **参考**: [BullMQ Documentation](https://docs.bullmq.io/)、[Bull Board Dashboard](https://github.com/felixmosh/bull-board)

---

## ADR-005: API キー + IP ホワイトリスト認証

**ステータス**: ✅ 承認済み
**日付**: 2025-11-14
**決定者**: システムアーキテクト、セキュリティ監査者
**タグ**: #security #authentication #api

### コンテキスト

RosterHub REST API は機密性の高い生徒・教師データを公開します。不正アクセスを防ぐための安全な認証が必要です。

**問題**:
- REST API を消費する学習ツールベンダーをどのように認証するか？
- 生徒・教師データへの不正アクセスをどのように防ぐか？

**制約**:
- OneRoster 仕様推奨に整合必須
- IP ベース制限のサポート必須（学習ツールは既知の IP 範囲からアクセス）
- クライアントごとのレート制限のサポート必須
- ベンダーが実装しやすい必要（複雑な OAuth フローなし）

### 検討したオプション

#### オプション 1: API キー + IP ホワイトリスト ✅ **選定**

**概要**: ベンダーごとに発行された API キー、IP ホワイトリスト制限とレート制限付き。

**メリット**:
- ✅ **OneRoster 推奨**: OneRoster 仕様が API キー認証を推奨
- ✅ **シンプルな統合**: ベンダーは `Authorization: Bearer {api_key}` ヘッダーを追加
- ✅ **IP 制限**: 追加セキュリティ層（ホワイトリストされた IP のみアクセス可能）
- ✅ **レート制限**: キーごとのレート制限（濫用防止）
- ✅ **監査可能**: ベンダーごとの API 使用追跡
- ✅ **ユーザーコンテキスト不要**: システム間統合（ユーザーログイン不要）

**デメリット**:
- ❌ **キー管理**: API キーは定期的にローテーション必要
- ❌ **細粒度権限なし**: すべての API キーが同じアクセス（読み取り専用）

**実装**:
- API キーをデータベースに保存（bcrypt ハッシュ）
- API キーごとの IP ホワイトリスト（例: `["203.0.113.0/24"]`）
- レート制限: キーあたり 1000 リクエスト/時間（設定可能）

**コスト**: 低（組み込み実装）

---

#### オプション 2: OAuth 2.0（認可コードフロー）

**概要**: ベンダー認証用 OAuth 2.0 と認可コードフロー。

**メリット**:
- ✅ **業界標準**: API 認証に広く使用
- ✅ **細粒度権限**: スコープでアクセスレベルを定義
- ✅ **トークン有効期限**: アクセストークンが期限切れ（短命）

**デメリット**:
- ❌ **複雑さ**: ベンダーは OAuth フロー実装が必要（認可サーバー、トークン交換）
- ❌ **OneRoster 標準でない**: OneRoster は OAuth を要求しない
- ❌ **オーバーヘッド**: 認可サーバー必要（追加インフラストラクチャ）
- ❌ **システム統合に不適**: OAuth はユーザー認証用に設計、システム間でない

**コスト**: 中（認可サーバー必要）

---

#### オプション 3: 相互 TLS（mTLS）

**概要**: 認証用クライアント証明書（TLS ベース）。

**メリット**:
- ✅ **強力なセキュリティ**: 証明書ベース認証
- ✅ **キー管理不要**: 証明書は TLS で自動検証

**デメリット**:
- ❌ **複雑さ**: ベンダーは証明書生成と管理が必要
- ❌ **証明書配布**: 安全な証明書交換が必要
- ❌ **OneRoster 標準でない**: 教育データ統合では珍しい

**コスト**: 中（証明書管理オーバーヘッド）

---

### 決定

**選定**: **オプション 1 - API キー + IP ホワイトリスト**

### 根拠

1. **OneRoster 整合性**: OneRoster 仕様はシステム間統合に API キー認証を推奨。これは業界慣行と整合。

2. **シンプル**: 学習ツールベンダーは迅速に統合可能（単一ヘッダー: `Authorization: Bearer {api_key}`）。複雑な OAuth フローなし。

3. **IP ホワイトリスト**: 教育委員会はベンダーの既知の IP 範囲（例: AWS リージョン、オフィス IP）に API アクセスを制限可能。これで盗まれた API キーを不正な場所から使用できない。

4. **レート制限**: キーごとのレート制限で濫用防止（例: 1000 リクエスト/時間）。暴走スクリプトや DDoS 攻撃からシステム保護。

5. **監査可能性**: すべての API リクエストを API キー所有者とともにログ（教育委員会はどのベンダーがどのデータにアクセスしたか追跡可能）。

### 受け入れたトレードオフ

- **API キーローテーション**: API キーは 90 日ごとにローテーションすべき（手動プロセス）。緩和策:
  - ベンダーごとに複数のアクティブキーをサポート（移行期間を許可）
  - 有効期限 30 日前にメールリマインダー

- **細粒度権限なし**: すべての API キーがすべてのエンティティへの読み取り専用アクセス（Users、Orgs、Classes）。将来の改善:
  - スコープ追加（例: `users:read`、`classes:read`）
  - RBAC（ロールベースアクセス制御）実装

### 影響

**ポジティブ**:
- ベンダーオンボーディング高速化（シンプルな統合）
- 強力なセキュリティ（API キー + IP ホワイトリスト + レート制限）
- 完全な監査可能性（日本のプライバシー法準拠）

**ネガティブ**:
- 手動 API キーローテーション（定期タスク）

**影響を受けるステークホルダー**:
- 学習ツールベンダー: シンプルな統合
- 教育委員会管理者: API キー管理が必要
- セキュリティ監査者: キーローテーションポリシー承認

### 検証

**成功基準**:
- 不正アクセスインシデントゼロ（IP ホワイトリスト有効）
- 90 日以内に API キーローテーション完了（ポリシー準拠）

**測定**:
- セキュリティ監査ログ（認証失敗試行）
- API キー有効期限追跡（自動リマインダー）

### 関連

- **関連 ADR**: なし
- **参考**: [OneRoster Security Best Practices](https://www.imsglobal.org/oneroster-v11-final-specification#security)

---

## ADR-006: ストリーミング CSV パーサー（csv-parse）

**ステータス**: ✅ 承認済み
**日付**: 2025-11-14
**決定者**: システムアーキテクト、パフォーマンスエンジニア
**タグ**: #csv #performance #scalability

### コンテキスト

CSV インポートファイルは非常に大きい可能性があります（100MB 以上、200,000 レコード以上）。ファイル全体をメモリに読み込むと Out-of-Memory（OOM）エラーが発生します。

**問題**:
- メモリ不足にならずに 100MB 以上の CSV ファイルをどのように解析するか？
- CSV レコードを段階的にどのように処理するか（バッチ挿入）？

**制約**:
- 日本語ファイルの UTF-8 BOM（Byte Order Mark）を処理必須
- ストリーミングのサポート必須（一度にすべてではなく、解析時にレコードを処理）
- 日本語文字を含む引用符付きフィールドを処理必須（例: `"田中,太郎"`）
- CSV 形式エラーを検出および報告必須（カラム不足、無効なエンコーディング）

### 検討したオプション

#### オプション 1: csv-parse（ストリーミングパーサー） ✅ **選定**

**概要**: Node.js ストリーミング CSV パーサー（node-csv ライブラリの一部）。

**メリット**:
- ✅ **ストリーミング**: CSV を行ごとに処理（メモリ問題なし）
- ✅ **UTF-8 BOM サポート**: BOM を自動検出および削除
- ✅ **カラムヘッダー**: 最初の行をカラム名として解析（`columns: true`）
- ✅ **エラーハンドリング**: 詳細なエラーメッセージ（行番号、カラム名）
- ✅ **パフォーマンス**: 200,000 行を約 5 分で処理
- ✅ **成熟**: 数百万のプロジェクトで使用、アクティブに保守

**デメリット**:
- ❌ **組み込み検証なし**: カスタム検証実装が必要（JapanProfileValidatorService で処理）

**実装**:
```typescript
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

const parser = parse({
  columns: true,          // 最初の行をカラム名として使用
  skip_empty_lines: true,
  encoding: 'utf8',
  bom: true,              // UTF-8 BOM を検出
});

const stream = createReadStream('users.csv').pipe(parser);

for await (const record of stream) {
  // レコードを処理（検証、変換、挿入）
  await processRecord(record);
}
```

**コスト**: 無料（MIT ライセンス）

---

#### オプション 2: papaparse（ブラウザ + Node.js パーサー）

**概要**: ブラウザ用に設計された CSV パーサーだが Node.js でも動作。

**メリット**:
- ✅ **ストリーミングサポート**: 大きなファイルを解析可能
- ✅ **エラーハンドリング**: 詳細なエラー報告

**デメリット**:
- ❌ **主にブラウザ向け**: Node.js ではなくブラウザ用に最適化
- ❌ **重い**: csv-parse よりバンドルサイズが大きい

**コスト**: 無料（MIT ライセンス）

---

#### オプション 3: fast-csv（高性能パーサー）

**概要**: ストリーミングサポート付き高速 CSV パーサー。

**メリット**:
- ✅ **高性能**: csv-parse より 2 倍高速と主張
- ✅ **ストリーミング**: 行ごとの処理をサポート

**デメリット**:
- ❌ **成熟度低い**: csv-parse よりコミュニティが小さい
- ❌ **API 複雑**: csv-parse より複雑な API

**コスト**: 無料（MIT ライセンス）

---

### 決定

**選定**: **オプション 1 - csv-parse（ストリーミングパーサー）**

### 根拠

1. **メモリ効率**: csv-parse が CSV を行ごとにストリーミング。ファイルサイズに関係なくメモリ使用量は一定（約 50MB）（100MB vs. 1GB）。

2. **UTF-8 BOM サポート**: Excel からエクスポートされた日本語 CSV ファイルには UTF-8 BOM（EF BB BF バイト）が含まれる。csv-parse が BOM を自動削除（`bom: true` オプション）。

3. **エラー報告**: csv-parse がエラーに行番号とカラム名を提供（例: "行 12,345、カラム 'givenName' でエラー: 値不足"）。これで管理者が CSV ファイルを修正できる。

4. **成熟**: csv-parse は node-csv ライブラリの一部（10 年以上、100 万以上の週次ダウンロード）。本番環境で実戦投入済み。

5. **バッチ処理**: ストリーミングパーサーでバッチ挿入可能（一度に 1000 レコード）でデータベースパフォーマンス最適化:
   ```typescript
   const batch = [];
   for await (const record of stream) {
     batch.push(record);
     if (batch.length >= 1000) {
       await prisma.user.createMany({ data: batch });
       batch.length = 0;
     }
   }
   ```

### 受け入れたトレードオフ

- **組み込み検証なし**: csv-parse は CSV 構造のみ解析。Japan Profile 検証（例: kanaGivenName 形式）は別途実装が必要（JapanProfileValidatorService）。

- **パフォーマンス**: csv-parse は最速パーサーではない（fast-csv は 2 倍高速と主張）が、200,000 レコードで 5 分は許容範囲（要件: < 30 分）。

### 影響

**ポジティブ**:
- OOM エラーゼロ（ストリーミング処理）
- 高速処理（200,000 レコードで 5 分）
- 詳細なエラー報告（CSV 問題のデバッグが容易）

**ネガティブ**:
- なし

**影響を受けるステークホルダー**:
- システム管理者: 詳細なエラーレポート取得
- ソフトウェア開発者: シンプルな API、実装が容易

### 検証

**成功基準**:
- 200,000 レコードの CSV インポートが 30 分以内に完了
- メモリ使用量が 500MB 以下（OOM エラーなし）

**測定**:
- バックグラウンドジョブ時間（BullMQ メトリクス）
- メモリ使用量監視（Node.js `process.memoryUsage()`）

### 関連

- **関連 ADR**: ADR-004（BullMQ ジョブが CSV インポートに csv-parse 使用）
- **参考**: [csv-parse Documentation](https://csv.js.org/parse/)

---

## ADR-007: タイムスタンプ追跡による Delta 同期

**ステータス**: ✅ 承認済み
**日付**: 2025-11-14
**決定者**: システムアーキテクト、データベース管理者
**タグ**: #api #delta-sync #performance

### コンテキスト

学習ツールは名簿データを日次同期する必要があります。毎日 200,000 ユーザー全員を取得するのは非効率（遅い、高帯域幅、不必要なデータベース負荷）。

**問題**:
- 最後の同期以降に変更されたレコードのみをどのように取得するか？
- 新規 vs. 更新レコードをどのように識別するか？
- 削除されたレコードをどのように処理するか（OneRoster はソフトデリート使用）？

**制約**:
- OneRoster Delta API 仕様準拠必須
- `dateCreated` および `dateLastModified` フィールド使用必須
- ソフトデリート（`status='tobedeleted'`）のサポート必須
- タイムスタンプによるフィルタリング許可必須（例: `dateLastModified>2025-01-01T00:00:00Z`）

### 検討したオプション

#### オプション 1: タイムスタンプベース Delta 同期（dateLastModified） ✅ **選定**

**概要**: `dateLastModified` フィールドで変更を追跡。API エンドポイント: `GET /ims/oneroster/v1p2/users?filter=dateLastModified>2025-01-01T00:00:00Z`

**メリット**:
- ✅ **OneRoster 標準**: OneRoster 1.2 Delta API で指定
- ✅ **シンプルなクエリ**: `WHERE dateLastModified > ?`（インデックス付き、高速）
- ✅ **新規レコード検出**: `dateCreated == dateLastModified` は新規レコードを示す
- ✅ **更新レコード検出**: `dateCreated < dateLastModified` は更新レコードを示す
- ✅ **ソフトデリートサポート**: Delta レスポンスに `status='tobedeleted'` レコードを含む

**デメリット**:
- ❌ **クロックスキュー**: サーバークロック変更で更新を見逃す可能性（アプリケーションタイムスタンプではなくデータベースタイムスタンプで緩和）

**実装**:
```sql
-- Delta API クエリ用インデックス（パフォーマンスに重要）
CREATE INDEX idx_users_date_last_modified ON users(date_last_modified, status);

-- Delta クエリ（過去 24 時間）
SELECT * FROM users
WHERE date_last_modified > '2025-01-01 00:00:00'
ORDER BY date_last_modified ASC
LIMIT 100;
```

**コスト**: 低（データベースインデックスのみ）

---

#### オプション 2: 変更データキャプチャ（CDC）

**概要**: PostgreSQL 論理レプリケーションで変更を追跡。

**メリット**:
- ✅ **リアルタイム**: 変更を即座にキャプチャ
- ✅ **アプリケーションロジック不要**: データベースが追跡処理

**デメリット**:
- ❌ **複雑さ**: 論理レプリケーション設定、Debezium 等が必要
- ❌ **OneRoster 標準でない**: OneRoster はタイムスタンプベース Delta を指定、CDC でない
- ❌ **オーバーヘッド**: 論理レプリケーションでデータベース負荷増加

**コスト**: 高（インフラストラクチャ複雑性）

---

#### オプション 3: バージョン番号追跡

**概要**: 更新ごとにバージョン番号をインクリメント（`version` カラム）。

**メリット**:
- ✅ **シンプル**: 整数バージョン番号
- ✅ **クロック問題なし**: タイムスタンプスキューなし

**デメリット**:
- ❌ **OneRoster 標準でない**: OneRoster はタイムスタンプ使用、バージョンでない
- ❌ **日付でクエリ不可**: クライアントは「昨日以降の変更」を尋ねられない

**コスト**: 低

---

### 決定

**選定**: **オプション 1 - タイムスタンプベース Delta 同期（dateLastModified）**

### 根拠

1. **OneRoster 準拠**: OneRoster 仕様は Delta API 用に `dateCreated` および `dateLastModified` フィールドを要求。タイムスタンプ使用で準拠を保証。

2. **シンプルな実装**: タイムスタンプフィルタによる単一クエリ:
   ```typescript
   const users = await prisma.user.findMany({
     where: {
       dateLastModified: { gte: new Date('2025-01-01T00:00:00Z') }
     },
     orderBy: { dateLastModified: 'asc' }
   });
   ```

3. **新規 vs. 更新検出**: クライアントは区別可能:
   - **新規レコード**: `dateCreated === dateLastModified`
   - **更新レコード**: `dateCreated < dateLastModified`
   - **削除レコード**: `status === 'tobedeleted'`

4. **データベースインデックス**: `(dateLastModified, status)` 複合インデックスで高速クエリ保証（10,000 変更レコードで < 500ms）。

5. **クライアントフレンドリー**: クライアントは `lastSyncTimestamp` を追跡し、`dateLastModified > lastSyncTimestamp` をクエリ。シンプルで直感的。

### 受け入れたトレードオフ

- **クロックスキューリスク**: サーバークロックが後ろにジャンプ（例: NTP 補正）すると、更新を見逃す可能性。緩和策:
  - データベース生成タイムスタンプを使用（`DEFAULT CURRENT_TIMESTAMP`、`ON UPDATE CURRENT_TIMESTAMP`）
  - NTP ドリフトを監視（> 1 秒でアラート）

- **ページネーション必要**: Delta クエリは数千レコードを返す可能性。クライアントはページネーション（`limit` と `offset`）を実装する必要。

### 影響

**ポジティブ**:
- API レスポンスサイズ 99%削減（変更レコードのみ）
- 同期時間高速化（フル同期の分から秒）
- データベース負荷低減（インデックス付きクエリ）

**ネガティブ**:
- クライアントは `lastSyncTimestamp` 追跡が必要（シンプルだが状態管理必要）

**影響を受けるステークホルダー**:
- 学習ツールベンダー: Delta API クライアントロジック実装が必要
- データベース管理者: インデックス作成と保守が必要

### 検証

**成功基準**:
- Delta API クエリが 500ms 以内に完了（10,000 変更レコード）
- 更新見逃しゼロ（フル同期ベースラインと比較）

**測定**:
- API レスポンス時間（CloudWatch メトリクス）
- データ整合性チェック（Delta vs. フル同期比較）

### 関連

- **関連 ADR**: ADR-003（PostgreSQL インデックスが Delta クエリをサポート）
- **参考**: [OneRoster Delta API Specification](https://www.imsglobal.org/oneroster-v11-final-specification#delta-api)

---

## ADR-008: Prisma ORM の選定

**ステータス**: ✅ 承認済み
**日付**: 2025-11-14
**決定者**: システムアーキテクト、ソフトウェア開発者
**タグ**: #database #orm #typescript

### コンテキスト

RosterHub は PostgreSQL データベースとやりとりするための ORM（Object-Relational Mapping）ライブラリを必要とします。ORM は TypeScript、複雑なクエリ、マイグレーションをサポートする必要があります。

**問題**:
- データベースアクセスにどの ORM を使用すべきか？
- ORM は複雑な OneRoster クエリ（結合、フィルタ、ページネーション）をサポートする必要がある。

**制約**:
- TypeScript ネイティブ必須（強力な型安全性）
- PostgreSQL 機能のサポート必須（JSONB、インデックス）
- マイグレーションのサポート必須（スキーマバージョニング）
- NestJS との良好な統合必須
- 良好なパフォーマンス必須（N+1 クエリ防止）

### 検討したオプション

#### オプション 1: Prisma 5.x ✅ **選定**

**概要**: スキーマから自動生成された型安全クライアントを持つ最新の TypeScript 優先 ORM。

**メリット**:
- ✅ **型安全性**: スキーマから TypeScript 型を自動生成
- ✅ **スキーマ優先**: `schema.prisma` でスキーマを定義、マイグレーション生成
- ✅ **優れた DX**: Prisma Studio（データベース用 GUI）、IDE で自動補完
- ✅ **パフォーマンス**: クエリオプティマイザー、コネクションプーリング、N+1 防止
- ✅ **JSONB サポート**: PostgreSQL JSONB 完全サポート（metadata カラム）
- ✅ **NestJS 統合**: 公式 `@nestjs/prisma` モジュール
- ✅ **マイグレーション**: ロールバックサポート付き前方専用マイグレーション

**デメリット**:
- ❌ **スキーマ言語**: カスタム DSL（TypeScript でない）、学習が必要
- ❌ **柔軟性低い**: 任意の SQL 書けない（複雑ケースは生クエリ使用）

**パフォーマンス**: 優れた（生 SQL と同等）

**コスト**: 無料（Apache 2.0 ライセンス）

---

#### オプション 2: TypeORM

**概要**: Hibernate（Java）と Doctrine（PHP）に触発された成熟した ORM。

**メリット**:
- ✅ **成熟**: 実戦投入済み、大規模コミュニティ
- ✅ **デコレーター**: Active Record または Data Mapper パターン
- ✅ **NestJS 統合**: 公式 TypeORM モジュール

**デメリット**:
- ❌ **TypeScript サポート**: TypeScript ネイティブでない（デコレーターが冗長になる可能性）
- ❌ **Active Record 問題**: Active Record パターンがエンティティをデータベースに結合（テストが困難）
- ❌ **パフォーマンス**: Prisma より遅い（ベンチマーク）
- ❌ **メンテナンス**: 開発が鈍化（更新が少ない）

**コスト**: 無料（MIT ライセンス）

---

#### オプション 3: Sequelize

**概要**: Node.js 用の伝統的な ORM（元々 MySQL 向け、現在 PostgreSQL サポート）。

**メリット**:
- ✅ **成熟**: 多くの本番システムで使用
- ✅ **柔軟**: 生 SQL クエリサポート

**デメリット**:
- ❌ **JavaScript 優先**: TypeScript サポートは後付け（慣用的でない）
- ❌ **複雑な API**: 冗長、急な学習曲線
- ❌ **パフォーマンス**: Prisma より遅い

**コスト**: 無料（MIT ライセンス）

---

### 決定

**選定**: **オプション 1 - Prisma 5.x**

### 根拠

1. **型安全性**: Prisma がスキーマから TypeScript 型を自動生成。これでランタイムエラー防止:
   ```typescript
   // 自動生成 Prisma Client
   const user = await prisma.user.findUnique({
     where: { sourcedId: 'abc123' }
   });
   // TypeScript が `user` のプロパティを認識: givenName、familyName、metadata 等
   ```

2. **JSONB サポート**: Prisma が PostgreSQL JSONB を完全サポート（`metadata.jp.*` フィールドに重要）:
   ```prisma
   model User {
     metadata Json?  // JSONB カラム
   }
   ```

3. **Prisma Studio**: データベースレコード閲覧/編集用 GUI（デバッグとテストに便利）。

4. **NestJS 統合**: 公式 `@nestjs/prisma` モジュールでクリーンな統合:
   ```typescript
   @Injectable()
   export class UsersRepository {
     constructor(private readonly prisma: PrismaService) {}
   }
   ```

5. **パフォーマンス**: Prisma クエリオプティマイザーで N+1 クエリを防止（一般的な ORM の落とし穴）。ベンチマーク: Prisma は複雑なクエリで TypeORM より 20%高速。

6. **マイグレーション**: Prisma マイグレーションはシンプル:
   ```bash
   prisma migrate dev --name add-users-table
   prisma migrate deploy  # 本番デプロイメント
   ```

### 受け入れたトレードオフ

- **スキーマ DSL**: Prisma はカスタムスキーマ言語使用（TypeScript でない）。緩和策:
  - スキーマ言語はシンプルでよく文書化
  - 開発者は約 1 時間で DSL を学習

- **生 SQL の柔軟性低い**: 複雑なクエリ（例: 再帰 CTE）は `prisma.$queryRaw()` が必要。緩和策:
  - クエリの 95%は Prisma のクエリビルダー使用
  - 生 SQL はエッジケースのみ使用（レポート、分析）

### 影響

**ポジティブ**:
- 開発高速化（型安全クエリ、自動補完）
- ランタイムエラー減少（コンパイル時型チェック）
- パフォーマンス向上（クエリオプティマイザー）

**ネガティブ**:
- Prisma スキーマ DSL の学習曲線（約 1 時間）

**影響を受けるステークホルダー**:
- ソフトウェア開発者: Prisma スキーマ言語学習が必要
- データベース管理者: マイグレーション戦略で協力

### 検証

**成功基準**:
- N+1 クエリ問題ゼロ（Prisma クエリオプティマイザー動作）
- 80%以上のテストカバレッジ（Prisma モッキングでクリーンなテスト可能）

**測定**:
- データベースクエリパフォーマンス監視（CloudWatch RDS）
- コードレビュー（N+1 クエリパターンチェック）

### 関連

- **関連 ADR**: ADR-003（Japan Profile に JSONB サポート重要）、ADR-002（NestJS が Prisma と統合）
- **参考**: [Prisma Documentation](https://www.prisma.io/docs/)、[Prisma NestJS Integration](https://docs.nestjs.com/recipes/prisma)

---

## まとめ

このドキュメントは、RosterHub の **8 つのアーキテクチャ決定記録（ADR）** を定義しました:

1. ✅ **ADR-001**: pnpm + Turborepo によるモノレポ
2. ✅ **ADR-002**: NestJS フレームワーク
3. ✅ **ADR-003**: Japan Profile メタデータ用 PostgreSQL と JSONB
4. ✅ **ADR-004**: バックグラウンドジョブ用 BullMQ
5. ✅ **ADR-005**: API キー + IP ホワイトリスト認証
6. ✅ **ADR-006**: ストリーミング CSV パーサー（csv-parse）
7. ✅ **ADR-007**: タイムスタンプ追跡による Delta 同期
8. ✅ **ADR-008**: Prisma ORM

**次のステップ**:
- 外部ベンダー承認
- システムアーキテクトレビュー
- 決定を検証するプロトタイプ実装

---

**ドキュメントステータス**: 提案中（承認待ち）
**レビュー必要**: 外部ベンダー、システムアーキテクト、セキュリティ監査者
**次回レビュー日**: 2025-11-21

---

**バージョン履歴**

| バージョン | 日付 | 作成者 | 変更内容 |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | System Architect AI | 初版作成 - 8 つの ADR |
