# エンティティ関連図 - RosterHub

**プロジェクト名**: RosterHub - OneRoster Japan Profile 1.2.2 統合ハブ
**作成日**: 2025-11-14
**作成者**: Database Schema Designer AI
**データベース**: PostgreSQL 15+
**ORM**: Prisma 5.x
**仕様**: OneRoster Japan Profile 1.2.2

---

## 概要

本ドキュメントは、OneRoster Japan Profile 1.2.2準拠のデータ統合ハブであるRosterHubのエンティティ関連図（ER図）を提示します。本スキーマは、学校情報システムと学習ツール間の教育データ同期のためのCSVインポート/エクスポートおよびREST APIアクセスをサポートします。

### 主要機能
- **OneRoster準拠**: すべてのエンティティがOneRoster 1.2.2 Japan Profile仕様に準拠
- **Japan Profile拡張**: `metadata.jp.*`名前空間のカスタムフィールド（JSONBカラム）
- **差分/増分同期**: `dateLastModified`によるタイムスタンプベースの変更追跡
- **論理削除**: 物理削除の代わりに`status='tobedeleted'`を使用
- **監査証跡**: データアクセスおよび変更の完全なログ記録
- **大規模対応**: 10,000〜200,000ユーザーに最適化

---

## ER図（Mermaid形式）

```mermaid
erDiagram
    %% OneRosterコアエンティティ

    USER ||--o{ ENROLLMENT : 作成
    USER ||--o{ USER : "エージェント関係"
    USER }o--o{ ORG : "所属"
    USER ||--o| DEMOGRAPHIC : 所有

    ORG ||--o{ ORG : "親子階層"
    ORG ||--o{ CLASS : 開講
    ORG ||--o{ COURSE : 提供

    COURSE ||--o{ CLASS : "クラスとして実体化"

    CLASS ||--o{ ENROLLMENT : 含む
    CLASS }o--o{ ACADEMIC_SESSION : "スケジュール"

    ACADEMIC_SESSION ||--o{ ACADEMIC_SESSION : "親子階層"

    %% システムエンティティ（OneRoster外）
    API_KEY ||--o{ AUDIT_LOG : 認証
    CSV_IMPORT_JOB ||--o{ AUDIT_LOG : トリガー

    %% エンティティ詳細

    USER {
        uuid id PK "プライマリーキー（内部）"
        string sourcedId UK "OneRoster一意識別子"
        datetime dateCreated "作成タイムスタンプ"
        datetime dateLastModified "最終更新タイムスタンプ（インデックス付き）"
        enum status "active|tobedeleted|inactive"
        boolean enabledUser "ユーザーアカウント有効フラグ"
        string username "ログインユーザー名"
        string[] userIds "複数の識別子（学生ID等）"
        string givenName "名"
        string familyName "姓"
        string middleName "ミドルネーム（任意）"
        enum role "student|teacher|staff|administrator"
        string identifier UK "国/地方一意識別子"
        string email "メールアドレス"
        string sms "SMS電話番号（任意）"
        string phone "電話番号（任意）"
        jsonb metadata "Japan Profile拡張（metadata.jp.*）"
    }

    ORG {
        uuid id PK "プライマリーキー（内部）"
        string sourcedId UK "OneRoster一意識別子"
        datetime dateCreated "作成タイムスタンプ"
        datetime dateLastModified "最終更新タイムスタンプ（インデックス付き）"
        enum status "active|tobedeleted|inactive"
        string name "組織名"
        enum type "department|school|district|local|state|national"
        string identifier UK "国/地方一意識別子"
        string parentSourcedId FK "親組織（階層）"
        jsonb metadata "Japan Profile拡張（metadata.jp.*）"
    }

    CLASS {
        uuid id PK "プライマリーキー（内部）"
        string sourcedId UK "OneRoster一意識別子"
        datetime dateCreated "作成タイムスタンプ"
        datetime dateLastModified "最終更新タイムスタンプ（インデックス付き）"
        enum status "active|tobedeleted|inactive"
        string title "クラスタイトル"
        string classCode "クラス識別コード"
        enum classType "homeroom|scheduled"
        string location "物理的な場所（任意）"
        string courseSourcedId FK "関連コース"
        string schoolSourcedId FK "関連学校（org）"
        jsonb metadata "Japan Profile拡張（metadata.jp.*）"
    }

    COURSE {
        uuid id PK "プライマリーキー（内部）"
        string sourcedId UK "OneRoster一意識別子"
        datetime dateCreated "作成タイムスタンプ"
        datetime dateLastModified "最終更新タイムスタンプ（インデックス付き）"
        enum status "active|tobedeleted|inactive"
        string title "コースタイトル"
        string courseCode "コース識別コード"
        string schoolYear "学年度（任意）"
        string schoolSourcedId FK "関連学校（org）"
        jsonb metadata "Japan Profile拡張（metadata.jp.*）"
    }

    ENROLLMENT {
        uuid id PK "プライマリーキー（内部）"
        string sourcedId UK "OneRoster一意識別子"
        datetime dateCreated "作成タイムスタンプ"
        datetime dateLastModified "最終更新タイムスタンプ（インデックス付き）"
        enum status "active|tobedeleted|inactive"
        enum role "primary|secondary|aide"
        boolean primary "主登録フラグ"
        datetime beginDate "登録開始日（任意）"
        datetime endDate "登録終了日（任意）"
        string userSourcedId FK "関連ユーザー"
        string classSourcedId FK "関連クラス"
        string schoolSourcedId FK "関連学校（org）"
        jsonb metadata "Japan Profile拡張（metadata.jp.*）"
    }

    ACADEMIC_SESSION {
        uuid id PK "プライマリーキー（内部）"
        string sourcedId UK "OneRoster一意識別子"
        datetime dateCreated "作成タイムスタンプ"
        datetime dateLastModified "最終更新タイムスタンプ（インデックス付き）"
        enum status "active|tobedeleted|inactive"
        string title "セッションタイトル"
        enum type "gradingPeriod|semester|schoolYear|term"
        datetime startDate "セッション開始日"
        datetime endDate "セッション終了日"
        string schoolYear "学年度"
        string parentSourcedId FK "親セッション（階層）"
        jsonb metadata "Japan Profile拡張（metadata.jp.*）"
    }

    DEMOGRAPHIC {
        uuid id PK "プライマリーキー（内部）"
        string sourcedId UK "OneRoster一意識別子"
        datetime dateCreated "作成タイムスタンプ"
        datetime dateLastModified "最終更新タイムスタンプ（インデックス付き）"
        enum status "active|tobedeleted|inactive"
        datetime birthDate "生年月日（任意）"
        enum sex "male|female|other|unknown"
        string userSourcedId FK UK "関連ユーザー（1:1）"
        jsonb metadata "Japan Profile拡張（metadata.jp.*）"
    }

    API_KEY {
        uuid id PK "プライマリーキー（内部）"
        string key UK "APIキー（表示用）"
        string hashedKey "ハッシュ化されたAPIキー（bcrypt）"
        string name "APIキー名"
        string organizationId "組織識別子"
        string[] ipWhitelist "許可IPアドレス"
        int rateLimit "1時間あたりリクエスト制限"
        boolean isActive "キー有効フラグ"
        datetime expiresAt "有効期限タイムスタンプ（任意）"
        datetime createdAt "作成タイムスタンプ"
        datetime lastUsedAt "最終使用タイムスタンプ（任意）"
    }

    AUDIT_LOG {
        uuid id PK "プライマリーキー（内部）"
        datetime timestamp "ログタイムスタンプ（インデックス付き）"
        enum action "CREATE|UPDATE|DELETE|READ"
        string entityType "エンティティタイプ（User、Org等）"
        string entitySourcedId "エンティティ識別子"
        string userId "アクション実行ユーザー（任意）"
        string ipAddress "リクエストIPアドレス"
        string requestMethod "HTTPメソッド"
        string requestPath "リクエストURLパス"
        jsonb requestBody "リクエストペイロード（任意）"
        int responseStatus "HTTPステータスコード"
        jsonb changes "変更前後の値（任意）"
    }

    CSV_IMPORT_JOB {
        uuid id PK "プライマリーキー（内部）"
        enum status "pending|processing|completed|failed"
        string fileName "アップロードファイル名"
        int fileSize "ファイルサイズ（バイト）"
        int totalRecords "総レコード数（任意）"
        int processedRecords "処理済みレコード数"
        int successRecords "正常インポート数"
        int failedRecords "失敗レコード数"
        jsonb errors "エラー詳細（任意）"
        datetime startedAt "ジョブ開始タイムスタンプ（任意）"
        datetime completedAt "ジョブ完了タイムスタンプ（任意）"
        datetime createdAt "ジョブ作成タイムスタンプ"
        string createdBy "ジョブ開始ユーザー"
    }
```

---

## エンティティ詳細

### OneRosterコアエンティティ

#### 1. USER（users）
**目的**: 学生、教師、職員、管理者を表現します。

**OneRoster仕様**: Section 4.3 Users
**Japan Profile拡張**:
- `metadata.jp.kanaGivenName`: フリガナ名（カナ名）
- `metadata.jp.kanaFamilyName`: フリガナ姓（カナ姓）
- `metadata.jp.kanaMiddleName`: フリガナミドルネーム（カナミドルネーム）
- `metadata.jp.homeClass`: ホームクラス識別子（ホームクラス）

**主要機能**:
- `userIds[]`配列による複数識別子対応（学生ID、国民ID等）
- 自己参照外部キーによるエージェント関係（例：親子関係）
- ORGとの多対多リレーション（ユーザーは複数の組織に所属可能）
- DEMOGRAPHICとの1対1リレーション

**規模**: 10,000〜200,000レコード

---

#### 2. ORG（orgs）
**目的**: 組織階層（学校、地区、部門）を表現します。

**OneRoster仕様**: Section 4.4 Orgs
**Japan Profile拡張**:
- `metadata.jp.localCode`: 地方自治体コード（自治体コード）
- `metadata.jp.prefectureCode`: 都道府県コード（都道府県コード）

**主要機能**:
- 自己参照階層（親子関係）
- タイプ: department、school、district、local、state、national
- USERとの多対多リレーション

**規模**: 100〜1,000レコード

---

#### 3. CLASS（classes）
**目的**: クラスインスタンス（コース+学期+時限）を表現します。

**OneRoster仕様**: Section 4.5 Classes
**Japan Profile拡張**:
- `metadata.jp.classGrade`: クラス学年（学年）
- `metadata.jp.curriculum`: カリキュラムタイプ（カリキュラムタイプ）

**主要機能**:
- COURSEへのリンク（多対1）
- ORG経由でSCHOOLへリンク（多対1）
- ACADEMIC_SESSIONへのリンク（多対多）
- ENROLLMENTレコードを含む（1対多）

**規模**: 5,000〜50,000レコード

---

#### 4. COURSE（courses）
**目的**: コースカタログ（コース定義、インスタンスではない）を表現します。

**OneRoster仕様**: Section 4.6 Courses
**Japan Profile拡張**:
- `metadata.jp.subject`: 教科区分（教科区分）
- `metadata.jp.credits`: 単位数（単位数）

**主要機能**:
- ORG経由でSCHOOLへリンク（多対1）
- CLASSレコードとして実体化（1対多）

**規模**: 500〜5,000レコード

---

#### 5. ENROLLMENT（enrollments）
**目的**: ユーザー・クラス関係（学生登録、教師割当）を表現します。

**OneRoster仕様**: Section 4.7 Enrollments
**Japan Profile拡張**:
- `metadata.jp.attendanceNumber`: 出席番号（出席番号）
- `metadata.jp.role`: 詳細役割区分（詳細役割）

**主要機能**:
- USERとCLASSをリンク（多対多ブリッジテーブル）
- ロールタイプ: primary（学生主登録）、secondary（クロスリスト）、aide（教師アシスタント）
- 期間限定登録のためのbegin/end日付サポート
- 一意制約: (userSourcedId, classSourcedId)

**規模**: 100,000〜2,000,000レコード（最大のテーブル）

---

#### 6. ACADEMIC_SESSION（academic_sessions）
**目的**: 学術期間（学期、セメスター、学年度）を表現します。

**OneRoster仕様**: Section 4.8 Academic Sessions
**Japan Profile拡張**:
- `metadata.jp.termName`: 日本語学期名（学期名）

**主要機能**:
- 自己参照階層（例: schoolYear → semester → gradingPeriod）
- タイプ: gradingPeriod、semester、schoolYear、term
- CLASSとの多対多リレーション

**規模**: 50〜500レコード

---

#### 7. DEMOGRAPHIC（demographics）
**目的**: ユーザー人口統計情報を表現します（Japan Profile拡張）。

**OneRoster仕様**: Section 4.9 Demographics
**Japan Profile拡張**:
- `metadata.jp.nationality`: 国籍（国籍）
- `metadata.jp.residentStatus`: 在留資格（在留資格）

**主要機能**:
- USERとの1対1リレーション
- オプションフィールド（birthDate、sex）
- 追加の人口統計データのためのJapan Profile拡張

**規模**: USERと同じ（10,000〜200,000レコード）

---

### システムエンティティ（OneRoster外）

#### 8. API_KEY（api_keys）
**目的**: API認証と認可。

**主要機能**:
- APIキー管理（作成、無効化、有効期限）
- 追加セキュリティのためのIPホワイトリスト
- キーごとのレート制限（デフォルト: 1000リクエスト/時）
- 監査とクリーンアップのための最終使用追跡

**規模**: 10〜100レコード

---

#### 9. AUDIT_LOG（audit_logs）
**目的**: すべてのデータアクセスおよび変更の監査証跡。

**主要機能**:
- OneRosterエンティティのすべてのCRUD操作をログ記録
- UPDATE操作の変更前後の値をキャプチャ
- GDPR、MEXT ガイドライン、個人情報保護法コンプライアンスに必須
- 保存期間: 最低3年

**規模**: 数百万レコード（大容量、日付でパーティション化）

---

#### 10. CSV_IMPORT_JOB（csv_import_jobs）
**目的**: CSVインポート操作のバックグラウンドジョブ追跡。

**主要機能**:
- インポート進捗追跡（処理済み/成功/失敗カウント）
- デバッグのためのJSONBカラムのエラー詳細
- ステータス追跡: pending → processing → completed/failed

**規模**: 100〜10,000レコード

---

## リレーションシップ概要

### OneRosterエンティティリレーションシップ

| リレーションシップ | タイプ | 説明 |
|--------------|------|-------------|
| USER ↔ ORG | 多対多 | ユーザーは複数の組織に所属 |
| USER → DEMOGRAPHIC | 1対1 | 各ユーザーは1つの人口統計レコードを持つ |
| USER → USER (agent) | 1対多 | 親子関係 |
| USER → ENROLLMENT | 1対多 | クラスへのユーザー登録 |
| ORG → ORG (parent) | 1対多 | 組織階層 |
| ORG → CLASS | 1対多 | 組織がクラスを開講 |
| ORG → COURSE | 1対多 | 組織がコースを提供 |
| COURSE → CLASS | 1対多 | コースがクラスとして実体化 |
| CLASS → ENROLLMENT | 1対多 | クラスが登録を含む |
| CLASS ↔ ACADEMIC_SESSION | 多対多 | セッションでスケジュールされたクラス |
| ACADEMIC_SESSION → ACADEMIC_SESSION | 1対多 | セッション階層 |

### システムエンティティリレーションシップ

| リレーションシップ | タイプ | 説明 |
|--------------|------|-------------|
| API_KEY → AUDIT_LOG | 1対多 | APIキー使用追跡 |
| CSV_IMPORT_JOB → AUDIT_LOG | 1対多 | インポートジョブ監査証跡 |

---

## インデックス戦略

### プライマリインデックス
すべてのエンティティに以下を設定:
- **プライマリーキー**: `id`（UUID、クラスター化インデックス）
- **一意インデックス**: `sourcedId`（OneRoster識別子、APIクエリ用）

### パフォーマンスインデックス
一般的なクエリパターンに最適化:

**Userエンティティ**:
- `idx_users_dateLastModified` - Delta APIクエリ
- `idx_users_status` - アクティブユーザーフィルタリング
- `idx_users_role` - ロールベースクエリ
- `idx_users_identifier` - 国民ID検索
- `idx_users_email` - メールベース検索

**Orgエンティティ**:
- `idx_orgs_dateLastModified` - Delta APIクエリ
- `idx_orgs_status` - アクティブ組織フィルタリング
- `idx_orgs_type` - 組織タイプフィルタリング
- `idx_orgs_parent` - 階層トラバーサル

**Classエンティティ**:
- `idx_classes_dateLastModified` - Delta APIクエリ
- `idx_classes_courseSourcedId` - コース・クラス検索
- `idx_classes_schoolSourcedId` - 学校・クラス検索

**Enrollmentエンティティ**（最大のテーブル）:
- `idx_enrollments_dateLastModified` - Delta APIクエリ（重要）
- `idx_enrollments_userSourcedId` - ユーザー登録検索
- `idx_enrollments_classSourcedId` - クラス名簿クエリ
- `idx_enrollments_schoolSourcedId` - 学校登録レポート
- `idx_enrollments_unique` - 一意制約 (userSourcedId, classSourcedId)

**Audit Logエンティティ**:
- `idx_audit_logs_timestamp` - 時間ベースクエリ
- `idx_audit_logs_entity` - エンティティベース監査証跡
- `idx_audit_logs_userId` - ユーザーアクティビティ追跡

**複合インデックス**（複雑なクエリ用）:
- `idx_enrollments_user_class` - (userSourcedId, classSourcedId) 登録チェック用
- `idx_classes_school_course` - (schoolSourcedId, courseSourcedId) クラスリスト用

---

## Japan Profileメタデータスキーマ

### JSONB構造（metadata.jp.*）

すべてのOneRosterエンティティは`metadata` JSONBカラムでJapan Profile拡張をサポートします。

**Userメタデータ例**:
```json
{
  "jp": {
    "kanaGivenName": "タロウ",
    "kanaFamilyName": "ヤマダ",
    "kanaMiddleName": null,
    "homeClass": "1-A"
  }
}
```

**Orgメタデータ例**:
```json
{
  "jp": {
    "localCode": "13101",
    "prefectureCode": "13"
  }
}
```

**Classメタデータ例**:
```json
{
  "jp": {
    "classGrade": "1",
    "curriculum": "standard"
  }
}
```

**Demographicメタデータ例**:
```json
{
  "jp": {
    "nationality": "JP",
    "residentStatus": "permanent"
  }
}
```

### JSONBインデックス作成
Japan Profileフィールドの高性能クエリのため:
```sql
-- 例: カナ姓でユーザーを検索
CREATE INDEX idx_users_metadata_kana_family ON users
  USING GIN ((metadata->'jp'->'kanaFamilyName'));

-- 例: 都道府県コードで組織を検索
CREATE INDEX idx_orgs_metadata_prefecture ON orgs
  USING GIN ((metadata->'jp'->'prefectureCode'));
```

---

## 差分/増分同期設計

### タイムスタンプベース変更追跡

**キーフィールド**: `dateLastModified`（すべてのエンティティにインデックス付き）

**クエリパターン**:
```sql
-- 最後の同期以降に変更されたすべてのユーザーを取得
SELECT * FROM users
WHERE dateLastModified > '2025-11-13T12:00:00Z'
ORDER BY dateLastModified ASC;
```

**APIエンドポイント**:
```
GET /oneroster/v1/users?filter=dateLastModified>2025-11-13T12:00:00Z
```

### 論理削除処理

**物理削除の代わりに**:
```sql
-- ユーザーを論理削除
UPDATE users
SET status = 'tobedeleted', dateLastModified = NOW()
WHERE sourcedId = 'abc123';
```

**消費システムが論理削除を検出**:
```sql
-- 削除されたユーザーを取得
SELECT * FROM users
WHERE status = 'tobedeleted'
  AND dateLastModified > '2025-11-13T12:00:00Z';
```

---

## パフォーマンス考慮事項

### スケール目標
- **Users**: 10,000〜200,000レコード
- **Enrollments**: 100,000〜2,000,000レコード（最大のテーブル）
- **Classes**: 5,000〜50,000レコード
- **Audit Logs**: 数百万レコード（月ごとにパーティション化）

### 最適化戦略

#### 1. パーティショニング
- **Audit Logs**: 時間範囲クエリのため月ごとにパーティション化
  ```sql
  CREATE TABLE audit_logs (
    ...
  ) PARTITION BY RANGE (timestamp);

  CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
  ```

#### 2. コネクションプーリング
- **PgBouncer**: 最大100接続（本番環境）
- **Prisma Client**: コネクションプールサイズ20

#### 3. クエリ最適化
- すべての外部キーカラムにインデックス付き
- すべてのエンティティで`dateLastModified`にインデックス付き（Delta APIに重要）
- 一般的なJOINパターン用の複合インデックス

#### 4. 一括挿入最適化
- **CSVインポート**: バッチ挿入（トランザクションあたり1000レコード）
- **トランザクション戦略**: バッチごとのコミット（レコードごとではない）
- **COPY FROM**: 最大パフォーマンスのためPostgreSQLのCOPYを使用

---

## 次のステップ

1. **正規化分析**: 3NF準拠を検証し、非正規化の機会を特定
2. **DDL生成**: PrismaスキーマとPostgreSQL DDLを作成
3. **インデックス設計**: 詳細なインデックスサイジングとパフォーマンステスト
4. **マイグレーション計画**: スキーマバージョニングとロールバック戦略
5. **テスト**: 200,000ユーザーデータセットでの負荷テスト

---

## 参考資料

- **OneRoster 1.2.2仕様**: [IMS Global OneRoster](https://www.imsglobal.org/oneroster-v11-final-specification)
- **OneRoster Japan Profile 1.2.2**: 日本の教育データ拡張
- **システム要件**: `docs/requirements/oneroster-system-requirements.md`
- **Steeringコンテキスト**:
  - `steering/structure.md` - アーキテクチャパターン
  - `steering/tech.md` - PostgreSQL 15+、Prisma 5.x
  - `steering/product.md` - RosterHub製品コンテキスト

---

**ドキュメントバージョン**: 1.0
**最終更新**: 2025-11-14
**ステータス**: レビュー準備完了
