# プロジェクト構造 - RosterHub

## 概要
このドキュメントは、RosterHub（OneRoster Japan Profile統合ハブ)のアーキテクチャパターン、ディレクトリ構成、コード構造規約を定義します。構造上の決定事項の唯一の情報源として機能し、すべての開発作業を導きます。

**最終更新**: 2025-11-15 (Steering Agent - Sprint 5 セキュリティ実装完了)

---

## 組織の哲学

RosterHubは、OneRoster仕様と日本の教育データ統合要件に沿った**ドメイン駆動、機能優先アーキテクチャ**に従います:

- **ドメイン駆動設計**: OneRosterエンティティ（users、orgs、classes、enrollments等）を中心とした明確な境界コンテキスト
- **機能優先の組織**: ビジネス機能（CSV入出力、REST API、データ検証、監査ログ）によってコードを整理
- **垂直スライスアーキテクチャ**: 各機能は、コントローラー、サービス、リポジトリ、DTOを含む凝集性の高いモジュール
- **仕様駆動**: OneRoster Japan Profile 1.2.2 エンティティモデルを反映した構造
- **API優先設計**: RESTful APIを主要インターフェースとし、CSV入出力をバッチ代替手段として提供

このアーキテクチャにより以下が実現されます:
- 明確なエンティティ境界によるOneRoster仕様準拠
- CSV vs API アクセスパスの独立した開発
- 容易なナビゲーション（ユーザー関連コードは`oneroster/entities/users/`に集約、分散しない）
- 大規模教育データ（200,000+ユーザー）に対応可能なスケーラビリティ
- 新しいOneRosterエンティティやJapan Profileアップデートへの将来的な拡張性

---

## ディレクトリ構造

### ルートレベル
**目的**: プロジェクト構成、ドキュメント、アプリケーション構造

```
RosterHub/
├── apps/                    # アプリケーションコード
│   └── api/                 # NestJS APIサーバー（メインアプリケーション）
├── docs/                    # ドキュメント
│   ├── research/            # 調査資料（OneRoster分析）
│   ├── requirements/        # 要件定義書（EARS形式）
│   ├── design/              # アーキテクチャ・設計書
│   ├── api/                 # APIドキュメント（OpenAPI/Swagger）
│   └── guides/              # 開発者ガイド
├── steering/                # プロジェクトメモリ（AIエージェント用コンテキスト）
│   ├── structure.md         # このドキュメント（英語版）
│   ├── structure.ja.md      # このドキュメント（日本語版）
│   ├── tech.md              # 技術スタック
│   ├── tech.ja.md           # 技術スタック（日本語版）
│   ├── product.md           # プロダクトコンテキスト
│   └── product.ja.md        # プロダクトコンテキスト（日本語版）
├── .claude/                 # AIエージェント定義（Musuhi SDD agents）
├── scripts/                 # ビルド・ユーティリティスクリプト
├── .github/                 # GitHub Actions ワークフロー（CI/CD）
├── docker/                  # Docker設定ファイル（PostgreSQL、Redis）
├── package.json             # ルートワークスペース構成
├── README.md                # プロジェクト概要
└── CLAUDE.md                # Musubiプロジェクト指示書

```

---

## アプリケーション構造 (apps/api/)

### APIサーバー (NestJS)
**目的**: OneRoster Japan Profile REST APIおよびCSV処理バックエンド

```
apps/api/
├── src/
│   ├── oneroster/           # **OneRosterドメインモジュール**（コア機能）
│   │   ├── entities/        # OneRosterエンティティモジュール
│   │   │   ├── users/       # Userエンティティ（students、teachers、staff）
│   │   │   │   ├── users.controller.ts      # REST APIエンドポイント
│   │   │   │   ├── users.service.ts         # ビジネスロジック
│   │   │   │   ├── users.repository.ts      # データアクセス層
│   │   │   │   ├── dto/                     # データ転送オブジェクト
│   │   │   │   │   ├── create-user.dto.ts
│   │   │   │   │   ├── update-user.dto.ts
│   │   │   │   │   └── user-response.dto.ts
│   │   │   │   ├── entities/                # Prismaエンティティモデル
│   │   │   │   │   └── user.entity.ts
│   │   │   │   └── users.module.ts          # NestJSモジュール
│   │   │   │
│   │   │   ├── orgs/        # Organizationエンティティ（schools、districts）
│   │   │   │   ├── orgs.controller.ts
│   │   │   │   ├── orgs.service.ts
│   │   │   │   ├── orgs.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── orgs.module.ts
│   │   │   │
│   │   │   ├── classes/     # Classエンティティ（courses + periods）
│   │   │   │   ├── classes.controller.ts
│   │   │   │   ├── classes.service.ts
│   │   │   │   ├── classes.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── classes.module.ts
│   │   │   │
│   │   │   ├── courses/     # Courseエンティティ（course catalog）
│   │   │   │   ├── courses.controller.ts
│   │   │   │   ├── courses.service.ts
│   │   │   │   ├── courses.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── courses.module.ts
│   │   │   │
│   │   │   ├── enrollments/ # Enrollmentエンティティ（student-class関係）
│   │   │   │   ├── enrollments.controller.ts
│   │   │   │   ├── enrollments.service.ts
│   │   │   │   ├── enrollments.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── enrollments.module.ts
│   │   │   │
│   │   │   ├── academic-sessions/  # Academic sessionエンティティ（terms、semesters）
│   │   │   │   ├── academic-sessions.controller.ts
│   │   │   │   ├── academic-sessions.service.ts
│   │   │   │   ├── academic-sessions.repository.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── academic-sessions.module.ts
│   │   │   │
│   │   │   └── demographics/ # Demographicsエンティティ（Japan Profile拡張）
│   │   │       ├── demographics.controller.ts
│   │   │       ├── demographics.service.ts
│   │   │       ├── demographics.repository.ts
│   │   │       ├── dto/
│   │   │       ├── entities/
│   │   │       └── demographics.module.ts
│   │   │
│   │   ├── csv/             # **CSV入出力モジュール**
│   │   │   ├── import/      # CSV入力機能
│   │   │   │   ├── csv-import.controller.ts   # アップロードエンドポイント
│   │   │   │   ├── csv-import.service.ts      # オーケストレーションロジック
│   │   │   │   ├── csv-parser.service.ts      # ストリーミングパーサー（csv-parse）
│   │   │   │   ├── csv-validator.service.ts   # Japan Profile検証
│   │   │   │   ├── bulk-insert.service.ts     # データベース一括挿入
│   │   │   │   ├── import-job.processor.ts    # BullMQバックグラウンドジョブ
│   │   │   │   ├── dto/
│   │   │   │   │   ├── csv-import-request.dto.ts
│   │   │   │   │   └── csv-import-status.dto.ts
│   │   │   │   └── csv-import.module.ts
│   │   │   │
│   │   │   └── export/      # CSV出力機能
│   │   │       ├── csv-export.controller.ts   # ダウンロードエンドポイント
│   │   │       ├── csv-export.service.ts      # CSV生成ロジック
│   │   │       ├── csv-formatter.service.ts   # Japan Profileフォーマット
│   │   │       ├── dto/
│   │   │       │   ├── csv-export-request.dto.ts
│   │   │       │   └── csv-export-response.dto.ts
│   │   │       └── csv-export.module.ts
│   │   │
│   │   ├── api/             # **REST API機能**（Bulk + Deltaエンドポイント）
│   │   │   ├── v1/          # APIバージョン1
│   │   │   │   ├── bulk/    # Bulk API（全データアクセス）
│   │   │   │   │   ├── bulk-api.controller.ts
│   │   │   │   │   ├── bulk-api.service.ts
│   │   │   │   │   └── bulk-api.module.ts
│   │   │   │   │
│   │   │   │   └── delta/   # Delta/Incremental API
│   │   │   │       ├── delta-api.controller.ts
│   │   │   │       ├── delta-api.service.ts
│   │   │   │       ├── change-tracker.service.ts  # dateLastModified追跡
│   │   │   │       └── delta-api.module.ts
│   │   │   │
│   │   │   └── common/      # 共有APIユーティリティ
│   │   │       ├── pagination.dto.ts
│   │   │       ├── filter.dto.ts
│   │   │       ├── sort.dto.ts
│   │   │       └── response.interceptor.ts
│   │   │
│   │   ├── auth/            # **API認証モジュール** (Sprint 5 ✅)
│   │   │   ├── api-key/     # APIキー管理
│   │   │   │   ├── api-key.service.ts       # キー生成・検証・失効
│   │   │   │   ├── api-key.controller.ts    # CRUD APIエンドポイント
│   │   │   │   └── api-key.module.ts        # NestJSモジュール
│   │   │   ├── repositories/
│   │   │   │   └── api-key.repository.ts    # APIキーのデータベースアクセス
│   │   │   └── dto/
│   │   │       ├── create-api-key.dto.ts    # APIキー作成リクエスト
│   │   │       └── api-key-response.dto.ts  # APIキーレスポンス
│   │   │
│   │   ├── validation/      # **データ検証モジュール**
│   │   │   ├── japan-profile-validator.service.ts   # Japan Profileルール
│   │   │   ├── reference-validator.service.ts       # 外部キーチェック
│   │   │   ├── duplicate-detector.service.ts        # 重複検出
│   │   │   ├── rules/                               # 検証ルール定義
│   │   │   │   ├── user-validation.rules.ts
│   │   │   │   ├── org-validation.rules.ts
│   │   │   │   ├── class-validation.rules.ts
│   │   │   │   └── enrollment-validation.rules.ts
│   │   │   └── validation.module.ts
│   │   │
│   │   ├── audit/           # **監査ログモジュール** (Sprint 5 ✅)
│   │   │   ├── audit.service.ts         # 監査ログクエリ・分析
│   │   │   ├── audit.controller.ts      # 監査ログAPI（クエリ、GDPRレポート）
│   │   │   ├── repositories/
│   │   │   │   └── audit-log.repository.ts  # 監査ログのデータベースアクセス
│   │   │   └── audit.module.ts
│   │   │
│   │   └── oneroster.module.ts  # ルートOneRosterモジュール
│   │
│   ├── common/              # アプリケーション横断の共有リソース
│   │   ├── decorators/      # カスタムデコレーター
│   │   │   ├── api-key.decorator.ts
│   │   │   └── audit-log.decorator.ts
│   │   ├── filters/         # 例外フィルター
│   │   │   ├── http-exception.filter.ts
│   │   │   └── validation-exception.filter.ts
│   │   ├── guards/          # **セキュリティガード** (Sprint 5 ✅)
│   │   │   ├── api-key.guard.ts                  # APIキー検証（Redisキャッシュ）
│   │   │   ├── ip-whitelist.guard.ts             # IPホワイトリストチェック（IPv4/IPv6/CIDR）
│   │   │   ├── ip-whitelist.guard.spec.ts        # ユニットテスト（15テスト）
│   │   │   ├── rate-limit.guard.ts               # トークンバケット式レート制限
│   │   │   ├── rate-limit-sliding-window.guard.ts # 高度なスライディングウィンドウ式
│   │   │   └── rate-limit.guard.spec.ts          # ユニットテスト（11テスト）
│   │   ├── interceptors/    # **グローバルインターセプター** (Sprint 5 ✅)
│   │   │   ├── audit.interceptor.ts      # 強化された監査ログ（DB + コンソール）
│   │   │   ├── logging.interceptor.ts    # リクエスト/レスポンスログ
│   │   │   └── transform.interceptor.ts  # レスポンス変換
│   │   ├── pipes/           # 検証パイプ
│   │   │   └── validation.pipe.ts
│   │   └── utils/           # ユーティリティ関数
│   │       ├── date-utils.ts
│   │       ├── csv-utils.ts
│   │       └── sourcedid-generator.ts
│   │
│   ├── config/              # 構成管理
│   │   ├── database.config.ts      # PostgreSQL設定
│   │   ├── redis.config.ts         # Redis設定（BullMQ）
│   │   ├── auth.config.ts          # API認証設定
│   │   ├── csv.config.ts           # CSV処理設定
│   │   └── app.config.ts           # 一般アプリ設定
│   │
│   ├── prisma/              # Prisma ORM（データベース層）
│   │   ├── schema.prisma    # データベーススキーマ（OneRosterエンティティ）
│   │   ├── migrations/      # データベースマイグレーション
│   │   │   ├── 20250101_init/
│   │   │   ├── 20250102_add_users/
│   │   │   ├── 20250103_add_orgs/
│   │   │   └── ...
│   │   └── seed.ts          # データベースシーディング（テストデータ）
│   │
│   ├── main.ts              # アプリケーションエントリーポイント
│   └── app.module.ts        # ルートNestJSモジュール
│
├── tests/                   # テストファイル
│   ├── e2e/                 # エンドツーエンドテスト
│   │   ├── csv-import.e2e-spec.ts
│   │   ├── csv-export.e2e-spec.ts
│   │   ├── bulk-api.e2e-spec.ts
│   │   └── delta-api.e2e-spec.ts
│   └── unit/                # ユニットテスト（またはソースと同じ場所）
│
├── nest-cli.json            # NestJS CLI設定
├── tsconfig.json            # TypeScript設定
└── package.json             # 依存関係
```

---

## OneRosterエンティティモジュールパターン

### 標準エンティティモジュール構造

各OneRosterエンティティ（users、orgs、classes、courses、enrollments、academicSessions、demographics）は、以下の一貫した構造に従います:

```
oneroster/entities/[entity-name]/
├── [entity].controller.ts   # REST APIエンドポイント（CRUD）
├── [entity].service.ts      # ビジネスロジック
├── [entity].repository.ts   # データアクセス層（Prisma）
├── [entity].module.ts       # NestJSモジュール定義
├── dto/                     # データ転送オブジェクト
│   ├── create-[entity].dto.ts    # POSTリクエストボディ
│   ├── update-[entity].dto.ts    # PUT/PATCHリクエストボディ
│   ├── [entity]-response.dto.ts  # APIレスポンスフォーマット
│   └── [entity]-filter.dto.ts    # クエリフィルター
└── entities/                # Prismaエンティティモデル
    └── [entity].entity.ts   # TypeScriptエンティティクラス
```

### 例: Userエンティティモジュール

```typescript
// oneroster/entities/users/users.controller.ts
@Controller('oneroster/v1/users')
@UseGuards(ApiKeyGuard, IpWhitelistGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() filter: UserFilterDto): Promise<UserResponseDto[]> {
    return this.usersService.findAll(filter);
  }

  @Get(':sourcedId')
  async findOne(@Param('sourcedId') sourcedId: string): Promise<UserResponseDto> {
    return this.usersService.findBySourcedId(sourcedId);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Put(':sourcedId')
  async update(
    @Param('sourcedId') sourcedId: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.usersService.update(sourcedId, updateUserDto);
  }

  @Delete(':sourcedId')
  async delete(@Param('sourcedId') sourcedId: string): Promise<void> {
    return this.usersService.delete(sourcedId);
  }
}

// oneroster/entities/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly validationService: JapanProfileValidatorService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findAll(filter: UserFilterDto): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findAll(filter);
    return users.map(user => this.toDto(user));
  }

  async findBySourcedId(sourcedId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findBySourcedId(sourcedId);
    if (!user) {
      throw new NotFoundException(`User with sourcedId ${sourcedId} not found`);
    }
    return this.toDto(user);
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Validate Japan Profile fields
    await this.validationService.validateUser(createUserDto);

    // Create user
    const user = await this.usersRepository.create(createUserDto);

    // Audit log
    await this.auditLogService.logCreate('User', user.sourcedId);

    return this.toDto(user);
  }

  async update(sourcedId: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Validate Japan Profile fields
    await this.validationService.validateUser(updateUserDto);

    // Update user
    const user = await this.usersRepository.update(sourcedId, updateUserDto);

    // Audit log
    await this.auditLogService.logUpdate('User', sourcedId);

    return this.toDto(user);
  }

  async delete(sourcedId: string): Promise<void> {
    // Soft delete (set status to 'tobedeleted')
    await this.usersRepository.softDelete(sourcedId);

    // Audit log
    await this.auditLogService.logDelete('User', sourcedId);
  }

  private toDto(user: User): UserResponseDto {
    // Map entity to DTO (Japan Profile format)
    return new UserResponseDto(user);
  }
}

// oneroster/entities/users/users.repository.ts
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: UserFilterDto): Promise<User[]> {
    return this.prisma.user.findMany({
      where: this.buildWhereClause(filter),
      orderBy: filter.sort,
      skip: filter.offset,
      take: filter.limit,
    });
  }

  async findBySourcedId(sourcedId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { sourcedId },
    });
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        sourcedId: generateSourcedId('user'),
        dateCreated: new Date(),
        dateLastModified: new Date(),
      },
    });
  }

  async update(sourcedId: string, data: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { sourcedId },
      data: {
        ...data,
        dateLastModified: new Date(),
      },
    });
  }

  async softDelete(sourcedId: string): Promise<User> {
    return this.prisma.user.update({
      where: { sourcedId },
      data: {
        status: 'tobedeleted',
        dateLastModified: new Date(),
      },
    });
  }

  private buildWhereClause(filter: UserFilterDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filter.dateLastModified) {
      where.dateLastModified = { gte: filter.dateLastModified };
    }

    if (filter.role) {
      where.role = filter.role;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    return where;
  }
}
```

---

## セキュリティアーキテクチャパターン (Sprint 5)

### ガード実行順序

セキュリティは、特定の実行順序を持つNestJSガードを使用して実装されています:

```typescript
@Controller('ims/oneroster/v1p2/users')
@UseGuards(
  ApiKeyGuard,           // 1. APIキーを検証（キャッシュ → データベース）
  IpWhitelistGuard,      // 2. IPホワイトリストを確認（設定されている場合）
  RateLimitGuard,        // 3. レート制限をチェック（スライディングウィンドウ）
)
@UseInterceptors(
  AuditInterceptor,      // 4. すべてのリクエスト/レスポンスをログ
)
export class UsersController {}
```

**実行フロー**:
1. **ApiKeyGuard** がX-API-Keyヘッダーを検証
   - Redisキャッシュをチェック（5分TTL）
   - データベース検証へフォールバック（ApiKeyService経由）
   - APIキーメタデータをrequestオブジェクトにアタッチ
   - X-Forwarded-Forまたはrequest.ipからクライアントIPを抽出

2. **IpWhitelistGuard** がクライアントIPをホワイトリストと照合
   - APIキーにIPホワイトリストが設定されていない場合はスキップ
   - IPv4完全一致をサポート（例: `192.168.1.100`）
   - IPv6完全一致をサポート（例: `2001:db8::1`）
   - CIDR範囲をサポート（例: `192.168.1.0/24`, `2001:db8::/32`）
   - IP解析と範囲検証に`ipaddr.js`を使用

3. **RateLimitGuard** がレート制限を適用
   - 2つの実装が利用可能:
     - `RateLimitGuard`: シンプルなトークンバケット（cache-manager）
     - `RateLimitSlidingWindowGuard`: 正確なスライディングウィンドウ（Redis sorted sets）
   - デフォルト制限: APIキーあたり1時間に1000リクエスト
   - フェイルオープン動作: Redisが利用不可の場合はリクエストを許可
   - レート制限ヘッダーを設定（X-RateLimit-Limit、X-RateLimit-Remaining、X-RateLimit-Reset）

4. **AuditInterceptor** がすべてのAPI活動をログ
   - コンプライアンスのためデータベース（AuditLogテーブル）に保存
   - 監視用にコンソール（構造化JSON）にログ
   - リクエスト詳細をキャプチャ（メソッド、パス、ボディ、ヘッダー）
   - レスポンス詳細をキャプチャ（ステータス、ボディ、期間）
   - 機密データをサニタイズ（パスワード、トークン、APIキー）
   - エンティティコンテキストを抽出（エンティティタイプ、アクション、sourcedId）

### セキュリティモジュール構造

```
src/
├── oneroster/auth/              # APIキー管理
│   ├── api-key/
│   │   ├── api-key.service.ts       # キー生成、検証、失効
│   │   ├── api-key.controller.ts    # POST/GET/DELETE /api/v1/auth/api-keys
│   │   └── api-key.module.ts
│   ├── repositories/
│   │   └── api-key.repository.ts    # データベースアクセス
│   └── dto/
│       ├── create-api-key.dto.ts    # 名前、組織、IPホワイトリスト、レート制限
│       └── api-key-response.dto.ts  # プレーンテキストキー（一度だけ表示）
│
├── oneroster/audit/             # 監査ログ
│   ├── audit.service.ts             # ログクエリ、GDPRレポート、統計
│   ├── audit.controller.ts          # GET /api/v1/audit（フィルタリング、ページング）
│   ├── repositories/
│   │   └── audit-log.repository.ts  # データベースアクセス
│   └── audit.module.ts
│
└── common/
    ├── guards/                      # 再利用可能なガード
    │   ├── api-key.guard.ts             # 認証（Redisキャッシュ）
    │   ├── ip-whitelist.guard.ts        # 認可（IPチェック）
    │   ├── rate-limit.guard.ts          # DoS保護（トークンバケット）
    │   └── rate-limit-sliding-window.guard.ts  # 高度なレート制限
    │
    └── interceptors/
        └── audit.interceptor.ts     # 自動監査ログ
```

### APIキー形式

- **形式**: `rh_live_{64_hex_characters}` または `rh_test_{64_hex_characters}`
- **生成**: `crypto.randomBytes(32).toString('hex')` （64文字の16進数）
- **保存**: 12ラウンドのsaltでBcryptハッシュ化
- **検証**: Bcrypt比較（`await bcrypt.compare(plainKey, hashedKey)`）
- **セキュリティ**: プレーンテキストキーは作成時に一度だけ表示、取得不可

### レート制限アルゴリズム

**トークンバケット（シンプル）**:
- RedisでNestJS `@nestjs/cache-manager`を使用
- APIキーごとの固定ウィンドウ
- オーバーヘッドが低く、シンプルな実装

**スライディングウィンドウ（高度）**:
- Redis sorted setsで`ioredis`を直接使用
- 真のスライディングウィンドウ（ウィンドウ境界でのバースト無し）
- より正確なリクエストカウント
- 本番環境推奨

### 監査ログデータモデル

```typescript
interface AuditLog {
  id: string;
  timestamp: DateTime;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  entityType: string;           // 'User', 'Org', 'Class'等
  entitySourcedId: string;
  apiKeyId?: string;            // 使用されたAPIキー
  userId?: string;              // OneRosterユーザー（利用可能な場合）
  ipAddress: string;
  userAgent?: string;
  requestMethod: string;        // GET, POST, PUT, DELETE
  requestPath: string;          // /ims/oneroster/v1p2/users/abc123
  requestBody?: Json;           // サニタイズされたリクエストボディ
  responseStatus: number;       // 200, 404, 500等
  responseBody?: Json;          // サニタイズされたレスポンス（サイズ制限）
  duration: number;             // リクエスト期間（ミリ秒）
  errorMessage?: string;        // エラーメッセージ（失敗時）
  errorStack?: string;          // スタックトレース（非本番環境のみ）
}
```

### GDPR準拠機能

- **データアクセスログ**: すべてのAPI操作をタイムスタンプ付きでログ
- **アクセス権（第15条）**: GDPRレポートAPIエンドポイント
- **データ保持**: 設定可能な保持ポリシー（デフォルト: 2年）
- **データサニタイゼーション**: 機密フィールドをログから削除
- **監査証跡**: データアクセスと変更の完全な履歴

---

## 命名規則

### ファイルとディレクトリ

#### バックエンド（NestJS）
- **Controllers**: `kebab-case.controller.ts` (例: `users.controller.ts`、`csv-import.controller.ts`)
- **Services**: `kebab-case.service.ts` (例: `users.service.ts`、`csv-parser.service.ts`)
- **Repositories**: `kebab-case.repository.ts` (例: `users.repository.ts`)
- **Modules**: `kebab-case.module.ts` (例: `users.module.ts`、`oneroster.module.ts`)
- **Entities**: `PascalCase.entity.ts` (例: `User.entity.ts`、`Org.entity.ts`)
- **DTOs**: `kebab-case.dto.ts` (例: `create-user.dto.ts`、`user-response.dto.ts`)
- **Guards**: `kebab-case.guard.ts` (例: `api-key.guard.ts`、`ip-whitelist.guard.ts`)
- **Interceptors**: `kebab-case.interceptor.ts` (例: `logging.interceptor.ts`)
- **Pipes**: `kebab-case.pipe.ts` (例: `validation.pipe.ts`)
- **Test Files**: `*.spec.ts` (例: `users.controller.spec.ts`)

#### データベース（Prisma）
- **Schema File**: `schema.prisma`
- **Migration Directories**: `YYYYMMDD_description` (例: `20250101_init`、`20250102_add_users`)

### コード要素

```typescript
// 変数と関数: camelCase
const sourcedId = 'abc123';
const dateLastModified = new Date();
function validateJapanProfile() {}
const handleCsvImport = async () => {};

// クラスとインターフェース: PascalCase
class UsersService {}
class UserResponseDto {}
interface OneRosterEntity {}
type UserRole = 'student' | 'teacher' | 'staff';

// 定数: UPPER_SNAKE_CASE
const MAX_CSV_FILE_SIZE_MB = 100;
const DEFAULT_PAGE_SIZE = 100;
const CSV_ENCODING = 'utf8';

// Enum: PascalCase（キーもPascalCase）
enum UserRole {
  Student = 'student',
  Teacher = 'teacher',
  Staff = 'staff',
  Administrator = 'administrator'
}

enum StatusType {
  Active = 'active',
  Tobedeleted = 'tobedeleted',
  Inactive = 'inactive'
}

// OneRosterフィールド: camelCase（仕様に従う）
// - sourcedId (sourceIdやsourced_idではない)
// - dateLastModified (last_modifiedやlastModifiedDateではない)
// - metadata.jp.* (Japan Profile拡張)
```

---

## インポート順序

### 標準順序

```typescript
// 1. 外部依存関係（NestJS、ライブラリ）
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

// 2. 内部絶対インポート（@/パス）
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ApiKeyGuard } from '@/oneroster/auth/api-key.guard';
import { AuditLogService } from '@/oneroster/audit/audit-log.service';

// 3. 相対インポート（同じ機能/モジュール）
import { User } from './entities/user.entity';
import { UserFilterDto } from './dto/user-filter.dto';
```

### パスエイリアス

`tsconfig.json`で設定:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/oneroster/*": ["src/oneroster/*"],
      "@/common/*": ["src/common/*"],
      "@/config/*": ["src/config/*"]
    }
  }
}
```

---

## アーキテクチャパターン

### 主要原則

1. **OneRoster仕様準拠**
   - エンティティ構造はOneRoster仕様に正確に従う
   - フィールド名は仕様に一致（sourcedId、dateLastModified等）
   - Japan Profile拡張は`metadata.jp.*`名前空間に配置

2. **関心の分離**
   - Controllersはリクエスト/レスポンスを処理
   - Servicesはビジネスロジックを含む
   - RepositoriesはデータベースアクセスH理
   - Validatorsはデータ検証を処理
   - Interceptors/Guardsは横断的関心事を処理

3. **依存関係の方向**
   - ControllersはServicesに依存
   - ServicesはRepositoriesとValidatorsに依存
   - RepositoriesはPrisma（データベース層）に依存
   - 循環依存なし

4. **DRY (Don't Repeat Yourself)**
   - 共通検証ルールは`validation/rules/`に配置
   - 共有DTOは`common/dto/`に配置
   - 再利用可能なユーティリティは`common/utils/`に配置

### 一般的なパターン

#### Repositoryパターン（データアクセス層）
```typescript
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: UserFilterDto): Promise<User[]> {
    return this.prisma.user.findMany({
      where: this.buildWhereClause(filter),
    });
  }

  private buildWhereClause(filter: UserFilterDto): Prisma.UserWhereInput {
    // Build complex where clause
  }
}
```

#### Serviceレイヤーパターン（ビジネスロジック）
```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly validator: JapanProfileValidatorService,
    private readonly auditLog: AuditLogService
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.validator.validateUser(dto);
    const user = await this.repository.create(dto);
    await this.auditLog.logCreate('User', user.sourcedId);
    return this.toDto(user);
  }
}
```

#### DTOパターン（データ転送オブジェクト）
```typescript
// Japan Profile準拠DTO
export class UserResponseDto {
  sourcedId: string;
  dateCreated: Date;
  dateLastModified: Date;
  status: StatusType;
  enabledUser: boolean;
  username: string;
  userIds: string[];
  givenName: string;
  familyName: string;
  middleName?: string;
  role: UserRole;
  identifier: string;
  email: string;
  sms?: string;
  phone?: string;
  metadata: {
    jp: {
      kanaGivenName?: string;
      kanaFamilyName?: string;
      kanaMiddleName?: string;
      homeClass?: string;
    };
  };
  orgs: { href: string; sourcedId: string; type: string }[];
  agents: { href: string; sourcedId: string; type: string }[];
}
```

#### CSVストリーミングパターン（大容量ファイル）
```typescript
@Injectable()
export class CsvParserService {
  async parseStream(fileStream: Readable): Promise<AsyncIterableIterator<any>> {
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      encoding: 'utf8',
      bom: true,
    });

    fileStream.pipe(parser);

    // Return async iterable for streaming processing
    return parser[Symbol.asyncIterator]();
  }
}

// Usage in import service
async importUsers(fileStream: Readable): Promise<void> {
  const records = await this.csvParser.parseStream(fileStream);
  const batch = [];

  for await (const record of records) {
    // Validate record
    await this.validator.validateUser(record);

    // Add to batch
    batch.push(record);

    // Bulk insert every 1000 records
    if (batch.length >= 1000) {
      await this.bulkInsert.insertUsers(batch);
      batch.length = 0;
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    await this.bulkInsert.insertUsers(batch);
  }
}
```

---

## データベーススキーマ構成（Prisma）

### スキーマ構造

```
apps/api/src/prisma/
├── schema.prisma           # メインスキーマファイル
├── migrations/             # 自動生成マイグレーション
│   ├── 20250101_init/
│   ├── 20250102_add_users/
│   ├── 20250103_add_orgs/
│   └── ...
└── seed.ts                 # データベースシーディングスクリプト
```

### スキーマ構成（schema.prisma内）

```prisma
// 1. GeneratorとDatasource設定
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 2. Enum（OneRoster仕様）
enum StatusType {
  active
  tobedeleted
  inactive
}

enum UserRole {
  student
  teacher
  staff
  administrator
}

enum OrgType {
  department
  school
  district
  local
  state
  national
}

// 3. コアOneRosterエンティティ
// Users (students, teachers, staff)
model User {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  enabledUser        Boolean
  username           String
  userIds            String[]
  givenName          String
  familyName         String
  middleName         String?
  role               UserRole
  identifier         String    @unique
  email              String
  sms                String?
  phone              String?
  metadata           Json?     // Japan Profile extensions

  // Relationships
  orgs               Org[]     @relation("OrgMembers")
  agents             User[]    @relation("AgentRelationship")
  enrollments        Enrollment[]
  demographics       Demographic?

  @@index([dateLastModified])
  @@index([status])
  @@index([role])
}

// Organizations (schools, districts)
model Org {
  id                 String    @id @default(uuid())
  sourcedId          String    @unique
  dateCreated        DateTime  @default(now())
  dateLastModified   DateTime  @updatedAt
  status             StatusType
  name               String
  type               OrgType
  identifier         String    @unique
  metadata           Json?     // Japan Profile extensions

  // Relationships
  parent             Org?      @relation("OrgHierarchy", fields: [parentSourcedId], references: [sourcedId])
  parentSourcedId    String?
  children           Org[]     @relation("OrgHierarchy")
  members            User[]    @relation("OrgMembers")
  classes            Class[]

  @@index([dateLastModified])
  @@index([status])
  @@index([type])
}

// (他のエンティティも同様...)
```

---

## テスト構造

### バックエンドテスト

**ユニットテスト（ソースと同じ場所）**
```
oneroster/entities/users/
├── users.controller.ts
├── users.controller.spec.ts
├── users.service.ts
├── users.service.spec.ts
├── users.repository.ts
└── users.repository.spec.ts
```

**E2Eテスト（分離）**
```
tests/e2e/
├── csv-import.e2e-spec.ts
├── csv-export.e2e-spec.ts
├── users-api.e2e-spec.ts
├── orgs-api.e2e-spec.ts
├── classes-api.e2e-spec.ts
├── enrollments-api.e2e-spec.ts
├── delta-api.e2e-spec.ts
└── auth.e2e-spec.ts
```

---

## ファイルサイズガイドライン

- **最大ファイルサイズ**: 300-400行（テスト除く）
- **Controllers**: 理想的には200行未満
- **Services**: 300行未満
- **Repositories**: 250行未満
- **制限を超える場合**:
  - 複数のサービスに分割（例: UserValidationService、UserTransformationService）
  - 複雑なロジックを別のユーティリティファイルに抽出
  - サブモジュールに分割

---

## ドキュメント標準

### 必須ドキュメントファイル

```
docs/
├── README.md                # プロジェクト概要とクイックスタート
├── ARCHITECTURE.md          # 詳細なアーキテクチャ決定
├── ONEROSTER_COMPLIANCE.md  # OneRoster Japan Profile準拠詳細
├── API.md                   # APIドキュメント（またはSwagger使用）
└── DEPLOYMENT.md            # デプロイ手順
```

### コードドキュメント

**パブリックAPI用のJSDoc**
```typescript
/**
 * OneRosterユーザーをCSVファイルから入力します（Japan Profileフォーマット）。
 *
 * @param file - CSVファイルストリーム（UTF-8 BOMエンコード）
 * @param options - 入力オプション（検証レベル、バッチサイズ）
 * @returns 処理されたレコード数を含む入力ジョブステータス
 * @throws {ValidationException} CSVフォーマットまたはJapan Profile検証が失敗した場合
 * @throws {DuplicateException} sourcedIdの重複が検出された場合
 */
export async function importUsersFromCsv(
  file: Readable,
  options: CsvImportOptions
): Promise<CsvImportStatus> {
  // Implementation
}
```

---

## バージョン管理構造

### ブランチ戦略
- `main` - 本番環境対応コード
- `develop` - 統合ブランチ
- `feature/*` - 機能ブランチ（例: `feature/csv-import`、`feature/delta-api`）
- `bugfix/*` - バグ修正ブランチ
- `hotfix/*` - 本番緊急修正

### コミット規約
Conventional Commitsに従う:
```
feat(users): add Japan Profile validation for user entity
feat(csv): implement streaming CSV parser for large files
fix(delta-api): correct dateLastModified query filter
docs(api): update OpenAPI spec for enrollment endpoints
test(users): add E2E tests for user CRUD operations
refactor(validation): extract Japan Profile rules to separate module
```

---

**注**: このドキュメントは、RosterHub（OneRoster統合）の現在のアーキテクチャ決定を記録します。以下の場合にこのドキュメントを更新してください:
- OneRosterエンティティモジュールが追加または変更された場合
- ディレクトリ構造が変更された場合
- 新しいアーキテクチャパターンが導入された場合
- 大規模なリファクタリングが発生した場合

パターンと原則を文書化し、網羅的なファイルリストは記載しません。既存のパターンに従う新しいファイルの追加では、このドキュメントの更新は不要です。

**最終更新**: 2025-11-15 (Steering Agent - Sprint 5 セキュリティ実装完了)
